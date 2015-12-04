/**
 * Listens for connections from clients
 */
class ClientBridge {
  constructor() {
    /**
     * For now we assume/enforce only one client per window, so this is a direct
     * map to our clientMeta structure.
     */
    this.clientsByWindowId = new Map();

    this

    chrome.runetime.onConnect.addListener(this.onConnect.bind(this));
  }

  _purgeConnectionWithWindowId(windowId) {
    let clientMeta = this.clientsByWindowId.get(windowId);
    if (!clientMeta) {
      return;
    }

    this.clientsByWindowId.delete(windowId);
    clientMeta.port.disconnect();
  }

  onConnect(port) {
    let windowId = port.sender.tab.windowId;

  }

  onWindowTabChanges(windowID, windowNormTabsById) {

  }
}
