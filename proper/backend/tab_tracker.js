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
  constructor({ onWindowTabChanges }) {
    this._notifyWindowTabChanges = onWindowTabChanges;

    /**
     * Normalized tabs keyed by their browser-allocated id.
     */
    this.normTabsById = new Map();

    /**
     * Maps windowId to the id-keyed Map of normalized tabs that live in that
     * window. Note that the ordering of the contents of the set is an emergent
     * thing that we don't care about.
     */
    this.normTabsByWindow = new Map();

    // Simple batching mechanism using setTimeout to avoid pathological
    // performance in bulk manipulations like session restores, closing
    // subtrees, closing windows, etc.
    this._dirtyWindowTimer = 0;
    this._dirtyWindows = new Set();

    chrome.tabs.query({}, (tabs) => {
      for (let tab of tabs) {
        this.onCreated(tab);
      }
      this._listenForEvents();
    });

    this.globalSerial = 0;

    chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
  }

  _listenForEvents() {
    // Note that we don't need onActivated since onUpdated will be invoked.
    chrome.tabs.onCreated.addListener(this.onCreated.bind(this));
    chrome.tabs.onUpdated.addListener(this.onUpdated.bind(this));
    chrome.tabs.onRemoved.addListener(this.onRemoved.bind(this));
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

  _getOrCreateWindowTabs(windowId) {
    let tabs = this.normTabsByWindow.get(windowId);
    if (!tabs) {
      tabs = new Map();
      this.normTabsByWindow.set(windowId, tabs);
    }
    return tabs;
  }

  _learnAboutBrowserTab(tab) {
    let normTab = {
      id: tab.id,
      suid: '!' + tab.id,
      serial: this.globalSerial++,
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
      fromContent: {}
    };

    this.normTabsById.set(normTab.id, normTab);
    this._getOrCreateWindowTabs(normTab.windowId).set(normTab.id, normTab);
    this._reportDirtyWindow(normTab.windowId);
  }

  _updateNormTabWithTab(normTab, tab) {
    // We could diff to determine whether bumping the serial is necessary, but
    // it seems reasonable to trust the upstream event generating logic to be
    // sufficiently competent that it's not just spamming us nonstop with BS
    // events.
    normTab.serial = this.globalSerial++;
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
      return;
    }
    if (normTab.windowId !== tab.windowId) {
      let oldWindowTabs = this._getOrCreateWindowTabs(normTab.windowId);
      let newWindowTabs = this._getOrCreateWindowTabs(tab.windowId);
      oldWindowTabs.delete(normTab.id);
      newWindowTabs.set(normTab.id, normTab);
      this._reportDirtyWindow(normTab.windowId);
    }
    this._updateNormTabWithTab(normTab, tab);
    this._reportDirtyWindow(normTab.windowId);
  }

  _deletedTab(tabId) {
    this.globalSerial++;
    let normTab = this._getNormTabOrExplode(tabId);
    this._reportDirtyWindow(normTab.windowId);
    // XXX we need to explicitly understand windows going away.
    let windowTabs = this._getOrCreateWindowTabs(normTab.windowId);
    windowTabs.delete(tabId);
    this.normTabsById.delete(tabId);
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
   * Process messages from content scripts.
   */
  onMessage(message, sender) {
    if (!sender.tab) {
      return;
    }

    let normTab = this._getNormTabOrExplode(sender.tab.id);
    for (let key of Object.keys(message)) {
      normTab.fromContent[key] = message[key];
    }
    this._reportDirtyWindow(normTab.windowId);
  }

  /**
   * We can get updates before creations, and in practice the difference does
   * not matter.
   */
  onCreated(tab) {
    console.log('onCreated', tab.id);
    this._learnAboutBrowserTab(tab);
  }

  onUpdated(tabId, changeInfo, tab) {
    console.log('onUpdate', tabId);
    this._processTabUpdate(tab);
  }

  onRemoved(tabId/*, { windowId, isWindowClosing }*/) {
    console.log('onRemoved', tabId);
    // XXX as noted elsewhere, we need to handle window closing better/at all.
    this._deletedTab(tabId);
  }

  /**
   * Deferred (via setTimeout scheduled by _reportDirtyWindow) processing of
   * dirty windows for efficiency/sanity purposes.  Invokes the
   * onWindowTabChanges originally passed in to our object constructor.
   */
  _flushToTabulator() {
    for (let windowId of this._dirtyWindows) {
      let windowNormTabs = this._getOrCreateWindowTabs(windowId);
      this._notifyWindowTabChanges(windowId, windowNormTabs);
    }
    this._dirtyWindows.clear();
  }
}

module.exports = TabTracker;
