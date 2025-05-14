import React, { useState, useEffect } from 'react';
import '../styles/FactoryForm.css';
import { X } from 'lucide-react';

const FactoryForm = ({ factory, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    lowerBound: 1,
    upperBound: 100,
    childCount: 5
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    if (factory) {
      setFormData({
        name: factory.name || '',
        lowerBound: factory.lowerBound || 1,
        upperBound: factory.upperBound || 100,
        childCount: factory.childCount || 5
      });
    }
  }, [factory]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'lowerBound' || name === 'upperBound' || name === 'childCount') {
      processedValue = parseInt(value) || 0;
    }
    
    setFormData({
      ...formData,
      [name]: processedValue
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.lowerBound < 0) {
      newErrors.lowerBound = 'Lower bound must be non-negative';
    }
    
    if (formData.upperBound <= formData.lowerBound) {
      newErrors.upperBound = 'Upper bound must be greater than lower bound';
    }
    
    if (formData.childCount < 1) {
      newErrors.childCount = 'Must generate at least 1 child';
    }
    
    if (formData.childCount > 15) {
      newErrors.childCount = 'Cannot exceed 15 children';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };
  
  return (
    <div className="factory-form-overlay" onClick={onCancel}>
      <div className="factory-form" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h3>{factory ? 'Edit Factory' : 'Add New Factory'}</h3>
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Factory Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter factory name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lowerBound">Lower Bound</label>
              <input
                type="number"
                id="lowerBound"
                name="lowerBound"
                value={formData.lowerBound}
                onChange={handleChange}
                min="0"
                className={errors.lowerBound ? 'error' : ''}
              />
              {errors.lowerBound && <div className="error-message">{errors.lowerBound}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="upperBound">Upper Bound</label>
              <input
                type="number"
                id="upperBound"
                name="upperBound"
                value={formData.upperBound}
                onChange={handleChange}
                min={formData.lowerBound + 1}
                className={errors.upperBound ? 'error' : ''}
              />
              {errors.upperBound && <div className="error-message">{errors.upperBound}</div>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="childCount">Number of Children</label>
            <input
              type="number"
              id="childCount"
              name="childCount"
              value={formData.childCount}
              onChange={handleChange}
              min="1"
              max="15"
              className={errors.childCount ? 'error' : ''}
            />
            {errors.childCount && <div className="error-message">{errors.childCount}</div>}
            <div className="input-hint">Maximum 15 children allowed</div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="save-button">
              {factory ? 'Update Factory' : 'Create Factory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FactoryForm;