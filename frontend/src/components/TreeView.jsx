import React, { useState } from 'react';
import '../styles/TreeView.css';
import { PlusCircle, Wifi, WifiOff, Loader } from 'lucide-react';
import FactoryNode from './FactoryNode';
import FactoryForm from './FactoryForm';
import { useTree } from '../context/TreeContext';

const TreeView = () => {
  const { 
    tree, 
    loading, 
    error, 
    socketConnected,
    addFactory, 
    updateFactory, 
    deleteFactory, 
    generateChildren,
    clearError 
  } = useTree();
  
  const [editingFactory, setEditingFactory] = useState(null);
  const [showFactoryForm, setShowFactoryForm] = useState(false);
  
  const handleAddFactory = () => {
    setEditingFactory(null);
    setShowFactoryForm(true);
  };
  
  const handleEditFactory = (factory) => {
    setEditingFactory(factory);
    setShowFactoryForm(true);
  };
  
  const handleSaveFactory = async (formData) => {
    if (editingFactory) {
      await updateFactory(editingFactory.id, formData);
    } else {
      await addFactory(formData);
    }
    
    setShowFactoryForm(false);
    setEditingFactory(null);
  };
  
  const handleDeleteFactory = async (factoryId) => {
    await deleteFactory(factoryId);
  };
  
  const handleGenerateChildren = async (factoryId) => {
    await generateChildren(factoryId);
  };
  
  const calculateFactoryPositions = () => {
    const totalFactories = tree.factories.length;
    if (totalFactories === 0) return [];
    
    const radius = 250;
    const positions = [];
    
    for (let i = 0; i < totalFactories; i++) {
      const angle = (i / totalFactories) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      positions.push({ id: tree.factories[i].id, x, y });
    }
    
    return positions;
  };
  
  const factoryPositions = calculateFactoryPositions();
  
  // Render error notification if there's an error
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="error-notification">
        <div className="error-content">
          <div className="error-message">{error}</div>
          <button className="error-close" onClick={clearError}>×</button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="tree-view">
      {/* Connection status indicator */}
      <div className={`connection-status ${socketConnected ? 'connected' : 'disconnected'}`}>
        {socketConnected ? (
          <>
            <Wifi size={16} />
            <span>Connected</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>Disconnected</span>
          </>
        )}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="loading-overlay">
          <Loader size={32} className="spinner" />
        </div>
      )}
      
      {/* Error notification */}
      {renderError()}
      
      <div className="tree-visualization">
        <div className="root-node-container">
          <div className="root-node">
            <span>Root</span>
            <button 
              className="add-factory-btn" 
              onClick={handleAddFactory}
              title="Add Factory"
            >
              <PlusCircle size={20} />
            </button>
          </div>
          
          <div className="factories-container">
            {tree.factories.map((factory) => {
              const position = factoryPositions.find(pos => pos.id === factory.id);
              if (!position) return null;
              
              const lineLength = Math.sqrt(position.x * position.x + position.y * position.y);
              const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
              
              return (
                <div 
                  key={factory.id} 
                  className="factory-branch"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px)`
                  }}
                >
                  <div 
                    className="connector-root-to-factory"
                    style={{
                      width: `${lineLength}px`,
                      transform: `rotate(${angle}deg) translateX(-100%)`,
                      top: '0',
                      left: '0'
                    }}
                  ></div>
                  
                  <FactoryNode 
                    factory={factory}
                    onEdit={() => handleEditFactory(factory)}
                    onDelete={() => handleDeleteFactory(factory.id)}
                    onGenerateChildren={() => handleGenerateChildren(factory.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {showFactoryForm && (
        <FactoryForm 
          factory={editingFactory}
          onSave={handleSaveFactory}
          onCancel={() => {
            setShowFactoryForm(false);
            setEditingFactory(null);
          }}
        />
      )}
    </div>
  );
};

export default TreeView;