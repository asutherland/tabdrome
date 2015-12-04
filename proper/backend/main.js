/**
 * Brings up the back-end so that as per-window tab UIs are brought up, They
 * can connect and be happy and everything works.
 **/

import TabTracker from 'tab_tracker';
import Tabulator from 'tabulator';
import ClientBridge from 'client_bridge';

const clientBridge = new ClientBridge();
const tracker = new TabTracker({
  onWindowTabChanges: (windowId, windowNormTabsById) => {
    clientBridge.onWindowTabChanges(windowId, windowNormTabsById);
  }
});
