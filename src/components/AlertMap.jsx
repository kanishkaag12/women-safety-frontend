import React from 'react';
import './Dashboard.css';

const AlertMap = ({ alerts }) => {
    if (!alerts || alerts.length === 0) {
        return (
            <div className="alert-map-container">
                <p>No alerts to display on map</p>
            </div>
        );
    }

    const renderMapLink = (alert) => {
        if (alert.coordinates) {
            const [lat, lng] = alert.coordinates.split(', ');
            const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
            return (
                <a 
                    href={mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="map-link"
                >
                    📍 View on Map
                </a>
            );
        }
        return <span className="no-coordinates">No coordinates</span>;
    };

    return (
        <div className="alert-map-container">
            <h3>Alert Locations</h3>
            <div className="alert-locations">
                {alerts.map((alert) => (
                    <div key={alert._id} className="alert-location-item">
                        <div className="alert-info">
                            <strong>{alert.userName}</strong>
                            <span className={`priority-badge priority-${alert.priority}`}>
                                {alert.priority}
                            </span>
                        </div>
                        <div className="location-info">
                            <span className="location-text">{alert.location}</span>
                            {renderMapLink(alert)}
                        </div>
                        <div className="alert-time">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertMap;
