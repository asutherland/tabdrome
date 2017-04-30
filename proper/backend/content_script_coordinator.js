/**
 * Simple helper to ensure a given content script is loaded, send it a message,
 * and be able to wait for a response via returned Promise.
 *
 * The motivations behind this class are:
 * - We would like to avoid doing anything that resembles an "eval" anywhere in
 *   our code, which includes not generating dynamic strings to pass to
 *   executeScript.  Accordingly, we need to make sure our content script is
 *   loaded and then message it.
 * - The content script global is sticky until the page navigates.  I assume, at
 *   least.  Which means we only need to execute the content script if it hasn't
 *   already been executed.  Unfortunately, I'm not seeing an immediately
 *   obvious way to tell when an inner window change occurs.  It's possible that
 *   tab updates for URL changes convey that (even if the URL isn't actually
 *   changing).  Another possibility would be to hope that the runtime.Port
 *   disconnect is generated promptly, although it's not clear how that
 *   interacts with the bfcache.
 */
class ContentScriptCoordinator {
  constructor() {
    this.nextId = 1;
    this.pendingRequestsById = new Map();

    browser.runtime.onMessage.addListener(this.onMessage.bind(this));
  }

  ask(normTab, scriptInfo, payload) {
    return new Promise((resolve) => {
      const id = this.nextId++;
      this.pendingRequestsById.set(id, { scriptInfo, resolve });

      const evaluated = browser.tabs.executeScript(
        normTab.id,
        {
          file: scriptInfo.file
        });
      evaluated.then(() => {
        browser.tabs.sendMessage(
          normTab.id,
          {
            id,
            type: scriptInfo.type,
            payload
          });
      });
    });
  }

  /**
   * Process messages from content scripts.
   */
  onMessage(message, sender) {
    if (!sender.tab) {
      return;
    }

    const { scriptInfo, resolve } = this.pendingRequestsById.get(message.id);
    this.pendingRequestsById.delete(message.id);
    if (message.err) {
      console.error('Content script', scriptInfo, 'reported error',
                    message.err);
    }
    resolve(message.result);
  }
}

module.exports = ContentScriptCoordinator;
