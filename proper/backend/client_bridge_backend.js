/**
 * The switchboard for clients which currently covers both the "tab-ui" and
 * "editor-ui".  See `proper/README.md` for an overview of which files do what.
 * This is the only place non-content-scripts communicate with the extension.
 * Communication with content scripts is handled by the
 * ContentScriptCoordinator.
 */
export default class ClientBridgeBackend {
  constructor({ workflowManager }) {
    this.workflowManager = workflowManager;

    /**
     * Map from windowId to Sets of our clientMeta objects for interested
     * clients.
     */
    this.clientsByWindowId = new Map();
    /**
     * The tabulated root group for each window.
     */
    this.rootGroupsByWindowId = new Map();

    this.editorClients = new Set();

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
   * Determine what type of client is connecting and register appropriately.
   */
  _onRuntimeConnect(port) {
    const frontendMatch = /^tab-ui-bridge:(\d+)$/.exec(port.name);
    if (frontendMatch) {
      this._uiBridgeConnect(port, frontendMatch);
      return;
    }

    const editorMatch = /^editor-ui-bridge$/.exec(port.name);
    if (editorMatch) {
      this._editorBridgeConnect(port, editorMatch);
      return;
    }

    console.warn('ignoring port connection with name', port.name);
  }

  _uiBridgeConnect(port, match) {
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

  _editorBridgeConnect(port/*, match*/) {
    let workflowClient;
    const broadcastToOtherClients = (message) => {
      for (const client of this.editorClients) {
        if (client === workflowClient) {
          continue;
        }
        client.port.postMessage(message);
      }
    };
    workflowClient = this.workflowManager.newClient({
      // The client is required to save this off so we can use it in our
      // broadcastToOtherClients impl above.  This is all a bit too ad hoc.
      // TODO: next time we do something meaningful with clients like add a new
      // one, perhaps create a base class that can provide sendToClient and
      // broadcastToOtherClients.  (Avoiding us needing to create a WeakMap or
      // other equivalent wrapping that distrusts the client.)
      port,
      broadcastToOtherClients
    });
    this.editorClients.add(workflowClient);
    port.onMessage.addListener(async (msg) => {
      if (msg.type === 'workflow') {
        const reply = await workflowClient.onClientRequest(msg.payload);
        if (reply) {
          port.postMessage({
            type: 'reply',
            replyId: msg.id,
            payload: reply
          });
        }
      }
    });
    port.onDisconnect.addListener(() => {
      workflowClient.onClientDisconnected();
      this.editorClients.delete(workflowClient);
    });
  }
}
