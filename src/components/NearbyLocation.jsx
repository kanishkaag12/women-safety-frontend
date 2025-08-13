import React, { useState, useEffect } from 'react';

const NearbyLocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setIsLoading(false);
            return;
        }

        const success = (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            console.log('Location obtained:', { latitude, longitude });
            setLocation({ latitude, longitude });
            setError(null);
            setIsLoading(false);
        };

        const handleError = (err) => {
            console.error('Geolocation error:', err);
            setError(err.message);
            setIsLoading(false);
        };

        console.log('Requesting location...');
        navigator.geolocation.getCurrentPosition(success, handleError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        });
    }, []);

    const mapUrl = location
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01},${location.latitude - 0.01},${location.longitude + 0.01},${location.latitude + 0.01}&marker=${location.latitude},${location.longitude}&layer=mapnik`
        : 'about:blank';

    return (
        <div className="nearby-location-container" style={{
            padding: '20px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
        }}>
            <h2 style={{ color: '#ff4d4d' }}>Nearby Safe Locations</h2>
            
            {/* Show error */}
            {error && (
                <div style={{ color: '#ff4d4d', marginBottom: '10px', padding: '10px', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: '5px' }}>
                    <strong>Location Error:</strong> {error}
                </div>
            )}
            
            {/* Show loading status */}
            {isLoading && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                    <strong>Getting your location...</strong>
                </div>
            )}
            
            {/* Show location info and map */}
            {location ? (
                <>
                    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                        <strong>Your current location:</strong><br />
                        Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}
                    </div>
                    <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        height: '400px',
                        border: '2px solid #ff4d4d',
                        borderRadius: '10px',
                        marginTop: '20px',
                        overflow: 'hidden'
                    }}>
                        <iframe
                            title="user-location-map"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            src={mapUrl}
                            allowFullScreen
                            loading="lazy"
                        ></iframe>
                    </div>
                </>
            ) : !isLoading && !error ? (
                <div style={{ 
                    width: '100%', 
                    maxWidth: '600px', 
                    height: '400px', 
                    border: '2px solid #ff4d4d', 
                    borderRadius: '10px', 
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }}>
                    <p>Location not available</p>
                </div>
            ) : null}
        </div>
    );
};

export default NearbyLocation;