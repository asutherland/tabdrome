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
* ContentDigger / InvestigationCache
  * Add constraints and cacheKey fields to the digger definitions, with each of
    these being basically { key: [list of selectn traversals that will be
    concatenated to a single string]}.
  * Either decouple the digger key from the fromContents key so that we can use
    it as an explicit lookup, and/or tuple them.  Could also have live object
    ref.  The intent is to be able to easily get at the constraints selectors
    above when enforcing constraints since the constraints would no longer be
    self-descriptive.
  * Accordingly change InvestigationCache keying.  The fundamental two pieces of
    interest are the origin and the digger.  I'm not sure we'd ever expect to
    have such extension turnover that full traversals to dump moot extension
    data would be something we'd have to optimize for.  It's more likely for the
    user's set of visited sites to get crazy big and/or just for us to run up
    against a site that emergently uses its URL space in way that causes us to
    accumulate way too many values.  For example, specific tweets on twitter
    have their own URL, which is great from a webby-ness perspective, but
    potentially bad for our naive storage.  That's something that wants a more
    structured understanding like an explicit messaging client.  So the plan
    is then that we continue to key by origin first, for easy eviction
    management, but then by provider-key, and then by the cacheKey that is
    defined by the provider, making it compulsory to go below the provider key.
* ContentScriptCoordinator
  * Stop trying to executeScript against tabs that aren't loaded yet.  We should
    just consult the cache and then not bother to try and probe the tab.  It's
    possible we should set a constraint against the loading status in that
    failure case.  Or not.
