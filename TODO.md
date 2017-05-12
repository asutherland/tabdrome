* Hierarchy from middle-click quasi-plan:
  * Have DAG forest of trees from parents to children.  Initially just the
    output of inferred middle-click without changes.  Subsequently modified by
    workflow rules to know when to clip the branch and make the new tab its own
    root or stash it under some other parent by some rule.  (But do keep around
    the original edge as something to optionally be restored if the rule was
    wrong.  Like "No, put this back under ${blah}").
  * Being clear: Grouping/clustering logic establishes DAG and is a refinement
    of current tab bidding mechanism.  With introduction of rules, rules get a
    pass over all tabs and establish a prioritized list of tuples of [rule,
    tab, arranger].  As these fire they remove tabs from the pool and build the
    group/node hierarchy.  We maintain a mapping from tabId to the group node
    it got stashed in.
  * Run arrangers as tree traversal, with arrangers informed of parent node's
    placement.
* Actions Plan
  * Service actions other than activating a tab in the back-end.
  * Along with the root group, a list of action definitions and their simple
    tag/kind constraints is sent over.  These contain enough information to
    populate the UI, informed by the tag/kind info on the group.  The front end
    has no deeper understanding of the tags, meaning the back-end can change
    how it handles all of that whenever it wants.
  * The back-end's transmission of root groups to the front-end will change so
    that it holds onto each transmitted state until a higher root serial has
    been acked.
  * When an action is made, the root group serial in use is transmitted along
    with the rel group id path to the node that was acted on.  The back-end then
    bases its actions on the front-end's perceived state rather than the current
    state the back-end would tell the front-end about.  The goal is to avoid
    unlucky choices of action times that result in something different happening
    than the user expected.  This could be further made friendly by actually
    delaying the ack by however long we think a reasonable user perceptual time
    is, so that if a user clicks just as the UI is re-rendering, we still do
    what the user intended.  We might actually make this most friendly by
    freezing updates while the context menu is active.  This way nothing weird
    happens like the tab under the context menu changing or stuff like that.
    Because things take two clicks, there is no race.  The user will always get
    to perceive what they are acting on.
* ContentScriptCoordinator
  * Stop trying to executeScript against tabs that aren't loaded yet.  We should
    just consult the cache and then not bother to try and probe the tab.  It's
    possible we should set a constraint against the loading status in that
    failure case.  Or not.
