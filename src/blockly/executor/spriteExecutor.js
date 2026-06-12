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

// Returns an array of frames: { state, delay? (ms), stop? (boolean) }
// initialState defaults to DEFAULT_SPRITE_STATE, so position persists between runs.
export function executeSprite(workspace, initialState = DEFAULT_SPRITE_STATE) {
  const frames = [];
  let state = { ...DEFAULT_SPRITE_STATE, ...initialState };

  const topBlocks = workspace.getTopBlocks(true);

  // If there are "when flag clicked" hat blocks, only run those stacks.
  const flagBlocks = topBlocks.filter(b => b.type === 'sprite_when_flag_clicked');
  const sources = flagBlocks.length > 0
    ? flagBlocks.map(b => b.getNextBlock())
    : topBlocks.filter(b => !isHatBlock(b));

  for (const start of sources) {
    state = walkBlocks(start, state, frames);
  }

  return frames;
}

// Run stacks attached to hat blocks of a specific type, optionally filtered by a field value.
// matchField=null skips the field check (e.g. for sprite_when_clicked).
export function executeHatBlocks(workspace, hatType, matchField, matchValue, initialState = DEFAULT_SPRITE_STATE) {
  const frames = [];
  let state = { ...DEFAULT_SPRITE_STATE, ...initialState };
  for (const hat of workspace.getTopBlocks(true)) {
    if (hat.type !== hatType) continue;
    if (matchField !== null) {
      const fv = hat.getFieldValue(matchField);
      if (fv !== matchValue && fv !== 'any') continue;
    }
    const next = hat.getNextBlock();
    if (next) state = walkBlocks(next, state, frames);
  }
  return frames;
}

function isHatBlock(block) {
  return block.type === 'sprite_when_flag_clicked'
    || block.type === 'sprite_when_key_pressed'
    || block.type === 'sprite_when_clicked'
    || block.type === 'sprite_when_i_receive';
}

function walkBlocks(block, state, frames) {
  if (!block) return state;
  state = applyBlock(block, state, frames);
  // Stop propagation if a stop signal was pushed
  if (frames.length > 0 && frames[frames.length - 1].stop) return state;
  return walkBlocks(block.getNextBlock(), state, frames);
}

