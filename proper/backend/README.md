Everything in here runs in the background page.

The tab dataflow goes like this:
- TabTracker receives the chrome.tabs representation and merges in information
  sent to it from content scripts or simply derived from direction understanding
  of the URL representation.
- The Tabulator and its arrangers produce, on a per-window basis, hierarchies
  of tabs.  They are aware of explicit user feedback/settings/preferences and
  adjust their decisions appropriately.
-

## To Do ##

### Persisted historical affinity ###

There is information in the tab-opened-tab relationship that's normally used
only for ephemeral hierarchy.  We can instead log these openings in order to
re-establish the link when re-opened via awesomebar or other context-free-ish
link opening like when triggered by irccloud or external app.
