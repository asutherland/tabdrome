# Content Digging: An Overview #

How we build our tab hierarchy and the information we display about the tab can
be greatly informed by the contents of tabs.

## Examples of Diggable Content ##

* Navigation breadcrumbs.  These can be used to organize tabs in a hierarchy.
  These may be inferred from the URL structure or extracted out of the HTML
  of the document itself.
* Alerts: Maybe you've entered

## Content versus Context ##

We also have Context Searchers.  Content Diggers deal exclusively with the tab
and its immediate contents.

# Implementation #

## Extensibility, Security, Privacy, and Performance ##

One approach to extensibility would be to favor having a small extension for
content digging for each site or family of related sites.  The extensions could
be specifically scoped and minimal, making it easier to review.

Unfortunately, review is not a panacea on its own.  Review bandwidth has long
been a problem for AMO, and encouraging full-fledged WebExtensions as the
default risks less than minimal implementations with potential privacy,
security, and performance concerns.  Which is not to say that full-fledged
extensions should be forbidden, just that they shouldn't be the default.

Additionally, there is a cognitive burden and hassle on the users of a tool when
they need to go out of their way to install additional extensions.  Given that
tabdrome likely benefits from diggers spanning many different websites, it would
quickly become infeasible for users to take advantage without placing themselves
at risk.  (Even if it's just a performance risk.)

### Inert Queries as Default ###

In most cases, the data in pages is easily extractable.  As long as:
* The query language is limited so that information leaks can't be generated.
* Its output is properly sanitized and kept as inert content so that script
  injection and arbitrary HTML/XML/SVG content cannot be inserted.
...we can more streamline the experience.

It potentially becomes risk-free to try out new diggers.  Users can even A/B/C
test diggers by comparing how different digger definitions provided by other
users work on the page they're looking at.

The registry is an open question.  Following in the footsteps of GreaseMonkey
seems like the right path.  In particular, while explicit sites like userstyles
works, GreaseMonkey's support of ".user.js" files exposed with a non-HTML MIME
type seems fairly smart.  Adopting a ".digger.json" suffix for digger
definitions (one eTLD+1 per file supporting wildcards beneath that?) and perhaps
".digger-registry.json" that maps domain/eTLD+1 names to .digger.json links so
people could publish what they use?

## When to Re-Dig ##
