// use jakearchibald's IndexedDB-wrapped-in-promises library.
const idb = require('idb');

/**
 * Very simple periodically flushed storage helper that handles the actual
 * persistence for every other class in this directory.  We use IndexedDB for
 * storage because the browser.storage API basically only serializes using JSON.
 * (Although one might be execused for mis-reading and thinking it supports full
 * structured clone support and initially trying to use it...)
 *
 * In the future, everything in this directory will get a bit more sophisticated
 * or complex because our strategy of "write everything whenever anything
 * changes" is not particularly efficient and likely to result in janking our
 * main thread as the objects being structured cloned grow larger in size.  Note
 * that we're not going completely naive, having stores/caches tell us when
 * they're dirty.
 */
class StorageManager {
  constructor() {
    this.clientInfoByName = new Map();
    this.dirtyClients = new Set();

    this.flushDelayMillis = 5 * 1000;
    this._flushTimerId = null;

    this._loaded = false;
    this.loadedPromise = this._load();
  }

  /**
   * Registers a client and returns a Promise that will be resolved with the
   * contents last persisted for the client.
   */
  registerClient(client) {
    if (this._loaded) {
      throw new Error(`too late to register client ${client.clientName}`);
    }

    return new Promise((resolve) => {
      const clientInfo = {
        client,
        resolveInitialLoad: resolve
      };
      this.clientInfoByName.set(client.clientName, clientInfo);
    });
  }

  async _load() {
    const db = this.db = await idb.open('tabdrome-main', 1, (upgradeDB) => {
      upgradeDB.createObjectStore('soup');
    });

    const allValues = await db.transaction('soup').objectStore('soup').getAll();

    for (const { clientName, value } of allValues) {
      const clientInfo = this.clientInfoByName.get(clientName);

      clientInfo.resolveInitialLoad(value);
      clientInfo.resolveInitialLoad = null;
    }

    // For those clients that didn't have something stored, resolve their value
    // with null.
    for (const clientInfo of this.clientInfoByName.values()) {
      if (clientInfo.resolveInitialLoad) {
        clientInfo.resolveInitialLoad(null);
        clientInfo.resolveInitialLoad = null;
      }
    }

    this._loaded = true;
  }

  /**
   * Used by clients to self-report as dirty so that we will write them to disk
   * when we flush.  We guarantee that we'll call persistContents() at some
   * point in the future once reportDirtyClient() has been invoked.  It's okay
   * for clients to use this to optimize so that redundant reportDirtyClient
   * calls aren't made, but it's also fine to issue them.
   */
  reportDirtyClient(client) {
    if (this.dirtyClients.has(client)) {
      return;
    }

    if (this.dirtyClients.size === 0) {
      this._flushTimerId = window.setTimeout(
        () => { this._flushTimerFired(); },
        this.flushDelayMillis);
    }

    this.dirtyClients.add(client);
  }

  _flushTimerFired() {
    const store = this.db.transaction('soup', 'readwrite').objectStore('soup');
    for (let client of this.dirtyClients) {
      store.put({
        // We redundantly encode the clientName in the payload because it lets
        // us use getAll() without bothering with cursors.  So lazy.
        clientName: client.clientName,
        value: client.persistContents()
      }, client.clientName);
    }

    this.dirtyClients.clear();
    this._flushTimerId = null;
  }
}

module.exports = StorageManager;
