# Tabdrome #

A hierarchical vertical tabs WebExtension for Firefox that tries to
automatically organize tabs for you based on simple, but extensible smarts.

## Tell Me More... ##

### Should I Use It? ###

No.  You want one of these:
* The gold standard:
  https://addons.mozilla.org/en-US/firefox/addon/tree-style-tab/
* The Firefox Test Pilot Tab Center experiment thing that you unfortunately have
  to install before you can learn anything about it at
  https://testpilot.firefox.com/experiments/tab-center


### How Does It Work? ###

Not at all.

### How Might It Eventually Work? ###

At all.

### Why Does Tabdrome Exist Given The Other Options? ###

I audited the existing open source options when the first noodling occurred a
long time ago.  To the best of my understanding while writing this now, the main
change since then is that Tab Center has come into existence and is actively
developed.

At the start, I decided on creating a greenfield WebExtension using React
instead of building on existing XUL or add-on SDK addons.  The existence of the
WebExtensions tabs API allowed access to info about tabs without having to deal
with the complexities of the Firefox tabs implementation.  And my lack of
concern over interaction with other tab add-ons or having polished (or any)
support for usability-improving animations or support for drag-and-drop meant
that the downsides were acceptable.  Because...

My primary concern in developing this extension is the automatic organization
mechanism and extensibility of that.  Ideally this can be integrated into
other extensions either via an API exposed by those extensions or direct
inclusion in those extensions.

## Developing ##

### Running ###

This is what I do.  It is not very fancy.  There may be more fancy things that
work better, and I'd be interested in hearing about them.

Base case:
0. Run `npm install` in the root, this gets you all the dependencies.  Look for
   signs of errors.
1. Run `npm run build` in the root, this populates the "build" subdirectory.  If
   you get any errors and you don't have any local changes, then double-check
   that npm install worked and that your checkout is the most recent.
2. In Firefox nightly/dev edition, in "about:debugging", click "Load Temporary
   Add-on".  In the file-chooser, select the "build" subdirectory.  You should
   see "Tabdrome" and its icon in the alphabetically sorted list of Extensions.
   You should also see its icon on the toolbar probably.
3. Try it.

You already did that and now you've made changes case:
1. Run `npm run build` in the root.  If you get any errors, then it's time to
   make more changes!
2. Click the "Reload" button in the about:debugging page.
3. Try it.

Firefox quit for some reason:
1. Go back to the base case step 1 or 2.  Firefox forgot about Tabdrome when it
   quit.

### Alternate Running ###

There's now a Makefile!  It's got the following super cool targets you can use
like so:
* `make npm-build`: Avoid having to laboriously type `npm run build` like a
  sucker.  Build results show up in build/.
* `make webext-build`: Create an .xpi from the contents of build/.  You have to
  have built the "npm-build" target already, or you could...
* `make build`: This does both of the above things!  (More properly,
  webext-build could depend on npm-build, but sometimes you want to modify the
  contents of build/ manually.)
