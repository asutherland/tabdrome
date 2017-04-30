/**
 * Handles communication between tabdrome UI and the back-end.  The UI
 * counterpart is "ui/client_bridge_frontend.js".
 */
class ClientBridgeBackend {
  constructor() {
    /**
     * Map from windowId to Sets of our clientMeta objects for interested
     * clients.
     */
    this.clientsByWindowId = new Map();
    /**
     * The tabulated root group for each window.
     */
    this.rootGroupsByWindowId = new Map();

    browser.runtime.onConnect.addListener(this._onRuntimeConnect.bind(this));
  }

  _sendWindowState(windowId) {
    // It's possible nothing has been tabulated yet.  Bail, trusting that when
    // state has been tabulated we'll
    let rootGroup = this.rootGroupsByWindowId.get(windowId);
    if (!rootGroup) {
      return;
    }

    let interestedClients = this.clientsByWindowId.get(windowId);
    if (!interestedClients) {
      return;
    }

    for (let { port } of interestedClients ) {
      port.postMessage({ rootGroup });
    }
  }

  /**
   * Handler for runtime.connect() that holds onto t
   */
  _onRuntimeConnect(port) {
    const match = /^ui-bridge:(\d+)$/.exec(port.name);
    if (!match) {
      return;
    }

    const windowId = parseInt(match[1], 10);
    let interestedClients = this.clientsByWindowId.get(windowId);
    if (!interestedClients) {
      interestedClients = new Set();
      this.clientsByWindowId.set(windowId, interestedClients);
    }

    let clientMeta = {
      windowId,
      port
    };
    interestedClients.add(clientMeta);
    port.onDisconnect.addListener(() => {
      this.clientsByWindowId.get(windowId).delete(clientMeta);
    });

    this._sendWindowState(windowId);
  }

  onWindowTabChanges(windowId, hierNodes) {
    this.rootGroupsByWindowId.set(windowId, hierNodes);
    this._sendWindowState(windowId);
  }

  onWindowGone(windowId) {
    this.rootGroupsByWindowId.delete(windowId);
  }
}

module.exports = ClientBridgeBackend;
