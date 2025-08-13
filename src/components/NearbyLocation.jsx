import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    maxWidth: '600px',
    height: '400px',
    border: '2px solid #ff4d4d',
    borderRadius: '10px',
    marginTop: '20px',
};

const NearbyLocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);


    const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_Google_Maps_API_KEY, // Corrected line
});

    const success = (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation({ lat: latitude, lng: longitude });
        setError(null);
    };

    const handleError = (err) => {
        setError(err.message);
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(success, handleError);
    }, []);

    const [map, setMap] = useState(null);
    const onLoad = useCallback(function callback(map) {
        if (location) {
            const bounds = new window.google.maps.LatLngBounds(location);
            map.fitBounds(bounds);
        }
        setMap(map);
    }, [location]);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

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
            {error && <p style={{ color: '#ff4d4d' }}>Error: {error}</p>}
            {location && <p>
                Your current location: <br />
                Latitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}
            </p>}
            {isLoaded && location ? (
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={location}
                    zoom={15}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                >
                    <MarkerF position={location} />
                </GoogleMap>
            ) : (
                <p>Loading map...</p>
            )}
        </div>
    );
};

export default NearbyLocation;