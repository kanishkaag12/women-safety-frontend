// src/Dashboard.js

import React, { useState, useEffect } from 'react';
import AlertCard from './AlertCard';
import HotspotList from './HotspotList';

function Dashboard() {
    const [alerts, setAlerts] = useState([]);
    const [hotspots, setHotspots] = useState([]);

    // This useEffect hook will fetch data when the component loads
    useEffect(() => {
        // We'll add the actual fetch calls here in a later page
        // For now, let's use some dummy data
        const dummyAlerts = [
            { type: 'Suspicious Person', location: 'Near Park', timestamp: new Date() },
            { type: 'Loud Noise', location: 'Main Street', timestamp: new Date() },
        ];
        setAlerts(dummyAlerts);

        const dummyHotspots = ['Main Street', 'Near Park'];
        setHotspots(dummyHotspots);
    }, []);

    return (
        <div className="dashboard-container">
            <div className="alerts-section">
                <h2>Recent Alerts</h2>
                {alerts.map((alert, index) => (
                    <AlertCard key={index} alert={alert} />
                ))}
            </div>
            <div className="hotspots-section">
                <HotspotList hotspots={hotspots} />
            </div>
        </div>
    );
}

export default Dashboard;