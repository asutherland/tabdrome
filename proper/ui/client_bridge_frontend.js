function deserializeMap(serialized) {
  return new Map(serialized);
}

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
    let normTabsById = deserializeMap(msg.normTabsById);
    console.log('got message', normTabsById);
    this._onUpdate(normTabsById);
  }
}

module.exports = ClientBridgeFrontend;
