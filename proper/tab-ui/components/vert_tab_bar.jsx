import { ContextMenu } from 'react-contextmenu';

import GroupComponent from './group_component';
import varyByGroup from './vary_by_group';

export default class VertTabBar extends GroupComponent {
  render() {
    const group = this.props.group;

    const childGroups = varyByGroup.mapAll(group.children);

    return (
      <div className='VertTabBar'>
        <div className='VertTabBar-toolbar'>
        </div>
        <div className='VertTabBar-scrolly'>
          { childGroups }
        </div>
      </div>
    );
  }
}
