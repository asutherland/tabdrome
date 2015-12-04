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
