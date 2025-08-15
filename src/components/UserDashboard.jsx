import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import config from '../config';
import './Dashboard.css';
import Microphone from './Microphone.jsx';
import NearbyLocation from './NearbyLocation.jsx';
import PersonalInfo from './PersonalInfo.jsx';

const UserDashboard = ({ user }) => {
    const [userAlerts, setUserAlerts] = useState([]);
    const [emergencyContacts, setEmergencyContacts] = useState(user?.emergencyContacts || []);
    const [isCreatingAlert, setIsCreatingAlert] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showTipsModal, setShowTipsModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportDescription, setReportDescription] = useState('');
    const [reportLocation, setReportLocation] = useState('');
    const [isReporting, setIsReporting] = useState(false);
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
            const userId = user._id || user.id;
            
            // Fetch user's alerts
            const alertsResponse = await fetch(`${config.ALERTS_BASE}/user/${userId}`, {
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

    const openReportIncident = () => {
        setReportDescription('');
        setReportLocation('');
        setShowReportModal(true);
        // Try to prefill location using geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
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
                } catch (_) {
                    // ignore geocoding failure
                }
                setReportLocation(readableLocation);
            });
        }
    };

    const submitReportIncident = async (e) => {
        e.preventDefault();
        if (!reportDescription.trim()) {
            alert('Please describe the incident.');
            return;
        }
        try {
            setIsReporting(true);
            const token = localStorage.getItem('token');
            const userId = user._id || user.id;
            const payload = {
                userId,
                userName: user.name,
                location: reportLocation || 'Location not provided',
                coordinates: '',
                type: 'manual',
                priority: 'low',
                status: 'active',
                description: reportDescription.trim()
            };
            const response = await fetch(`${config.ALERTS_BASE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                alert('Incident reported successfully. Authorities have been notified.');
                setShowReportModal(false);
                fetchUserData();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.message || 'Failed to report incident.');
            }
        } catch (error) {
            console.error('Report incident error:', error);
            alert('Error reporting incident. Please try again.');
        } finally {
            setIsReporting(false);
        }
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
                <div className="table-container table-scroll-10">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Location</th>
                                <th>Status</th>
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
                    <button className="btn btn-primary" onClick={() => setShowProfileModal(true)}>Update Profile</button>
                    <button className="btn btn-success" onClick={() => setShowTipsModal(true)}>Safety Tips</button>
                    <button className="btn btn-warning" onClick={openReportIncident}>Report Incident</button>
                </div>
            </div>
            
            <DashboardFooter />

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Update Profile</h3>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowProfileModal(false)}>Close</button>
                        </div>
                        <div className="modal-body">
                            <PersonalInfo />
                        </div>
                    </div>
                </div>
            )}

            {/* Safety Tips Modal */}
            {showTipsModal && (
                <div className="modal-overlay" onClick={() => setShowTipsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Safety Tips</h3>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowTipsModal(false)}>Close</button>
                        </div>
                        <div className="modal-body">
                            <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
                                <li style={{ marginBottom: 12 }}>Share your live location with a trusted contact when traveling alone.</li>
                                <li style={{ marginBottom: 12 }}>Avoid poorly lit areas at night and stay aware of your surroundings.</li>
                                <li style={{ marginBottom: 12 }}>Keep emergency contacts updated and easily accessible.</li>
                                <li style={{ marginBottom: 12 }}>Trust your instincts—if something feels wrong, seek help immediately.</li>
                                <li style={{ marginBottom: 12 }}>Use the Emergency Alert button in this app if you feel unsafe.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Incident Modal */}
            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Report Incident (Low Priority)</h3>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowReportModal(false)}>Close</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={submitReportIncident}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Description</label>
                                    <textarea
                                        value={reportDescription}
                                        onChange={(e) => setReportDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe what happened..."
                                        style={{ 
                                            width: '100%', 
                                            padding: 12, 
                                            borderRadius: 8, 
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            fontSize: 14
                                        }}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Location (optional)</label>
                                    <input
                                        type="text"
                                        value={reportLocation}
                                        onChange={(e) => setReportLocation(e.target.value)}
                                        placeholder="Detected automatically, or enter address"
                                        style={{ 
                                            width: '100%', 
                                            padding: 12, 
                                            borderRadius: 8, 
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            fontSize: 14
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-danger" onClick={() => setShowReportModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-success" disabled={isReporting}>
                                        {isReporting ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
