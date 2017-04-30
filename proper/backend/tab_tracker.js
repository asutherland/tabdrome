/**
 * Wraps/normalizes the chrome.tabs API and unifies/latches data sent from
 * our content script helpers.  This is also where any other per-tab data would
 * be mixed-in.  (For example, data from about:memory or about:performance).
 *
 * This is where any hacks/workarounds for limitations in the chrome.tabs API
 * or Firefox's implementation happen.  (For example, openerTabId currently
 * is not supported by Firefox, so we would do inference in here.)
 *
 * ## Execution Context ##
 *
 * Despite the presence of the extension APIs in all of our page contexts, we
 * only run in the background page.  This is because we only (want to) receive
 * and process data from content scripts in one place.
 */
class TabTracker {
  constructor({ initHelpers, onWindowTabChanges, onWindowRemoved }) {
    this._notifyWindowTabChanges = onWindowTabChanges;
    this._notifyWindowRemoved = onWindowRemoved;

    /**
     * Normalized tabs keyed by their browser-allocated id.
     */
    this.normTabsById = new Map();

    /**
     * Maps windowId to the id-keyed Map of normalized tabs that live in that
     * window. Note that the ordering of the contents of the set is an emergent
     * thing that we don't care about.
     */
    this.perWindowInfo = new Map();

    // Simple batching mechanism using setTimeout to avoid pathological
    // performance in bulk manipulations like session restores, closing
    // subtrees, closing windows, etc.
    this._dirtyWindowTimer = 0;
    this._dirtyWindows = new Set();

    // The monotonic clock that moves forward every time anything happens.  This
    // is the value stamped on tabs in the most recent set of changes.  In the
    // case of tab removals, however, there will be no tab hanging around with
    // the serial.
    this.globalSerial = 0;

    // Because of our communication flow, there are inherently some circular
    // dependencies between us and our helpers.  In the interest of letting the
    // factory that sets everything up do all the wiring and avoiding us
    // assigning ourselves into helpers via non-obvious API, we have this helper
    // method.
    const helpers = initHelpers(this);
    this.contentScriptCoordinator = helpers.contentScriptCoordinator;
    this.contentDigger = helpers.contentDigger;
    this.contextSearcher = helpers.contextSearcher;

    browser.tabs.query({}).then((tabs) => {
      for (let tab of tabs) {
        this.onCreated(tab);
      }
      this._listenForEvents();
    });
  }

  _listenForEvents() {
    browser.tabs.onCreated.addListener(this.onCreated.bind(this));
    browser.tabs.onUpdated.addListener(this.onUpdated.bind(this));
    // We need onActivated because onUpdated may not fire when tabs are
    // switching.
    browser.tabs.onActivated.addListener(this.onActivated.bind(this));
    browser.tabs.onRemoved.addListener(this.onRemoved.bind(this));

    browser.windows.onRemoved.addListener(this.onWindowRemoved.bind(this));
  }

  _reportDirtyWindow(windowId) {
    this._dirtyWindows.add(windowId);
    if (!this._dirtyWindowTimer) {
      this._dirtyWindowTimer = window.setTimeout(
        () => {
          this._dirtyWindowTimer = 0;
          this._flushToTabulator();
        }, 0);
    }
  }

  _parseAndExpandUrl(urlStr) {
    let url = new URL(urlStr);
    let searchDict = {};
    for (let [key, value] of url.searchParams) {
      searchDict[key] = value;
    }
    return {
      href: url.href,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      username: url.username,
      password: url.password,
      origin: url.origin,
      searchParams: searchDict
    };
  }

  _getOrCreateWindowInfo(windowId) {
    let winInfo = this.perWindowInfo.get(windowId);
    if (!winInfo) {
      winInfo = {
        activeTabId: null,
        tabs: new Map()
      };
      this.perWindowInfo.set(windowId, winInfo);
    }
    return winInfo;
  }

  _learnAboutBrowserTab(tab) {
    let normTab = {
      id: tab.id,
      suid: '!' + tab.id,
      serial: ++this.globalSerial,
      createdTS: Date.now(),
      windowId: tab.windowId,
      index: tab.index,
      openerTabId: tab.openedTabId,
      active: tab.active,
      pinned: tab.pinned,
      parsedUrl: this._parseAndExpandUrl(tab.url),
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      status: tab.status,
      incognito: tab.incognito,
      width: tab.width,
      height: tab.height,
      fromContent: null // or Map()
    };

    this.normTabsById.set(normTab.id, normTab);

    const winInfo = this._getOrCreateWindowInfo(normTab.windowId);
    winInfo.tabs.set(normTab.id, normTab);
    // We don't get a synthetic activate event, so we need to populate this when
    // we see the tab if one isn't already known.
    if (normTab.active && winInfo.activeTabId === null) {
      winInfo.activeTabId = normTab.id;
    }

    this._reportDirtyWindow(normTab.windowId);

    return normTab;
  }

