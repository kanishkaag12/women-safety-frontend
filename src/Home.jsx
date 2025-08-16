import React, { useState } from 'react';
import Footer from './components/Footer';
import NearbyLocation from './components/NearbyLocation'; // Import the new component
import Microphone from './components/Microphone';       // Import the new component
import EmergencyContact from './components/EmergencyContact'; // Import the EmergencyContact component
import PersonalInfo from './components/PersonalInfo';
import config from './config';

// Keep the other placeholder component for now
const Panic = () => <div style={{ padding: '20px', color: '#fff' }}><h2>Panic Button</h2><p>Content for Panic Button goes here...</p></div>;


const Home = ({ user }) => {
    const [activeComponent, setActiveComponent] = useState('NearbyLocation');
    const [isCreatingAlert, setIsCreatingAlert] = useState(false);
    const [currentEmergencyAlertId, setCurrentEmergencyAlertId] = useState(null);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            window.location.reload();
        }
    };

    const sendEmergencyAlert = async () => {
        setIsCreatingAlert(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('You are not authenticated. Please log in again.');
                return;
            }

            const userId = user?._id || user?.id;
            const userName = user?.name || 'User';

            // Try to get location, but don't block sending the alert
            let location = 'Location not available';
            let coordinates = '';

            if (navigator.geolocation) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => reject({ code: 3, message: 'Timeout expired' }), 6000);
                        navigator.geolocation.getCurrentPosition(
                            (pos) => { clearTimeout(timeoutId); resolve(pos); },
                            (err) => { clearTimeout(timeoutId); reject(err); },
                            { timeout: 8000, enableHighAccuracy: true }
                        );
                    });
                    const { latitude, longitude } = position.coords;
                    location = `${latitude}, ${longitude}`;
                    coordinates = `${latitude}, ${longitude}`;
                } catch (_) {
                    // keep fallback location
                }
            }

            const alertData = {
                userId,
                userName,
                location,
                coordinates,
                type: 'emergency',
                priority: 'high',
                status: 'active',
                description: `Emergency alert from ${userName}.`
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
                const created = await response.json().catch(() => null);
                if (created && created._id) {
                    setCurrentEmergencyAlertId(created._id);
                }
                alert('Emergency alert sent successfully! You can now start live recording.');
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.message || 'Failed to send emergency alert. Please try again.');
            }
        } catch (error) {
            console.error('Error sending emergency alert:', error);
            alert('Failed to send emergency alert. Please try again.');
        } finally {
            setIsCreatingAlert(false);
        }
    };

    const renderComponent = () => {
        switch (activeComponent) {
            case 'NearbyLocation':
                return <NearbyLocation />;
            case 'Microphone':
                return (
                    <div>
                        <div style={{ marginBottom: 12 }}>
                            <button 
                                onClick={sendEmergencyAlert}
                                disabled={isCreatingAlert || !!currentEmergencyAlertId}
                                style={{
                                    backgroundColor: (!!currentEmergencyAlertId ? '#28a745' : '#ff4d4d'),
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    cursor: (isCreatingAlert || !!currentEmergencyAlertId) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isCreatingAlert ? 'Sending Alert...' : (!!currentEmergencyAlertId ? 'Emergency Alert Created' : '🚨 SEND EMERGENCY ALERT')}
                            </button>
                        </div>
                        <Microphone user={user} canRecord={!!currentEmergencyAlertId} alertId={currentEmergencyAlertId} />
                        {!currentEmergencyAlertId && (
                            <p style={{ marginTop: 8, color: '#666' }}>
                                Start recording is enabled only after you send an Emergency Alert.
                            </p>
                        )}
                    </div>
                );
            case 'Panic':
                return <Panic />;
            case 'EmergencyContact':
                return <EmergencyContact />;
            case 'PersonalInfo':
                return <PersonalInfo />;
            default:
                return <NearbyLocation />;
        }
    };

    return (
        <div className="home-container" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#1a1a1a',
            color: '#fff',
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                color: '#ff4d4d',
                fontSize: '24px',
                fontWeight: 'bold',
                borderBottom: '2px solid #ff4d4d',
            }}>
                <div>WE ARE SAFE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px' }}>
                    {user && (
                        <span style={{ color: '#fff', fontSize: '16px' }}>
                            Welcome, {user.name}!
                        </span>
                    )}
                    <button
                        onClick={handleLogout}
                        style={{
                            backgroundColor: '#ff4d4d',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '8px 15px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main style={{
                flex: 1,
                overflowY: 'auto',
                paddingBottom: '60px', // Space for the footer
            }}>
                {renderComponent()}
            </main>

            <Footer setActiveComponent={setActiveComponent} />
        </div>
    );
};

export default Home;