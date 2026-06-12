import rowdyFrontUrl from '../../sprites/assets/rowdy_front.png';
import rowdyWalk1Url from '../../sprites/assets/rowdy_walk1.png';
import rowdyWalk2Url from '../../sprites/assets/rowdy_walk2.png';

export const DEFAULT_SPRITE_STATE = {
  x: 0,
  y: 0,
  rotation: 0,       // degrees, 0 = right, clockwise
  width: 60,
  height: 60,
  color: '#ff8c00',
  size: 100,         // percent
  visible: true,
  bubble: null,      // { text, type: 'say' | 'think' } | null
  rotationStyle: 'all', // 'all' | 'lr' | 'none'
  costume: rowdyFrontUrl, // image URL for the sprite's current costume, or null for a plain rectangle
  costumes: [ // named costume list — cycled by "next costume", picked by "switch costume to"
    { name: 'front', url: rowdyFrontUrl },
    { name: 'walk1', url: rowdyWalk1Url },
    { name: 'walk2', url: rowdyWalk2Url },
  ],
  costumeIndex: 0,
  variables: {},     // { [varId]: value }
  layer: 0,          // stacking order — higher draws on top
};

// Monotonically increasing so repeated "go to front/back" calls
// (from any sprite) keep producing a new extreme value.
let layerCounter = 0;

// Approximate pause for "broadcast and wait" — receivers run as separate
// animations, so we can't truly block until they finish.
const BROADCAST_WAIT_MS = 300;

// Stage half-dimensions (matches CANVAS_W/H in App.jsx) — used for edge checks.
const STAGE_HALF_W = 240;
const STAGE_HALF_H = 150;

// ── Generator-based execution ──────────────────────────────────
// Scripts are executed incrementally: each step (`.next()`) runs until the
// next frame is ready, then yields it. This lets "forever" / "repeat until" /
// "wait until" re-check live, external state (keyboard, mouse, other sprites)
// on every iteration instead of all being computed upfront from a single
// snapshot — required for Sensing blocks to behave correctly inside loops.
//
// A frame is: { state, delay? (ms), stop? (boolean), broadcast? (string) }
//
// `state` is a single mutable object SHARED by every script/thread running
// on a sprite (the caller creates one per sprite and passes it to every
// `runScript` call for that sprite). Blocks mutate it in place, so changes
// made by one concurrently-running script (e.g. a forever loop) are
// immediately visible to another (e.g. a broadcast receiver) — matching
// Scratch's model where every script on a sprite shares one set of fields.
//
// `world`, if provided, gives reporters access to live external state:
//   world.getSprites() -> [{ id, name, state }, ...] (all sprites, live)
//   world.input -> { mouseX, mouseY, mouseDown, keysDown: Set }
//   world.timer -> { start: <ms timestamp> }

// Runs a single script (the block chain starting at `startBlock`) to completion,
// yielding a frame after every step. One generator = one concurrent "thread".
export function* runScript(startBlock, state, world = null) {
  const ctx = { world, stop: false };
  yield* walkBlocks(startBlock, state, ctx);
}

// The set of scripts that should start running on "when flag clicked"
// (one per "when flag clicked" hat, run concurrently) — or, if there are
// none, every top-level stack that isn't under a hat block, each as its
// own concurrent script.
export function getFlagScripts(workspace) {
  const topBlocks = workspace.getTopBlocks(true);
  const flagBlocks = topBlocks.filter(b => b.type === 'sprite_when_flag_clicked');
  if (flagBlocks.length > 0) {
    return flagBlocks.map(b => b.getNextBlock()).filter(Boolean);
  }
  return topBlocks.filter(b => !isHatBlock(b));
}

// The set of scripts attached to hat blocks of `hatType`, optionally filtered
// by a field value (matchValue, or hats whose field is 'any'). matchField=null
// skips the field check (e.g. for sprite_when_clicked). One entry per matching
// hat that has a body — each runs as its own concurrent script.
export function getHatScripts(workspace, hatType, matchField, matchValue) {
  const scripts = [];
  for (const hat of workspace.getTopBlocks(true)) {
    if (hat.type !== hatType) continue;
    if (matchField !== null) {
      const fv = hat.getFieldValue(matchField);
      if (fv !== matchValue && fv !== 'any') continue;
    }
    const next = hat.getNextBlock();
    if (next) scripts.push(next);
  }
  return scripts;
}

