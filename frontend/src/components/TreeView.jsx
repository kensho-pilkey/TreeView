import React, { useState } from 'react';
import '../styles/TreeView.css';
import { PlusCircle } from 'lucide-react';
import FactoryNode from './FactoryNode';
import FactoryForm from './FactoryForm';

const TreeView = () => {
  const [tree, setTree] = useState({
    id: 'root',
    name: 'Root',
    factories: []
  });
  const [editingFactory, setEditingFactory] = useState(null);
  const [showFactoryForm, setShowFactoryForm] = useState(false);
  
  const addFactory = (formData) => {
    const newFactory = {
      id: `factory-${Date.now()}`,
      name: formData.name || `Factory ${tree.factories.length + 1}`,
      lowerBound: parseInt(formData.lowerBound),
      upperBound: parseInt(formData.upperBound),
      childCount: parseInt(formData.childCount),
      children: []
    };
    setTree({
      ...tree,
      factories: [...tree.factories, newFactory]
    });
    setShowFactoryForm(false);
    setEditingFactory(null);
  };
  
  const updateFactory = (factoryId, formData) => {
    const updatedFactories = tree.factories.map(factory => {
      if (factory.id === factoryId) {
        return {
          ...factory,
          name: formData.name,
          lowerBound: parseInt(formData.lowerBound),
          upperBound: parseInt(formData.upperBound),
          childCount: parseInt(formData.childCount)
        };
      }
      return factory;
    });
    setTree({
      ...tree,
      factories: updatedFactories
    });
    setShowFactoryForm(false);
    setEditingFactory(null);
  };
  
  const deleteFactory = (factoryId) => {
    setTree({
      ...tree,
      factories: tree.factories.filter(factory => factory.id !== factoryId)
    });
  };
  
  const generateChildren = (factoryId) => {
    const updatedFactories = tree.factories.map(factory => {
      if (factory.id === factoryId) {
        const newChildren = [];
        for (let i = 0; i < factory.childCount; i++) {
          const randomValue = Math.floor(
            Math.random() * (factory.upperBound - factory.lowerBound + 1) + factory.lowerBound
          );
          newChildren.push({
            id: `child-${factoryId}-${i}-${Date.now()}`,
            value: randomValue
          });
        }
        return {
          ...factory,
          children: newChildren
        };
      }
      return factory;
    });
    setTree({
      ...tree,
      factories: updatedFactories
    });
  };
  
  const handleAddFactory = () => {
    setEditingFactory(null);
    setShowFactoryForm(true);
  };
  
  const handleEditFactory = (factory) => {
    setEditingFactory(factory);
    setShowFactoryForm(true);
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
  
  return (
    <div className="tree-view">
      <div className="tree-visualization">
        <div className="root-node-container">
          <div className="root-node">
            <span>Root</span>
            <button 
              className="add-factory-btn" 
              onClick={handleAddFactory}
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
                    onDelete={() => deleteFactory(factory.id)}
                    onGenerateChildren={() => generateChildren(factory.id)}
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
          onSave={(formData) => {
            if (editingFactory) {
              updateFactory(editingFactory.id, formData);
            } else {
              addFactory(formData);
            }
          }}
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