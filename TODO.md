
* Stop trying to executeScript against tabs that aren't loaded yet.  We should
  just consult the cache and then not bother to try and probe the tab.  It's
  possible we should set a constraint against the loading status in that failure
  case.  Or not.
