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
      this._purgeViolatingData(
        normTab, shadowTab, shadowTab.constraintsByKey, stillValidKeys);
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
    // Build and set the constraints now to serve as suppression of redundant
    // invocations of this digger.  We'll clear them if the script invocation
    // rejects.  And there is a failsafe timeout rejection, so this is safe.
    const constraints = {
      // note that this is not actually a key in the normTab; still unsure
      // about whether to allow arbitrary traversal here or just use
      // specific values.
      url: normTab.parsedUrl.href
    };
    shadowTab.constraintsByKey.set(key, constraints);

    let result;
    try {
      // We either expect a truthy result if the script succeeded, or null if
      // something went wrong.  We treat this in-band null as retryable
      // (clear constraints) because wacky transient stuff could have been
      // going on with the DOM.
      result = await this.scriptCoordinator.ask(
        normTab, simpleQueryDiggerScriptInfo, spec);
    } catch (ex) {
      // The script didn't even respond, suggesting a page navigation happened.
      // Or something weird.  Either way, we think the situation merits a retry,
      // so we set result to null for identical handling of the in-band error
      // result above.  (Although that error may have happened a *LOT* faster
      // than us arriving here since right now rejection happens only for
      // timeouts.  And plan to expand rejections to also include things like
      // the process dying on us.)
      result = null;
    }

    // Our success or failure no longer matter if the constraints aren't the
    // ones we put in there.
    if (shadowTab.constraintsByKey.get(key) !== constraints) {
      return;
    }

    if (result) {
      // Per the previous check, our constraints are still the ones tracked in
      // the shadowTab.  So our constraints should still hold because, from our
      // perspective, normTab cannot be updated in a way that violates our
      // constraints without our dig method being invokes.  And our dig method
      // will enforce constraints.  But we may change things in the future in a
      // way that violates this invariant, or maybe I'm just wrong, so let's
      // add a warning here.  We won't clear the constrint or values though,
      // since the next dig will handle that.
      if (!this._constraintsMatchTab(constraints, normTab)) {
        console.warn('constraints do not hold but they really should',
                     constraints, normTab);
        return;
      }

      this.tabTracker.setDataFromContentDigger(normTab, key, result);
    } else {
      // As per the `result` comments, null means this is a retryable error, so
      // eliminate the constraints.
      shadowTab.constraintsByKey.delete(key);
    }
  }
}

module.exports = ContentDigger;
