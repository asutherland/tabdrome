const GroupComponent = require('./group_component');

const varyByGroup = require('./vary_by_group');

class VertTabBar extends GroupComponent {
  render() {
    const group = this.props.group;

    const childGroups = varyByGroup.mapAll(group.children);

    return <div className='VertTabBar'>{ childGroups }</div>;
  }
}

module.exports = VertTabBar;
