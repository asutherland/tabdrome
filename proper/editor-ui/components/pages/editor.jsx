import { Component } from 'react';

import BlocklyComponent from 'react-blockly-component';
const { BlocklyEditor } = BlocklyComponent;

export default class EditorPage extends Component {
  render() {
    return (
      <div>
        <BlocklyEditor />
      </div>
    );
  }
}
