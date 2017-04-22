const GroupComponent = require('./group_component');

class SimpleTab extends GroupComponent {
  render() {
    let group = this.props.group;
    let normTab = group.nodeProps.tab;
    return <div className='SimpleTab'>{ normTab.title }</div>;
  }
}

module.exports = SimpleTab;
