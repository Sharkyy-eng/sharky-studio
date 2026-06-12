// ============================================================
// generators/python.js — MICROPYTHON CODE GENERATOR
// ============================================================
// Same structure as arduino.js but produces MicroPython.
//
// Key Python differences from Arduino C++:
//   - Indentation is SYNTAX (not just style) — 4 spaces per level
//   - No variable declarations needed — just assign and go
//   - Booleans are True/False (capital), not true/false
//   - `not`, `and`, `or` instead of !, &&, ||
//   - ** instead of pow() for exponentiation
//   - random.randint(lo, hi) is INCLUSIVE on both ends (unlike Arduino)
//
// INDENT is set to 4 spaces. generator.statementToCode() uses INDENT
// automatically, so nested block bodies come out correctly indented.
// ============================================================

import * as Blockly from 'blockly';

export const pythonGenerator = new Blockly.Generator('Python');

pythonGenerator.ORDER_ATOMIC = 0;

// Python requires exactly 4 spaces per indent level
pythonGenerator.INDENT = '    ';

pythonGenerator.scrub_ = function (block, code, thisOnly) {
  const nextBlock = block.nextConnection?.targetBlock();
  if (nextBlock && !thisOnly) {
    return code + pythonGenerator.blockToCode(nextBlock);
  }
  return code;
};

// ─── MOVEMENT ───────────────────────────────────────────────

pythonGenerator.forBlock['move_forward']  = (b) => `move_forward(${b.getFieldValue('DIST')})\n`;
pythonGenerator.forBlock['move_backward'] = (b) => `move_backward(${b.getFieldValue('DIST')})\n`;
pythonGenerator.forBlock['turn_left']     = (b) => `turn_left(${b.getFieldValue('DEG')})\n`;
pythonGenerator.forBlock['turn_right']    = (b) => `turn_right(${b.getFieldValue('DEG')})\n`;
pythonGenerator.forBlock['stop_motors']   = ()  => `stop_motors()\n`;

// ─── SENSORS ────────────────────────────────────────────────

pythonGenerator.forBlock['get_distance'] = () => [`get_distance()`, 0];
pythonGenerator.forBlock['is_obstacle_close'] = (block) =>
  [`(get_distance() < ${block.getFieldValue('THRESHOLD')})`, 0];

// ─── ACTUATORS ──────────────────────────────────────────────

pythonGenerator.forBlock['set_servo'] = function (block) {
  const angle = block.getFieldValue('ANGLE');
  // Map 0-180° to a duty cycle (0-1023 range, ~25-125 for standard servos at 50Hz)
  const duty = Math.round((angle / 180) * 100 + 25);
  return `servo.duty(${duty})\n`;
};
pythonGenerator.forBlock['wait_ms'] = (b) => `time.sleep_ms(${b.getFieldValue('MS')})\n`;

// ─── CONTROL ────────────────────────────────────────────────
// Python uses if/elif/else with colons, no braces.
// Empty branches need `pass` or Python throws a SyntaxError.

pythonGenerator.forBlock['controls_if'] = function (block, generator) {
  let n = 0;
  let code = '';
  do {
    const cond = generator.valueToCode(block, 'IF' + n, 0) || 'False';
    let body = generator.statementToCode(block, 'DO' + n);
    if (!body) body = generator.INDENT + 'pass\n'; // Python requires something in every branch
    code += (n === 0 ? 'if' : 'elif') + ` ${cond}:\n${body}`;
    n++;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE')) {
    let body = generator.statementToCode(block, 'ELSE');
    if (!body) body = generator.INDENT + 'pass\n';
    code += `else:\n${body}`;
  }
  return code;
};

pythonGenerator.forBlock['controls_repeat_ext'] = function (block, generator) {
  const times = generator.valueToCode(block, 'TIMES', 0) || '0';
  let body = generator.statementToCode(block, 'DO');
  if (!body) body = generator.INDENT + 'pass\n';
  return `for _count in range(${times}):\n${body}`;
};

pythonGenerator.forBlock['controls_whileUntil'] = function (block, generator) {
  const until = block.getFieldValue('MODE') === 'UNTIL';
  const cond = generator.valueToCode(block, 'BOOL', 0) || 'False';
  let body = generator.statementToCode(block, 'DO');
  if (!body) body = generator.INDENT + 'pass\n';
  // "until X" is the same as "while not X"
  return `while ${until ? `not ${cond}` : cond}:\n${body}`;
};

pythonGenerator.forBlock['repeat_forever'] = function (block, generator) {
  let body = generator.statementToCode(block, 'DO');
  if (!body) body = generator.INDENT + 'pass\n';
  return `while True:\n${body}`;
};

// ─── OPERATORS ──────────────────────────────────────────────

pythonGenerator.forBlock['math_number'] = (b) => [String(b.getFieldValue('NUM')), 0];

pythonGenerator.forBlock['math_arithmetic'] = function (block, generator) {
  const ops = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' };
  const op = ops[block.getFieldValue('OP')];
  const a = generator.valueToCode(block, 'A', 0) || '0';
  const b = generator.valueToCode(block, 'B', 0) || '0';
  return [`(${a} ${op} ${b})`, 0];
};

