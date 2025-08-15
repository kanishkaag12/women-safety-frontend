import React, { useState, useEffect } from 'react';
import './EmergencyContact.css';

const EmergencyContact = () => {
    const [contacts, setContacts] = useState([]);
    const [newContact, setNewContact] = useState({ name: '', phoneNumber: '', relationship: '' });
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [editContact, setEditContact] = useState({ name: '', phoneNumber: '', relationship: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch contacts when component mounts
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to view contacts');
                return;
            }

            const response = await fetch('http://localhost:5000/api/contacts', {
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch contacts');
            }

            const data = await response.json();
            setContacts(data);
        } catch (err) {
            setError(err.message);
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

        try {
            if (!newContact.name || !newContact.phoneNumber) {
                setError('Name and phone number are required');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to add contacts');
                return;
            }

            const response = await fetch('http://localhost:5000/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(newContact)
            });

            if (!response.ok) {
                throw new Error('Failed to add contact');
            }

            const data = await response.json();
            setContacts(data);
            setNewContact({ name: '', phoneNumber: '', relationship: '' });
            setIsAddingContact(false);
            setSuccess('Contact added successfully');
        } catch (err) {
            setError(err.message);
        }
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

            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to update contacts');
                return;
            }

            const response = await fetch(`http://localhost:5000/api/contacts/${contactId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(editContact)
            });

            if (!response.ok) {
                throw new Error('Failed to update contact');
            }

            const data = await response.json();
            setContacts(data);
            setIsEditing(null);
            setSuccess('Contact updated successfully');
        } catch (err) {
            setError(err.message);
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

            const response = await fetch(`http://localhost:5000/api/contacts/${contactId}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete contact');
            }

            // Remove the deleted contact from state
            setContacts(contacts.filter(contact => contact._id !== contactId));
            setSuccess('Contact deleted successfully');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="emergency-contact-container" style={{ padding: '20px', color: '#fff' }}>
            <h2 style={{ color: '#ff4d4d' }}>Emergency Contacts</h2>
            <p>Add and manage your emergency contacts here.</p>

            {error && <div className="error-message" style={{ color: '#ff4d4d', marginBottom: '10px' }}>{error}</div>}
            {success && <div className="success-message" style={{ color: '#4dff4d', marginBottom: '10px' }}>{success}</div>}

            {!isAddingContact ? (
                <button 
                    onClick={() => setIsAddingContact(true)}
                    style={{
                        backgroundColor: '#ff4d4d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        marginBottom: '20px'
                    }}
                >
                    <i className="fas fa-plus"></i> Add New Contact
                </button>
            ) : (
                <div className="add-contact-form" style={{ 
                    backgroundColor: '#333', 
                    padding: '20px', 
                    borderRadius: '10px',
                    marginBottom: '20px'
                }}>
                    <h3>Add New Contact</h3>
                    <form onSubmit={addContact}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={newContact.name}
                                onChange={handleInputChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ff4d4d',
                                    backgroundColor: '#444',
                                    color: '#fff'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Phone Number:</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={newContact.phoneNumber}
                                onChange={handleInputChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ff4d4d',
                                    backgroundColor: '#444',
                                    color: '#fff'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Relationship:</label>
                            <input
                                type="text"
                                name="relationship"
                                value={newContact.relationship}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ff4d4d',
                                    backgroundColor: '#444',
                                    color: '#fff'
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
                                    cursor: 'pointer'
                                }}
                            >
                                Save Contact
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsAddingContact(false);
                                    setNewContact({ name: '', phoneNumber: '', relationship: '' });
                                }}
                                style={{
                                    backgroundColor: '#4d4d4d',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50px',
                                    padding: '10px 20px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="contacts-list">
                {contacts.length === 0 ? (
                    <p>No emergency contacts added yet.</p>
                ) : (
                    contacts.map(contact => (
                        <div 
                            key={contact._id} 
                            className="contact-card"
                            style={{
                                backgroundColor: '#333',
                                padding: '15px',
                                borderRadius: '10px',
                                marginBottom: '15px'
                            }}
                        >
                            {isEditing === contact._id ? (
                                <form onSubmit={(e) => updateContact(e, contact._id)}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={editContact.name}
                                            onChange={handleEditInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '5px',
                                                border: '1px solid #ff4d4d',
                                                backgroundColor: '#444',
                                                color: '#fff'
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Phone Number:</label>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            value={editContact.phoneNumber}
                                            onChange={handleEditInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '5px',
                                                border: '1px solid #ff4d4d',
                                                backgroundColor: '#444',
                                                color: '#fff'
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Relationship:</label>
                                        <input
                                            type="text"
                                            name="relationship"
                                            value={editContact.relationship}
                                            onChange={handleEditInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '5px',
                                                border: '1px solid #ff4d4d',
                                                backgroundColor: '#444',
                                                color: '#fff'
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
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Update
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setIsEditing(null)}
                                            style={{
                                                backgroundColor: '#4d4d4d',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50px',
                                                padding: '10px 20px',
                                                fontSize: '16px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <h3 style={{ marginBottom: '5px' }}>{contact.name}</h3>
                                    <p style={{ marginBottom: '5px' }}>
                                        <i className="fas fa-phone"></i> {contact.phoneNumber}
                                    </p>
                                    {contact.relationship && (
                                        <p style={{ marginBottom: '10px' }}>
                                            <i className="fas fa-user-friends"></i> {contact.relationship}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => startEdit(contact)}
                                            style={{
                                                backgroundColor: '#007bff',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50px',
                                                padding: '8px 15px',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <i className="fas fa-edit"></i> Edit
                                        </button>
                                        <button 
                                            onClick={() => deleteContact(contact._id)}
                                            style={{
                                                backgroundColor: '#dc3545',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50px',
                                                padding: '8px 15px',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <i className="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EmergencyContact;