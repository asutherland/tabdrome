/**
 * Drives the multi-stage pipline from learning about the existence of a tab
 * through analysis, bucketing, and arranging.
 *
 * ## Pipeline ##
 *
 * We break the pipeline into grouped stages:
 *
 * - Stage 0: Per-tab: TabTracker tells us about a new/changed tab.
 * - Stage 1: Per-tab: We asynchronously gather a bunch of information.  We try
 *   and wait for everything in this stage to run before advancing to the next
 *   stage, although we do use a timeout-based race.  TODO: actually do that
 *   clever buffering stuff.
 *   - Tab metadata lookup (sync).  This is only relevant at startup/session
 *     restore time.
 *   - Site metadata lookup (sync and async).
 *   - Content digging (sync and async).
 *   - Tab context searching (async).  We perform the automatic tab definitions.
 *     There are also action-triggered context searching definitions.
 * - Stage 2: Per-tab pre-bucketing synchronous cluster
 *   - Tab analysis rules applied.
 *   - Tab auto-action rules run (w/the results of the analysis rules).  If
 *     these trigger context searching, their results will re-run this stage.
 * - Stage 3: per-tab: bucketing.
 *   - bucketing rules are run, buckets are produced, potentially recursively.
 * - Stage 4: per-bucket.  This stage ideally wants all the prior stages
 *   flushed.
 *   - bucket decorating rules run which may trigger context searchers.  As they
 *     return, this stage will be re-run.  (Searchers may want to iteratively
 *     expand or something like that.)
 *   - bucket contents arranging (synchronous)
 *   - user-action candidate matching.
 *
 * ## Annotated tab storage ##
 *
 * The TabTracker maintains its own map from browser.tabs API-issued id to
 * normTab representation.  We receive notifications when tabs are created,
 * modified, and removed.  We maintain our own map here, keyed by the normTab
 * `suid`` AKA "sufficiently unique id".
 *
 * We maintain both our "public" annoTab representation plus per-tab,
 * per-implementation-class private representations as well.
 *
 * ## Interaction with other classes ##
 *
 *
 */
export default class TabCascader {
  constructor({ initHelpers,
                rulesRuler,
                siteMetadataStore, tabMetadataStore }) {
    this.rulesRuler = rulesRuler;

    // contentDigger is via initHelpers
    // contextSearcher is via initHelpers
    this.siteMetadataStore = siteMetadataStore;
    this.tabMetadataStore = tabMetadataStore;

    /**
     * Map from tab SUIDs to glomTab reps, see _getOrCreateGlomTab for more.
     */
    this._glommedTabsBySuid = new Map();

    /**
     * Do we believe any created tabs we hear about right now could be the
     * result of a session restore happening?  (Either automatically at startup,
     * from that interactive sesion restore tab UI, or other.)
     *
     * TODO: Make the tab meta store and related logic work.
     */
    this._sessionRestorePossible = false;

    this._stage2PendingTabs = new Set();
    this._stage3PendingTabs = new Set();
    this._stage4PendingBuckets = new Set();
    this._flushTimerId = 0;

    // Because of our communication flow, there are inherently some circular
    // dependencies between us and our helpers.  In the interest of letting the
    // factory that sets everything up do all the wiring and avoiding us
    // assigning ourselves into helpers via non-obvious API, we have this helper
    // method.
    const helpers = initHelpers(this);
    this.contentScriptCoordinator = helpers.contentScriptCoordinator;
    this.contentDigger = helpers.contentDigger;
    this.contextSearcher = helpers.contextSearcher;
  }


  /**
   * Used by _queue* functions to schedule a `_flush` for the near future.  We
   * use a short setTimeout in order to:
   * - give batch mutations that resulted in multiple events dispatched to the
   *   event queue a chance to be processed.  (Note that in the world of Quantum
   *   DOM things are changing, but we would generally expect our logic to run
   *   with the same or lower priority as those events.)
   * - give stage 1 lookups a chance to provide their data, avoiding us running
   *   stage 2 against a tab only to re-run it nearly immediately once the
   *   lookups come back.  Note that we have a TODO up above about explicitly
   *   providing for some level of per-tab race duration.  That could take the
   *   form of having _flush consult a _pendingRace Map() that counts how many
   *   outstanding, expected-timely lookups are in flight.
   */
  _ensureScheduledFlush() {
    if (this._flushTimerId) {
      return;
    }

    this._flushTimerId = window.setTimeout(
      () => {
        this._flushTimerId = 0;
        this._flush();
      }, 10);
  }

