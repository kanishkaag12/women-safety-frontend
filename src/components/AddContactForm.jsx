import React, { useState } from 'react';

const AddContactForm = ({ onSubmit, onClose }) => {
    const [contact, setContact] = useState({ name: '', phoneNumber: '', relationship: '' });
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!contact.name.trim()) {
            newErrors.name = 'Name is required';
        }
        if (!contact.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        } else {
            const phoneRegex = /^[\+]?[1-9][\d]{9,15}$/;
            if (!phoneRegex.test(contact.phoneNumber.replace(/\s/g, ''))) {
                newErrors.phoneNumber = 'Please enter a valid phone number';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit({
                name: contact.name.trim(),
                phoneNumber: contact.phoneNumber.trim(),
                relationship: contact.relationship.trim()
            });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Emergency Contact</h3>
                    <button 
                        className="btn btn-danger btn-sm" 
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                                Name *
                            </label>
                            <input
                                type="text"
                                value={contact.name}
                                onChange={(e) => setContact({...contact, name: e.target.value})}
                                placeholder="Enter contact name"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: errors.name ? '1px solid #ff4757' : '1px solid #667eea',
                                    fontSize: '16px',
                                    color: '#333'
                                }}
                            />
                            {errors.name && (
                                <div style={{ color: '#ff4757', fontSize: '14px', marginTop: '5px' }}>
                                    {errors.name}
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                value={contact.phoneNumber}
                                onChange={(e) => setContact({...contact, phoneNumber: e.target.value})}
                                placeholder="Enter phone number"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: errors.phoneNumber ? '1px solid #ff4757' : '1px solid #667eea',
                                    fontSize: '16px',
                                    color: '#333'
                                }}
                            />
                            {errors.phoneNumber && (
                                <div style={{ color: '#ff4757', fontSize: '14px', marginTop: '5px' }}>
                                    {errors.phoneNumber}
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                                Relationship
                            </label>
                            <input
                                type="text"
                                value={contact.relationship}
                                onChange={(e) => setContact({...contact, relationship: e.target.value})}
                                placeholder="e.g., Parent, Sibling, Friend"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #667eea',
                                    fontSize: '16px',
                                    color: '#333'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: '1px solid #e1e1e1',
                                    background: '#f8f9fa',
                                    color: '#6c757d',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#667eea',
                                    color: '#fff',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Add Contact
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddContactForm;
