import React, { useState } from 'react';
import '../styles/FactoryNode.css';
import { Edit, X, Play } from 'lucide-react';

/**
 * FactoryNode - Component for displaying factory nodes and their children
 * 
 * @param {Object} factory - The factory data
 * @param {Function} onEdit - Callback for edit action
 * @param {Function} onDelete - Callback for delete action
 * @param {Function} onGenerateChildren - Callback for generating children
 */
const FactoryNode = ({ factory, onEdit, onDelete, onGenerateChildren }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Child node distance from factory center
  const radius = 140; 
  
  return (
    <div className="factory-node-wrapper">
      <div className="factory-center-point">
        {/* Factory Node */}
        <div 
          className="factory-node"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="factory-header">
            <span className="factory-name">{factory.name}</span>
            
            {/* Controls visible on hover */}
            {isHovered && (
              <div className="factory-controls">
                <button 
                  className="factory-btn edit-btn" 
                  onClick={onEdit}
                  title="Edit Factory"
                >
                  <Edit size={16} />
                </button>
                
                <button 
                  className="factory-btn generate-btn" 
                  onClick={onGenerateChildren}
                  title="Generate Children"
                >
                  <Play size={16} />
                </button>
                
                <button 
                  className="factory-btn delete-btn" 
                  onClick={onDelete}
                  title="Delete Factory"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="factory-info">
            <div className="factory-range">
              Range: {factory.lowerBound} - {factory.upperBound}
            </div>
            <div className="factory-child-count">
              Children: {factory.childCount}
            </div>
          </div>
        </div>
        
        {/* Child Nodes with connecting lines */}
        {factory.children && factory.children.length > 0 && (
          <div className="children-container">
            {/* Draw the connector lines first so they appear behind nodes */}
            {factory.children.map((child, index) => {
              const totalChildren = factory.children.length;
              const angle = (index / totalChildren) * Math.PI * 2;
              
              return (
                <div 
                  key={`line-${child.id}`}
                  className="connector-line"
                  style={{
                    width: radius,
                    transform: `rotate(${angle * (180 / Math.PI)}deg)`,
                    left: '0',
                    top: '0'
                  }}
                />
              );
            })}
            
            {/* Child nodes */}
            {factory.children.map((child, index) => {
              const totalChildren = factory.children.length;
              const angle = (index / totalChildren) * Math.PI * 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div 
                  key={child.id}
                  className="child-node"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`
                  }}
                >
                  {child.value}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FactoryNode;