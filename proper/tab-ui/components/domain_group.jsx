import GroupComponent from './group_component';
import varyByGroup from './vary_by_group';

export default class DomainGroup extends GroupComponent {
  render() {
    const group = this.props.group;
    const nodeProps = group.nodeProps;

    const childGroups = varyByGroup.mapAll(group.children);
    return (
      <section className='DomainGroup'>
        <h4 className='DomainGroup-domain'>{ nodeProps.domain }</h4>
        { childGroups }
      </section>
    );
  }
}
