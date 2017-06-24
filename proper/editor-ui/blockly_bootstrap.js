import Blockly from 'node-blockly/browser';
window.Blockly = Blockly;

import tabdromeBlocks from './blocks/block_defs.json';

Blockly.defineBlocksWithJsonArray(tabdromeBlocks);
