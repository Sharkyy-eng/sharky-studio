// This is the ENTRY POINT — the first JavaScript that runs.
// It does ONE job: grab the <div id="root"> and render our App into it.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)