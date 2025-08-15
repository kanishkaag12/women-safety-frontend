import React, { useState } from 'react';
import Footer from './components/Footer';
import NearbyLocation from './components/NearbyLocation'; // Import the new component
import Microphone from './components/Microphone';       // Import the new component
import EmergencyContact from './components/EmergencyContact'; // Import the EmergencyContact component

// Keep the other placeholder components for now
const Panic = () => <div style={{ padding: '20px', color: '#fff' }}><h2>Panic Button</h2><p>Content for Panic Button goes here...</p></div>;
const PersonalInfo = () => <div style={{ padding: '20px', color: '#fff' }}><h2>Personal Information</h2><p>Content for Personal Information goes here...</p></div>;


const Home = ({ user }) => {
    const [activeComponent, setActiveComponent] = useState('NearbyLocation');

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            window.location.reload();
        }
    };

    const renderComponent = () => {
        switch (activeComponent) {
            case 'NearbyLocation':
                return <NearbyLocation />;
            case 'Microphone':
                return <Microphone />;
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