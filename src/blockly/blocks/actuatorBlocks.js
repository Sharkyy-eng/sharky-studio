// ============================================================
// actuatorBlocks.js — ACTUATOR & CONTROL BLOCK DEFINITIONS
// ============================================================
// "Actuators" are outputs — things the robot physically does
// beyond just driving motors. Here: servo motor control.
// "wait_ms" is also here as it controls timing/pacing.
//
// All blocks here are STATEMENT blocks (snap above/below),
// not value blocks, because they perform actions not return data.
// ============================================================

import * as Blockly from 'blockly';

Blockly.defineBlocksWithJsonArray([

  // ── set_servo ─────────────────────────────────────────────
  // Rotates the servo motor to a specific angle.
  // field_number with min/max keeps the input in the valid servo range.
  {
    "type": "set_servo",
    "message0": "set servo to %1 °",
    "args0": [
      { "type": "field_number", "name": "ANGLE", "value": 90, "min": 0, "max": 180 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Rotate the servo motor to the given angle (0 = full left, 90 = centre, 180 = full right)"
  },

  // ── wait_ms ───────────────────────────────────────────────
  // Pauses execution for the given number of milliseconds.
  // 1000 ms = 1 second. Useful between movements.
  {
    "type": "wait_ms",
    "message0": "wait %1 ms",
    "args0": [
      { "type": "field_number", "name": "MS", "value": 500, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 65,
    "tooltip": "Pause the program for the given number of milliseconds (1000 ms = 1 second)"
  }

]);
