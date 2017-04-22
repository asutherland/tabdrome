/**
 * Listens for connections from clients
 */
class ClientBridgeBackend {
  constructor() {
    /**
     * For now we assume/enforce only one client per window, so this is a direct
     * map to our clientMeta structure.
     */
    this.clientsByWindowId = new Map();
    /**
     * The tabulated root group for each window.
     */
    this.rootGroupsByWindowId = new Map();

    chrome.runtime.onConnect.addListener(this._onConnect.bind(this));
  }

  _sendWindowState(windowId) {
    let rootGroup = this.rootGroupsByWindowId.get(windowId) || new Map();
    let clientMeta = this.clientsByWindowId.get(windowId);
    if (clientMeta) {
      console.log('sending tab data for', windowId, rootGroup);
      clientMeta.port.postMessage({
        rootGroup: rootGroup
      });
    }
  }

  _onConnect(port) {
    let windowId = port.sender.tab.windowId;
    if (this.clientsByWindowId.has(windowId)) {
      // Do warn if our one-client-per-window assumption is violated and
      // something may break.
      console.warn('previous client for window', windowId, 'being clobbered');
      // (this does not generate an error if already disconnected)
      this.clientsByWindowId.get(windowId).port.disconnect();
    }

    let clientMeta = {
      windowId,
      port
    };
    this.clientsByWindowId.set(windowId, clientMeta);
    port.onDisconnect.addListener(() => {
      if (this.clientsByWindowId.get(windowId) === clientMeta) {
        this.clientsByWindowId.delete(windowId);
      }
    });

    this._sendWindowState(windowId);
  }

  onWindowTabChanges(windowId, hierNodes) {
    this.rootGroupsByWindowId.set(windowId, hierNodes);
    this._sendWindowState(windowId);
  }
}

module.exports = ClientBridgeBackend;
