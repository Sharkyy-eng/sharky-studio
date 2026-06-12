import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';

import './blockly/blocks/basicBlocks.js';
import './blockly/blocks/sensorBlocks.js';
import './blockly/blocks/actuatorBlocks.js';
import './blockly/blocks/controlBlocks.js';
import './blockly/blocks/spriteBlocks.js';

import { workspaceToArduino } from './blockly/generators/arduino.js';
import { workspaceToPython }  from './blockly/generators/python.js';
import { executeSprite, executeHatBlocks, hasMatchingHat, DEFAULT_SPRITE_STATE } from './blockly/executor/spriteExecutor.js';

import robotToolboxXml  from './blockly/toolboxes/robot.xml?raw';
import spriteToolboxXml from './blockly/toolboxes/sprite.xml?raw';
import { SPRITE_LIBRARY } from './sprites/library.js';

const STEP_DELAY = 300;

const CANVAS_W = 480;
const CANVAS_H = 300;

function createSprite(name, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    state: { ...DEFAULT_SPRITE_STATE, ...overrides },
  };
}

// Loads (and caches) the image for a costume URL. Returns the <img> element once
// loaded, or null while it's still loading — onLoad fires a redraw when it's ready.
function getCostumeImage(src, cache, onLoad) {
  let entry = cache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false };
    img.onload = () => { entry.loaded = true; onLoad(); };
    img.src = src;
    cache.set(src, entry);
  }
  return entry.loaded ? entry.img : null;
}

// ─── Stage canvas ─────────────────────────────────────────────
// Coordinate system: (0,0) = center of canvas, +x = right, +y = up (Scratch-style)
function drawSprite(ctx, sprite, imageCache, onImageLoad) {
  if (!sprite.visible) return;

  const sw = (sprite.width  * sprite.size) / 100;
  const sh = (sprite.height * sprite.size) / 100;
  const style = sprite.rotationStyle || 'all';

  // Convert logical coords to canvas coords: flip y so +y is up
  const cx = CANVAS_W / 2 + sprite.x;
  const cy = CANVAS_H / 2 - sprite.y;

  ctx.save();
  ctx.translate(cx, cy);
  if      (style === 'all') { ctx.rotate((sprite.rotation * Math.PI) / 180); }
  else if (style === 'lr')  { if (sprite.rotation > 180) ctx.scale(-1, 1); }

  const img = sprite.costume ? getCostumeImage(sprite.costume, imageCache, onImageLoad) : null;
  if (img) {
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  } else {
    ctx.fillStyle = sprite.color;
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  }

  if (style !== 'none' && !img) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(sw / 2,      0);
    ctx.lineTo(sw / 2 - 10, -8);
    ctx.lineTo(sw / 2 - 10,  8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (sprite.bubble) {
    const { text, type } = sprite.bubble;
    const bx  = cx + sw / 2 + 8;
    const by  = cy - sh / 2 - 10;
    const pad = 10;
    ctx.font = '13px system-ui, sans-serif';
    const bw = Math.max(ctx.measureText(text).width + pad * 2, 60);
    const bh = 30;
    const r  = 8;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + r, by - bh); ctx.lineTo(bx + bw - r, by - bh);
    ctx.quadraticCurveTo(bx + bw, by - bh, bx + bw, by - bh + r);
    ctx.lineTo(bx + bw, by - r);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw - r, by);
    ctx.lineTo(bx + r, by); ctx.quadraticCurveTo(bx, by, bx, by - r);
    ctx.lineTo(bx, by - bh + r); ctx.quadraticCurveTo(bx, by - bh, bx + r, by - bh);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (type === 'say') {
      ctx.beginPath();
      ctx.moveTo(bx, by - 1);
      ctx.lineTo(cx + sw / 2, cy - sh / 4);
      ctx.lineTo(bx + 14, by - 1);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.stroke();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(bx - 4 - i * 5, by + 3 + i * 3, 3 - i * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.stroke();
      }
    }
    ctx.fillStyle = '#333'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(text, bx + pad, by - bh / 2 + 5);
  }
}

