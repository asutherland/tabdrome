const GroupComponent = require('./group_component');
const varyByGroup = require('./vary_by_group');

class BreadcrumbGroup extends GroupComponent {
  render() {
    const group = this.props.group;
    const nodeProps = group.nodeProps;

    const childGroups = varyByGroup(group.children);
    return (
      <section className='BreadcrumbGroup'>
        <h4 className='BreadcrumbGroup-crumb'>{ nodeProps.text }</h4>
        { childGroups }
      </section>
    );
  }
}

module.exports = BreadcrumbGroup;
