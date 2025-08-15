import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import config from '../config';
import './Dashboard.css';
import Microphone from './Microphone.jsx';
import NearbyLocation from './NearbyLocation.jsx';

const UserDashboard = ({ user }) => {
    const [userAlerts, setUserAlerts] = useState([]);
    const [emergencyContacts, setEmergencyContacts] = useState(user?.emergencyContacts || []);
    const [isCreatingAlert, setIsCreatingAlert] = useState(false);
    const [stats, setStats] = useState({
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        lastAlert: null
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Fetch user's alerts
            const alertsResponse = await fetch(`${config.ALERTS_BASE}/user/${user.id}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            if (alertsResponse.ok) {
                const alertsData = await alertsResponse.json();
                setUserAlerts(alertsData);
                setStats({
                    totalAlerts: alertsData.length,
                    activeAlerts: alertsData.filter(a => a.status === 'active').length,
                    resolvedAlerts: alertsData.filter(a => a.status === 'resolved').length,
                    lastAlert: alertsData.length > 0 ? alertsData[0] : null
                });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const sendEmergencyAlert = async () => {
        try {
            setIsCreatingAlert(true);
            const token = localStorage.getItem('token');
            
            // Get current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    // Convert coordinates to readable address
                    let readableLocation = `${latitude}, ${longitude}`;
                    try {
                        const geocodeResponse = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                        );
                        
                        if (geocodeResponse.ok) {
                            const geocodeData = await geocodeResponse.json();
                            if (geocodeData.display_name) {
                                readableLocation = geocodeData.display_name;
                            }
                        }
                    } catch (geocodeError) {
                        console.log('Geocoding failed, using coordinates:', geocodeError);
                        // Fallback to coordinates if geocoding fails
                    }
                    
                    const alertData = {
                        userId: user.id,
                        userName: user.name,
                        location: readableLocation,
                        coordinates: `${latitude}, ${longitude}`,
                        type: 'emergency',
                        priority: 'high',
                        status: 'active'
                    };

                    const response = await fetch(`${config.ALERTS_BASE}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify(alertData)
                    });

                    if (response.ok) {
                        alert('Emergency alert sent successfully! Help is on the way.');
                        fetchUserData(); // Refresh data
                    } else {
                        alert('Failed to send emergency alert. Please try again.');
                    }
                    setIsCreatingAlert(false);
                }, (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your location. Please try again.');
                    setIsCreatingAlert(false);
                });
            } else {
                alert('Geolocation is not supported by this browser.');
                setIsCreatingAlert(false);
            }
        } catch (error) {
            console.error('Error sending emergency alert:', error);
            alert('Failed to send emergency alert. Please try again.');
            setIsCreatingAlert(false);
        }
    };

    const addEmergencyContact = () => {
        const name = prompt('Enter contact name:');
        const phone = prompt('Enter phone number:');
        const relationship = prompt('Enter relationship:');

        if (name && phone) {
            const newContact = { name, phoneNumber: phone, relationship: relationship || '' };
            setEmergencyContacts([...emergencyContacts, newContact]);
            
            // Update user profile
            updateEmergencyContacts([...emergencyContacts, newContact]);
        }
    };

    const updateEmergencyContacts = async (contacts) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.AUTH_PROFILE}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ emergencyContacts: contacts })
            });

            if (response.ok) {
                console.log('Emergency contacts updated successfully');
            }
        } catch (error) {
            console.error('Error updating emergency contacts:', error);
        }
    };

    const removeEmergencyContact = (index) => {
        const updatedContacts = emergencyContacts.filter((_, i) => i !== index);
        setEmergencyContacts(updatedContacts);
        updateEmergencyContacts(updatedContacts);
    };

    return (
        <div className="dashboard user-dashboard">
            <DashboardHeader 
                user={user}
                title="User Dashboard"
                subtitle="Stay safe and connected with emergency services"
            />

            {/* Emergency Alert Section */}
            <div className="dashboard-section">
                <h2>🚨 Emergency Alert</h2>
                <div className="emergency-alert-box">
                    <p>In case of emergency, click the button below to send an immediate alert to nearby police stations.</p>
                    <button 
                        onClick={sendEmergencyAlert}
                        className="btn btn-emergency"
                    >
                        {isCreatingAlert ? 'Sending Alert...' : '🚨 SEND EMERGENCY ALERT'}
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Alerts</h3>
                    <p className="stat-number">{stats.totalAlerts}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Alerts</h3>
                    <p className="stat-number">{stats.activeAlerts}</p>
                </div>
                <div className="stat-card">
                    <h3>Resolved</h3>
                    <p className="stat-number">{stats.resolvedAlerts}</p>
                </div>
                <div className="stat-card">
                    <h3>Last Alert</h3>
                    <p className="stat-number">
                        {stats.lastAlert ? new Date(stats.lastAlert.createdAt).toLocaleDateString() : 'None'}
                    </p>
                </div>
            </div>

            {/* Safety Tools */}
            <div className="dashboard-section">
                <h2>Safety Tools</h2>
                <div className="safety-tools">
                    <div className="tool-card">
                        <h3>Voice Alert</h3>
                        <Microphone user={user} />
                    </div>
                    <div className="tool-card">
                        <h3>Nearby Safe Locations</h3>
                        <NearbyLocation />
                    </div>
                </div>
            </div>

            {/* Emergency Contacts */}
            <div className="dashboard-section">
                <h2>Emergency Contacts</h2>
                <button 
                    onClick={addEmergencyContact}
                    className="btn btn-primary"
                >
                    + Add Contact
                </button>
                <div className="contacts-list">
                    {emergencyContacts.map((contact, index) => (
                        <div key={index} className="contact-card">
                            <div className="contact-info">
                                <h4>{contact.name}</h4>
                                <p>{contact.phoneNumber}</p>
                                <p className="relationship">{contact.relationship}</p>
                            </div>
                            <div className="contact-actions">
                                <button 
                                    onClick={() => window.open(`tel:${contact.phoneNumber}`)}
                                    className="btn btn-success btn-sm"
                                >
                                    📞 Call
                                </button>
                                <button 
                                    onClick={() => removeEmergencyContact(index)}
                                    className="btn btn-danger btn-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alert History */}
            <div className="dashboard-section">
                <h2>Your Alert History</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userAlerts.map(alert => (
                                <tr key={alert._id}>
                                    <td>{new Date(alert.createdAt).toLocaleString()}</td>
                                    <td>
                                        <span className={`alert-type type-${alert.type}`}>
                                            {alert.type}
                                        </span>
                                    </td>
                                    <td>{alert.location}</td>
                                    <td>
                                        <span className={`status-badge status-${alert.status}`}>
                                            {alert.status}
                                        </span>
                                    </td>
                                    <td>
                                        {alert.policeResponse ? 
                                            `Officer ${alert.policeResponse.officerName}` : 
                                            'Pending'
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions">
                    <button className="btn btn-primary">Update Profile</button>
                    <button className="btn btn-success">View Safety Tips</button>
                    <button className="btn btn-info">Contact Support</button>
                    <button className="btn btn-warning">Report Incident</button>
                </div>
            </div>
            
            <DashboardFooter />
        </div>
    );
};

export default UserDashboard;
