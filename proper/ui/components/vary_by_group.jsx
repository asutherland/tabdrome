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

// Because of circular depenencies and our require clobbering the initial
// module.exports value, it's necessary that we put our requires after we
// perform our export.  This works because of hoisting and what not.
const BreadcrumbGroup = require('./breadcrumb_group');
const DomainGroup = require('./domain_group');
const SimpleTab = require('./simple_tab');
