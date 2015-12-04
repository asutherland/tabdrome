Everything in here runs in the background page.

The tab dataflow goes like this:
- TabTracker receives the chrome.tabs representation and merges in information
  sent to it from content scripts or simply derived from direction understanding
  of the URL representation.
- The Tabulator and its arrangers produce, on a per-window basis, hierarchies
  of tabs.  They are aware of explicit user feedback/settings/preferences and
  adjust their decisions appropriately.
-
