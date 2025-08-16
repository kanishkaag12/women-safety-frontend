import React, { useState, useEffect } from 'react';
import config from '../config';
import './EmergencyContact.css';

const EmergencyContact = () => {
    const [contacts, setContacts] = useState([]);
    const [newContact, setNewContact] = useState({ name: '', phoneNumber: '', relationship: '' });
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [editContact, setEditContact] = useState({ name: '', phoneNumber: '', relationship: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch contacts from backend when component mounts
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to view contacts');
                setIsLoading(false);
                return;
            }

            console.log('Fetching contacts with token:', token);

            const response = await fetch(config.CONTACTS_BASE, {
                headers: {
                    'x-auth-token': token
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in again to access your contacts');
                } else {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`Failed to fetch contacts: ${response.status}`);
                }
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            console.log('Fetched contacts:', data);
            setContacts(data);
            setError('');
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setError('Failed to load contacts. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewContact(prev => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditContact(prev => ({ ...prev, [name]: value }));
    };

    const addContact = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            // Input validation
            if (!newContact.name || !newContact.phoneNumber) {
                setError('Name and phone number are required');
                return;
            }
            // Enhanced phone number validation
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
            if (!phoneRegex.test(newContact.phoneNumber.replace(/\s/g, ''))) {
                setError('Please enter a valid phone number (e.g., +1234567890 or 123-456-7890)');
                return;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to add contacts');
                return;
            }
            // Prepare contact data
            const contactData = {
                name: newContact.name.trim(),
                phoneNumber: newContact.phoneNumber.trim(),
                relationship: newContact.relationship.trim()
            };
            // Add request timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            // Make API request
            console.log('Making request to:', config.CONTACTS_BASE);
            console.log('Request data:', contactData);
            console.log('Token:', token ? 'Present' : 'Missing');
            
            const response = await fetch(config.CONTACTS_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(contactData),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            if (!response.ok) {
                let errorMessage = 'Failed to add contact';
                try {
                    const errorData = await response.text();

                    try {
                        const parsedError = JSON.parse(errorData);
                        errorMessage = parsedError.message || errorMessage;
                    } catch (parseError) {
                        errorMessage = errorData || `Failed to add contact: ${response.status}`;
                    }
                } catch (textError) {
                    errorMessage = `Failed to add contact: ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            const data = await response.json();

            if (Array.isArray(data)) {
                setContacts(data);
                setNewContact({ name: '', phoneNumber: '', relationship: '' });
                setIsAddingContact(false);
                setSuccess('Contact added successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (err) {
            console.error('Error adding contact:', err);
            console.error('Error details:', {
                name: err.name,
                message: err.message,
                stack: err.stack
            });
            
            let errorMessage = 'Failed to add contact';

            if (err.name === 'AbortError') {
                errorMessage = 'Request timed out. Please try again.';
            } else if (err.message === 'Failed to fetch') {
                errorMessage = 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000';
            } else if (err.message && err.message.trim() !== '') {
                errorMessage = err.message;
            } else {
                errorMessage = 'Network error. Please check your connection and ensure the backend server is running.';
            }

            setError(errorMessage);
        }
        setIsLoading(false);
    };

const startEdit = (contact) => {
    setIsEditing(contact._id);
    setEditContact({
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        relationship: contact.relationship || ''
    });
};

const updateContact = async (e, contactId) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
        if (!editContact.name || !editContact.phoneNumber) {
            setError('Name and phone number are required');
            return;
        }

        // Validate phone number
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(editContact.phoneNumber.replace(/\s/g, ''))) {
            setError('Please enter a valid phone number');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('You must be logged in to update contacts');
            return;
        }

        const contactData = {
            name: editContact.name.trim(),
            phoneNumber: editContact.phoneNumber.trim(),
            relationship: editContact.relationship.trim()
        };

        console.log('Updating contact:', contactId, contactData);

        const response = await fetch(`${config.CONTACTS_BASE}/${contactId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(contactData)
        });

        console.log('Update contact response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                setError('Please log in again to update contacts');
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to update contact: ${response.status}`);
            }
            return;
        }

        const data = await response.json();
        console.log('Updated contact response:', data);
        setContacts(data);
        setIsEditing(null);
        setSuccess('Contact updated successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
        console.error('Error updating contact:', err);
        setError(`Failed to update contact: ${err.message}`);
    }
};

const deleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
        return;
    }

    setError('');
    setSuccess('');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('You must be logged in to delete contacts');
            return;
        }

        console.log('Deleting contact:', contactId);

        const response = await fetch(`${config.CONTACTS_BASE}/${contactId}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token
            }
        });

        console.log('Delete contact response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                setError('Please log in again to delete contacts');
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to delete contact: ${response.status}`);
            }
            return;
        }

        // Remove the deleted contact from state
        setContacts(prev => prev.filter(contact => contact._id !== contactId));
        setSuccess('Contact deleted successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
        console.error('Error deleting contact:', err);
        setError(`Failed to delete contact: ${err.message}`);
    }
};

const callContact = (phoneNumber) => {
    window.open(`tel:${phoneNumber}`, '_self');
};

const refreshContacts = () => {
    fetchContacts();
};

return (
    <div className="emergency-contact-container" style={{
        padding: '20px',
        color: '#333',
        background: '#fff',
        minHeight: '100vh'
    }}>
        <h2 style={{ color: '#667eea', marginBottom: '10px' }}>Emergency Contacts</h2>
        <p style={{ color: '#6c757d' }}>Add and manage your emergency contacts here.</p>

        {error && (
            <div className="error-message" style={{
                color: '#ff4757',
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: 'rgba(255,71,87,0.1)',
                borderRadius: '8px',
                border: '1px solid #ff4757'
            }}>
                ⚠️ {error}
            </div>
        )}

        {success && (
            <div className="success-message" style={{
                color: '#2ed573',
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: 'rgba(46,213,115,0.1)',
                borderRadius: '8px',
                border: '1px solid #2ed573'
            }}>
                ✅ {success}
            </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {!isAddingContact && (
                <button
                    onClick={() => setIsAddingContact(true)}
                    style={{
                        backgroundColor: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s ease'
                    }}
                >
                    <i className="fas fa-plus"></i> Add New Contact
                </button>
            )}

            <button
                onClick={refreshContacts}
                disabled={isLoading}
                style={{
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                {isLoading ? 'Loading...' : 'Refresh'}
            </button>
        </div>

        {!isAddingContact ? null : (
            <div className="add-contact-form" style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #e1e1e1',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ marginBottom: '20px', color: '#667eea' }}>Add New Contact</h3>
                <form onSubmit={addContact}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name: *</label>
                        <input
                            type="text"
                            name="name"
                            value={newContact.name}
                            onChange={handleInputChange}
                            placeholder="Enter contact name"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #667eea',
                                backgroundColor: '#fff',
                                color: '#333',
                                fontSize: '16px',
                                transition: 'border-color 0.2s ease'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone Number: *</label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={newContact.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="Enter phone number"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '5px',
                                border: '1px solid #ff4d4d',
                                backgroundColor: '#444',
                                color: '#fff',
                                fontSize: '16px'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Relationship:</label>
                        <input
                            type="text"
                            name="relationship"
                            value={newContact.relationship}
                            onChange={handleInputChange}
                            placeholder="e.g., Mother, Father, Friend"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '5px',
                                border: '1px solid #ff4d4d',
                                backgroundColor: '#444',
                                color: '#fff',
                                fontSize: '16px'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="submit"
                            style={{
                                backgroundColor: '#667eea',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                flex: 1,
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            <i className="fas fa-save"></i> Save Contact
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsAddingContact(false);
                                setNewContact({ name: '', phoneNumber: '', relationship: '' });
                                setError('');
                            }}
                            style={{
                                backgroundColor: '#f8f9fa',
                                color: '#6c757d',
                                border: '1px solid #e1e1e1',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                flex: 1,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <i className="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="contacts-list">
            {isLoading ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px'
                }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#ff4d4d', marginBottom: '20px' }}></i>
                    <p style={{ fontSize: '18px', color: '#ccc' }}>Loading your contacts...</p>
                </div>
            ) : contacts.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    border: '1px dashed #666'
                }}>
                    <i className="fas fa-users" style={{ fontSize: '48px', color: '#666', marginBottom: '20px' }}></i>
                    <p style={{ fontSize: '18px', color: '#ccc' }}>No emergency contacts added yet.</p>
                    <p style={{ color: '#999' }}>Click "Add New Contact" to get started.</p>
                </div>
            ) : (
                <>
                    <h3 style={{ marginBottom: '20px', color: '#ff4d4d' }}>
                        Your Emergency Contacts ({contacts.length})
                    </h3>
                    {contacts.map(contact => (
                        <div
                            key={contact._id}
                            className="contact-card"
                            style={{
                                backgroundColor: '#fff',
                                padding: '20px',
                                borderRadius: '12px',
                                marginBottom: '15px',
                                border: '1px solid #e1e1e1',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                            }}
                        >
                            {isEditing === contact._id ? (
                                <form onSubmit={(e) => updateContact(e, contact._id)}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name: *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={editContact.name}
                                            onChange={handleEditInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '5px',
                                                border: '1px solid #ff4d4d',
                                                backgroundColor: '#444',
                                                color: '#fff',
                                                fontSize: '16px'
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone Number: *</label>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            value={editContact.phoneNumber}
                                            onChange={handleEditInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '5px',
                                                border: '1px solid #ff4d4d',
                                                backgroundColor: '#444',
                                                color: '#fff',
                                                fontSize: '16px'
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Relationship:</label>
                                        <input
                                            type="text"
                                            name="relationship"
                                            value={editContact.relationship}
                                            onChange={handleEditInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '5px',
                                                border: '1px solid #ff4d4d',
                                                backgroundColor: '#444',
                                                color: '#fff',
                                                fontSize: '16px'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="submit"
                                            style={{
                                                backgroundColor: '#ff4d4d',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50px',
                                                padding: '10px 20px',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                flex: 1
                                            }}
                                        >
                                            <i className="fas fa-save"></i> Update
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(null);
                                                setError('');
                                            }}
                                            style={{
                                                backgroundColor: '#4d4d4d',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50px',
                                                padding: '10px 20px',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                flex: 1
                                            }}
                                        >
                                            <i className="fas fa-times"></i> Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <h3 style={{ marginBottom: '8px', color: '#fff' }}>{contact.name}</h3>
                                            <p style={{ marginBottom: '5px', fontSize: '16px' }}>
                                                <i className="fas fa-phone" style={{ color: '#ff4d4d', marginRight: '8px' }}></i>
                                                {contact.phoneNumber}
                                            </p>
                                            {contact.relationship && (
                                                <p style={{ marginBottom: '10px', fontSize: '14px', color: '#ccc' }}>
                                                    <i className="fas fa-user-friends" style={{ color: '#ff4d4d', marginRight: '8px' }}></i>
                                                    {contact.relationship}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => callContact(contact.phoneNumber)}
                                                style={{
                                                    backgroundColor: '#28a745',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    padding: '8px 12px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Call this contact"
                                            >
                                                <i className="fas fa-phone"></i>
                                            </button>
                                            <button
                                                onClick={() => startEdit(contact)}
                                                style={{
                                                    backgroundColor: '#007bff',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    padding: '8px 12px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Edit contact"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => deleteContact(contact._id)}
                                                style={{
                                                    backgroundColor: '#dc3545',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    padding: '8px 12px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Delete contact"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </>
            )}
        </div>
    </div>
);
};

export default EmergencyContact;