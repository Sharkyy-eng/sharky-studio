// ============================================================
// generators/arduino.js — ARDUINO CODE GENERATOR
// ============================================================
// A "generator" is like a compiler pass. You register one
// function per block type; when you call workspaceToCode(),
// Blockly walks the block tree and calls each function.
//
// Two kinds of blocks produce different return types:
//   Statement blocks  → return a string "moveForward(10);\n"
//   Value blocks      → return an array ["getDistance()", 0]
//     The 0 is the precedence order — 0 means "highest, no parens needed"
//
// valueToCode(block, inputName, order) — gets the code for an oval
//   block that is plugged into a value input (like IF condition).
// statementToCode(block, inputName) — gets the code for blocks
//   nested inside a C-shape (like the body of an if/loop).
//   It automatically indents by generator.INDENT.
// ============================================================

import * as Blockly from 'blockly';

export const arduinoGenerator = new Blockly.Generator('Arduino');

arduinoGenerator.ORDER_ATOMIC = 0;

// How much to indent nested code (inside if/while/for bodies)
arduinoGenerator.INDENT = '  ';

// scrub_() stitches each block's code to the next block below it.
arduinoGenerator.scrub_ = function (block, code, thisOnly) {
  const nextBlock = block.nextConnection?.targetBlock();
  if (nextBlock && !thisOnly) {
    return code + arduinoGenerator.blockToCode(nextBlock);
  }
  return code;
};

// ─── MOVEMENT ───────────────────────────────────────────────

arduinoGenerator.forBlock['move_forward'] = function (block) {
  return `moveForward(${block.getFieldValue('DIST')});\n`;
};
arduinoGenerator.forBlock['move_backward'] = function (block) {
  return `moveBackward(${block.getFieldValue('DIST')});\n`;
};
arduinoGenerator.forBlock['turn_left'] = function (block) {
  return `turnLeft(${block.getFieldValue('DEG')});\n`;
};
arduinoGenerator.forBlock['turn_right'] = function (block) {
  return `turnRight(${block.getFieldValue('DEG')});\n`;
};
arduinoGenerator.forBlock['stop_motors'] = function () {
  return `stopMotors();\n`;
};

// ─── SENSORS (value blocks → return [code, order]) ──────────

arduinoGenerator.forBlock['get_distance'] = function () {
  return [`getDistance()`, 0];
};
arduinoGenerator.forBlock['is_obstacle_close'] = function (block) {
  return [`(getDistance() < ${block.getFieldValue('THRESHOLD')})`, 0];
};

// ─── ACTUATORS ──────────────────────────────────────────────

arduinoGenerator.forBlock['set_servo'] = function (block) {
  return `myServo.write(${block.getFieldValue('ANGLE')});\n`;
};
arduinoGenerator.forBlock['wait_ms'] = function (block) {
  return `delay(${block.getFieldValue('MS')});\n`;
};

// ─── CONTROL ────────────────────────────────────────────────
// These blocks use generator.valueToCode() to read oval-shaped
// inputs (conditions) and generator.statementToCode() to read
// C-shape inputs (block bodies). Both are inherited from Blockly.Generator.

arduinoGenerator.forBlock['controls_if'] = function (block, generator) {
  let n = 0;
  let code = '';
  do {
    // valueToCode reads the oval plugged into IF0, IF1, IF2 …
    const condition = generator.valueToCode(block, 'IF' + n, 0) || 'false';
    // statementToCode reads the C-shape body DO0, DO1 … and indents it
    const body = generator.statementToCode(block, 'DO' + n);
    code += (n === 0 ? 'if' : ' else if') + ` (${condition}) {\n${body}}`;
    n++;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE')) {
    const body = generator.statementToCode(block, 'ELSE');
    code += ` else {\n${body}}`;
  }
  return code + '\n';
};

arduinoGenerator.forBlock['controls_repeat_ext'] = function (block, generator) {
  const times = generator.valueToCode(block, 'TIMES', 0) || '0';
  const body = generator.statementToCode(block, 'DO');
  return `for (int _count = 0; _count < ${times}; _count++) {\n${body}}\n`;
};

