import GroupComponent from './group_component';
import varyByGroup from './vary_by_group';

/**
 * Hierarchical breadcrumb groups.  Each level of the trail can be one of three
 * things:
 * - An existing tab.  We have a tab corresponding to this crumb.
 * - A potential tab.  There is no open tab for the crumb, but we have a URL for
 *   the crumb so we can totally open such a tab.
 * - Title-only crumb.  The crumb didn't have a URL and we're lacking a tab.
 *   Not sure this would happen in practice; at least for MDN only the terminal
 *   crumb which is the current URL falls into that case, in which case we are
 *   covered by the 'existing tab' case.
 *
 */
export default class BreadcrumbGroup extends GroupComponent {
  constructor() {
    super();
    this.handleCrumbClick = this.handleCrumbClick.bind(this);

    this.suppressCreation = false;
  }

  handleCrumbClick() {
    const nodeProps = this.props.group.nodeProps;
    const normTab = nodeProps.tab;
    const url = nodeProps.url;

    if (normTab) {
      console.log('asking to activate', normTab.id);
      browser.tabs.update(normTab.id, { active: true });
    } else if (url && !this.suppressCreation) {
      // We only want to try and create the tab once, so we've added this
      // half-assed guard to avoid treating multiple clicks as multiple creation
      // requests.  User intent would clearly to be to switch, not redundantly
      // create.
      //
      // This may be an argument for plumbing this creation through the
      // back-end, especially because the breadcrumbs may take a non-trivial
      // amount of time to look up.
      this.suppressCreation = true;
      browser.tabs.create({ url });
    }
  }

  render() {
    const group = this.props.group;
    const nodeProps = group.nodeProps;
    const normTab = group.nodeProps.tab; // (may be null/undefined)

    let crumbClasses = 'BreadcrumbGroup-crumb';
    if (normTab) {
      // - Existing Tab
      crumbClasses += ' BreadcrumbGroup-tabCrumb';
      if (normTab.active) {
        crumbClasses += ' ActiveTab';
      }
    } else if (nodeProps.url) {
      // - Potential Tab
      crumbClasses += ' BreadcrumbGroup-potentialTabCrumb';
    } else {
      // - Title-Only Crumb
      crumbClasses += ' BreadcrumbGroup-titleOnlyCrumb';
    }

    const childGroups = varyByGroup.mapAll(group.children);
    return (
      <section className='BreadcrumbGroup'>
        <h4 className={ crumbClasses } onClick={ this.handleCrumbClick }>
          { nodeProps.text }
        </h4>
        <div className='BreadcrumbGroup-children'>
          { childGroups }
        </div>
      </section>
    );
  }
}