  /**
   * Walk through all stages with pending
   */
  _flush() {
    for (const glomTab of this._stage2PendingTabs) {
      this._triggerStage2Analysis(glomTab);
    }
    this._stage2PendingTabs.clear();

    for (const glomTab of this._stage3PendingTabs) {
      this._triggerStage3Bucketing(glomTab);
    }
    this._stage3PendingTabs.clear();

    for (const bucket of this._stage4PendingBuckets) {
      this._triggerStage4BucketBuild(bucket);
    }
    this._stage4PendingBuckets.clear();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Annotated tab book-keeping

  _makeTabDataBundle() {
    return {
      tags: [],
      antiTags: [],
      simpleVars: new Map(),
      schemaPayloads: new Map()
    };
  }

  _normalizeTabDataBundle(data) {
    return {
      tags: data.tags || [],
      antiTags: data.antiTags || [],
      simpleVars: data.simpleVars || new Map(),
      schemaPayloads: data.schemaPayloads || new Map()
    };
  }

  _getOrCreateGlomTab(normTab) {
    let glomTab = this._glommedTabsBySuid.get(normTab.suid);
    if (glomTab) {
      return glomTab;
    }

    glomTab = {
      suid: normTab.suid,
      // documented in annotated_tabs.md
      annoTab: {
        normTab,
        tabMeta: this._makeTabDataBundle(),
        siteMeta: this._makeTabDataBundle(),
        dug: this._makeTabDataBundle(),
        searched: this._makeTabDataBundle(),
        analyzed: this._makeTabDataBundle(),
        aggr: this._makeTabDataBundle()
      },
      // The implementation private data
      shadow: {
        tabMetaLookedUp: false,
        digger: null
      },
      // Each tab may belong to one or more top-level buckets.  This can be due
      // to avant garde workflows displaying the same tab multiple times in a
      // single window, or due to cross-window tab display.
      topLevelBuckets: new Set()
    };
  }

  _getGlomTabOrExplode(tabSuid) {
    const glomTab = this._glommedTabsBySuid.get(tabSuid);
    if (glomTab) {
      return glomTab;
    }

    throw new Error(`no tab with suid ${tabSuid}`);
  }

  _getGlomTabNoExploding(tabSuid) {
    return this._glommedTabsBySuid.get(tabSuid);
  }

  _removeGlomTabBySuid(tabSuid) {
    const glomTab = this._glommedTabsBySuid.get(tabSuid);
    if (glomTab) {
      this._glommedTabsBySuid.delete(tabSuid);
      this._stage2PendingTabs.delete(glomTab);
      this._stage3PendingTabs.delete(glomTab);
      for (let bucket of glomTab.topLevelBuckets) {
        bucket.glomTabs.delete(glomTab);
        this._queueStage4BucketBuild(bucket);
      }
    }
    return glomTab;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Notifications from the TabTracker

  onCreatedNormTab(normTab) {
    const glomTab = this._getOrCreateGlomTab(normTab);
    this._triggerStage1Lookups(glomTab);
  }

  onChangedNormTab(normTab) {
    const glomTab = this._getGlomTabOrExplode(normTab.suid);
    this._triggerStage1Lookups(glomTab);
  }

  onRemovedNormTab(normTab) {
    // this handles the re-bucketing side-effects
    this._removeGlomTabBySuid(normTab.suid);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Data from (async) content digging

  _triggerContentDigging(glomTab) {
    glomTab.shadow.digger =
      this.contentDigger.digUpdatedTab(glomTab.annoTab, glomTab.shadow.digger);
  }

  setDataFromContentDigger(tabSuid, key, value) {
    const glomTab = this._getGlomTabNoExploding(tabSuid);
    if (!glomTab) {
      return;
    }

    // For now we're pretending/requiring/assuming that all digging results in
    // schema'ed results.
    if (value === undefined) {
      glomTab.annoTab.dug.schemaPayloads.delete(key);
    } else {
      glomTab.annoTab.dug.schemaPayloads.set(key, value);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Data from (async) content searching

  //////////////////////////////////////////////////////////////////////////////
  // TODO: Data from tab metadata store

  //////////////////////////////////////////////////////////////////////////////
  // Data from (async) session store lookup
  //
  // NB: The underlying implementation is currently sync, but it pretends that
  // it's async because


  //////////////////////////////////////////////////////////////////////////////
  // Stage 1

  _triggerStage1Lookups(glomTab) {
    if (this._sessionRestorePossible && !glomTab.shadow.tabMetaLookedUp) {
      // TODO: tab meta/session restore support
    }

    // TODO: site metadata lookup

    this._triggerContentDigging(glomTab);

    // TODO: context searching

    this._queueStage2Analysis(glomTab);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Stage 2

  _queueStage2Analysis(glomTab) {
    this._stage2PendingTabs.add(glomTab);
    this._ensureScheduledFlush(2);
  }

  _triggerStage2Analysis(glomTab) {
    const effects = this.rulesRuler.runTabAnalysis(glomTab.annoTab);
    const resultData = flattenEffectsToData(effects);
    if (resultData) {
      glomTab.annoTab.analyzed = this._normalizeTabDataBundle(resultData);
    }

    // TODO: auto-action rules

    this._queueStage3Bucketing(glomTab);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Stage 3

  _queueStage3Bucketing(glomTab) {
    this._stage3PendingTabs.add(glomTab);
    this._ensureScheduledFlush(3);
  }

  _triggerStage3Bucketing() {

  }

  //////////////////////////////////////////////////////////////////////////////
  // Stage 4

  _queueStage4BucketBuild(bucket) {
    this._stage4PendingBuckets.add(bucket);
    this._ensureScheduledFlush(4);
  }

  _triggerStage4BucketBuild(bucket) {

  }
}
