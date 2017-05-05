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
  'XXXhttps://bugzilla.mozilla.org': {
    breadcrumbs: {
      type: 'url-extraction',
      label: 'Cluster bugs with attachments',
      patterns: [
        {
          match: {
            pathname: '/show_bug.cgi'
          },
          results: [

          ]
        },
        {
          match: {
            pathname: '/page.cgi'
          },
          results: [

            {
              // the title here needs to be weak; we want the show_bug case to
              // be able to contribute the page's title in a way that overrides
              // the path segment we provide here.
              // TODO: make site_hierarchy understand "path" and "title".  title
              // is what to display, and path if omitted.  If path is provided
              // and title omitted, path is a weak title and should be clobbered
              // by a strong title.  If both are provided, both are used, with
              // title clobbering any weak title.
              path: {},
              url: {}
            }
          ]
        }
      ]
    }
  }
};

module.exports = hardcodedSiteInfo;
