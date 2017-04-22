const React = require('react');

/**
 * For rendering serialized groups where state changes are always accompanied by
 * a change in their `serial`.  Groups are always passed as `group`.
 */
class GroupComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  shouldComponentUpdate(nextProps) {
    return this.props.group.serial !== nextProps.group.serial;
  }
}

module.exports = GroupComponent;