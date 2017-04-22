/**
 * Brings up the back-end so that as per-window tab UIs are brought up, They
 * can connect and be happy and everything works.
 **/


const TabTracker = require('./tab_tracker');
const Tabulator = require('./tabulator');
const ClientBridgeBackend = require('./client_bridge_backend');

//const SiteHierarchyArranger = require('./arrangers/site_hierarchy');
const SessionArranger = require('./arrangers/session');

const clientBridge = new ClientBridgeBackend();
const tabulator = new Tabulator({
  arrangers: [new SessionArranger()]
});
window.tracker = new TabTracker({
  onWindowTabChanges: (windowId, windowNormTabsById) => {
    const rootGroup = tabulator.tabulate(windowNormTabsById);
    const serializedRootGroup = rootGroup.__serialize();
    clientBridge.onWindowTabChanges(windowId, serializedRootGroup);
  }
});

function handleClick() {
  chrome.tabs.create({
    url: chrome.extension.getURL('tabdrome.html')
  });
}

chrome.browserAction.onClicked.addListener(handleClick);
