import React, { useState } from 'react';
import Footer from './components/Footer';

// Placeholder components for the 5 buttons
const NearbyLocation = () => <div style={{padding: '20px', color: '#fff'}}><h2>Nearby Location</h2><p>Content for Nearby Location goes here...</p></div>;
const Microphone = () => <div style={{padding: '20px', color: '#fff'}}><h2>Microphone</h2><p>Content for Microphone goes here...</p></div>;
const Panic = () => <div style={{padding: '20px', color: '#fff'}}><h2>Panic Button</h2><p>Content for Panic Button goes here...</p></div>;
const EmergencyContact = () => <div style={{padding: '20px', color: '#fff'}}><h2>Emergency Contacts</h2><p>Content for Emergency Contacts goes here...</p></div>;
const PersonalInfo = () => <div style={{padding: '20px', color: '#fff'}}><h2>Personal Information</h2><p>Content for Personal Information goes here...</p></div>;

const Home = () => {
    const [activeComponent, setActiveComponent] = useState('NearbyLocation');

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
                textAlign: 'center',
                padding: '10px',
                color: '#ff4d4d',
                fontSize: '24px',
                fontWeight: 'bold',
                borderBottom: '2px solid #ff4d4d',
            }}>
                WE ARE SAFE
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