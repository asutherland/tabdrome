/**
 * Listens for connections from clients
 */
class ClientBridgeFrontend {
  constructor({ onUpdate }) {
    this._onUpdate = onUpdate;

    this.port = chrome.runtime.connect();
    this.port.onMessage.addListener(this._onMessage.bind(this));
  }

  _onMessage(msg) {
    let rootGroup = msg.rootGroup;
    console.log('got message', rootGroup);
    this._onUpdate(rootGroup);
  }
}

module.exports = ClientBridgeFrontend;