// Returns the topmost (front-to-back) sprite whose bounding box contains (cx, cy), or null.
function hitTestSprites(sprites, cx, cy) {
  const ordered = [...sprites].sort((a, b) => b.state.layer - a.state.layer);
  for (const sprite of ordered) {
    const s = sprite.state;
    if (!s.visible) continue;
    const sw = (s.width * s.size) / 100;
    const sh = (s.height * s.size) / 100;
    const scx = CANVAS_W / 2 + s.x;
    const scy = CANVAS_H / 2 - s.y;
    if (Math.abs(cx - scx) <= sw / 2 && Math.abs(cy - scy) <= sh / 2) return sprite;
  }
  return null;
}

function Stage({ sprites, onCanvasClick, onSpriteDrag, onSelectSprite, onStageMouseMove }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const [redrawTick, forceRedraw] = useState(0);

  // Keep the canvas's backing-store resolution matched to its displayed size
  // (x devicePixelRatio) so costumes stay sharp at any zoom level, e.g. fullscreen.
  useEffect(() => {
    const canvas = canvasRef.current;
    const observer = new ResizeObserver(() => forceRedraw(t => t + 1));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pixelW = Math.max(1, Math.round(rect.width * dpr));
    const pixelH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
    ctx.setTransform(pixelW / CANVAS_W, 0, 0, pixelH / CANVAS_H, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }
    // Draw axis lines at center
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, 0); ctx.lineTo(CANVAS_W / 2, CANVAS_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CANVAS_H / 2); ctx.lineTo(CANVAS_W, CANVAS_H / 2); ctx.stroke();

    // Draw back-to-front so higher layers end up on top
    const ordered = [...sprites].sort((a, b) => a.state.layer - b.state.layer);
    const onImageLoad = () => forceRedraw(t => t + 1);
    for (const sprite of ordered) drawSprite(ctx, sprite.state, imageCacheRef.current, onImageLoad);
  }, [sprites, redrawTick]);

  // Clean up any in-flight drag listeners if the Stage unmounts mid-drag
  useEffect(() => () => {
    const drag = dragRef.current;
    if (drag) {
      window.removeEventListener('mousemove', drag.onMove);
      window.removeEventListener('mouseup', drag.onUp);
    }
  }, []);

  function canvasCoords(e, rect) {
    return [
      (e.clientX - rect.left) * (CANVAS_W / rect.width),
      (e.clientY - rect.top)  * (CANVAS_H / rect.height),
    ];
  }

  function handleMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const [cx, cy] = canvasCoords(e, rect);
    const hit = hitTestSprites(sprites, cx, cy);
    if (!hit) return;

    onSelectSprite?.(hit.id);
    const s = hit.state;
    const scx = CANVAS_W / 2 + s.x;
    const scy = CANVAS_H / 2 - s.y;

    const drag = {
      id: hit.id,
      offsetX: scx - cx,
      offsetY: scy - cy,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };

    drag.onMove = (ev) => {
      if (!drag.moved) {
        const dist = Math.hypot(ev.clientX - drag.startClientX, ev.clientY - drag.startClientY);
        if (dist > 3) { drag.moved = true; canvasRef.current.style.cursor = 'grabbing'; }
      }
      const [mx, my] = canvasCoords(ev, rect);
      const newScx = mx + drag.offsetX;
      const newScy = my + drag.offsetY;
      onSpriteDrag?.(drag.id, newScx - CANVAS_W / 2, CANVAS_H / 2 - newScy);
    };

    drag.onUp = (ev) => {
      window.removeEventListener('mousemove', drag.onMove);
      window.removeEventListener('mouseup', drag.onUp);
      dragRef.current = null;
      canvasRef.current.style.cursor = onCanvasClick ? 'pointer' : 'default';
      if (!drag.moved) {
        const [cx2, cy2] = canvasCoords(ev, rect);
        onCanvasClick?.(cx2, cy2);
      }
    };

    dragRef.current = drag;
    window.addEventListener('mousemove', drag.onMove);
    window.addEventListener('mouseup', drag.onUp);
  }

  // Tracks the stage-coordinate mouse position live for Sensing blocks
  // ("mouse x", "mouse y", "touching mouse-pointer?"), independent of dragging.
  function handleMouseMove(e) {
    if (!onStageMouseMove) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const [cx, cy] = canvasCoords(e, rect);
    onStageMouseMove(cx - CANVAS_W / 2, CANVAS_H / 2 - cy);
  }

  return (
    <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      style={{ display: 'block', width: '100%', height: 'auto', cursor: onCanvasClick ? 'pointer' : 'default' }} />
  );
}

