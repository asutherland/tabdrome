const BreadcrumbGroup = require('./breadcrumb_group');
const DomainGroup = require('./domain_group');
const SimpleTab = require('./simple_tab');

function varyByGroup(group) {
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

module.exports = varyByGroup;