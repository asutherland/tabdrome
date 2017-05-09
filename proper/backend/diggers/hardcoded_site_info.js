/**
 * All keys are origins as returned by `URL.origin`.  We assume the ports are
 * never specified.
 */
const hardcodedSiteInfo = {
  'https://developer.mozilla.org': {
    breadcrumbs: 'rdfa-breadcrumbs'
  },
  'XXXhttps://wiki.mozilla.org': {
    breadcrumbs: 'url-path'
  },
  'https://bugzilla.mozilla.org': {
    /**
     * A tremendously shoddy URL-based hierarchy for bugzilla.  There just isn't
     * a lot of useful information in the URL.
     */
    breadcrumbs: {
      diggerId: 'builtin:bugzilla:v1',
      provides: 'breadcrumbs',
      label: 'Cluster bugs with attachments, no insight into product/component',
      engine: 'url-extraction',
      constraintSpec: {
        url: 'parsedUrl.href',
        // We explicitly use the tab's title, so if it changes, we want our
        // breadcrumbs to change too.
        title: 'title'
      },
      // no need to cache, our state is synchronously derived.
      cacheKeySpec: null,
      /**
       * The whole schema is potentially in flux.  Note that we're optimizing
       * for safety of the output product in avoiding side-channel leaks.  This
       * means no regexps and construction of anything that might be a URL has
       * to explicitly be built as a URL and our URL building will only produce
       * site-relative URL's.
       */
      spec: {
        patterns: [
          // Viewing a bug.
          {
            match: {
              pathname: '/show_bug.cgi'
            },
            results: [
              {
                // Rebuild the bug URL.  We could also have used a type of
                // 'same-url' but I vaguely think I've seen URL variants that
                // might mean we really want to normalize to best match up with
                // the other cases.
                url: {
                  type: 'url',
                  pathname: '/show_bug.cgi',
                  searchParams: {
                    id: { type: 'searchParam', key: 'id' }
                  }
                },
                title: {
                  // just reuse the title in question.
                  type: 'tab.title'
                },
                // indicate this title should clobber the other title.
                titleStrength: {
                  type: 'string',
                  parts: ['strong']
                }
              }
            ]
          },
          // Viewing an attachment.
          // *
          // * Splinter: id=splinter.html&bug=1355608&attachment=8860209
          {
            match: {
              pathname: '/page.cgi'
            },
            results: [
              {
                url: {
                  type: 'url',
                  pathname: '/show_bug.cgi',
                  searchParams: {
                    id: { type: 'searchParam', key: 'bug' }
                  }
                },
                title: {
                  type: 'string',
                  // Don't prefix with "Bug " because bug titles are just the
                  // number and then a dash.
                  parts: [{ type: 'searchParam', key: 'bug' }]
                },
              },
              {
                url: { type: 'same-url'},
                title: {
                  type: 'string',
                  parts: ['Review ', { type: 'searchParam', key: 'attachment'}]
                }
              }
            ]
          },
          // Things we can't breadcrumb via URL match:
          // * Attachment details.  The URL only includes the attachment id.
          // * Normal
        ]
      }
    }
  }
};

module.exports = hardcodedSiteInfo;
