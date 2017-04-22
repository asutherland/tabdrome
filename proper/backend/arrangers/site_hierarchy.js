/**
 * Reverse the components of the domain name so we can get a sort key that
 * clusters based on domain hierarchy.
 */
function makeClusteringDomainSortString(domain) {
  return domain.split('.').reverse().join('.');
}

class SiteHierarchyArranger {
  constructor() {
  }

  /**
   *
   */
  bidForTab(normTab) {
    // If something sent us breadcrumbs, this implies intent to use the
    // breadcrumb hierarchy for organization.  (Or at least it will if/when the
    // breadrumb-providers aren't baked into our own extension.)
    //
    // Some other bid (like a user session with intent) could outbid this.
    if (normTab.fromContent.breadcrumbs) {
      return 'extension-implies-intent';
    }

    return null;
  }

  arrangeTab(normTabs, root) {
    // (we will only get tabs we bid for)
    for (let normTab of normTabs) {
      let node = root.getOrCreateGroup(
        {
          type: 'domain',
          domain: normTab.parsedUrl.hostname
        },
        {
          // We go in the domains group of the root.
          rootSortGroup: 'domains',
          rootSortKey: makeClusteringDomainSortString(
            normTab.parsedUrl.hostname),
          // And our children just want to be sorted by their text value.
          sortChildrenBy: 'text'
          // as a parent, our serial is derived from our children exclusively
        });

      let breadcrumbs = normTab.fromContent.breadcrumbs;
      for (let crumb of breadcrumbs) {
        node = node.getOrCreateGroup(
          {
            text: crumb.text || normTab.title
          },
          {
            //
            type: 'breadcrumb',
            url: crumb.url,
            // In the event non-breadcrumbs get binned in with us in the future,
            // let them happen before us to avoid ambiguity.
            sortGroup: 'custom-after',
            sortChildrenBy: 'text',
            serial: normTab.serial
          });
      }

      // And just put the tab at its breadcrumb location.
      if (node.props.tab) {
        console.warn('duplicate tab? group:', node, 'tab:', normTab);
      }
      node.props.tab = normTab;
    }
  }
}

module.exports = SiteHierarchyArranger;
