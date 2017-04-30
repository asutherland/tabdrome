/**
 * Brings up the back-end so that as per-window tab UIs are brought up, They
 * can connect and be happy and everything works.
 **/


const TabTracker = require('./tab_tracker');
const Tabulator = require('./tabulator');
const ClientBridgeBackend = require('./client_bridge_backend');

const ContentScriptCoordinator = require('./content_script_coordinator');

const ContentDigger = require('./content_digger');
const ContextSearcher = require('./context_searcher');

//const SiteHierarchyArranger = require('./arrangers/site_hierarchy');
const SessionArranger = require('./arrangers/session');

const clientBridge = new ClientBridgeBackend();
const tabulator = new Tabulator({
  arrangers: [new SessionArranger()]
});

// We're trying to make the hook-ups between things explicit to aid in testing
// and reduce coupling.  However, the TabTracker fundamentally has a higher
// degree of coupling with the ContentDigger and ContextSearcher which in turn
// are highly coupled with the ContentScriptCoordinator.  So that forms one
// cluster and the other cluster is the ClientBridgeBackend.
window.tracker = new TabTracker({
  // Circular dependencies?  Us?  Never...
  initHelpers: function(tabTracker) {
    const contentScriptCoordinator = new ContentScriptCoordinator(tabTracker);
    const contentDigger = new ContentDigger(
      { tabTracker, contentScriptCoordinator });
    const contextSearcher = new ContextSearcher(
      { tabTracker, contentScriptCoordinator });

    return {
      contentScriptCoordinator,
      contentDigger,
      contextSearcher
    };
  },

  onWindowTabChanges: function (windowId, windowNormTabsById, globalSerial) {
    const rootGroup = tabulator.tabulate(windowNormTabsById, globalSerial);
    const serializedRootGroup = rootGroup.__serialize();
    clientBridge.onWindowTabChanges(windowId, serializedRootGroup);
  },

  onWindowRemoved: function (windowId) {
    clientBridge.onWindowRemoved(windowId);
  }
});

// We still want a browser button so we can debug.  The sidebar is a bit
// annoying on this front.
function handleClick() {
  browser.tabs.create({
    url: chrome.extension.getURL('tabdrome.html')
  });
}
browser.browserAction.onClicked.addListener(handleClick);