  _updateNormTabWithTab(normTab, tab) {
    // We could diff to determine whether bumping the serial is necessary, but
    // it seems reasonable to trust the upstream event generating logic to be
    // sufficiently competent that it's not just spamming us nonstop with BS
    // events.
    normTab.serial = ++this.globalSerial;
    // by definition not allowed to change: id
    // by definition not allowed to change at this time: suid.  (In the future
    // if we're getting clever about inferring session restores if they're not
    // going well for us, we may end up retracting a tab and reissuing it with
    // a previously known suid, etc. etc.)
    normTab.windowId = tab.windowId;
    normTab.active = tab.active;
    normTab.pinned = tab.pinned;
    if (normTab.parsedUrl.href !== tab.url) {
      normTab.parsedUrl = this._parseAndExpandUrl(tab.url);
    }
    normTab.title = tab.title;
    normTab.favIconUrl = tab.favIconUrl;
    normTab.status = tab.status;
    normTab.incognito = tab.incognito;
    normTab.width = tab.width;
    normTab.height = tab.height;
  }

  _processTabUpdate(tab) {
    let normTab = this.normTabsById.get(tab.id);
    if (!normTab) {
      // It's possible to get an update event before the creation event.  In
      // that case, just leave it to the create event.
      return null;
    }
    if (normTab.windowId !== tab.windowId) {
      let { tabs: oldWinTabs } = this._getOrCreateWindowInfo(normTab.windowId);
      let { tabs: newWinTabs } = this._getOrCreateWindowInfo(tab.windowId);
      oldWinTabs.delete(normTab.id);
      newWinTabs.set(normTab.id, normTab);
      this._reportDirtyWindow(normTab.windowId);
    }
    this._updateNormTabWithTab(normTab, tab);
    this._reportDirtyWindow(normTab.windowId);
    return normTab;
  }

  _deletedTab(tabId) {
    this.globalSerial += 1;
    let normTab = this._getNormTabOrExplode(tabId);
    this._reportDirtyWindow(normTab.windowId);
    this.normTabsById.delete(tabId);

    // Cleanup the window tracking of the tab if we haven't already deleted the
    // window.
    let windowTabs = this.normTabsByWindow.get(normTab.windowId);
    if (windowTabs) {
      windowTabs.delete(tabId);
    }
  }

  /**
   * Lookup helper for consistent error handling/logging.  Likely can go away
   * once we're sure about platform logging of exceptions and we don't screw up
   * too much.
   */
  _getNormTabOrExplode(tabId) {
    let tab = this.normTabsById.get(tabId);
    if (!tab) {
      throw new Error('Heard about unknown tab with id: ' + tabId);
    }
    return tab;
  }

  /**
   * We can get updates before creations, and in practice the difference does
   * not matter.
   */
  onCreated(tab) {
    console.log('onCreated', tab.id);
    const normTab = this._learnAboutBrowserTab(tab);
    this.contentDigger.digUpdatedTab(normTab);
  }

  onUpdated(tabId, changeInfo, tab) {
    console.log('onUpdate', tabId, changeInfo);
    const normTab = this._processTabUpdate(tab);
    if (normTab) {
      // (the create event didn't happen yet, it will handle the dig.)
      this.contentDigger.digUpdatedTab(normTab);
    }
  }

  onActivated({ tabId, windowId }) {
    console.log('onActivated', tabId, windowId);
    const winInfo = this.perWindowInfo.get(windowId);
    if (!winInfo) {
      return;
    }

    const serial = ++this.globalSerial;
    if (winInfo.activeTabId !== null) {
      const oldNormTab = winInfo.tabs.get(winInfo.activeTabId);

      oldNormTab.serial = serial;
      oldNormTab.active = false;
    }
    const newNormTab = winInfo.tabs.get(tabId);
    if (newNormTab) {
      winInfo.activeTabId = tabId;
      newNormTab.serial = serial;
      newNormTab.active = true;
    }
    this._reportDirtyWindow(windowId);
  }

  onRemoved(tabId/*, { windowId, isWindowClosing }*/) {
    console.log('onRemoved', tabId);
    this._deletedTab(tabId);
  }

  onWindowRemoved(windowId) {
    this.normTabsByWindow.delete(windowId);
    this._dirtyWindows.delete(windowId);
    if (this._notifyWindowRemoved) {
      this._notifyWindowRemoved(windowId);
    }
  }

  /**
   * Deferred (via setTimeout scheduled by _reportDirtyWindow) processing of
   * dirty windows for efficiency/sanity purposes.  Invokes the
   * onWindowTabChanges originally passed in to our object constructor.
   */
  _flushToTabulator() {
    for (let windowId of this._dirtyWindows) {
      let { tabs: windowNormTabs } = this._getOrCreateWindowInfo(windowId);
      this._notifyWindowTabChanges(windowId, windowNormTabs, this.globalSerial);
    }
    this._dirtyWindows.clear();
  }

  /**
   * Setter for fromContent payloads that handles initialization and dirtying
   * things so updates are appropriately propagated.  If you want to delete a
   * value you previously set, pass a value of `undefined`.
   */
  setDataFromContentDigger(oldNormTab, key, value) {
    // The tab may no longer exist by the time we are called, so bail if there
    // is no longer a tab.
    let normTab = this.normTabsById.get(oldNormTab.id);
    if (!normTab) {
      return;
    }

    if (!normTab.fromContent) {
      normTab.fromContent = new Map();
    }
    if (value === undefined) {
      normTab.fromContent.delete(key);
    } else {
      normTab.fromContent.set(key, value);
    }
    this._reportDirtyWindow(normTab.windowId);
  }
}

module.exports = TabTracker;
