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
  
  return (
    <div className="factory-node-wrapper">
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
      
      {/* Child Nodes */}
      {factory.children && factory.children.length > 0 && (
        <>
          {/* Draw connector lines first so they appear behind the nodes */}
          {factory.children.map((child, index) => {
            const totalChildren = factory.children.length;
            // Using a 120-degree arc below the factory
            const arcSize = Math.PI * 2/3;
            // Bottom-centered angle
            const startAngle = Math.PI / 2 - arcSize / 2;
            // Calculate the angle for this specific child
            const angle = totalChildren === 1 
              ? Math.PI / 2 // Center angle for single child
              : startAngle + (index / (totalChildren - 1)) * arcSize;
            
            const radius = 100; // Distance from factory center to child center
            
            // Calculate coordinates for child position (center of child)
            const childX = Math.cos(angle) * radius;
            const childY = Math.sin(angle) * radius;
            
            // Factory node dimensions
            const factoryWidth = 120;
            const factoryHeight = 80;
            
            // Start point (center of factory)
            const startX = 0;
            const startY = 0;
            
            // Find the intersection point on the factory border
            let exitX, exitY;
            
            // For bottom edge
            if (angle > Math.PI/4 && angle < Math.PI*3/4) {
              exitY = factoryHeight / 2;
              exitX = exitY * Math.tan(Math.PI/2 - angle);
              
              // Cap within width
              if (Math.abs(exitX) > factoryWidth/2) {
                exitX = Math.sign(exitX) * factoryWidth/2;
                exitY = exitX / Math.tan(Math.PI/2 - angle);
              }
            }
            // For right edge
            else if (angle >= Math.PI*3/4 || angle <= -Math.PI*3/4) {
              exitX = -factoryWidth / 2;
              exitY = exitX * Math.tan(angle);
              
              // Cap within height
              if (Math.abs(exitY) > factoryHeight/2) {
                exitY = Math.sign(exitY) * factoryHeight/2;
                exitX = exitY / Math.tan(angle);
              }
            }
            // For left edge
            else if (angle >= -Math.PI/4 && angle <= Math.PI/4) {
              exitX = factoryWidth / 2;
              exitY = exitX * Math.tan(angle);
              
              // Cap within height
              if (Math.abs(exitY) > factoryHeight/2) {
                exitY = Math.sign(exitY) * factoryHeight/2;
                exitX = exitY / Math.tan(angle);
              }
            }
            // For top edge (unlikely for this use case, but for completeness)
            else {
              exitY = -factoryHeight / 2;
              exitX = exitY * Math.tan(Math.PI/2 - angle);
              
              // Cap within width
              if (Math.abs(exitX) > factoryWidth/2) {
                exitX = Math.sign(exitX) * factoryWidth/2;
                exitY = exitX / Math.tan(Math.PI/2 - angle);
              }
            }
            
            // Calculate the distance and angle for the connector line
            const dx = childX - exitX;
            const dy = childY - exitY;
            const childRadius = 18; // Half of child node width
            const distance = Math.sqrt(dx*dx + dy*dy) - childRadius;
            const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
            
            return (
              <div 
                key={`connector-${child.id}`}
                className="child-connector"
                style={{
                  width: `${distance}px`,
                  transform: `translate(${exitX}px, ${exitY}px) rotate(${rotation}deg)`,
                  transformOrigin: 'left center',
                  left: '50%',
                  top: '50%'
                }}
              ></div>
            );
          })}
          
          {/* Draw the child nodes */}
          <div className="children-container">
            {factory.children.map((child, index) => {
              const totalChildren = factory.children.length;
              // Using a 120-degree arc below the factory
              const arcSize = Math.PI * 2/3;
              // Bottom-centered angle
              const startAngle = Math.PI / 2 - arcSize / 2;
              // Calculate the angle for this specific child
              const angle = totalChildren === 1 
                ? Math.PI / 2 // Center angle for single child
                : startAngle + (index / (totalChildren - 1)) * arcSize;
              
              const radius = 100; // Distance from factory center to child center
              
              // Calculate coordinates for child position
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div 
                  key={child.id}
                  className="child-node"
                  style={{
                    transform: `translate(${x}px, ${y}px)`
                  }}
                >
                  {child.value}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FactoryNode;