// ─── Sprite info panel (Scratch-style) ────────────────────────
function SpriteInfo({ sprite, onUpdate, name, onNameChange }) {
  const F = 'system-ui, sans-serif';

  const fieldBox = {
    background: '#2a2a2a',
    border: '1px solid #3a3a3a',
    borderRadius: 4,
    color: '#ddd',
    fontFamily: F,
    fontSize: 12,
    padding: '4px 6px',
    width: 52,
    textAlign: 'center',
    MozAppearance: 'textfield',
    outline: 'none',
  };
  const label = {
    fontSize: 10,
    color: '#888',
    fontFamily: F,
    marginBottom: 3,
    display: 'block',
    letterSpacing: '0.03em',
  };
  const cell = { display: 'flex', flexDirection: 'column' };

  return (
    <div style={{
      background: '#1e1e1e',
      borderTop: '1px solid #2e2e2e',
      padding: '8px 10px',
      flexShrink: 0,
    }}>
      {/* Row 1: name · x · y */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
        <div style={{ ...cell, flex: 1 }}>
          <span style={label}>Sprite</span>
          <input
            value={name}
            onChange={e => onNameChange(e.target.value)}
            style={{ ...fieldBox, width: '100%', textAlign: 'left', boxSizing: 'border-box' }}
          />
        </div>
        <div style={cell}>
          <span style={label}>x</span>
          <input type="number" style={fieldBox}
            value={Math.round(sprite.x)}
            onChange={e => onUpdate({ x: Number(e.target.value) })} />
        </div>
        <div style={cell}>
          <span style={label}>y</span>
          <input type="number" style={fieldBox}
            value={Math.round(sprite.y)}
            onChange={e => onUpdate({ y: Number(e.target.value) })} />
        </div>
      </div>

      {/* Row 2: show · size · direction */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={cell}>
          <span style={label}>Show</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[
              { val: true,  icon: '◉', title: 'Show'  },
              { val: false, icon: '⊘', title: 'Hide'  },
            ].map(({ val, icon, title }) => (
              <button key={title} onClick={() => onUpdate({ visible: val })} title={title}
                style={{
                  background: sprite.visible === val ? '#4af' : '#2a2a2a',
                  border: '1px solid #3a3a3a', borderRadius: 4,
                  color: sprite.visible === val ? '#fff' : '#888',
                  cursor: 'pointer', fontFamily: F, fontSize: 13,
                  padding: '3px 7px', lineHeight: 1,
                }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div style={cell}>
          <span style={label}>Size</span>
          <input type="number" style={fieldBox}
            value={Math.round(sprite.size)}
            onChange={e => onUpdate({ size: Math.max(0, Number(e.target.value)) })} />
        </div>
        <div style={cell}>
          <span style={label}>Direction</span>
          <input type="number" style={fieldBox}
            value={Math.round(sprite.rotation)}
            onChange={e => onUpdate({ rotation: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}

// ─── Sprite library picker ─────────────────────────────────────
function SpriteLibraryModal({ onChoose, onClose }) {
  const F = 'system-ui, sans-serif';
  const tile = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    background: '#222', border: '2px solid transparent', borderRadius: 8,
    padding: '10px 6px', cursor: 'pointer', color: '#ccc', fontFamily: F, fontSize: 12,
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', border: '1px solid #333', borderRadius: 10,
        padding: 20, width: 420, maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: F }}>Choose a Sprite</span>
          <button onClick={onClose} style={{
            background: '#2a2a2a', color: '#ccc', border: '1px solid #444',
            borderRadius: 4, padding: '2px 9px', cursor: 'pointer', fontFamily: F, fontSize: 13,
          }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {SPRITE_LIBRARY.map(item => (
            <div key={item.name} onClick={() => onChoose(item)} style={tile}>
              <img src={item.costume} alt={item.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
function App() {
  const robotDiv = useRef(null);
  const robotWorkspaceRef = useRef(null);
  const spriteWorkspaces     = useRef(new Map()); // spriteId -> WorkspaceSvg
  const spriteWorkspaceDivs  = useRef(new Map()); // spriteId -> HTMLDivElement
  const animTimersRef = useRef(new Map());        // spriteId -> Set<timeoutId> (one entry per running script "thread")
  const spritesRef = useRef([]);                  // always holds latest sprites without closure issues

  // Live external state for Sensing blocks — mutated in place by input
  // listeners below, and read lazily during script execution so "forever"
  // loops see up-to-date keyboard/mouse/timer/other-sprite state each tick.
  const inputStateRef = useRef({ mouseX: 0, mouseY: 0, mouseDown: false, keysDown: new Set() });
  const timerStateRef = useRef({ start: Date.now() });
  const worldRef = useRef({
    getSprites: () => spritesRef.current,
    input: inputStateRef.current,
    timer: timerStateRef.current,
  });

  const [workspaceMode, setWorkspaceMode] = useState('robot');
  const [arduinoCode, setArduinoCode] = useState('// Drag some blocks to generate code!');
  const [pythonCode,  setPythonCode]  = useState('# Drag some blocks to generate code!');
  const [sprites, setSprites] = useState(() => [createSprite('Roundy')]);
  const [selectedSpriteId, setSelectedSpriteId] = useState(() => sprites[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);

  const selectedSprite = sprites.find(s => s.id === selectedSpriteId) ?? sprites[0];

  // Keep spritesRef in sync so event handlers always read fresh state
  useEffect(() => { spritesRef.current = sprites; }, [sprites]);

  function updateSelectedSprite(updates) {
    setSprites(prev => prev.map(s =>
      s.id === selectedSpriteId ? { ...s, state: { ...s.state, ...updates } } : s
    ));
  }

  function renameSelectedSprite(name) {
    setSprites(prev => prev.map(s =>
      s.id === selectedSpriteId ? { ...s, name } : s
    ));
  }

  // Dragging a sprite on the stage repositions it directly (no animation).
  function handleSpriteDrag(id, x, y) {
    setSprites(prev => prev.map(s =>
      s.id === id ? { ...s, state: { ...s.state, x, y } } : s
    ));
  }

  // Drives a script generator for a single sprite, independent of all others.
  // `gen` is the iterator returned by executeSprite/executeHatBlocks — each
  // `.next()` runs the script until its next frame, so loops re-check live
  // Sensing state (keyboard/mouse/other sprites) every iteration.
  function playFramesForSprite(id, gen, onDone) {
    let timers = animTimersRef.current.get(id);
    if (!timers) { timers = new Set(); animTimersRef.current.set(id, timers); }

    function anyRunning() {
      for (const t of animTimersRef.current.values()) if (t.size > 0) return true;
      return false;
    }

    function finish(prevTimeoutId) {
      if (prevTimeoutId !== undefined) timers.delete(prevTimeoutId);
      if (timers.size === 0) animTimersRef.current.delete(id);
      setIsRunning(anyRunning());
      onDone?.();
    }

    function step(prevTimeoutId) {
      if (prevTimeoutId !== undefined) timers.delete(prevTimeoutId);
      let result;
      try {
        result = gen.next();
      } catch (err) {
        console.error('[Sharky] executor error:', err);
        finish();
        return;
      }
      if (result.done) { finish(); return; }
      const frame = result.value;
      setSprites(prev => prev.map(s => s.id === id ? { ...s, state: { ...frame.state } } : s));
      if (frame.broadcast) handleBroadcast(frame.broadcast);
      if (frame.stop) { finish(); return; }
      const delay = frame.delay !== undefined ? frame.delay : STEP_DELAY;
      const timeoutId = setTimeout(() => step(timeoutId), delay);
      timers.add(timeoutId);
      setIsRunning(true);
    }
    step();
  }

  // Runs every sprite's "when I receive [message]" scripts, each as its own
  // independent animation (Scratch's broadcast/receive messaging).
  function handleBroadcast(message) {
    for (const sprite of spritesRef.current) {
      const ws = spriteWorkspaces.current.get(sprite.id);
      if (!ws) continue;
      if (!hasMatchingHat(ws, 'sprite_when_i_receive', 'MESSAGE', message)) continue;
      const gen = executeHatBlocks(ws, 'sprite_when_i_receive', 'MESSAGE', message, sprite.state, worldRef.current);
      playFramesForSprite(sprite.id, gen);
    }
  }

  // Tracks the live stage-coordinate mouse position for Sensing blocks.
  function handleStageMouseMove(x, y) {
    inputStateRef.current.mouseX = x;
    inputStateRef.current.mouseY = y;
  }

  function stopAll() {
    for (const timers of animTimersRef.current.values()) {
      for (const t of timers) clearTimeout(t);
    }
    animTimersRef.current.clear();
    setIsRunning(false);
  }

  // Inject robot workspace
  useEffect(() => {
    const parser = new DOMParser();
    const toolboxDom = parser.parseFromString(robotToolboxXml, 'text/xml');
    const workspace = Blockly.inject(robotDiv.current, {
      toolbox: toolboxDom.documentElement,
      scrollbars: true, trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 1.0 },
    });
    robotWorkspaceRef.current = workspace;
    workspace.addChangeListener((event) => {
      if (event.isUiEvent) return;
      setArduinoCode(workspaceToArduino(workspace));
      setPythonCode(workspaceToPython(workspace));
    });
    return () => workspace.dispose();
  }, []);

  // Inject / dispose a Blockly workspace per sprite, one per hidden <div>.
  // Each sprite keeps its own live workspace so scripts persist when
  // switching sprites and so Run can execute every sprite's scripts directly.
  const spriteIdsKey = sprites.map(s => s.id).join(',');
  useEffect(() => {
    for (const sprite of sprites) {
      if (spriteWorkspaces.current.has(sprite.id)) continue;
      const div = spriteWorkspaceDivs.current.get(sprite.id);
      if (!div) continue;
      const parser = new DOMParser();
      const toolboxDom = parser.parseFromString(spriteToolboxXml, 'text/xml');
      const workspace = Blockly.inject(div, {
        toolbox: toolboxDom.documentElement,
        scrollbars: true, trashcan: true,
        zoom: { controls: true, wheel: true, startScale: 1.0 },
      });
      spriteWorkspaces.current.set(sprite.id, workspace);
    }

    const currentIds = new Set(sprites.map(s => s.id));
    for (const [id, workspace] of spriteWorkspaces.current) {
      if (!currentIds.has(id)) {
        workspace.dispose();
        spriteWorkspaces.current.delete(id);
        spriteWorkspaceDivs.current.delete(id);
      }
    }
  }, [spriteIdsKey]);

  // Stop all running animations on unmount
  useEffect(() => () => {
    for (const timers of animTimersRef.current.values()) {
      for (const t of timers) clearTimeout(t);
    }
  }, []);

  // Resize the visible workspace when switching mode or selected sprite
  useEffect(() => {
    if (workspaceMode === 'robot') {
      if (robotWorkspaceRef.current) setTimeout(() => Blockly.svgResize(robotWorkspaceRef.current), 0);
    } else {
      const ws = spriteWorkspaces.current.get(selectedSpriteId);
      if (ws) setTimeout(() => Blockly.svgResize(ws), 0);
    }
  }, [workspaceMode, selectedSpriteId]);

  function handleRun() {
    if (isRunning) { stopAll(); return; }
    for (const sprite of sprites) {
      const ws = spriteWorkspaces.current.get(sprite.id);
      if (!ws) continue;
      const gen = executeSprite(ws, sprite.state, worldRef.current);
      playFramesForSprite(sprite.id, gen);
    }
  }

  // when key pressed — capture phase so Blockly's stopPropagation doesn't block us
  useEffect(() => {
    function onKeyDown(e) {
      // Skip if user is typing into a Blockly field or any input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target.isContentEditable) return;
      if (workspaceMode !== 'sprite') return;
      // e.key for spacebar is ' '; the block field uses 'space'
      const key = e.key === ' ' ? 'space' : e.key;
      for (const sprite of spritesRef.current) {
        const ws = spriteWorkspaces.current.get(sprite.id);
        if (!ws) continue;
        if (!hasMatchingHat(ws, 'sprite_when_key_pressed', 'KEY', key)) continue;
        const gen = executeHatBlocks(ws, 'sprite_when_key_pressed', 'KEY', key, sprite.state, worldRef.current);
        playFramesForSprite(sprite.id, gen);
      }
    }
    window.addEventListener('keydown', onKeyDown, true); // capture phase
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [workspaceMode]); // playFramesForSprite / spritesRef are stable refs, no need to list them

  // Tracks live key-down state for the "key [x] pressed?" Sensing reporter.
  // Separate from the capture-phase handler above (which fires hat-block
  // scripts on each keydown) — this just maintains a held-keys set.
  useEffect(() => {
    function onKeyDown(e) {
      inputStateRef.current.keysDown.add(e.key === ' ' ? 'space' : e.key);
    }
    function onKeyUp(e) {
      inputStateRef.current.keysDown.delete(e.key === ' ' ? 'space' : e.key);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Tracks live mouse-button state for the "mouse down?" Sensing reporter.
  useEffect(() => {
    function onMouseDown() { inputStateRef.current.mouseDown = true; }
    function onMouseUp() { inputStateRef.current.mouseDown = false; }
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // when sprite clicked — canvas click that lands inside a sprite's bounding box.
  // Hit-test front-to-back so the topmost sprite under the click wins.
  function handleCanvasClick(canvasX, canvasY) {
    const ordered = [...spritesRef.current].sort((a, b) => b.state.layer - a.state.layer);
    for (const sprite of ordered) {
      const s = sprite.state;
      const sw = (s.width * s.size) / 100;
      const sh = (s.height * s.size) / 100;
      const cx = CANVAS_W / 2 + s.x;
      const cy = CANVAS_H / 2 - s.y;
      if (Math.abs(canvasX - cx) > sw / 2 || Math.abs(canvasY - cy) > sh / 2) continue;

      const ws = spriteWorkspaces.current.get(sprite.id);
      if (!ws) return;
      if (hasMatchingHat(ws, 'sprite_when_clicked', null, null)) {
        const gen = executeHatBlocks(ws, 'sprite_when_clicked', null, null, s, worldRef.current);
        playFramesForSprite(sprite.id, gen);
      }
      return;
    }
  }

  function handleAddSprite() {
    setShowLibrary(true);
  }

  // item is an entry from SPRITE_LIBRARY.
  function handleChooseLibrarySprite(item) {
    const overrides = { costume: item.costume, costumes: item.costumes, costumeIndex: 0, color: item.color };
    const newSprite = createSprite(item.name, overrides);
    setSprites(prev => [...prev, newSprite]);
    setSelectedSpriteId(newSprite.id);
    setShowLibrary(false);
  }

  // Drag the divider to resize the left (stage) panel.
  function handleResizeMouseDown(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    const activeWorkspace = workspaceMode === 'robot'
      ? robotWorkspaceRef.current
      : spriteWorkspaces.current.get(selectedSpriteId);

    function onMove(ev) {
      const width = Math.min(640, Math.max(240, startWidth + (ev.clientX - startX)));
      setLeftPanelWidth(width);
      if (activeWorkspace) Blockly.svgResize(activeWorkspace);
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleDeleteSprite(id) {
    if (sprites.length <= 1) return;
    const next = sprites.filter(s => s.id !== id);
    setSprites(next);
    if (id === selectedSpriteId) setSelectedSpriteId(next[0].id);
    const timers = animTimersRef.current.get(id);
    if (timers) {
      for (const t of timers) clearTimeout(t);
      animTimersRef.current.delete(id);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111' }}>

      {showLibrary && (
        <SpriteLibraryModal onChoose={handleChooseLibrarySprite} onClose={() => setShowLibrary(false)} />
      )}

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        height: 48, background: '#111', display: 'flex', alignItems: 'center',
        padding: '0 16px', borderBottom: '1px solid #2e2e2e', flexShrink: 0,
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: 'system-ui, sans-serif' }}>
          Sharky Studio
        </span>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel ────────────────────────────────────── */}
        <div style={{
          width: leftPanelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#1a1a1a', overflow: 'hidden',
        }}>

          {/* Fullscreen overlay */}
          {isFullscreen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: '#111', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', borderBottom: '1px solid #2e2e2e', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, color: '#666', fontFamily: 'system-ui, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>Stage</span>
                  <button onClick={handleRun} style={{
                    background: isRunning ? '#922' : '#1a7a3a',
                    color: '#fff', border: 'none', borderRadius: 4,
                    padding: '3px 12px', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 600,
                  }}>
                    {isRunning ? '■ Stop' : '▶ Run'}
                  </button>
                </div>
                <button onClick={() => setIsFullscreen(false)} style={{
                  background: '#2a2a2a', color: '#ccc', border: '1px solid #444',
                  borderRadius: 4, padding: '4px 12px', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'system-ui, sans-serif',
                }}>✕ Exit Fullscreen</button>
              </div>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
              }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '480 / 300',
                  maxHeight: 'calc(100vh - 80px)',
                  border: '1px solid #2e2e2e', borderRadius: 4, overflow: 'hidden',
                }}>
                  <Stage sprites={sprites} onCanvasClick={handleCanvasClick}
                    onSpriteDrag={handleSpriteDrag} onSelectSprite={setSelectedSpriteId}
                    onStageMouseMove={handleStageMouseMove} />
                </div>
              </div>
            </div>
          )}

          {/* Stage + Run button */}
          <div style={{ padding: '8px 8px 0', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 4,
            }}>
              <span style={{
                fontSize: 10, color: '#666', fontFamily: 'system-ui, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Stage</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setIsFullscreen(true)} title="Fullscreen" style={{
                  background: '#2a2a2a', color: '#aaa', border: '1px solid #3a3a3a',
                  borderRadius: 4, padding: '2px 7px', cursor: 'pointer',
                  fontSize: 13, lineHeight: 1, fontFamily: 'system-ui, sans-serif',
                }}>⛶</button>
                <button onClick={handleRun} style={{
                  background: isRunning ? '#922' : '#1a7a3a',
                  color: '#fff', border: 'none', borderRadius: 4,
                  padding: '3px 12px', cursor: 'pointer',
                  fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 600,
                }}>
                  {isRunning ? '■ Stop' : '▶ Run'}
                </button>
              </div>
            </div>
            <div style={{ border: '1px solid #2e2e2e', borderRadius: 4, overflow: 'hidden' }}>
              <Stage sprites={sprites} onCanvasClick={handleCanvasClick}
                onSpriteDrag={handleSpriteDrag} onSelectSprite={setSelectedSpriteId}
                onStageMouseMove={handleStageMouseMove} />
            </div>
          </div>

          {/* Sprite info panel */}
          <SpriteInfo
            sprite={selectedSprite.state}
            onUpdate={updateSelectedSprite}
            name={selectedSprite.name}
            onNameChange={renameSelectedSprite}
          />

          {/* Sprite strip */}
          <div style={{
            padding: '8px 10px', borderTop: '1px solid #2e2e2e',
            background: '#161616', flex: 1, overflowY: 'auto',
          }}>
            <span style={{
              fontSize: 10, color: '#666', fontFamily: 'system-ui, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6,
            }}>Sprites</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sprites.map(sprite => (
                <div key={sprite.id}
                  onClick={() => setSelectedSpriteId(sprite.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    border: sprite.id === selectedSpriteId ? '2px solid #4af' : '2px solid transparent',
                    borderRadius: 6, padding: '4px 6px',
                    cursor: 'pointer', background: '#222', gap: 3,
                    position: 'relative',
                  }}>
                  {sprites.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSprite(sprite.id); }}
                      title="Delete sprite"
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#922', color: '#fff', border: 'none',
                        fontSize: 10, lineHeight: 1, cursor: 'pointer', padding: 0,
                      }}>×</button>
                  )}
                  <div style={{
                    width: 44, height: 44, background: sprite.state.costume ? '#2a2a2a' : sprite.state.color,
                    borderRadius: 3, opacity: sprite.state.visible ? 1 : 0.4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sprite.state.costume && (
                      <img src={sprite.state.costume} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 9, color: '#ccc', fontFamily: 'system-ui, sans-serif',
                    maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{sprite.name}</span>
                </div>
              ))}

              {/* Add sprite tile */}
              <div onClick={handleAddSprite} title="Add sprite"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  border: '2px dashed #444', borderRadius: 6, padding: '4px 6px',
                  cursor: 'pointer', background: '#1c1c1c', gap: 3,
                }}>
                <div style={{
                  width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#666', fontSize: 22, fontWeight: 700,
                }}>+</div>
                <span style={{ fontSize: 9, color: '#666', fontFamily: 'system-ui, sans-serif' }}>Add</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider: drag to resize the stage panel ─────────── */}
        <div
          onMouseDown={handleResizeMouseDown}
          style={{ width: 6, flexShrink: 0, cursor: 'col-resize', background: '#2e2e2e' }}
        />

        {/* ── Right: mode toggle + workspaces ─────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Mode toggle */}
          <div style={{
            height: 40, background: '#161616', display: 'flex', alignItems: 'center',
            padding: '0 12px', gap: 4, borderBottom: '1px solid #2e2e2e', flexShrink: 0,
          }}>
            {[['robot', 'Robot'], ['sprite', 'Sprite']].map(([mode, label]) => (
              <button key={mode} onClick={() => setWorkspaceMode(mode)} style={{
                background: workspaceMode === mode ? '#2a2a2a' : 'transparent',
                color: workspaceMode === mode ? '#fff' : '#888',
                border: workspaceMode === mode ? '1px solid #444' : '1px solid transparent',
                borderRadius: 6, padding: '4px 14px', cursor: 'pointer',
                fontSize: 12, fontFamily: 'system-ui, sans-serif',
                fontWeight: workspaceMode === mode ? 600 : 400,
              }}>
                {label}
              </button>
            ))}
            <span style={{ marginLeft: 8, fontSize: 11, color: '#555', fontFamily: 'system-ui, sans-serif' }}>
              {workspaceMode === 'robot'
                ? 'generates Arduino / Python code'
                : `editing ${selectedSprite.name} — hit Run to play`}
            </span>
          </div>

          <div ref={robotDiv} style={{ flex: 1, display: workspaceMode === 'robot' ? 'block' : 'none' }} />
          {sprites.map(sprite => (
            <div key={sprite.id}
              ref={el => { if (el) spriteWorkspaceDivs.current.set(sprite.id, el); }}
              style={{
                flex: 1,
                display: (workspaceMode === 'sprite' && sprite.id === selectedSpriteId) ? 'block' : 'none',
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