// True if `getHatScripts` would return at least one script. Used to avoid
// starting a no-op animation — and registering an unnecessary thread — when
// a hat event fires but no script is listening for it.
export function hasMatchingHat(workspace, hatType, matchField, matchValue) {
  return getHatScripts(workspace, hatType, matchField, matchValue).length > 0;
}

function isHatBlock(block) {
  return block.type === 'sprite_when_flag_clicked'
    || block.type === 'sprite_when_key_pressed'
    || block.type === 'sprite_when_clicked'
    || block.type === 'sprite_when_i_receive';
}

function* walkBlocks(block, state, ctx) {
  if (!block) return;
  yield* applyBlock(block, state, ctx);
  if (ctx.stop) return;
  yield* walkBlocks(block.getNextBlock(), state, ctx);
}

// ── Block executor ────────────────────────────────────────────
// `state` is the sprite's shared mutable state object — mutated in place.
function* applyBlock(block, state, ctx) {
  const world = ctx.world;

  switch (block.type) {

    // ── MOTION ───────────────────────────────────────────────
    case 'sprite_move_steps': {
      const steps = Number(block.getFieldValue('STEPS'));
      const rad = (state.rotation * Math.PI) / 180;
      state.x += steps * Math.cos(rad);
      state.y -= steps * Math.sin(rad); // -y because +y is up (canvas y is flipped)
      yield { state: { ...state } };
      break;
    }
    case 'sprite_turn_right': {
      state.rotation = (state.rotation + Number(block.getFieldValue('DEGREES'))) % 360;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_turn_left': {
      state.rotation = ((state.rotation - Number(block.getFieldValue('DEGREES'))) + 360) % 360;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_go_to_xy': {
      state.x = Number(block.getFieldValue('X'));
      state.y = Number(block.getFieldValue('Y'));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_glide_secs_to_xy': {
      const secs = Math.max(0, Number(block.getFieldValue('SECS')));
      const tx = Number(block.getFieldValue('X'));
      const ty = Number(block.getFieldValue('Y'));
      const fromX = state.x;
      const fromY = state.y;
      const steps = 10;
      const stepMs = (secs * 1000) / steps;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        state.x = fromX + (tx - fromX) * t;
        state.y = fromY + (ty - fromY) * t;
        yield { state: { ...state }, delay: stepMs };
      }
      state.x = tx;
      state.y = ty;
      break;
    }
    case 'sprite_point_in_direction': {
      state.rotation = Number(block.getFieldValue('DIRECTION'));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_change_x_by': {
      state.x += Number(block.getFieldValue('DX'));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_change_y_by': {
      state.y += Number(block.getFieldValue('DY'));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_set_x': {
      state.x = Number(block.getFieldValue('X'));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_set_y': {
      state.y = Number(block.getFieldValue('Y'));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_if_on_edge_bounce': {
      const hw = (state.width * state.size) / 200;
      const hh = (state.height * state.size) / 200;
      if      (state.x - hw < -STAGE_HALF_W) { state.x = -STAGE_HALF_W + hw; state.rotation = (180 - state.rotation + 360) % 360; }
      else if (state.x + hw >  STAGE_HALF_W) { state.x =  STAGE_HALF_W - hw; state.rotation = (180 - state.rotation + 360) % 360; }
      if      (state.y - hh < -STAGE_HALF_H) { state.y = -STAGE_HALF_H + hh; state.rotation = (360 - state.rotation) % 360; }
      else if (state.y + hh >  STAGE_HALF_H) { state.y =  STAGE_HALF_H - hh; state.rotation = (360 - state.rotation) % 360; }
      yield { state: { ...state } };
      break;
    }
    case 'sprite_set_rotation_style': {
      state.rotationStyle = block.getFieldValue('STYLE');
      yield { state: { ...state } };
      break;
    }

    // ── LOOKS ────────────────────────────────────────────────
    case 'sprite_say_for_secs': {
      const text = block.getFieldValue('TEXT') ?? '';
      const ms = Math.max(0, Number(block.getFieldValue('SECS'))) * 1000;
      state.bubble = { text, type: 'say' };
      yield { state: { ...state }, delay: ms };
      state.bubble = null;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_say': {
      state.bubble = { text: block.getFieldValue('TEXT') ?? '', type: 'say' };
      yield { state: { ...state } };
      break;
    }
    case 'sprite_think_for_secs': {
      const text = block.getFieldValue('TEXT') ?? '';
      const ms = Math.max(0, Number(block.getFieldValue('SECS'))) * 1000;
      state.bubble = { text, type: 'think' };
      yield { state: { ...state }, delay: ms };
      state.bubble = null;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_think': {
      state.bubble = { text: block.getFieldValue('TEXT') ?? '', type: 'think' };
      yield { state: { ...state } };
      break;
    }
    case 'sprite_change_size_by': {
      state.size = Math.max(0, state.size + Number(block.getFieldValue('DELTA')));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_set_size_to': {
      state.size = Math.max(0, Number(block.getFieldValue('SIZE')));
      yield { state: { ...state } };
      break;
    }
    case 'sprite_show': {
      state.visible = true;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_hide': {
      state.visible = false;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_go_to_layer': {
      const front = block.getFieldValue('LAYER') === 'front';
      state.layer = front ? ++layerCounter : -(++layerCounter);
      yield { state: { ...state } };
      break;
    }
    case 'sprite_next_costume': {
      const list = state.costumes && state.costumes.length ? state.costumes : [{ name: 'costume1', url: state.costume }];
      state.costumeIndex = ((state.costumeIndex ?? 0) + 1) % list.length;
      state.costume = list[state.costumeIndex].url;
      yield { state: { ...state } };
      break;
    }
    case 'sprite_switch_costume': {
      const name = block.getFieldValue('COSTUME');
      const list = state.costumes || [];
      const idx = list.findIndex(c => c.name === name);
      if (idx >= 0) {
        state.costumeIndex = idx;
        state.costume = list[idx].url;
      }
      yield { state: { ...state } };
      break;
    }

    // ── VARIABLES ────────────────────────────────────────────
    case 'variables_set': {
      const varId = block.getFieldValue('VAR');
      const val = evaluateValue(block.getInputTargetBlock('VALUE'), state, world);
      state.variables = { ...(state.variables || {}), [varId]: val };
      yield { state: { ...state }, delay: 0 }; // instant frame captures updated variable
      break;
    }
    case 'math_change': {
      const varId = block.getFieldValue('VAR');
      const delta = evaluateValue(block.getInputTargetBlock('DELTA'), state, world);
      const prev = Number((state.variables || {})[varId] ?? 0);
      state.variables = { ...(state.variables || {}), [varId]: prev + delta };
      yield { state: { ...state }, delay: 0 };
      break;
    }

    // ── EVENTS hat blocks — skip, handled by getFlagScripts/getHatScripts ──
    case 'sprite_when_flag_clicked':
    case 'sprite_when_key_pressed':
    case 'sprite_when_clicked':
    case 'sprite_when_i_receive':
      break;
    case 'sprite_broadcast': {
      const message = block.getFieldValue('MESSAGE') ?? '';
      yield { state: { ...state }, broadcast: message };
      break;
    }
    case 'sprite_broadcast_and_wait': {
      const message = block.getFieldValue('MESSAGE') ?? '';
      yield { state: { ...state }, broadcast: message, delay: BROADCAST_WAIT_MS };
      break;
    }

    // ── SENSING ──────────────────────────────────────────────
    case 'sprite_reset_timer': {
      if (world?.timer) world.timer.start = Date.now();
      yield { state: { ...state } };
      break;
    }

    // ── CONTROL ──────────────────────────────────────────────
    case 'sprite_wait': {
      const ms = Math.max(0, Number(block.getFieldValue('SECS'))) * 1000;
      yield { state: { ...state }, delay: ms };
      break;
    }
    case 'sprite_repeat': {
      const times = Math.max(1, Number(block.getFieldValue('TIMES')));
      const inner = block.getInputTargetBlock('DO');
      for (let i = 0; i < times; i++) {
        yield* walkBlocks(inner, state, ctx);
        if (ctx.stop) return;
      }
      break;
    }
    case 'sprite_forever': {
      const inner = block.getInputTargetBlock('DO');
      // eslint-disable-next-line no-constant-condition
      while (true) {
        yield* walkBlocks(inner, state, ctx);
        if (ctx.stop) return;
        // Guarantee at least one yield per iteration (even for an empty body)
        // so live state (Sensing) is re-checked and Stop can interrupt.
        yield { state: { ...state }, delay: 0 };
      }
    }
    case 'sprite_if': {
      if (evaluateValue(block.getInputTargetBlock('CONDITION'), state, world)) {
        yield* walkBlocks(block.getInputTargetBlock('DO'), state, ctx);
      }
      break;
    }
    case 'sprite_if_else': {
      if (evaluateValue(block.getInputTargetBlock('CONDITION'), state, world)) {
        yield* walkBlocks(block.getInputTargetBlock('DO'), state, ctx);
      } else {
        yield* walkBlocks(block.getInputTargetBlock('ELSE'), state, ctx);
      }
      break;
    }
    case 'sprite_wait_until': {
      while (!evaluateValue(block.getInputTargetBlock('CONDITION'), state, world)) {
        yield { state: { ...state }, delay: 50 };
      }
      break;
    }
    case 'sprite_repeat_until': {
      const inner = block.getInputTargetBlock('DO');
      while (!evaluateValue(block.getInputTargetBlock('CONDITION'), state, world)) {
        yield* walkBlocks(inner, state, ctx);
        if (ctx.stop) return;
        yield { state: { ...state }, delay: 0 };
      }
      break;
    }
    case 'sprite_stop': {
      ctx.stop = true;
      yield { state: { ...state }, stop: true };
      break;
    }
  }
}

