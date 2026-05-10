// ============================================================
// App.jsx — MAIN FILE
// ============================================================
// This wires everything together:
//   1. Import Blockly
//   2. Import our block definitions (registers them with Blockly)
//   3. Import the toolbox XML
//   4. Inject Blockly into a <div>
//   5. Done — drag and drop works!
// ============================================================

import { useEffect, useRef } from "react";
import * as Blockly from "blockly";

// This import RUNS the file, which calls defineBlocksWithJsonArray()
// That registers our 3 blocks with Blockly globally.
import "./blockly/blocks/basicBlocks.js";

// The ?raw suffix tells Vite: "give me the file contents as a string"
// Without ?raw, Vite would try to parse the XML as a module and crash.
import toolboxXml from "./blockly/toolboxes/robot.xml?raw";

function App() {
  // useRef gives us a reference to the actual DOM element
  // We need this because Blockly needs a real <div> to inject into
  const blocklyDiv = useRef(null);

  // useEffect runs ONCE after the component mounts (the [] at the end)
  useEffect(() => {
    // Parse our XML string into a real DOM element
    const parser = new DOMParser();
    const toolboxDom = parser.parseFromString(toolboxXml, "text/xml");

    // THIS IS THE KEY LINE — inject Blockly into our div
    const workspace = Blockly.inject(blocklyDiv.current, {
      toolbox: toolboxDom.documentElement,  // our sidebar categories
      scrollbars: true,                      // can scroll the workspace
      trashcan: true,                        // shows a trashcan to delete blocks
    });

    // Cleanup: when the component unmounts, dispose of Blockly
    return () => workspace.dispose();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* Top bar */}
      <div style={{
        height: 48,
        background: "#111",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: "1px solid #333"
      }}>
        <span style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
          fontFamily: "system-ui, sans-serif"
        }}>
          🤖 Sharky Studio
        </span>
      </div>

      {/* Blockly workspace — takes up all remaining space */}
      <div ref={blocklyDiv} style={{ flex: 1 }} />

    </div>
  );
}

export default App;