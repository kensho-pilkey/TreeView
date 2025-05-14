import TreeView from './components/TreeView';
import './styles/App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Factory Tree Visualization</h1>
      </header>
      
      <main className="app-main">
        <TreeView />
      </main>
      
      <footer className="app-footer">
        <p>Tree View Application - &copy; 2025</p>
      </footer>
    </div>
  );
}

export default App;