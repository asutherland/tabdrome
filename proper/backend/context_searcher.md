# Context Searchers: Overview #

Context Searchers build on content diggers to find information related to the
contents of a page as exposed by content diggers.

## Information Outlets ##

Not all context exposed by searchers needs to be displayed in the tab bar UI.
There are other ways the information can be used or surfaced:

### Awesomebar-style context-aware navigation ###

The tab bar is prime real estate.  At least when I navigate, I frequently do it
via ctrl-t and the awesomebar.  Frequently I even use the awesomebar to switch
tabs because I've lost track of the tabs.

We can inform and bolster this use-case by knowing the likely pages or type of
pages you're likely to visit given the current page.  Or history locality.  A
lot of things.

For example, if you're looking at a bugzilla bug in a browser engine component,
we can boost the results for recently consulted bugs and github issues, boost
the results for bugs related through their dependency graph, boost the results
for bugs filed around the same time (for dupe checking), boost the results for
web standards (to check if the behavior matches the standard), etc.

### Automatic/Proposed Redirect Bouncers ###

In the web standards world, you usually don't want the Technical Recommendation
(TR) specs, you want the current Editor's Draft.  Also spec-wise, you might
favor HTML RFC's over plaintext RFC's.  Or maybe there's a particular
information or news site that people can't linking to and you'd prefer to find
the closest matching page on another reference or news site.

Context searchers can help find the page you'd rather be on and inform the
bouncer logic.  The bouncer logic can then automatically redirect and provide
the UI that exposes what page you were redirected from in case the redirect was
not desired, plus the ability to remove it.  Or perhaps it could provide context
showing that it's recommended you check out the given page, but not
automatically redirect you.  Just provide it as an option (that maybe is
preloading in the background?)

## Examples ##

* Bookmarks:
  * Bookmarks to anchors on a page can be used to construct a sub-ToC of
    interest.
  * Bookmarks to siblings in a breadcrumb/URL hierarchy can provide a similar
    ToC style experience, providing quick access to nearby pages that might
    also be consulted.  For example MDN reference pages.
* History:
  * Frequently-visited-together clusters of pages could

### Anchor Bookmarks as ToC of Interest ###
