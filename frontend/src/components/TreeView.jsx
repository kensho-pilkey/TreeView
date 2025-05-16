import React, { useState, useMemo } from 'react';
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
  const [isRootHovered, setIsRootHovered] = useState(false);
  
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
  
  const uniqueFactories = useMemo(() => {
    const factoryMap = new Map();
    
    // Only keep one instance of each factory ID
    tree.factories.forEach(factory => {
      if (factory && factory.id && !factoryMap.has(factory.id)) {
        factoryMap.set(factory.id, factory);
      }
    });
    
    // Convert back to array
    return Array.from(factoryMap.values());
  }, [tree.factories]);

  // Get the appropriate zoom class based on number of factories
  const getZoomClass = () => {
    const count = uniqueFactories.length;
    if (count <= 4) return '';
    if (count <= 7) return 'zoomed-out';
    if (count <= 11) return 'zoomed-out-more';
    return 'zoomed-out-max';
  };

  // Get the zoom level as a string to pass to child components
  const zoomLevel = getZoomClass();
  
  // Calculate positions based on unique factories with dynamic radius
  const factoryPositions = useMemo(() => {
    const totalFactories = uniqueFactories.length;
    if (totalFactories === 0) return [];
    
    // Sort factories by ID for consistent positioning
    const sortedFactories = [...uniqueFactories].sort((a, b) => 
      a.id.localeCompare(b.id)
    );
    
    // Base radius for 1-4 factories
    let baseRadius = 250;
    
    // Scale radius up as more factories are added beyond 4
    // This creates the "spread out" effect
    const radius = totalFactories <= 4 
      ? baseRadius 
      : baseRadius * (1 + (totalFactories - 4) * 0.15); // Increase by 15% for each factory beyond 4
    
    const positions = [];
    
    for (let i = 0; i < sortedFactories.length; i++) {
      const angle = (i / sortedFactories.length) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      positions.push({ id: sortedFactories[i].id, x, y });
    }
    
    return positions;
  }, [uniqueFactories]);
  
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
      
      <div className={`tree-visualization ${getZoomClass()}`}>
        <div className="root-node-container">
          <div 
            className="root-node"
            onMouseEnter={() => setIsRootHovered(true)}
            onMouseLeave={() => setIsRootHovered(false)}
          >
            <span>Root</span>
            <button 
              className={`add-factory-btn ${isRootHovered ? 'visible' : ''}`}
              onClick={handleAddFactory}
              title="Add Factory"
            >
              <PlusCircle size={20} />
            </button>
          </div>
          
          <div className="factories-container">
            {uniqueFactories.map((factory) => {
              const position = factoryPositions.find(pos => pos.id === factory.id);
              if (!position) return null;
              
              const lineLength = Math.sqrt(position.x * position.x + position.y * position.y);
              const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
              
              return (
                <div 
                  key={`factory-${factory.id}`}
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
                    zoomLevel={zoomLevel}
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