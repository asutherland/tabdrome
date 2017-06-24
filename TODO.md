### Hierarchy from middle-click quasi-plan ###
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

Rule pipeline noodling:
* Tab analysis.  Analysis rules get a chance to consider the tab and apply
  analysis tags.  Inputs to analysis are:
  * everything on the normTab
  * everything content diggers and context searchers find.
  * "url badge tags", tags applied by action rules to a URL or URL prefix.
    The WebExtensions bookmarks API doesn't expose bookmark tags, so this has to
    do double duty for things we really wouldn't want to clutter up the user's
    bookmarks plus those things they user would ideally be able to persist.
  * "tab badge tags", tab-instance-persistent tags applied by action rules.
    That is, they are all about the tab, not about the URL.  When the tab is
    closed, they disappear.  We would want these to win over url badge tags.
  * MAYBE the results of other analysis rules.  These could maybe go into a
    second tier like "meta-analysis rules".

* Tab bucketing.  These match against tabs (and potentially their children) and
  return a bucket type, bucket name, and bid.  Each tab goes in the bucket that
  won the bid.  The bucket type can also be a magic "nested bucket" which
  creates a bucket of buckets, where the next winning bid is applied for each of
  the tabs in the bucket.

* Bucket decorators.  These rules get a chance to trigger context searchers (or
  similar) which can create synthetic tabs or other synthetic things that will
  want to be arranged and presented in the UI.  Examples:
  * Adding a static, naive widget like a search button or field for a
    site-specific more easily use site logic.
  * Injecting potential tabs based on history showing pages on the same domain
    the user has visited a lot before.  Or when using a search site, picking
    previously visited results for a similar query that had a high read time
    after being opened.
  * Showing sibling bugzilla bugs under a tightly focused meta-bug.

* Bucket contents arranging.  These are rules that match against the tabs in the
  bucket and propose a get-or-create group traversal path at which to place the
  tab.
  * Q: Should the bucket path instead be implemented as the buckets just
    recursively applying?  Bucket decorators could be self-supressing in child
    buckets once they've fired in a parent, with the idea being that they might
    wait to fire until either the set of tabs crosses some threshold or the
    list of breadcrumbs to traverse is short enough
  * A: No... at least not as the primary mode of operation.  The reason is that
    this would result in really weird rules.  It's far preferable I think to
    have a single rule that generates the path segments.


Example rules:
* Tab analysis:
  * If `tab URL` has badge `newsy-site-root`
  * If `session root tab` has `newsy` tag,
  * If `ancestor tab` has `doc-site` tag,

Stock pipline around core:session-root.
* Tab bucketing:
  * If tab `has tag` [`core:session-root`]. Do `put in bucket` "normal" with
    id [using `tab id`], with bid of `0`.
* Bucket contents arranging:
  *

Tab actions and tags... We could have a magic tag like "tab-api:muted", or we
could require that there be a "behavior" rule that works a bit like an analysis
rule and can perform a one-off action to mute.  The rule could also have some
self-supression magic and/or explicit rising-edge triggering built-in.  This
would avoid bad situations where we're fighting the user if the rule only fires
at distinct times.
* This might also imply some type of 'event' or 'signal' capability that could
  fire behavior rules.  These rules might also form the basis for having the
  tags continue to stick around in the event we choose a functional "rebuild the
  tags periodically from an empty set based on known state" approach.  In that
  case we need the event/signal rules as the abstraction that holds onto the
  sticky-ness.  Examples:
  * A tab generates a noise, becoming audible, but then it stops.  This could
    generate an event that would allow a tag to be set that would stick around.
  * A persistent content digger that watches for some specific DOM mutation
    sends a message.  This would be processed via a corresponding event/signal
    handler.

Example related actions.
  * Applies to `tabs without` [`core:session-root`].  Do `set tab`
    [`core:session-root`].  Call it "Set as session root."
    * Persistence-wise, maybe make this something that can automatically expose
      a "make this permanent for this [site | for root/]" option. without having
      every option need to do so.
  * Applies to `tabs with` [`analysis!core:session-root`, `tab with opener`].
    Do `set anti-tag` [`analysis!core:session-root`].  Call it "Put back with
    opener."
  * Applies to `tab with opener`.  Do `Clear tab opener`.  Call it "Forget
    opener." (Q: Should this be suppress tab opener, or just covered by leaving
    an undo byproduct?)



### Actions Plan ###
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

### ContentScriptCoordinator ###
  * Stop trying to executeScript against tabs that aren't loaded yet.  We should
    just consult the cache and then not bother to try and probe the tab.  It's
    possible we should set a constraint against the loading status in that
    failure case.  Or not.
