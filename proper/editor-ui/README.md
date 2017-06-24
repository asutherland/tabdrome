# The Rule Editor UI #

UI for inspecting, creating, editing, and sharing workflows.

## Routes ##

* `/workflows/`
  * `new/`
  * `view/:workflowId/`
    * `meta/` provides package.json equivalents and the place to put the
      documentation in, probably.
    * `docs/` is for author-provided documentation to be read.
    * `commands/` defines commands that can be exposed to the user
    * `diggers/` defines content diggers.
    * `searchers/` defines context searchers.
    * `analysis/` defines analysis rules
    * `bucketing/` defines bucketing rules
    * `decorating/` defines bucket decorating rules
    * `arranging/` defines bucket arranging rules

## State / Redux Mapping ##

We're not meaningfully using redux yet.  The editor UI is effectively a filtered
view of a single monolithic data structure. For initial implementation
simplicity we do some ugly hacks leveraging mutating shared state.  We know this
is bad and that long term we'll have more complicated state needs.

So we've chosen redux and set up the barest scaffolding to use it with the
foreknowledge that we'll eventually need such a solution.  The choice was made
based on prior decisions for glodastrophe and redux's adoption in various
Mozilla JS projects.

We've got the following state:
* Workflows.  These are stored in the backend and retrieved and saved via the
  client bridge.  Right now we just retrieve all the workflows at startup to
  avoid some async control flow, but fundamentally we would want:
  * The list of workflows.
  * The contents of the workflow that's currently being viewed/edited.
* Current Route AKA the "where" of what the user is viewing/editing.  This is
  stored in the URL and handled by react-router(-redux).
