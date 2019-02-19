/**
 * Who rules the rules?  The rules ruler rules the rules.  (Have I mentioned
 * this is a hobby project?  RulesDriver is probably a better, non-silly name.)
 *
 * This class provides ontology-aware rule running methods for all our different
 * rule execution contexts.  From this class's perspective, rule running is
 * always stateless.  All calls take an input, run the relevant ruleset,
 * then produce a set of output results that can be aggregated with other
 * results for the next stage in the pipeline or processed for side effects.
 *
 * Rules are pushed into this class by the WorkflowManager at startup and as
 * workflows are reconfigured.  The WorkflowManager also configures the content
 * diggers and context searchers that contribute to the "annotated" tab
 * representation.
 */
export default class RulesRuler {
  constructor() {

  }

  /**
   * Run tab analysis rules against a given tab, producing a prioritized list of
   * analysis tags.
   */
  runTabAnalysis(annoTab) {

  }

  /**
   * Given an analyzed tab, determine what, if any, auto-action rules are
   * appropriate.  This includes the rule both matching the tab and not being
   * suppressed by its previous application.
   *
   * For example, rules related to muting tabs don't want to fight the user,
   * but they also don't want a single user-action to disable auto-actions for
   * the tab (unless that's the desired effect).
   */
  runTabAutoActionMatching(annoTab) {

  }

  /**
   * Run tab bucketing rules against an analzyed tab, producing the prioritized
   * list of bucket placements.
   */
  runTabBucketing(annoTab) {

  }

  /**
   * Run bucket decorating rules against a bucket and its contents, producing
   * a list of context searchers w/arguments to trigger, and a list of synthetic
   * tabs/things to be arranged.
   */
  runBucketDecoratoring(annoBucket) {

  }

  /**
   * Run bucket arranging rules against the contents of a bucket, which includes
   * both tabs and synthetic tabs created by bucket decorating rules.  For each
   * item, a path is created, with each segment of the path self-describing the
   * sort order for itself and same-type siblings.  (Non same-type siblings are
   * still subject to an ordering.  Nothing should be arbitrary/random.)
   */
  runBucketContentsArranging(annoBucket) {

  }

  /**
   * Given an arranged hierarchy, for each node determine what, if any, action
   * rules are appropriate.  These will be reported to the front-end and latched
   * for subsequent invocation when triggered by the user.
   */
  runUserActionCandidateMatching(annoBucket) {

  }
}
