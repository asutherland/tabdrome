/**
 * Establishes a connection with the back-end, automatically subscribing to
 * updates for the current window.  The provided onUpdate method is invoked when
 * updates occuring, including an initial compulsory onUpdate once the
 * connection has been established.
 */
export default class ClientBridgeFrontend {
  constructor({ onUpdate }) {
    this._onUpdate = onUpdate;

    browser.windows.getCurrent().then((windowInfo) => {
      this.port =
        chrome.runtime.connect({ name: `ui-bridge:${windowInfo.id}` });
      this.port.onMessage.addListener(this._onMessage.bind(this));
    });
  }

  _onMessage(msg) {
    let rootGroup = msg.rootGroup;
    console.log('got message', rootGroup);
    this._onUpdate(rootGroup);
  }
}
