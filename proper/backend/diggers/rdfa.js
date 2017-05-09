const NS_PRED = 'xmlns\\:v="http://rdf.data-vocabulary.org/#"';
export default {
  breadcrumbs: {
    diggerId: 'builtin:rdf-breadcrumbs:v1',
    provides: 'breadcrumbs',
    label: 'RDFa-styled Breadcrumbs',
    engine: 'simple-query-digger',
    constraintSpec: {
      url: 'parsedUrl.href'
    },
    // The server doesn't see the hash, so rebuild the URL without that to avoid
    // wasteful duplication.  (Also leave out crazy things like username and
    // password.  They could matter to the server, but don't matter to us as
    // much.)
    //
    // Note that we're leaving the constraint against the full href.  This is
    // mainly because I don't want to replicate this interpretation of the URL
    // everywhere.  Also, hashes could matter for some diggers.  (Possibly even
    // for query diggers like this too, although there's little excuse for the
    // "#!" style of app state now that history.pushState should be everywhere.)
    // In any event, the intent has always been that the digger def would
    // express the appropriate level of constraint for the site.  We would
    // ideally similarly have it specify the level of caching, which may or may
    // not be the same.
    //
    // TODO: maybe promote this to have an alias like 'url-no-hash'.
    cacheKeySpec: [
      'normTab.parsedUrl.origin',
      'normTab.parsedUrl.pathname',
      'normTab.parsedUrl.search'
    ],
    spec: {
      containerSelector: `ol[${NS_PRED}],ul[${NS_PRED}]`,
      itemSelector: '[typeof="v:Breadcrumb"]',
      // For the last breadcrumb that represents the current page, at least MDN
      // stashes the property=v:title directly on the <li> and there is no <a> or
      // rel="v:url", hence the fallbacks below to still extract the title and
      // to assume the page's URL as the URL.  (The URL is necessary in this
      // case because the breadcrumbs are built based on the underlying URL,
      // not the title.)
      values: {
        url: {
          selector: '[rel="v:url"]',
          extract: 'href',
          fallbackAction: 'use-document-url-sans-hash',
          fallbackValue: null
        },
        title: {
          selector: '[property="v:title"]',
          extract: 'text',
          fallbackAction: 'use-self',
          fallbackValue: null
        }
      }
    }
  }
};