// ── Block executor ────────────────────────────────────────────
function applyBlock(block, state, frames) {
  let s = { ...state };

  switch (block.type) {

    // ── MOTION ───────────────────────────────────────────────
    case 'sprite_move_steps': {
      const n = Number(block.getFieldValue('STEPS'));
      const rad = (s.rotation * Math.PI) / 180;
      s.x += n * Math.cos(rad);
      s.y -= n * Math.sin(rad); // -y because +y is up (canvas y is flipped)
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_turn_right': {
      s.rotation = (s.rotation + Number(block.getFieldValue('DEGREES'))) % 360;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_turn_left': {
      s.rotation = ((s.rotation - Number(block.getFieldValue('DEGREES'))) + 360) % 360;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_go_to_xy': {
      s.x = Number(block.getFieldValue('X'));
      s.y = Number(block.getFieldValue('Y'));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_glide_secs_to_xy': {
      const secs = Math.max(0, Number(block.getFieldValue('SECS')));
      const tx = Number(block.getFieldValue('X'));
      const ty = Number(block.getFieldValue('Y'));
      const steps = 10;
      const stepMs = (secs * 1000) / steps;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        frames.push({
          state: { ...s, x: s.x + (tx - s.x) * t, y: s.y + (ty - s.y) * t },
          delay: stepMs,
        });
      }
      s.x = tx;
      s.y = ty;
      break;
    }
    case 'sprite_point_in_direction': {
      s.rotation = Number(block.getFieldValue('DIRECTION'));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_change_x_by': {
      s.x += Number(block.getFieldValue('DX'));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_change_y_by': {
      s.y += Number(block.getFieldValue('DY'));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_set_x': {
      s.x = Number(block.getFieldValue('X'));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_set_y': {
      s.y = Number(block.getFieldValue('Y'));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_if_on_edge_bounce': {
      const hw = (s.width * s.size) / 200;
      const hh = (s.height * s.size) / 200;
      if      (s.x - hw < -240) { s.x = -240 + hw; s.rotation = (180 - s.rotation + 360) % 360; }
      else if (s.x + hw >  240) { s.x =  240 - hw; s.rotation = (180 - s.rotation + 360) % 360; }
      if      (s.y - hh < -150) { s.y = -150 + hh; s.rotation = (360 - s.rotation) % 360; }
      else if (s.y + hh >  150) { s.y =  150 - hh; s.rotation = (360 - s.rotation) % 360; }
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_set_rotation_style': {
      s.rotationStyle = block.getFieldValue('STYLE');
      frames.push({ state: { ...s } });
      break;
    }

    // ── LOOKS ────────────────────────────────────────────────
    case 'sprite_say_for_secs': {
      const text = block.getFieldValue('TEXT') ?? '';
      const ms = Math.max(0, Number(block.getFieldValue('SECS'))) * 1000;
      frames.push({ state: { ...s, bubble: { text, type: 'say' } }, delay: ms });
      s.bubble = null;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_say': {
      s.bubble = { text: block.getFieldValue('TEXT') ?? '', type: 'say' };
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_think_for_secs': {
      const text = block.getFieldValue('TEXT') ?? '';
      const ms = Math.max(0, Number(block.getFieldValue('SECS'))) * 1000;
      frames.push({ state: { ...s, bubble: { text, type: 'think' } }, delay: ms });
      s.bubble = null;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_think': {
      s.bubble = { text: block.getFieldValue('TEXT') ?? '', type: 'think' };
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_change_size_by': {
      s.size = Math.max(0, s.size + Number(block.getFieldValue('DELTA')));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_set_size_to': {
      s.size = Math.max(0, Number(block.getFieldValue('SIZE')));
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_show': {
      s.visible = true;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_hide': {
      s.visible = false;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_go_to_layer': {
      const front = block.getFieldValue('LAYER') === 'front';
      s.layer = front ? ++layerCounter : -(++layerCounter);
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_next_costume': {
      const list = s.costumes && s.costumes.length ? s.costumes : [{ name: 'costume1', url: s.costume }];
      s.costumeIndex = ((s.costumeIndex ?? 0) + 1) % list.length;
      s.costume = list[s.costumeIndex].url;
      frames.push({ state: { ...s } });
      break;
    }
    case 'sprite_switch_costume': {
      const name = block.getFieldValue('COSTUME');
      const list = s.costumes || [];
      const idx = list.findIndex(c => c.name === name);
      if (idx >= 0) {
        s.costumeIndex = idx;
        s.costume = list[idx].url;
      }
      frames.push({ state: { ...s } });
      break;
    }

    // ── VARIABLES ────────────────────────────────────────────
    case 'variables_set': {
      const varId = block.getFieldValue('VAR');
      const val = evaluateValue(block.getInputTargetBlock('VALUE'), s);
      s.variables = { ...(s.variables || {}), [varId]: val };
      frames.push({ state: { ...s }, delay: 0 }); // instant frame captures updated variable
      break;
    }
    case 'math_change': {
      const varId = block.getFieldValue('VAR');
      const delta = evaluateValue(block.getInputTargetBlock('DELTA'), s);
      const prev = Number((s.variables || {})[varId] ?? 0);
      s.variables = { ...(s.variables || {}), [varId]: prev + delta };
      frames.push({ state: { ...s }, delay: 0 });
      break;
    }

    // ── EVENTS hat blocks — skip, handled by executeSprite ───
    case 'sprite_when_flag_clicked':
    case 'sprite_when_key_pressed':
    case 'sprite_when_clicked':
    case 'sprite_when_i_receive':
      break;
    case 'sprite_broadcast': {
      const message = block.getFieldValue('MESSAGE') ?? '';
      frames.push({ state: { ...s }, broadcast: message });
      break;
    }
    case 'sprite_broadcast_and_wait': {
      const message = block.getFieldValue('MESSAGE') ?? '';
      frames.push({ state: { ...s }, broadcast: message, delay: BROADCAST_WAIT_MS });
      break;
    }

    // ── CONTROL ──────────────────────────────────────────────
    case 'sprite_wait': {
      const ms = Math.max(0, Number(block.getFieldValue('SECS'))) * 1000;
      frames.push({ state: { ...s }, delay: ms });
      break;
    }
    case 'sprite_repeat': {
      const times = Math.max(1, Number(block.getFieldValue('TIMES')));
      const inner = block.getInputTargetBlock('DO');
      for (let i = 0; i < times; i++) {
        s = walkBlocks(inner, s, frames);
        if (frames.length > 0 && frames[frames.length - 1].stop) return s;
      }
      break;
    }
    case 'sprite_forever': {
      const inner = block.getInputTargetBlock('DO');
      for (let i = 0; i < 500; i++) {
        s = walkBlocks(inner, s, frames);
        if (frames.length > 0 && frames[frames.length - 1].stop) return s;
      }
      break;
    }
    case 'sprite_if': {
      if (evaluateValue(block.getInputTargetBlock('CONDITION'), s)) {
        s = walkBlocks(block.getInputTargetBlock('DO'), s, frames);
      }
      break;
    }
    case 'sprite_if_else': {
      if (evaluateValue(block.getInputTargetBlock('CONDITION'), s)) {
        s = walkBlocks(block.getInputTargetBlock('DO'), s, frames);
      } else {
        s = walkBlocks(block.getInputTargetBlock('ELSE'), s, frames);
      }
      break;
    }
    case 'sprite_wait_until': {
      // Poll up to 5s in 50ms ticks; if state changes (e.g. inside a loop) condition can become true
      for (let i = 0; i < 100; i++) {
        if (evaluateValue(block.getInputTargetBlock('CONDITION'), s)) break;
        frames.push({ state: { ...s }, delay: 50 });
      }
      break;
    }
    case 'sprite_repeat_until': {
      const inner = block.getInputTargetBlock('DO');
      for (let i = 0; i < 1000; i++) {
        if (evaluateValue(block.getInputTargetBlock('CONDITION'), s)) break;
        s = walkBlocks(inner, s, frames);
        if (frames.length > 0 && frames[frames.length - 1].stop) return s;
      }
      break;
    }
    case 'sprite_stop': {
      frames.push({ state: { ...s }, stop: true });
      break;
    }
  }

  return s;
}

