import { useState } from 'react';
import '../styles/TreeView.css';

const TreeView = () => {
  // State for factories (will be expanded later)
  const [factories, setFactories] = useState([]);

  return (
    <div className="tree-view-container">
      <h2>Tree View Application</h2>
      
      <div className="tree-view">
        <div className="root-node">
          <div className="node-content">
            <h3>Root Node</h3>
          </div>
          
          <div className="factories-container">
            {factories.length > 0 ? (
              <ul className="factories-list">
                {factories.map(factory => (
                  <li key={factory.id} className="factory-item">
                    {/* Factory details will be rendered by FactoryNode component */}
                    <div className="factory-placeholder">
                      Factory: {factory.name}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-factories">
                <p>No factories added yet. Use the form below to add a factory.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="factory-form-placeholder">
        <p>Factory Form will be added here</p>
      </div>
    </div>
  );
};

export default TreeView;