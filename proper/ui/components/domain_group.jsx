const GroupComponent = require('./group_component');
const varyByGroup = require('./vary_by_group');

class DomainGroup extends GroupComponent {
  render() {
    const group = this.props.group;
    const nodeProps = group.nodeProps;

    const childGroups = varyByGroup(group.children);
    return (
      <section className='DomainGroup'>
        <h4 className='DomainGroup-domain'>{ nodeProps.domain }</h4>
        { childGroups }
      </section>
    );
  }
}

module.exports = DomainGroup;
