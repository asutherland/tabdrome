import BreadcrumbGroup from './breadcrumb_group';
import DomainGroup from './domain_group';
import SimpleTab from './simple_tab';

export default function varyByGroup(group) {
  switch (group.nodeProps.type) {
    case 'breadcrumb':
      return <BreadcrumbGroup key={ group.groupRelId } group={ group } />;

    case 'domain':
      return <DomainGroup key={ group.groupRelId } group={ group } />;

    default:
    case 'tab':
      return <SimpleTab key={ group.groupRelId } group={ group } />;
  }
}

varyByGroup.mapAll = function(groups) {
  return groups.map(varyByGroup);
};