pythonGenerator.forBlock['math_random_int'] = function (block, generator) {
  const from = generator.valueToCode(block, 'FROM', 0) || '0';
  const to   = generator.valueToCode(block, 'TO',   0) || '0';
  // random.randint(a, b) is inclusive on both ends in Python
  return [`random.randint(${from}, ${to})`, 0];
};

pythonGenerator.forBlock['logic_compare'] = function (block, generator) {
  const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  const a = generator.valueToCode(block, 'A', 0) || '0';
  const b = generator.valueToCode(block, 'B', 0) || '0';
  return [`(${a} ${ops[block.getFieldValue('OP')]} ${b})`, 0];
};

pythonGenerator.forBlock['logic_operation'] = function (block, generator) {
  // Python uses `and`/`or` as keywords, not && / ||
  const op = block.getFieldValue('OP') === 'AND' ? 'and' : 'or';
  const a = generator.valueToCode(block, 'A', 0) || 'False';
  const b = generator.valueToCode(block, 'B', 0) || 'False';
  return [`(${a} ${op} ${b})`, 0];
};

pythonGenerator.forBlock['logic_negate'] = function (block, generator) {
  const val = generator.valueToCode(block, 'BOOL', 0) || 'False';
  return [`(not ${val})`, 0];
};

pythonGenerator.forBlock['logic_boolean'] = (b) =>
  [b.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False', 0];

// ─── VARIABLES ──────────────────────────────────────────────
// Python doesn't need declarations — just assign.
// We still initialize all variables at the top of main() so they
// exist before they're read (avoids UnboundLocalError).

pythonGenerator.forBlock['variables_get'] = (block) =>
  [block.getField('VAR').getText(), 0];

pythonGenerator.forBlock['variables_set'] = function (block, generator) {
  const name  = block.getField('VAR').getText();
  const value = generator.valueToCode(block, 'VALUE', 0) || '0';
  return `${name} = ${value}\n`;
};

pythonGenerator.forBlock['math_change'] = function (block, generator) {
  const name  = block.getField('VAR').getText();
  const delta = generator.valueToCode(block, 'DELTA', 0) || '0';
  return `${name} += ${delta}\n`;
};

// ─── FULL SCRIPT WRAPPER ─────────────────────────────────────

export function workspaceToPython(workspace) {
  const body = pythonGenerator.workspaceToCode(workspace);

  if (!body.trim()) {
    return '# Drag some blocks onto the workspace to generate code!';
  }

  // Initialize all user-created variables to 0 at the top of main()
  const vars = workspace.getAllVariables();
  const varInits = vars.length > 0
    ? vars.map(v => `    ${v.name} = 0`).join('\n') + '\n\n'
    : '';

  // Indent every generated line by 4 spaces so it sits inside main()
  const indented = body
    .split('\n')
    .map(line => (line ? `    ${line}` : ''))
    .join('\n');

  return `# ============================================================
# Generated by Sharky Studio
# Upload to your ESP32 with Thonny:
#   Tools → Options → Interpreter → MicroPython (ESP32)
#   Save this file as main.py on the device
# ============================================================

import time
import random
from machine import Pin, PWM

# ── L298N Motor Driver ───────────────────────────────────────
IN1  = Pin(27, Pin.OUT)
IN2  = Pin(26, Pin.OUT)
EN_A = PWM(Pin(14), freq=1000)
IN3  = Pin(25, Pin.OUT)
IN4  = Pin(33, Pin.OUT)
EN_B = PWM(Pin(32), freq=1000)

# ── HC-SR04 Ultrasonic Sensor ────────────────────────────────
TRIG = Pin(5, Pin.OUT)
ECHO = Pin(18, Pin.IN)

# ── Servo Motor ─────────────────────────────────────────────
servo = PWM(Pin(13), freq=50)


def stop_motors():
    IN1.off(); IN2.off(); IN3.off(); IN4.off()
    EN_A.duty(0); EN_B.duty(0)

def move_forward(cm):
    IN1.on(); IN2.off(); IN3.on(); IN4.off()
    EN_A.duty(800); EN_B.duty(800)
    time.sleep(cm / 20.0)
    stop_motors()

def move_backward(cm):
    IN1.off(); IN2.on(); IN3.off(); IN4.on()
    EN_A.duty(800); EN_B.duty(800)
    time.sleep(cm / 20.0)
    stop_motors()

def turn_left(deg):
    IN1.off(); IN2.on(); IN3.on(); IN4.off()
    EN_A.duty(700); EN_B.duty(700)
    time.sleep(deg / 90.0 * 0.5)
    stop_motors()

def turn_right(deg):
    IN1.on(); IN2.off(); IN3.off(); IN4.on()
    EN_A.duty(700); EN_B.duty(700)
    time.sleep(deg / 90.0 * 0.5)
    stop_motors()

def get_distance():
    TRIG.off(); time.sleep_us(2)
    TRIG.on();  time.sleep_us(10)
    TRIG.off()
    start = time.ticks_us()
    while ECHO.value() == 0: start = time.ticks_us()
    end = start
    while ECHO.value() == 1: end = time.ticks_us()
    return time.ticks_diff(end, start) * 0.034 / 2


def main():
${varInits}${indented}


main()
`;
}
