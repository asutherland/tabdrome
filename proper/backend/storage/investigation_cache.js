/**
 * The investigation cache is a key-value store for stateless, asynchronous
 * content diggers/context searchers where the results of digging and context
 * searching are expected to change rarely or be very "small" adjustments that
 * will not be jarring or misleading to the user.
 *
 * For example, the results of the MDN breadcrumb digger should almost never
 * change.  The only time we expect them to change, in fact, is when a page gets
 * moved, in which case a URL change would occur.  However, a digger that
 * extracted the current temperature from a weather page would probably not be
 * a good candidate for this cache because it's not helpful to tell the user
 * that it's "60F" when the actual result that could come back is "90F".
 *
 * The most important benefits of this cache are:
 * - Improving the experience of dealing with lazy-loaded tabs.  In cases like
 *   MDN where the content digger derives its breadcrumbs from the contents of
 *   the tab, having the cached value simply from the URL is invaluable.  This
 *   could be mitigated by explicitly persisting the dug content/searched
 *   context on the tabs, but that increases the potential for weird persistent
 *   bugs.  Plus it does not help the following situation...
 * - Improving the initial placement of freshly opened tabs.  If a tab has been
 *   previously visited
 */
class InvestigationCache {
  constructor({ storageManager }) {
    this.clientName = 'InvestigationCache';

    this.storageManager = storageManager;

    /**
     * Nested map with effective aggregate key of [origin, diggerSpec.diggerId,
     * cacheKey] and where the value is the digger result.
     */
    this.resultsByOrigin = null;

    this._load();
  }

  async _load() {
    const loaded = await this.storageManager.registerClient(this);

    console.log('IC maybe loaded?', loaded);
    if (loaded && loaded.version === 1 && loaded.data instanceof Map) {
      this.resultsByOrigin = loaded.data;
      console.log('IC loaded:', this.resultsByOrigin);
      return;
    }

    this.resultsByOrigin = new Map();
  }

  syncLookup(origin, diggerSpec, cacheKey) {
    const originResults = this.resultsByOrigin.get(origin);
    if (!originResults) {
      return null;
    }

    const diggerResults = originResults.get(diggerSpec.diggerId);
    if (!diggerResults) {
      return null;
    }

    const result = diggerResults.get(cacheKey);
    if (!result) {
      return null;
    }

    // Eventually we'll have some type of eviction smarts here where we take an
    // action to track that we got a hit.  The specific mechanics will depend on
    // the storage mechanism in use.  For now we just don't care.
    return result;
  }

  storeResult(origin, diggerSpec, cacheKey, value) {
    let originResults = this.resultsByOrigin.get(origin);
    if (!originResults) {
      originResults = new Map();
      this.resultsByOrigin.set(origin, originResults);
    }

    let diggerResults = originResults.get(diggerSpec.diggerId);
    if (!diggerResults) {
      diggerResults = new Map();
      originResults.set(diggerSpec.diggerId, diggerResults);
    }

    diggerResults.set(cacheKey, value);
    this.storageManager.reportDirtyClient(this);
  }

  persistContents() {
    return { version: 1, data: this.resultsByOrigin };
  }
}

module.exports = InvestigationCache;
