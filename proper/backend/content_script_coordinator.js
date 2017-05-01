/**
 * How long should the eviction timer wait before running an eviction pass if
 * the map does not become completely empty before the timer fires?
 *
 * This should be on the order of half of EVICT_ANCIENT_REQUEST_OLD_ENOUGH_SECS
 * because evictions now are used by upstream consumers to cancel their
 * suppression logic.  Half-ish because the eviction timer is only scheduled if
 * it's not already pending, so if this value is too large, the eviction may be
 * particularly delayed depending on relative timer phase.
 */
const EVICTION_TIMER_DELAY_SECS = 2.0;
const MILLIS_PER_SEC = 1000;

/**
 * How many seconds before the eviction timer should reject a returned promise.
 * This wants to be riding the boundary
 */
const EVICT_ANCIENT_REQUEST_OLD_ENOUGH_SECS = 5.0;

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

    this._evictionTimerId = null;

    browser.runtime.onMessage.addListener(this.onMessage.bind(this));
  }

  /**
   * The requests we make to content pages are not guaranteed to run for a
   * variety of reasons.  This method sets up a timer to evict old requests that
   * seem like they failed.
   */
  _maybePlanEviction() {
    if (this._evictionTimerId) {
      return;
    }

    this._evictionTimerId = setTimeout(
      () => { this._performEviction();},
      EVICTION_TIMER_DELAY_SECS * MILLIS_PER_SEC);
  }

  _performEviction() {
    this._evictionTimerId = null;

    // Anything issued before the doomStamp is doomed.  doooooooomed!
    const doomStamp = performance.now() - EVICT_ANCIENT_REQUEST_OLD_ENOUGH_SECS;
    for (let [id, { issued, reject }] of this.pendingRequestsById) {
      if (issued < doomStamp) {
        reject('too slow');
        this.pendingRequestsById.delete(id);
      }
    }

    // There may still be entries in here that haven't timed out yet, so
    // reschedule eviction.  They'll cancel if they all complete.
    if (this.pendingRequestsById.size > 0) {
      this._maybePlanEviction();
    }
  }

  /**
   * Something got deleted from this.pendingRequestsById, maybe we can cancel
   * the timer and we a good citizen as it relates to wake-ups.
   */
  _maybeCancelEviction() {
    if (this.pendingRequestsById.size === 0 && this._evictionTimerId) {
      clearTimeout(this._evictionTimerId);
      this._evictionTimerId = null;
    }
  }

  ask(normTab, scriptInfo, payload) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      // Use performance.now() to get a monotonic clock because Date.now() can
      // jump around.
      this.pendingRequestsById.set(
        id,
        { scriptInfo, resolve, reject, issued: performance.now() });
      this._maybePlanEviction();

      const evaluated = browser.tabs.executeScript(
        normTab.id,
        {
          file: scriptInfo.file
        });
      evaluated.then(() => {
        console.log('send CSC message id:', id);
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
    console.log('recv CSC message id:', message.id, 'has tab?', !!sender.tab);
    if (!sender.tab) {
      return;
    }

    let pendingInfo = this.pendingRequestsById.get(message.id);
    if (!pendingInfo) {
      console.warn('Got a message for which we have no pending info?', message);
      return;
    }
    this.pendingRequestsById.delete(message.id);
    this._maybeCancelEviction();

    const { scriptInfo, resolve } = pendingInfo;
    if (message.err) {
      console.error('Content script', scriptInfo, 'reported error',
                    message.err);
    }
    resolve(message.result);
  }
}

module.exports = ContentScriptCoordinator;
