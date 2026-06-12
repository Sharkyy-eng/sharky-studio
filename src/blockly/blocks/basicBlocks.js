// ============================================================
// basicBlocks.js — BLOCK DEFINITIONS
// ============================================================
// This file tells Blockly: "These blocks exist."
//
// Each block is a JSON object:
//   "type"        → unique ID (you'll use this everywhere)
//   "message0"    → text on the block. %1 %2 = placeholders for inputs
//   "args0"       → what those placeholders are (number, dropdown, etc)
//   "colour"      → hue 0-360 (like a color wheel)
//   "previousStatement" → can another block connect ABOVE this one?
//   "nextStatement"     → can another block connect BELOW this one?
//   "output"            → if set, this is an OVAL block that returns a value
//
// We start with 3 blocks — same as your dad's mebot-studio.
// We'll add more later.
// ============================================================

import * as Blockly from 'blockly';

Blockly.defineBlocksWithJsonArray([

  // Block 1: Move forward
  {
    "type": "move_forward",
    "message0": "move forward %1 cm",
    "args0": [
      { "type": "field_number", "name": "DIST", "value": 10, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Drive the robot forward"
  },

  // Block 2: Turn left
  {
    "type": "turn_left",
    "message0": "turn left %1 degrees",
    "args0": [
      { "type": "field_number", "name": "DEG", "value": 90 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Rotate the robot left"
  },

  // Block 3: Turn right
  {
    "type": "turn_right",
    "message0": "turn right %1 degrees",
    "args0": [
      { "type": "field_number", "name": "DEG", "value": 90 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Rotate the robot right"
  },

  // Block 4: Move backward
  {
    "type": "move_backward",
    "message0": "move backward %1 cm",
    "args0": [
      { "type": "field_number", "name": "DIST", "value": 10, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Drive the robot backward"
  },

  // Block 5: Stop motors
  // colour: 0 = red — visually stands out as an emergency/stop action
  {
    "type": "stop_motors",
    "message0": "stop motors",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 0,
    "tooltip": "Stop both drive motors immediately"
  }

]);