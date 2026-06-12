import * as Blockly from 'blockly';
import { SPRITE_LIBRARY } from '../../sprites/library.js';

// All costume names across the sprite library, deduplicated, for the
// "switch costume to" dropdown. Sprites without a matching costume name
// simply ignore the block (see sprite_switch_costume in spriteExecutor.js).
const ALL_COSTUME_NAMES = [...new Set(SPRITE_LIBRARY.flatMap(item => item.costumes.map(c => c.name)))];

Blockly.common.defineBlocksWithJsonArray([

  // ── MOTION ───────────────────────────────────────────────────────
  {
    type: 'sprite_move_steps',
    message0: 'move %1 steps',
    args0: [{ type: 'field_number', name: 'STEPS', value: 10 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_turn_right',
    message0: 'turn right %1 °',
    args0: [{ type: 'field_number', name: 'DEGREES', value: 15 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_turn_left',
    message0: 'turn left %1 °',
    args0: [{ type: 'field_number', name: 'DEGREES', value: 15 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_go_to_xy',
    message0: 'go to x: %1 y: %2',
    args0: [
      { type: 'field_number', name: 'X', value: 0 },
      { type: 'field_number', name: 'Y', value: 0 },
    ],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_glide_secs_to_xy',
    message0: 'glide %1 secs to x: %2 y: %3',
    args0: [
      { type: 'field_number', name: 'SECS', value: 1, min: 0 },
      { type: 'field_number', name: 'X', value: 0 },
      { type: 'field_number', name: 'Y', value: 0 },
    ],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_point_in_direction',
    message0: 'point in direction %1 °',
    args0: [{ type: 'field_number', name: 'DIRECTION', value: 0 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_change_x_by',
    message0: 'change x by %1',
    args0: [{ type: 'field_number', name: 'DX', value: 10 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_change_y_by',
    message0: 'change y by %1',
    args0: [{ type: 'field_number', name: 'DY', value: 10 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_set_x',
    message0: 'set x to %1',
    args0: [{ type: 'field_number', name: 'X', value: 0 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_set_y',
    message0: 'set y to %1',
    args0: [{ type: 'field_number', name: 'Y', value: 0 }],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_if_on_edge_bounce',
    message0: 'if on edge, bounce',
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  {
    type: 'sprite_set_rotation_style',
    message0: 'set rotation style %1',
    args0: [{ type: 'field_dropdown', name: 'STYLE', options: [
      ['all around', 'all'], ['left-right', 'lr'], ["don't rotate", 'none'],
    ]}],
    previousStatement: null, nextStatement: null, colour: '#4C97FF',
  },
  // Motion reporters
  { type: 'sprite_x_position', message0: 'x position', output: 'Number', colour: '#4C97FF' },
  { type: 'sprite_y_position', message0: 'y position', output: 'Number', colour: '#4C97FF' },
  { type: 'sprite_direction',  message0: 'direction',  output: 'Number', colour: '#4C97FF' },

  // ── LOOKS ────────────────────────────────────────────────────────
  {
    type: 'sprite_say_for_secs',
    message0: 'say %1 for %2 secs',
    args0: [
      { type: 'field_input', name: 'TEXT', text: 'Hello!' },
      { type: 'field_number', name: 'SECS', value: 2, min: 0 },
    ],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  {
    type: 'sprite_say',
    message0: 'say %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Hello!' }],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  {
    type: 'sprite_think_for_secs',
    message0: 'think %1 for %2 secs',
    args0: [
      { type: 'field_input', name: 'TEXT', text: 'Hmm...' },
      { type: 'field_number', name: 'SECS', value: 2, min: 0 },
    ],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  {
    type: 'sprite_think',
    message0: 'think %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Hmm...' }],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  {
    type: 'sprite_change_size_by',
    message0: 'change size by %1',
    args0: [{ type: 'field_number', name: 'DELTA', value: 10 }],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  {
    type: 'sprite_set_size_to',
    message0: 'set size to %1 %',
    args0: [{ type: 'field_number', name: 'SIZE', value: 100, min: 0 }],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  { type: 'sprite_next_costume', message0: 'next costume', previousStatement: null, nextStatement: null, colour: '#9966FF' },
  {
    type: 'sprite_switch_costume',
    message0: 'switch costume to %1',
    args0: [{ type: 'field_dropdown', name: 'COSTUME', options: ALL_COSTUME_NAMES.map(n => [n, n]) }],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  { type: 'sprite_show', message0: 'show', previousStatement: null, nextStatement: null, colour: '#9966FF' },
  { type: 'sprite_hide', message0: 'hide', previousStatement: null, nextStatement: null, colour: '#9966FF' },
  {
    type: 'sprite_go_to_layer',
    message0: 'go to %1 layer',
    args0: [{ type: 'field_dropdown', name: 'LAYER', options: [['front', 'front'], ['back', 'back']] }],
    previousStatement: null, nextStatement: null, colour: '#9966FF',
  },
  // Looks reporters
  { type: 'sprite_size_reporter', message0: 'size', output: 'Number', colour: '#9966FF' },

  // ── EVENTS ───────────────────────────────────────────────────────
  // Hat blocks: no previousStatement
  {
    type: 'sprite_when_flag_clicked',
    message0: 'when flag clicked',
    nextStatement: null,
    colour: '#FFD500',
  },
  {
    type: 'sprite_when_key_pressed',
    message0: 'when %1 key pressed',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: [
      ['space', 'space'],
      ['up arrow', 'ArrowUp'], ['down arrow', 'ArrowDown'],
      ['left arrow', 'ArrowLeft'], ['right arrow', 'ArrowRight'],
      ['any', 'any'],
      ['a','a'],['b','b'],['c','c'],['d','d'],['e','e'],['f','f'],
      ['g','g'],['h','h'],['i','i'],['j','j'],['k','k'],['l','l'],
      ['m','m'],['n','n'],['o','o'],['p','p'],['q','q'],['r','r'],
      ['s','s'],['t','t'],['u','u'],['v','v'],['w','w'],['x','x'],
      ['y','y'],['z','z'],
    ]}],
    nextStatement: null,
    colour: '#FFD500',
  },
  {
    type: 'sprite_when_clicked',
    message0: 'when this sprite clicked',
    nextStatement: null,
    colour: '#FFD500',
  },
  {
    type: 'sprite_broadcast',
    message0: 'broadcast %1',
    args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
    previousStatement: null, nextStatement: null, colour: '#FFD500',
  },
  {
    type: 'sprite_broadcast_and_wait',
    message0: 'broadcast %1 and wait',
    args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
    previousStatement: null, nextStatement: null, colour: '#FFD500',
  },
  {
    type: 'sprite_when_i_receive',
    message0: 'when I receive %1',
    args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
    nextStatement: null,
    colour: '#FFD500',
  },

  // ── CONTROL ──────────────────────────────────────────────────────
  {
    type: 'sprite_wait',
    message0: 'wait %1 secs',
    args0: [{ type: 'field_number', name: 'SECS', value: 1, min: 0 }],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_repeat',
    message0: 'repeat %1',
    args0: [{ type: 'field_number', name: 'TIMES', value: 10, min: 1 }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_forever',
    message0: 'forever',
    args0: [],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,   // no nextStatement: nothing goes after forever
    colour: '#FFAB19',
  },
  {
    type: 'sprite_if',
    message0: 'if %1 then',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_if_else',
    message0: 'if %1 then',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    message2: 'else %1',
    args2: [{ type: 'input_statement', name: 'ELSE' }],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_wait_until',
    message0: 'wait until %1',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_repeat_until',
    message0: 'repeat until %1',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_stop',
    message0: 'stop %1',
    args0: [{ type: 'field_dropdown', name: 'OPTION', options: [
      ['all', 'all'], ['this script', 'script'],
    ]}],
    previousStatement: null,   // no nextStatement
    colour: '#FFAB19',
  },
  // Clones
  {
    type: 'sprite_when_i_start_as_clone',
    message0: 'when I start as a clone',
    nextStatement: null,
    colour: '#FFAB19',
  },
  {
    type: 'sprite_create_clone_of',
    message0: 'create clone of %1',
    args0: [{ type: 'field_dropdown', name: 'TARGET', options: [
      ['myself', 'myself'],
    ]}],
    previousStatement: null, nextStatement: null, colour: '#FFAB19',
  },
  {
    type: 'sprite_delete_clone',
    message0: 'delete this clone',
    previousStatement: null,   // no nextStatement
    colour: '#FFAB19',
  },

  // ── OPERATORS ────────────────────────────────────────────────────
  // Arithmetic (Number reporters)
  {
    type: 'sprite_add',
    message0: '%1 + %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_subtract',
    message0: '%1 - %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_multiply',
    message0: '%1 × %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_divide',
    message0: '%1 / %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_mod',
    message0: '%1 mod %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_round',
    message0: 'round %1',
    args0: [{ type: 'input_value', name: 'A', check: 'Number' }],
    output: 'Number', colour: '#59C059',
  },
  {
    type: 'sprite_random',
    message0: 'pick random %1 to %2',
    args0: [
      { type: 'field_number', name: 'FROM', value: 1 },
      { type: 'field_number', name: 'TO', value: 10 },
    ],
    output: 'Number', colour: '#59C059',
  },
  {
    type: 'sprite_math_op',
    message0: '%1 of %2',
    args0: [
      { type: 'field_dropdown', name: 'OP', options: [
        ['abs','abs'],['floor','floor'],['ceiling','ceiling'],
        ['sqrt','sqrt'],['sin','sin'],['cos','cos'],['tan','tan'],
        ['asin','asin'],['acos','acos'],['atan','atan'],
        ['ln','ln'],['log','log'],['e^','exp'],['10^','pow10'],
      ]},
      { type: 'input_value', name: 'A', check: 'Number' },
    ],
    output: 'Number', colour: '#59C059',
  },
  // Comparison (Boolean reporters)
  {
    type: 'sprite_gt',
    message0: '%1 > %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Boolean', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_lt',
    message0: '%1 < %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Boolean', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_eq',
    message0: '%1 = %2',
    args0: [
      { type: 'input_value', name: 'A' },
      { type: 'input_value', name: 'B' },
    ],
    output: 'Boolean', colour: '#59C059', inputsInline: true,
  },
  // Logic (Boolean reporters)
  {
    type: 'sprite_and',
    message0: '%1 and %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Boolean' },
      { type: 'input_value', name: 'B', check: 'Boolean' },
    ],
    output: 'Boolean', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_or',
    message0: '%1 or %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'Boolean' },
      { type: 'input_value', name: 'B', check: 'Boolean' },
    ],
    output: 'Boolean', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_not',
    message0: 'not %1',
    args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }],
    output: 'Boolean', colour: '#59C059',
  },
  // String
  {
    type: 'sprite_join',
    message0: 'join %1 %2',
    args0: [
      { type: 'input_value', name: 'A' },
      { type: 'input_value', name: 'B' },
    ],
    output: 'String', colour: '#59C059', inputsInline: true,
  },
  {
    type: 'sprite_letter_of',
    message0: 'letter %1 of %2',
    args0: [
      { type: 'field_number', name: 'INDEX', value: 1, min: 1 },
      { type: 'input_value', name: 'TEXT', check: 'String' },
    ],
    output: 'String', colour: '#59C059',
  },
  {
    type: 'sprite_length_of',
    message0: 'length of %1',
    args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
    output: 'Number', colour: '#59C059',
  },
  {
    type: 'sprite_contains',
    message0: '%1 contains %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'String' },
      { type: 'input_value', name: 'B' },
    ],
    output: 'Boolean', colour: '#59C059', inputsInline: true,
  },
  // Literal value blocks (used as shadow/connector blocks)
  {
    type: 'sprite_number',
    message0: '%1',
    args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
    output: 'Number', colour: '#59C059',
  },
  {
    type: 'sprite_text',
    message0: '%1',
    args0: [{ type: 'field_input', name: 'TEXT', text: '' }],
    output: 'String', colour: '#59C059',
  },

  // ── SENSING ──────────────────────────────────────────────────────
  {
    type: 'sprite_touching',
    message0: 'touching %1 ?',
    args0: [{ type: 'field_input', name: 'TARGET', text: 'edge' }],
    output: 'Boolean', colour: '#5CB1D6',
  },
  {
    type: 'sprite_distance_to',
    message0: 'distance to %1',
    args0: [{ type: 'field_input', name: 'TARGET', text: 'mouse-pointer' }],
    output: 'Number', colour: '#5CB1D6',
  },
  {
    type: 'sprite_key_pressed',
    message0: 'key %1 pressed?',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: [
      ['space', 'space'],
      ['up arrow', 'ArrowUp'], ['down arrow', 'ArrowDown'],
      ['left arrow', 'ArrowLeft'], ['right arrow', 'ArrowRight'],
      ['any', 'any'],
      ['a','a'],['b','b'],['c','c'],['d','d'],['e','e'],['f','f'],
      ['g','g'],['h','h'],['i','i'],['j','j'],['k','k'],['l','l'],
      ['m','m'],['n','n'],['o','o'],['p','p'],['q','q'],['r','r'],
      ['s','s'],['t','t'],['u','u'],['v','v'],['w','w'],['x','x'],
      ['y','y'],['z','z'],
    ]}],
    output: 'Boolean', colour: '#5CB1D6',
  },
  { type: 'sprite_mouse_x', message0: 'mouse x', output: 'Number', colour: '#5CB1D6' },
  { type: 'sprite_mouse_y', message0: 'mouse y', output: 'Number', colour: '#5CB1D6' },
  { type: 'sprite_mouse_down', message0: 'mouse down?', output: 'Boolean', colour: '#5CB1D6' },
  { type: 'sprite_timer', message0: 'timer', output: 'Number', colour: '#5CB1D6' },
  {
    type: 'sprite_reset_timer',
    message0: 'reset timer',
    previousStatement: null, nextStatement: null, colour: '#5CB1D6',
  },
]);
