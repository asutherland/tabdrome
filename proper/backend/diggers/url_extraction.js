
export function transformValueDef(valueDef, normTab) {
  if (typeof(valueDef) === 'string') {
    return valueDef;
  } else {
    switch (valueDef.type) {
      case 'searchParam':
        if (normTab.parsedUrl.searchParams.hasOwnProperty(valueDef.key)) {
          return normTab.parsedUrl.searchParams[valueDef.key];
        }
        return null;

      default:
        console.warn('ignoring weird value def:', valueDef);
        return undefined;
    }
  }
}

/**
 * The whole point of URL extraction/generation is to generate site-relative
 * paths.  Our threat model is a nefarious person who contributes a nefarious
 * URL extractor that attempts to exfiltrate data through the generated URLs.
 *
 * To this end, we attempt to ensure and enforce that all generated links are
 * origin-relative.  This falls down if the origin hosts an open redirect
 * script, but there are things we can do to mitigate that both in performing
 * the URL traversal and with additional heuristic guards and/or explicit
 * blacklisting.
 *
 * Anywho, that's why we throw or seem to have inane, overly constraint
 * behaviors.
 */
export function buildUrl(urlDef, normTab) {
  // It's silly for us to try and reinvent URL parsing or interpretation.  So we
  // evaluate the pathname relative to the existing page to get the bones of the
  // URL.
  let newParsedUrl = new URL(urlDef.pathname, normTab.parsedUrl.href);

  if (newParsedUrl.origin !== normTab.parsedUrl.origin) {
    throw new Error('unsafe URL formulation resulted in origin change.');
  }

  let urlStr = normTab.parsedUrl.origin + newParsedUrl.pathname;

  if (urlDef.searchParams) {
    const urlBits = [];
    for (const paramKey of Object.keys(urlDef.searchParams)) {
      const encodedKey = encodeURIComponent(paramKey);
      const paramValueDef = urlDef.searchParams[paramKey];

      // undefined means don't even use the argument.  null means omit the
      // value, anything else should be included and encoded.
      let unencodedValue = undefined;
      if (paramValueDef === null) {
        unencodedValue = null;
      } else {
        unencodedValue = transformValueDef(paramValueDef, normTab);
      }

      if (unencodedValue === undefined) {
        continue;
      } else if (unencodedValue === null) {
        urlBits.push(encodedKey);
      } else {
        urlBits.push(encodedKey + '=' + encodeURIComponent(unencodedValue));
      }
    }
    urlStr += '?' + urlBits.join('&');
  }

  return urlStr;
}

export function populateResultPiece(pieceDef, normTab) {
  const resultObj = {};
  for (const key of Object.keys(pieceDef)) {
    const valueDef = pieceDef[key];
    // If the key has "url" in it, it needs to be built as a URL.  We don't care
    // how many otherwise useful keys this destroys.
    if (/url/i.test(key) &&
        !(valueDef.type === 'url' || valueDef.type === 'same-url')) {
      throw new Error(`illegal value type for "url" key ${valueDef.type}`);
    }

    let value;
    switch (valueDef.type) {
      case 'url':
        value = buildUrl(valueDef, normTab);
        break;
      case 'same-url':
        // sans hash though... do our hacky URL rebuild to drop it.
        value = normTab.parsedUrl.origin + normTab.parsedUrl.pathname +
                normTab.parsedUrl.search;
        break;
      case 'tab.title':
        value = normTab.title;
        break;
      case 'string':
        value =
          valueDef.parts.map(partDef => transformValueDef(partDef, normTab))
            .join('');
        break;
      default:
        console.warn('unsupported result value typpe in def:', valueDef);
        break;
    }
    resultObj[key] = value;
  }
  return resultObj;
}

export default function extractFromUrl(normTab, spec) {
  try {
    for (const { match, results } of spec.patterns) {
      // - Match pattern.
      if (match.pathname && match.pathname === normTab.parsedUrl.pathname) {
        // yay, steal control flow so we don't continue.
      } else {
        continue;
      }

      return results.map((resultPieceDef) => {
        return populateResultPiece(resultPieceDef, normTab);
      });
    }
  } catch (ex) {
    console.warn('problem during URL extraction. spec:', spec, 'tab',
                 normTab, 'ex:', ex);
    return null;
  }
}