arduinoGenerator.forBlock['controls_whileUntil'] = function (block, generator) {
  const until = block.getFieldValue('MODE') === 'UNTIL';
  const cond = generator.valueToCode(block, 'BOOL', 0) || 'false';
  const body = generator.statementToCode(block, 'DO');
  return `while (${until ? `!(${cond})` : cond}) {\n${body}}\n`;
};

arduinoGenerator.forBlock['repeat_forever'] = function (block, generator) {
  const body = generator.statementToCode(block, 'DO');
  // while(true) runs until the ESP32 is reset — just like Scratch's forever
  return `while (true) {\n${body}}\n`;
};

// ─── OPERATORS ──────────────────────────────────────────────
// These are all value blocks — they return [code, order].
// The order (0 here) tells Blockly whether to wrap in parens.

arduinoGenerator.forBlock['math_number'] = function (block) {
  const num = block.getFieldValue('NUM');
  return [String(num), 0];
};

arduinoGenerator.forBlock['math_arithmetic'] = function (block, generator) {
  const ops = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: null };
  const op = ops[block.getFieldValue('OP')];
  const a = generator.valueToCode(block, 'A', 0) || '0';
  const b = generator.valueToCode(block, 'B', 0) || '0';
  if (!op) return [`pow(${a}, ${b})`, 0]; // C++ has no ** operator; use pow()
  return [`(${a} ${op} ${b})`, 0];
};

arduinoGenerator.forBlock['math_random_int'] = function (block, generator) {
  const from = generator.valueToCode(block, 'FROM', 0) || '0';
  const to   = generator.valueToCode(block, 'TO', 0)   || '0';
  // Arduino's random(lo, hi) is exclusive on hi, so add 1
  return [`random(${from}, ${to} + 1)`, 0];
};

arduinoGenerator.forBlock['logic_compare'] = function (block, generator) {
  const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  const op = ops[block.getFieldValue('OP')];
  const a = generator.valueToCode(block, 'A', 0) || '0';
  const b = generator.valueToCode(block, 'B', 0) || '0';
  return [`(${a} ${op} ${b})`, 0];
};

arduinoGenerator.forBlock['logic_operation'] = function (block, generator) {
  const op = block.getFieldValue('OP') === 'AND' ? '&&' : '||';
  const a = generator.valueToCode(block, 'A', 0) || 'false';
  const b = generator.valueToCode(block, 'B', 0) || 'false';
  return [`(${a} ${op} ${b})`, 0];
};

arduinoGenerator.forBlock['logic_negate'] = function (block, generator) {
  const val = generator.valueToCode(block, 'BOOL', 0) || 'false';
  return [`!(${val})`, 0];
};

arduinoGenerator.forBlock['logic_boolean'] = function (block) {
  return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', 0];
};

// ─── VARIABLES ──────────────────────────────────────────────
// Blockly stores variables by ID; getField('VAR').getText() gives
// the human-readable name the user typed.

arduinoGenerator.forBlock['variables_get'] = function (block) {
  const name = block.getField('VAR').getText();
  return [name, 0];
};

arduinoGenerator.forBlock['variables_set'] = function (block, generator) {
  const name  = block.getField('VAR').getText();
  const value = generator.valueToCode(block, 'VALUE', 0) || '0';
  return `${name} = ${value};\n`;
};

// "change X by Y" — Blockly's built-in math_change block
arduinoGenerator.forBlock['math_change'] = function (block, generator) {
  const name  = block.getField('VAR').getText();
  const delta = generator.valueToCode(block, 'DELTA', 0) || '0';
  return `${name} += ${delta};\n`;
};

// ─── FULL SKETCH WRAPPER ─────────────────────────────────────

