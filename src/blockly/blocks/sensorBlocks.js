// ============================================================
// sensorBlocks.js — SENSOR BLOCK DEFINITIONS
// ============================================================
// Sensor blocks are DIFFERENT from movement blocks in one key way:
// they are VALUE blocks (oval-shaped) rather than STATEMENT blocks
// (rectangular, snap above/below).
//
// A value block returns data. You plug it INTO another block, like:
//   [if] [obstacle closer than 20 cm] → [stop motors]
//
// The signal: a block is a value block if it has "output" instead
// of "previousStatement"/"nextStatement".
//
// "output": "Number"  → oval that returns a number
// "output": "Boolean" → oval that returns true/false
// ============================================================

import * as Blockly from 'blockly';

Blockly.defineBlocksWithJsonArray([

  // ── get_distance ──────────────────────────────────────────
  // Returns the distance in cm measured by the HC-SR04 sensor.
  // This is a pure value block — no output pin, just an oval.
  {
    "type": "get_distance",
    "message0": "distance (cm)",
    "output": "Number",
    "colour": 20,
    "tooltip": "Read distance from the HC-SR04 ultrasonic sensor (in cm)"
  },

  // ── is_obstacle_close ─────────────────────────────────────
  // Returns true if an obstacle is closer than the given threshold.
  // Useful inside an "if" block: "if obstacle closer than 20 cm → stop"
  {
    "type": "is_obstacle_close",
    "message0": "obstacle closer than %1 cm",
    "args0": [
      { "type": "field_number", "name": "THRESHOLD", "value": 20, "min": 1, "max": 400 }
    ],
    "output": "Boolean",
    "colour": 20,
    "tooltip": "True if the ultrasonic sensor detects an object within the threshold distance"
  }

]);