// ── Value evaluator (reporter blocks → JS value) ──────────────
function evaluateValue(block, state) {
  if (!block) return 0;

  switch (block.type) {
    // Arithmetic
    case 'sprite_add':      return n(block,'A',state) + n(block,'B',state);
    case 'sprite_subtract': return n(block,'A',state) - n(block,'B',state);
    case 'sprite_multiply': return n(block,'A',state) * n(block,'B',state);
    case 'sprite_divide': {
      const b = n(block,'B',state);
      return b !== 0 ? n(block,'A',state) / b : 0;
    }
    case 'sprite_mod': {
      const b = n(block,'B',state);
      return b !== 0 ? n(block,'A',state) % b : 0;
    }
    case 'sprite_round':  return Math.round(n(block,'A',state));
    case 'sprite_random': {
      const from = Number(block.getFieldValue('FROM'));
      const to   = Number(block.getFieldValue('TO'));
      return Math.floor(Math.random() * (to - from + 1)) + from;
    }
    case 'sprite_math_op': {
      const a  = n(block,'A',state);
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
    case 'sprite_gt': return n(block,'A',state) > n(block,'B',state);
    case 'sprite_lt': return n(block,'A',state) < n(block,'B',state);
    case 'sprite_eq': return String(evaluateValue(block.getInputTargetBlock('A'), state))
                          === String(evaluateValue(block.getInputTargetBlock('B'), state));
    // Logic → Boolean
    case 'sprite_and': return Boolean(evaluateValue(block.getInputTargetBlock('A'), state))
                           && Boolean(evaluateValue(block.getInputTargetBlock('B'), state));
    case 'sprite_or':  return Boolean(evaluateValue(block.getInputTargetBlock('A'), state))
                           || Boolean(evaluateValue(block.getInputTargetBlock('B'), state));
    case 'sprite_not': return !evaluateValue(block.getInputTargetBlock('A'), state);
    // String
    case 'sprite_join':
      return String(evaluateValue(block.getInputTargetBlock('A'), state))
           + String(evaluateValue(block.getInputTargetBlock('B'), state));
    case 'sprite_letter_of': {
      const idx = Number(block.getFieldValue('INDEX')) - 1;
      const str = String(evaluateValue(block.getInputTargetBlock('TEXT'), state));
      return str[idx] ?? '';
    }
    case 'sprite_length_of':
      return String(evaluateValue(block.getInputTargetBlock('TEXT'), state)).length;
    case 'sprite_contains': {
      const a = String(evaluateValue(block.getInputTargetBlock('A'), state)).toLowerCase();
      const b = String(evaluateValue(block.getInputTargetBlock('B'), state)).toLowerCase();
      return a.includes(b);
    }
    // State reporters
    case 'sprite_x_position':   return state.x;
    case 'sprite_y_position':   return state.y;
    case 'sprite_direction':    return state.rotation;
    case 'sprite_size_reporter':return state.size;
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
function n(block, name, state) {
  return Number(evaluateValue(block.getInputTargetBlock(name), state));
}
