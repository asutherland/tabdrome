The tabulator takes the flat soup of tabs and creates the hierarchy that is
provided to the UI.  It does with the help of the various "by_*" organizational
heuristics available.

We have grouping heuristics based on common usage patterns/idioms:

- Site-centric using bread-crumb navigation.  For example, if you create a new
  tab to search for/awesomebar "mdn map", it makes sense to organize that tab
  in the hierarchy of your existing MDN site group, potentially clustering by
  bread-crumbs.

- Session-centric.  This is the standard emergent organizational pattern of
  TreeStyleTabs and others where parent/child relationships of middle-clicking
  to open new tabs result in a tree hiearchy.

## Immutability, Idempotency, Equivalence, Etc. ##

For sanity and simplicity, we compute an entirely new grouped hierarchy every
time we run the tabulate algorithm.  Because we want the front-end UI to be able
to efficiently determine what has changed and what has not, for each serialized
node we provide a relative-id that is derived from its defining state as well
as the max serial over the group and all its recursively serialized children.

Since currently all state comes only from the set of currently visible tabs,
this does mean that as tabs are removed, the serial number for a group may
decrease.  This is believed workable for the time being since equivalence
testing is based on on the relative id and serial, and the serial is based on
a global serial maintained by the TabTracker.  That is, TabTracker's global
serial effectively establishes a timeline of tab states.  Since our algorithms
are deterministic, jumping around on the timeline for a given (sub) group is
fine.

Complexity and erroneous behavior only arises if there is independent state
interacting with the decision making process that is not captured in the
serials.  The plan is to integrate user-feedback that impacts state by also
capturing it in the global serial state and ensuring the arranger logic uses
the maximum value of information it receives, including deletions.  (We could
make our group serials strictly increasing if we created tombstone nodes for
removed tabs, but that creates more problems than it solves.  Alternately, we
could maintain path-based max-observed-serial overlays for groups, but these
again effectively end up as tombstones with a potentially absurdly high growth
factor.)
