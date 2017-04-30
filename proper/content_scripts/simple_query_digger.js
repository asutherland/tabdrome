/**
 * Simple querySelector based data extraction.  The goal is for the query
 * mechanism to be so limited that it cannot be used to produce results that
 * exfiltrate data from a user's session.
 *
 * XPath, for example, makes it easy to construct URLs to attacker-controlled
 * sites that embed prviate information found in pages.  While the UI aspires to
 * consume our results in such a way that we avoid performing network fetches
 * (Ex: render images to a Blob and send that instead of sending a URL), in some
 * cases it will be explicitly part of the functionality, and in those cases we
 * want to avoid providing attackers with usable primitives.  In this manner,
 * even if an attacker is able to rely on the user viewing a page with both
 * user-private data and inert but attacker-provided content, they should not be
 * able to generate a result other than leaking that the user is looking at the
 * page.  (That would still be undesirable, but again, in some cases network
 * traffic is required.  However, mitigations would hopefully be in place to
 * limit network traffic to specific origins that are appropriate to the
 * use-case and obvious to the user as part of the side-effect of whatever
 * extension is using the functionality in question.)
 */
function runSimpleQuery(spec) {
  let container = document.querySelector(spec.containerSelector);
  if (!container) {
    return null;
  }

  let items = container.querySelectorAll(spec.itemSelector);

  let valueDefs = spec.values;
  let valueKeys = Object.keys(valueDefs);
  return Array.from(items).map(function(item) {
    let result = {};
    for (let key of valueKeys) {
      let { selector, extract, fallbackAction, fallbackValue } = valueDefs[key];
      let valueNode = selector ? item.querySelector(selector) : item;
      let value;
      if (valueNode == null) {
        switch (fallbackAction) {
          case 'constant':
            result[key] = fallbackValue;
            continue;
          case 'use-self':
            valueNode = item;
            break;
          default:
            // The casts on DOM nodes are required because otherwise we get
            // "<unavailable>" in the browser console.
            console.warn('selector', selector, 'on', item.toString(),
                         'had no match on page', window.location.toString(),
                         'and there was no fallback action.');
            throw new Error('Shoulda read the docs.');
        }
      }
      
      if (extract === 'href') {
        value = valueNode.href;
      } else {
        value = valueNode.textContent;
      }
      result[key] = value;
    }
    return result;
  });
}

browser.runtime.onMessage.addListener(function(msg) {
  if (msg.type !== 'dig') {
    return;
  }

  // Have undefined indicate explosions and madness.
  let queryResult;
  // Aw heck, we can include the error message too.
  let err = null;
  try {
    queryResult = runSimpleQuery(msg.payload);
  } catch(ex) {
    err = ex.message;
  }
  browser.runtime.sendMessage({
    id: msg.id,
    type: 'diggerResult',
    result: queryResult,
    err
  });
});
