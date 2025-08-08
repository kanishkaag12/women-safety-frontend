// src/AlertCard.js

import React from 'react';

function AlertCard({ alert }) {
    return (
        <div className="alert-card">
            <h3>Alert Type: {alert.type}</h3>
            <p>Location: {alert.location}</p>
            <p>Time: {new Date(alert.timestamp).toLocaleString()}</p>
        </div>
    );
}

export default AlertCard;