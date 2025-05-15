import React from 'react';
import './App.css';
import TreeView from './components/TreeView';
import { TreeProvider } from './context/TreeContext';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Factory Tree Visualization</h1>
      </header>
      
      <main className="app-main">
        <TreeProvider>
          <TreeView />
        </TreeProvider>
      </main>
      
      <footer className="app-footer">
        <p>Tree View Application | Real-time Tree View</p>
      </footer>
    </div>
  );
}

export default App;