import { Component } from 'react';

/**
 * For rendering serialized groups where state changes are always accompanied by
 * a change in their `serial`.  Groups are always passed as `group`.
 *
 * Note that the serial property only holds for aggregate groups under removal
 * because they are actually a hash derived from their children rather than
 * something like max().
 */
export default class GroupComponent extends Component {
  constructor(props) {
    super(props);
  }

  shouldComponentUpdate(nextProps) {
    const curGroup = this.props.group;
    const nextGroup = nextProps.group;
    return curGroup.serial !== nextGroup.serial ||
           curGroup.has !== nextGroup.hash;
  }
}
