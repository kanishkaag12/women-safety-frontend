import React, { useEffect, useState } from 'react';
import './Dashboard.css';

const AlertMap = ({ alerts }) => {
    const [addressCache, setAddressCache] = useState({}); // id -> human-readable address

    const looksLikeCoords = (str) => {
        if (!str || typeof str !== 'string') return false;
        const re = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;
        return re.test(str.trim());
    };

    const reverseGeocode = async (alert) => {
        try {
            if (!alert || !alert.coordinates) return null;
            const [latStr, lngStr] = alert.coordinates.split(',');
            const lat = latStr?.trim();
            const lon = lngStr?.trim();
            if (!lat || !lon) return null;
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=16&addressdetails=1`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return null;
            const data = await res.json();
            return data?.display_name || null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const fill = async () => {
            const toResolve = (alerts || []).filter(a => (!a.location || looksLikeCoords(a.location)) && a.coordinates && !addressCache[a._id]);
            if (!toResolve.length) return;
            const updates = {};
            for (const a of toResolve) {
                const addr = await reverseGeocode(a);
                if (addr) updates[a._id] = addr;
            }
            if (Object.keys(updates).length) setAddressCache(prev => ({ ...prev, ...updates }));
        };
        if (alerts && alerts.length) fill();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alerts]);

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
            <h2>Alert Locations</h2>
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
                            <span className="location-text">{addressCache[alert._id] || (!alert.location || looksLikeCoords(alert.location) ? (alert.coordinates || 'Unknown location') : alert.location)}</span>
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
