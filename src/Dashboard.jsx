import React, { useState, useEffect } from 'react';
import AlertCard from './AlertCard.jsx'; // Changed from './AlertCard'
import HotspotList from './HotspotList.jsx'; // Changed from './HotspotList'

function Dashboard() {
    const [alerts, setAlerts] = useState([]);
    const [hotspots, setHotspots] = useState([]);

    useEffect(() => {
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