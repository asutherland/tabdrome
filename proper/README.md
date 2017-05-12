Subdirectories, notable files are:
* backend: Core logic that runs as a WebExt background script.
  * background/main.js: Root of the background page scripts.
* content_scripts: All the scripts we potentially inject using executeScript.
* control-ui: Full-page configuration UI that ideally wants to be its own
  extension for security and validation reasons.  But for ease of early
  development and probably to lower the barrier to trying tabdrome once it gets
  usable, this is integrated for now.
* tab-ui: The tab bar UI, hosted by tabdrome.html.
  * tab-ui/ui-main.jsx: Root JS script loaded by tabdrome.html.
