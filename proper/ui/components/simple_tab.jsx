const GroupComponent = require('./group_component');

class SimpleTab extends GroupComponent {
  constructor() {
    super();

    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * For now, the only behavior we support is tab switching.
   *
   * We just issue the webext API call directly since that results in the
   * desired unidirectional flow, we have the permissions, and it's not like we
   * can do it any faster by bouncing it to the background page.
   */
  handleClick() {
    const normTab = this.props.group.nodeProps.tab;
    console.log('asking to activate', normTab.id);
    browser.tabs.update(normTab.id, { active: true });
  }

  render() {
    const group = this.props.group;
    const normTab = group.nodeProps.tab;

    let classes = 'SimpleTab';
    // React currently doesn't make it easy for us to propagate an attribute
    // through so we could do [active=true], so we're just throwing additional
    // classes on so that the selector can be .SimpleTab.ActiveTab to win the
    // specificity contest and be effectively namespaced.
    if (normTab.active) {
      classes += ' ActiveTab';
    }
    return <div className={ classes } onClick={ this.handleClick}>
      { normTab.title }
    </div>;
  }
}

module.exports = SimpleTab;