// ── Value evaluator (reporter blocks → JS value) ──────────────
function evaluateValue(block, state, world) {
  if (!block) return 0;

  switch (block.type) {
    // Arithmetic
    case 'sprite_add':      return n(block,'A',state,world) + n(block,'B',state,world);
    case 'sprite_subtract': return n(block,'A',state,world) - n(block,'B',state,world);
    case 'sprite_multiply': return n(block,'A',state,world) * n(block,'B',state,world);
    case 'sprite_divide': {
      const b = n(block,'B',state,world);
      return b !== 0 ? n(block,'A',state,world) / b : 0;
    }
    case 'sprite_mod': {
      const b = n(block,'B',state,world);
      return b !== 0 ? n(block,'A',state,world) % b : 0;
    }
    case 'sprite_round':  return Math.round(n(block,'A',state,world));
    case 'sprite_random': {
      const from = Number(block.getFieldValue('FROM'));
      const to   = Number(block.getFieldValue('TO'));
      return Math.floor(Math.random() * (to - from + 1)) + from;
    }
    case 'sprite_math_op': {
      const a  = n(block,'A',state,world);
      const op = block.getFieldValue('OP');
      const ops = {
        abs: Math.abs, floor: Math.floor, ceiling: Math.ceil,
        sqrt: Math.sqrt,
        sin:  v => Math.sin(v * Math.PI / 180),
        cos:  v => Math.cos(v * Math.PI / 180),
        tan:  v => Math.tan(v * Math.PI / 180),
        asin: v => Math.asin(v) * 180 / Math.PI,
        acos: v => Math.acos(v) * 180 / Math.PI,
        atan: v => Math.atan(v) * 180 / Math.PI,
        ln:   Math.log,
        log:  Math.log10,
        exp:  Math.exp,
        pow10: v => Math.pow(10, v),
      };
      return ops[op] ? ops[op](a) : a;
    }
    // Comparison → Boolean
    case 'sprite_gt': return n(block,'A',state,world) > n(block,'B',state,world);
    case 'sprite_lt': return n(block,'A',state,world) < n(block,'B',state,world);
    case 'sprite_eq': return String(evaluateValue(block.getInputTargetBlock('A'), state, world))
                          === String(evaluateValue(block.getInputTargetBlock('B'), state, world));
    // Logic → Boolean
    case 'sprite_and': return Boolean(evaluateValue(block.getInputTargetBlock('A'), state, world))
                           && Boolean(evaluateValue(block.getInputTargetBlock('B'), state, world));
    case 'sprite_or':  return Boolean(evaluateValue(block.getInputTargetBlock('A'), state, world))
                           || Boolean(evaluateValue(block.getInputTargetBlock('B'), state, world));
    case 'sprite_not': return !evaluateValue(block.getInputTargetBlock('A'), state, world);
    // String
    case 'sprite_join':
      return String(evaluateValue(block.getInputTargetBlock('A'), state, world))
           + String(evaluateValue(block.getInputTargetBlock('B'), state, world));
    case 'sprite_letter_of': {
      const idx = Number(block.getFieldValue('INDEX')) - 1;
      const str = String(evaluateValue(block.getInputTargetBlock('TEXT'), state, world));
      return str[idx] ?? '';
    }
    case 'sprite_length_of':
      return String(evaluateValue(block.getInputTargetBlock('TEXT'), state, world)).length;
    case 'sprite_contains': {
      const a = String(evaluateValue(block.getInputTargetBlock('A'), state, world)).toLowerCase();
      const b = String(evaluateValue(block.getInputTargetBlock('B'), state, world)).toLowerCase();
      return a.includes(b);
    }
    // State reporters
    case 'sprite_x_position':   return state.x;
    case 'sprite_y_position':   return state.y;
    case 'sprite_direction':    return state.rotation;
    case 'sprite_size_reporter':return state.size;
    // Sensing reporters
    case 'sprite_touching': {
      const target = String(block.getFieldValue('TARGET') ?? '').trim().toLowerCase();
      if (target === 'edge') return isTouchingEdge(state);
      if (target === 'mouse-pointer') {
        const mx = world?.input?.mouseX ?? 0;
        const my = world?.input?.mouseY ?? 0;
        return pointInSprite(state, mx, my);
      }
      const others = world?.getSprites?.() ?? [];
      const found = others.find(o => o.name.toLowerCase() === target);
      if (!found || !found.state.visible) return false;
      return rectsOverlap(state, found.state);
    }
    case 'sprite_distance_to': {
      const target = String(block.getFieldValue('TARGET') ?? '').trim().toLowerCase();
      let tx, ty;
      if (target === 'mouse-pointer') {
        tx = world?.input?.mouseX ?? 0;
        ty = world?.input?.mouseY ?? 0;
      } else {
        const others = world?.getSprites?.() ?? [];
        const found = others.find(o => o.name.toLowerCase() === target);
        if (!found) return 0;
        tx = found.state.x;
        ty = found.state.y;
      }
      return Math.hypot(state.x - tx, state.y - ty);
    }
    case 'sprite_key_pressed': {
      const key = block.getFieldValue('KEY');
      const keysDown = world?.input?.keysDown;
      if (!keysDown) return false;
      return key === 'any' ? keysDown.size > 0 : keysDown.has(key);
    }
    case 'sprite_mouse_x':    return world?.input?.mouseX ?? 0;
    case 'sprite_mouse_y':    return world?.input?.mouseY ?? 0;
    case 'sprite_mouse_down': return world?.input?.mouseDown ?? false;
    case 'sprite_timer':      return world?.timer ? (Date.now() - world.timer.start) / 1000 : 0;
    // Variables
    case 'variables_get': {
      const varId = block.getFieldValue('VAR');
      return (state.variables || {})[varId] ?? 0;
    }
    // Literals
    case 'sprite_number': return Number(block.getFieldValue('NUM'));
    case 'sprite_text':   return block.getFieldValue('TEXT') ?? '';
    // Blockly built-in math_number shadow
    case 'math_number':   return Number(block.getFieldValue('NUM'));
    default:              return 0;
  }
}

// Shorthand: get a Number input value
function n(block, name, state, world) {
  return Number(evaluateValue(block.getInputTargetBlock(name), state, world));
}

// ── Sensing geometry helpers (bounding-box based) ──────────────
function isTouchingEdge(state) {
  const hw = (state.width * state.size) / 200;
  const hh = (state.height * state.size) / 200;
  return state.x - hw <= -STAGE_HALF_W || state.x + hw >= STAGE_HALF_W
      || state.y - hh <= -STAGE_HALF_H || state.y + hh >= STAGE_HALF_H;
}

function pointInSprite(state, px, py) {
  const hw = (state.width * state.size) / 200;
  const hh = (state.height * state.size) / 200;
  return Math.abs(px - state.x) <= hw && Math.abs(py - state.y) <= hh;
}

function rectsOverlap(a, b) {
  const ahw = (a.width * a.size) / 200, ahh = (a.height * a.size) / 200;
  const bhw = (b.width * b.size) / 200, bhh = (b.height * b.size) / 200;
  return Math.abs(a.x - b.x) <= (ahw + bhw) && Math.abs(a.y - b.y) <= (ahh + bhh);
}
