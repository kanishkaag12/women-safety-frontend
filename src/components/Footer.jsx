import React from 'react';
import './Footer.css';

const Footer = ({ setActiveComponent }) => {
    return (
        <footer className="app-footer">
            <div className="footer-button" onClick={() => setActiveComponent('NearbyLocation')}>
                <i className="fas fa-map-marker-alt"></i>
                <span>Location</span>
            </div>
            <div className="footer-button" onClick={() => setActiveComponent('Microphone')}>
                <i className="fas fa-microphone"></i>
                <span>Mic</span>
            </div>
            <div className="footer-button" onClick={() => setActiveComponent('Panic')}>
                <i className="fas fa-exclamation-triangle"></i>
                <span>Panic</span>
            </div>
            <div className="footer-button" onClick={() => setActiveComponent('EmergencyContact')}>
                <i className="fas fa-users"></i>
                <span>Contacts</span>
            </div>
            <div className="footer-button" onClick={() => setActiveComponent('PersonalInfo')}>
                <i className="fas fa-user"></i>
                <span>Profile</span>
            </div>
        </footer>
    );
};

export default Footer;