export function workspaceToArduino(workspace) {
  const body = arduinoGenerator.workspaceToCode(workspace);

  if (!body.trim()) {
    return '// Drag some blocks onto the workspace to generate code!';
  }

  // Collect all variables the user created in the Variables category
  // and declare them as global floats so they survive between loop() calls.
  const vars = workspace.getAllVariables();
  const varDecls = vars.length > 0
    ? vars.map(v => `float ${v.name} = 0;`).join('\n') + '\n\n'
    : '';

  const indented = body
    .split('\n')
    .map(line => (line ? `  ${line}` : ''))
    .join('\n');

  return `// ============================================================
// Generated by Sharky Studio
// Paste this into Arduino IDE and flash to your ESP32.
// Requires: ESP32Servo library (install via Library Manager)
// ============================================================

#include <Arduino.h>
#include <ESP32Servo.h>

// ── L298N Motor Driver ───────────────────────────────────────
#define MOTOR_A_IN1  27
#define MOTOR_A_IN2  26
#define MOTOR_A_EN   14
#define MOTOR_B_IN3  25
#define MOTOR_B_IN4  33
#define MOTOR_B_EN   32

// ── HC-SR04 Ultrasonic Sensor ────────────────────────────────
#define TRIG_PIN  5
#define ECHO_PIN  18

// ── Servo Motor ─────────────────────────────────────────────
#define SERVO_PIN  13
Servo myServo;

${varDecls}// Forward declarations
void stopMotors();
float getDistance();

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0)); // seed random numbers from floating analog pin

  pinMode(MOTOR_A_IN1, OUTPUT); pinMode(MOTOR_A_IN2, OUTPUT); pinMode(MOTOR_A_EN,  OUTPUT);
  pinMode(MOTOR_B_IN3, OUTPUT); pinMode(MOTOR_B_IN4, OUTPUT); pinMode(MOTOR_B_EN,  OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  myServo.attach(SERVO_PIN);
}

void loop() {
${indented}
}

// ── Helper Functions ─────────────────────────────────────────

void moveForward(float cm) {
  digitalWrite(MOTOR_A_IN1, HIGH); digitalWrite(MOTOR_A_IN2, LOW);
  digitalWrite(MOTOR_B_IN3, HIGH); digitalWrite(MOTOR_B_IN4, LOW);
  analogWrite(MOTOR_A_EN, 200);    analogWrite(MOTOR_B_EN, 200);
  delay((cm / 20.0) * 1000);
  stopMotors();
}
void moveBackward(float cm) {
  digitalWrite(MOTOR_A_IN1, LOW);  digitalWrite(MOTOR_A_IN2, HIGH);
  digitalWrite(MOTOR_B_IN3, LOW);  digitalWrite(MOTOR_B_IN4, HIGH);
  analogWrite(MOTOR_A_EN, 200);    analogWrite(MOTOR_B_EN, 200);
  delay((cm / 20.0) * 1000);
  stopMotors();
}
void turnLeft(float deg) {
  digitalWrite(MOTOR_A_IN1, LOW);  digitalWrite(MOTOR_A_IN2, HIGH);
  digitalWrite(MOTOR_B_IN3, HIGH); digitalWrite(MOTOR_B_IN4, LOW);
  analogWrite(MOTOR_A_EN, 180);    analogWrite(MOTOR_B_EN, 180);
  delay((deg / 90.0) * 500);
  stopMotors();
}
void turnRight(float deg) {
  digitalWrite(MOTOR_A_IN1, HIGH); digitalWrite(MOTOR_A_IN2, LOW);
  digitalWrite(MOTOR_B_IN3, LOW);  digitalWrite(MOTOR_B_IN4, HIGH);
  analogWrite(MOTOR_A_EN, 180);    analogWrite(MOTOR_B_EN, 180);
  delay((deg / 90.0) * 500);
  stopMotors();
}
void stopMotors() {
  digitalWrite(MOTOR_A_IN1, LOW); digitalWrite(MOTOR_A_IN2, LOW);
  digitalWrite(MOTOR_B_IN3, LOW); digitalWrite(MOTOR_B_IN4, LOW);
  analogWrite(MOTOR_A_EN, 0);     analogWrite(MOTOR_B_EN, 0);
}
float getDistance() {
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  return (float)duration * 0.034f / 2.0f;
}
`;
}
