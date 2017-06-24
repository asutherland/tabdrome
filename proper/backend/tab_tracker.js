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
  constructor({ onTabCreated, onTabChanged, onTabRemoved }) {
    this._notifyTabCreated = onTabCreated;
    this._notifyTabChanged = onTabChanged;
    this._notifyTabRemoved = onTabRemoved;

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

    // The monotonic clock that moves forward every time anything happens.  This
    // is the value stamped on tabs in the most recent set of changes.  In the
    // case of tab removals, however, there will be no tab hanging around with
    // the serial.
    this.globalSerial = 0;

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
    browser.tabs.onMoved.addListener(this.onMoved.bind(this));
    browser.tabs.onRemoved.addListener(this.onRemoved.bind(this));

    browser.windows.onRemoved.addListener(this.onWindowRemoved.bind(this));
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
      lastActivatedSerial: tab.active ? this.globalSerial : 0,
      pinned: tab.pinned,
      parsedUrl: this._parseAndExpandUrl(tab.url),
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      status: tab.status,
      incognito: tab.incognito,
      audible: tab.audible,
      cookieStoreId: tab.cookieStoreId,
      muted: tab.mutedInfo && tab.mutedInfo.muted,
      mutedReason: tab.mutedInfo && tab.mutedInfo.reason,
      mutedExtensionId: tab.mutedInfo && tab.mutedInfo.extensionId,
      sessionId: tab.sessionId,
      width: tab.width,
      height: tab.height
    };

    this.normTabsById.set(normTab.id, normTab);

    const winInfo = this._getOrCreateWindowInfo(normTab.windowId);
    winInfo.tabs.set(normTab.id, normTab);
    // We don't get a synthetic activate event, so we need to populate this when
    // we see the tab if one isn't already known.
    if (normTab.active && winInfo.activeTabId === null) {
      winInfo.activeTabId = normTab.id;
    }

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
    normTab.audible = tab.audible;
    normTab.cookieStoreId = tab.cookieStoreId;
    // (muted is flattened)
    normTab.muted = tab.mutedInfo && tab.mutedInfo.muted;
    normTab.mutedReason = tab.mutedInfo && tab.mutedInfo.reason;
    normTab.mutedExtensionId = tab.mutedInfo && tab.mutedInfo.extensionId;
    normTab.sessionId = tab.sessionId;
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
    }
    this._updateNormTabWithTab(normTab, tab);
    return normTab;
  }

  _deletedTab(tabId) {
    this.globalSerial += 1;
    let normTab = this._getNormTabOrExplode(tabId);
    this.normTabsById.delete(tabId);

    // Cleanup the window tracking of the tab if we haven't already deleted the
    // window.
    let winInfo = this.perWindowInfo.get(normTab.windowId);
    if (winInfo) {
      winInfo.tabs.delete(tabId);
    }

    return normTab;
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
    this._notifyTabCreated(normTab);
  }

  onUpdated(tabId, changeInfo, tab) {
    console.log('onUpdate', tabId, changeInfo);
    const normTab = this._processTabUpdate(tab);
    if (normTab) {
      // (the create event didn't happen yet; the create will handle things.
      this._notifyTabChanged(normTab);
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
      if (oldNormTab) {
        oldNormTab.serial = serial;
        oldNormTab.active = false;
      } else {
        console.warn('activeTabId', winInfo.activeTabId, 'did not exist?');
      }
      this._notifyTabChanged(oldNormTab);
    }
    const newNormTab = winInfo.tabs.get(tabId);
    if (newNormTab) {
      winInfo.activeTabId = tabId;
      newNormTab.serial = serial;
      newNormTab.active = true;
      newNormTab.lastActivatedSerial = serial;
    }
    this._notifyTabChanged(newNormTab);
  }

  /**
   * Yuck.  The tab got moved which means all index values possibly changed.  We
   * could re-query, but we can do this efficiently with the info available and
   * avoid creating additional edge-cases.
   *
   * Assuming minIndex and maxIndex, case-wise, we have:
   * - Tabs "below" (<) minIndex.  They are not affected because all shifts
   *   occur "above" them.
   * - Tabs "above" (>) maxIndex.  They are not affected because the shifts
   *   don't ripple through to them.
   * - Tabs between the two (>= minIndex, <= maxIndex).  They are affected.  If
   *   (fromIndex < toIndex) then we're shifting "upwards" and tabs in the range
   *   will be shifted "downwards" (-= 1).  If (fromIndex > toIndex) then we're
   *   shifting "downwards" and the affected tabs will be shifted "upwards"
   *   (+1).
   *
   * This seems like a reasonable enough way to think about things, let's
   * implement that.
   *
   * XXX There's either a logic bug in here or (more likely, I'm thinking),
   * we need to also trigger logic similar to this to handle when a tab is
   * inserted/deleted in the middle of the list of tabs.  Which does seem rather
   * likely.  However, the problem is mitigated by just causing the tab to be
   * updated and us getting our index value updated, so, meh for now.
   */
  onMoved(tabId, { fromIndex, toIndex }) {
    const movedTab = this.normTabsById.get(tabId);
    if (!movedTab) {
      // Tab not known yet.
      return;
    }
    const winInfo = this.perWindowInfo.get(movedTab.windowId);
    const serial = ++this.globalSerial;

    const delta = (fromIndex < toIndex) ? -1 : +1;
    const minIndex = Math.min(fromIndex, toIndex);
    const maxIndex = Math.max(fromIndex, toIndex);

    for (let normTab of winInfo.tabs.values()) {
      if (normTab.index < minIndex) {
        continue;
      }
      if (normTab.index > maxIndex) {
        continue;
      }

      normTab.serial = serial;
      if (normTab === movedTab) {
        normTab.index = toIndex;
      } else {
        normTab.index += delta;
      }
      this._notifyTabChanged(normTab);
    }
  }

  onRemoved(tabId/*, { windowId, isWindowClosing }*/) {
    console.log('onRemoved', tabId);
    const normTab = this._deletedTab(tabId);
    if (normTab) {
      this._notifyTabRemoved(normTab);
    }
  }

  onWindowRemoved(windowId) {
    const winInfo = this.perWindowInfo.get(windowId);
    if (winInfo) {
      for (const normTab of winInfo.tabs.values()) {
        this._notifyTabRemoved(normTab);
      }
      this.perWindowInfo.delete(windowId);
    }
  }
}

module.exports = TabTracker;
