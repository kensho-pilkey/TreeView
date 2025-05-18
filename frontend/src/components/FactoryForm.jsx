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
    
    validateField(name, processedValue);
  };
  
  const validateField = (fieldName, value) => {
    let error = null;
    
    switch (fieldName) {
      case 'name':
        if (!value || !value.trim()) {
          error = 'Name is required';
        } else if (value.length > 30) {
          error = 'Name must be at most 30 characters';
        } else if (!/^[a-zA-Z0-9 ]*$/.test(value)) {
          error = 'Name can only contain letters, numbers, and spaces';
        }
        break;
        
      case 'lowerBound':
        if (typeof value !== 'number' || isNaN(value)) {
          error = 'Lower bound must be a valid number';
        } else if (value < 0) {
          error = 'Lower bound must be non-negative';
        } else if (formData.upperBound && value >= formData.upperBound) {
          error = 'Lower bound must be less than upper bound';
        }
        break;
        
      case 'upperBound':
        if (typeof value !== 'number' || isNaN(value)) {
          error = 'Upper bound must be a valid number';
        } else if (formData.lowerBound && value <= formData.lowerBound) {
          error = 'Upper bound must be greater than lower bound';
        }
        break;
        
      case 'childCount':
        if (typeof value !== 'number' || isNaN(value)) {
          error = 'Child count must be a valid number';
        } else if (!Number.isInteger(value)) {
          error = 'Child count must be a whole number';
        } else if (value < 1) {
          error = 'Must generate at least 1 child';
        } else if (value > 15) {
          error = 'Cannot exceed 15 children';
        }
        break;
        
      default:
        break;
    }
    
    if (error) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
      return false;
    }
    
    return true;
  };
  
  const validateForm = () => {
    const nameValid = validateField('name', formData.name);
    const lowerBoundValid = validateField('lowerBound', formData.lowerBound);
    const upperBoundValid = validateField('upperBound', formData.upperBound);
    const childCountValid = validateField('childCount', formData.childCount);
    
    let crossFieldValid = true;
    
    const range = formData.upperBound - formData.lowerBound;
    if (range > 1000000) {
      setErrors(prev => ({
        ...prev,
        upperBound: 'Range is too large (max 1,000,000)'
      }));
      crossFieldValid = false;
    }
    
    return nameValid && lowerBoundValid && upperBoundValid && childCountValid && crossFieldValid;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Sanitize the data before sending to prevent XSS and other injection attacks
      const sanitizedData = {
        name: formData.name.trim(),
        lowerBound: Math.max(0, Math.floor(Number(formData.lowerBound))),
        upperBound: Math.floor(Number(formData.upperBound)),
        childCount: Math.min(15, Math.max(1, Math.floor(Number(formData.childCount))))
      };
      
      onSave(sanitizedData);
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
        
        <form onSubmit={handleSubmit} noValidate>
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
              maxLength="30"
              pattern="[a-zA-Z0-9 ]+"
              required
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
            <div className="input-hint">Use only letters, numbers, and spaces</div>
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
                required
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
                required
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
              required
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