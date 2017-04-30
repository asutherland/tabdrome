const hardcodedSiteInfo = require('./diggers/hardcoded_site_info');
const rdfBreadcrumbDiggerSpec = require('./diggers/rdfa').breadcrumbs;

const simpleQueryDiggerScriptInfo = {
  // Built by webpack, check /webpack-*.config.js
  file: '/content-digger.js',
  type: 'dig'
};

/**
 * Helper to convert a map to an Object. `new Map(Object.entries(obj))`
 * accomplishes this but Object.entries() is not everywhere yet and we still
 * need a helper for naming reasons.
 * XXX just pull this out of a helper lib
 */
function mapFromObject(obj) {
  const map = new Map();
  for (let key of Object.keys(obj)) {
    map.set(key, obj[key]);
  }
  return map;
}

/**
 * mapFromObject but 2-levels deep.
 */
function mapOfMapsFromNestedObjects(obj) {
  const map = new Map();
  for (let key of Object.keys(obj)) {
    map.set(key, mapFromObject(obj[key]));
  }
  return map;
}

/**
 * Asynchronously extract information from tabs about their state and provides
 * it to the TabTracker.  See content_digger.md for detailed information on
 * intent and rationale.
 *
 * All dig-related state is maintained in this class or its helpers.  The
 * TabTracker only is involved insofar as it stores the results of digging in
 * its `fromContent` field.
 */
class ContentDigger {
  constructor({ tabTracker, contentScriptCoordinator }) {
    this.tabTracker = tabTracker;
    this.scriptCoordinator = contentScriptCoordinator;

    /**
     * Keys are origins, values are Maps whose keys are dug content keys like
     * 'breadcrumbs' and whose values are the digger to use.
     *
     * Currently just the contents of "hardcoded_site_info.js", but at some
     * point soon we'll support persisted diggers too so that an interactive
     * REPL kind of thing is possible.  We may end up using a layered series of
     * maps rather than flattening them all into this map.
     *
     * The choice of Maps all the way down is somewhat arbitrary.  I made
     * normTab.fromContent a Map because I'm expecting various async factors
     * (moreso for context searchers than content diggers) and diversity of
     * diggers/searches to mean that there would be no stable shapes.  Also,
     * iterating can be a bit awkward, and mixing Object and Map iteration is
     * annoying.
     */
    this.diggersByOrigin = mapOfMapsFromNestedObjects(hardcodedSiteInfo);

    /**
     * A mapping from normTabs to our dig information.  This is a (code-wise,
     * not performance-wise) cheap way to discard shadow tabs when their normTab
     * disappears.  It depends on the fact that the normTabs are created and
     * mutated in this global.
     *
     * We do this for separation of concerns, but there are other options:
     * - Have the TabTracker nest parallel objects to the gets-serialized
     *   normTab so that we and/or other explicitly interacting logic can have
     *   our own objects and TabTracker handles the book-keeping.
     * - Use a normal map and just listen to events from TabTracker.  Duplicate
     *   code can be eliminated via subclassing.
     *
     * Currently we store:
     * - constraintsByKey: A Map from digger key values to the constraint
     *   objects that express what must hold true for the "fromContent" values
     *   to still be valid.  Right now this is just the full URL, but the intent
     *   is to be able to express more complicated constraints.
     */
    this.shadowTabs = new WeakMap();
  }

  /**
   * Invoked whenever a normTab changes.
   *
   * Digging can be synchronous or asynchronous.  In all cases we purge
   * "fromContent" data whose constraints no longer applies before triggering
   * digging.
   */
  digUpdatedTab(normTab) {
    const origin = normTab.parsedUrl.origin;
    const diggers = this.diggersByOrigin.get(origin);
    let shadowTab = this.shadowTabs.get(normTab);

    // If there's no current state and we're not going to create any state, we
    // can fast-path out.
    if (!diggers && !shadowTab) {
      return;
    }

    // The set of dug content whose keys are believed to still be valid.
    const stillValidKeys = new Set();

    if (!shadowTab) {
      shadowTab = { constraintsByKey: new Map() };
      this.shadowTabs.set(normTab, shadowTab);
    } else {
      this._purgeViolatingData(normTab, shadowTab, shadowTab.stillValidKeys);
    }

    this._digMissingData(normTab, shadowTab, diggers, stillValidKeys);
  }

  _digMissingData(normTab, shadowTab, diggers, stillValidKeys) {
    for (let [diggerKey, diggerSpec] of diggers) {
      // If we already have valid data for the key, no need to dig.
      if (stillValidKeys.has(diggerKey)) {
        continue;
      }

      // Handle common aliases.  In the future, these should probably just be
      // pre-resolved when building the diggers maps.
      if (diggerSpec === 'rdfa-breadcrumbs') {
        diggerSpec = rdfBreadcrumbDiggerSpec;
      }
      this._runSimpleQuery(normTab, shadowTab, diggerKey, diggerSpec);
    }
  }

  /**
   * Check current constraints against the new state of the tab, nuking the
   * data.  For constraints that still hold, we also add the key to
   * stillValidKeys so that redundant digging can be avoided.
   */
  _purgeViolatingData(normTab, shadowTab, constraintsByKey, stillValidKeys) {
    for (let [key, constraints] of constraintsByKey) {
      if (!this._constraintsMatchTab(constraints, normTab)) {
        constraintsByKey.delete(key);
        this.tabTracker.setDataFromContentDigger(normTab, key, undefined);
      } else {
        stillValidKeys.add(key);
      }
    }
  }

  /**
   * Check if the given set of constraints apply to the given tab.
   */
  _constraintsMatchTab(constraints, tab) {
    if (!constraints) {
      return true;
    }

    if (constraints.url) {
      if (constraints.url !== tab.parsedUrl.href) {
        return false;
      }
    }

    return true;
  }

  /**
   * Run a DOM query provided by "simple_query_digger.js" with an assumed URL
   * constraint.
   */
  async _runSimpleQuery(normTab, shadowTab, key, spec) {
    // normTab is a mutable data structure, so we if we want a constraint on the
    // URL, we need to snapshot it before we yield control flow.
    let latchedUrl = normTab.parsedUrl.href;
    let result = await this.scriptCoordinator.ask(
      normTab, simpleQueryDiggerScriptInfo, spec);

    if (result) {
      let constraints = {
        // note that this is not actually a key in the normTab; still unsure
        // about whether to allow arbitrary traversal here or just use
        // specific values.
        url: latchedUrl
      };

      // The constraints may already fail to apply, in which case, bail without
      // updating the state on the tab.
      if (!this._constraintsMatchTab(constraints, normTab)) {
        return;
      }

      shadowTab.constraintsByKey.set(key, constraints);
      this.tabTracker.setDataFromContentDigger(normTab, key, result);
    }
  }
}

module.exports = ContentDigger;
