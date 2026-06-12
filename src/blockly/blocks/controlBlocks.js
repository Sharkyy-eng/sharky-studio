// ============================================================
// controlBlocks.js — CONTROL BLOCK DEFINITIONS
// ============================================================
// Blockly ships with built-in control blocks (controls_if,
// controls_repeat_ext, controls_whileUntil). We only need to
// define custom ones that Blockly doesn't provide.
//
// "repeat forever" is a Scratch staple — Blockly has no built-in
// equivalent, so we define it here.
//
// Notice: no "nextStatement" — nothing after a forever loop runs,
// just like in Scratch where the block has no bottom connector.
// ============================================================

import * as Blockly from 'blockly';

Blockly.defineBlocksWithJsonArray([

  // ── repeat forever ────────────────────────────────────────
  // The "C-shaped" block: it wraps other blocks inside it.
  // "input_dummy" + "input_statement" gives us the mouth shape.
  {
    "type": "repeat_forever",
    "message0": "repeat forever %1 %2",
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "colour": 65,
    "tooltip": "Repeat the inner blocks forever — like Scratch's forever block"
  }

]);
