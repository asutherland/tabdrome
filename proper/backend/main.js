/**
 * Brings up the back-end so that as per-window tab UIs are brought up, They
 * can connect and be happy and everything works.
 **/


const TabTracker = require('./tab_tracker');
const Tabulator = require('./tabulator');
const ClientBridgeBackend = require('./client_bridge_backend');

const clientBridge = new ClientBridgeBackend();
const tracker = new TabTracker({
  onWindowTabChanges: (windowId, windowNormTabsById) => {
    clientBridge.onWindowTabChanges(windowId, windowNormTabsById);
  }
});

function handleClick() {
  chrome.tabs.create({
    url: chrome.extension.getURL('tabdrome.html')
  });
}

chrome.browserAction.onClicked.addListener(handleClick);
