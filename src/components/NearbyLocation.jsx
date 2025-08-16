import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// CSS for the spinner animation
const spinnerAnimation = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;


// Style tag will be added inside the component

const NearbyLocation = () => {
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState(null);
    const [error, setError] = useState(null);
    const [policeStations, setPoliceStations] = useState([]);
    const [isFetchingStations, setIsFetchingStations] = useState(false);
    
    // Add style tag for spinner animation
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = spinnerAnimation;
        document.head.appendChild(style);
        
        return () => {
            // Clean up the style when component unmounts
            if (style && document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);
    const [isLoading, setIsLoading] = useState(true);
    const [addressLoading, setAddressLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const watchIdRef = useRef(null);
    const autoRetryTimeoutRef = useRef(null);
    const maxAutoRetries = 5;
    const autoRetryDelay = 5000; // 5 seconds

    // Function to get address from coordinates using reverse geocoding
    const getAddressFromCoordinates = async (latitude, longitude) => {
        setAddressLoading(true);
        try {
            // Using OpenStreetMap Nominatim API for reverse geocoding
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en', // Get results in English
                        'User-Agent': 'WomenSafetyApp' // Required by Nominatim usage policy
                    }
                }
            );
            
            if (response.data) {
                const addressData = response.data;
                // Format the address information
                const formattedAddress = {
                    display: addressData.display_name,
                    city: addressData.address.city || addressData.address.town || addressData.address.village || addressData.address.hamlet || 'Unknown',
                    state: addressData.address.state || 'Unknown',
                    country: addressData.address.country || 'Unknown',
                    road: addressData.address.road || addressData.address.pedestrian || 'Unknown',
                    neighborhood: addressData.address.suburb || addressData.address.neighbourhood || addressData.address.residential || 'Unknown'
                };
                
                setAddress(formattedAddress);
                console.log('Address obtained:', formattedAddress);
            }
        } catch (error) {
            console.error('Error getting address:', error);
            // Don't set error state here, just log it - we still have coordinates
        } finally {
            setAddressLoading(false);
        }
    };
    
    // Define success callback outside useEffect
    const success = async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log('Location obtained:', { latitude, longitude });
        setLocation({ latitude, longitude });
        setError(null);
        setIsLoading(false);
        
        // Get address from coordinates
        getAddressFromCoordinates(latitude, longitude);
        // Fetch nearby police stations
        fetchNearbyPoliceStations(latitude, longitude);
    };

    // Define error handler outside useEffect
    const handleError = (err) => {
        console.error('Geolocation error:', err);
        
        // Provide more user-friendly error messages with detailed instructions
        switch(err.code) {
            case 1: // PERMISSION_DENIED
                setError('Location access denied. This app REQUIRES access to your location to function properly. Please enable location services in your browser settings immediately.');
                break;
            case 2: // POSITION_UNAVAILABLE
                setError('Your location information is temporarily unavailable. This may be due to GPS issues or being indoors. The app will automatically retry to get your location.');
                break;
            case 3: // TIMEOUT
                setError('The request to get your location timed out. The app will automatically retry. Please check your internet connection if this persists.');
                break;
            default:
                setError(`Error accessing your location: ${err.message}. The app will automatically retry.`);
        }
        
        // Keep loading state true if we're going to auto-retry
        if (retryCount < maxAutoRetries) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    };

    // Fetch nearby police stations using Overpass API
    const fetchNearbyPoliceStations = async (lat, lon) => {
        try {
            setIsFetchingStations(true);
            // Search police amenities within 1000m (1KM)
            const radius = 1000;
            const query = `[
                out:json
            ];
            (
                node["amenity"="police"](around:${radius},${lat},${lon});
                way["amenity"="police"](around:${radius},${lat},${lon});
                relation["amenity"="police"](around:${radius},${lat},${lon});
            );
            out center 20;`;

            const response = await axios.post(
                'https://overpass-api.de/api/interpreter',
                query,
                { headers: { 'Content-Type': 'text/plain' } }
            );

            const elements = response.data.elements || [];
            // Map and sort by distance
            const stations = elements.map((el) => {
                const name = (el.tags && (el.tags.name || el.tags.operator || 'Police Station')) || 'Police Station';
                const latc = el.lat || (el.center && el.center.lat);
                const lonc = el.lon || (el.center && el.center.lon);
                const distance = haversineDistance(lat, lon, latc, lonc);
                return { id: el.id, name, lat: latc, lon: lonc, distance };
            }).filter(s => s.lat && s.lon)
              .sort((a, b) => a.distance - b.distance)
              .slice(0, 10);

            setPoliceStations(stations);
        } catch (err) {
            console.error('Failed to fetch nearby police stations:', err);
        } finally {
            setIsFetchingStations(false);
        }
    };

    // Haversine distance in meters
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    // Function to request location with continuous tracking and auto-retry
    const requestLocation = () => {
        setIsLoading(true);
        setError(null);
        
        // Clear any existing watch
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        
        // Clear any existing auto-retry timeout
        if (autoRetryTimeoutRef.current) {
            clearTimeout(autoRetryTimeoutRef.current);
            autoRetryTimeoutRef.current = null;
        }
        
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setIsLoading(false);
            return;
        }

        console.log('Starting location tracking...');
        
        // Use watchPosition instead of getCurrentPosition for continuous tracking
        try {
            watchIdRef.current = navigator.geolocation.watchPosition(
                success,
                (err) => {
                    handleError(err);
                    
                    // Auto-retry if under max retries
                    if (retryCount < maxAutoRetries) {
                        console.log(`Auto-retrying location request in ${autoRetryDelay/1000} seconds... (Attempt ${retryCount + 1}/${maxAutoRetries})`);
                        autoRetryTimeoutRef.current = setTimeout(() => {
                            setRetryCount(prevCount => prevCount + 1);
                        }, autoRetryDelay);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0 // Set to 0 to force a fresh location request on retry
                }
            );
        } catch (e) {
            console.error('Exception when requesting location:', e);
            setError(`Error starting location tracking: ${e.message}`);
            setIsLoading(false);
        }
    };
    
    // Effect to request location on mount or retry
    useEffect(() => {
        requestLocation();
        
        // Cleanup function to clear watch and timeout when component unmounts
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            
            if (autoRetryTimeoutRef.current) {
                clearTimeout(autoRetryTimeoutRef.current);
                autoRetryTimeoutRef.current = null;
            }
        };
        // This effect will run when component mounts or retryCount changes
    }, [retryCount]);

    // Effect to update police stations when location changes
    useEffect(() => {
        if (location) {
            fetchNearbyPoliceStations(location.latitude, location.longitude);
        }
    }, [location]);
    
    // Manual retry function - resets retry count and starts fresh
    const handleRetry = () => {
        // Reset retry count to 0 to allow for a fresh set of auto-retries
        setRetryCount(0);
    };

    const mapUrl = location
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005},${location.latitude - 0.005},${location.longitude + 0.005},${location.latitude + 0.005}&marker=${location.latitude},${location.longitude}&layer=mapnik`
        : 'about:blank';

    return (
        <div className="nearby-location-container" style={{
            padding: '20px',
            color: '#333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: '#fff',
            minHeight: '100vh'
        }}>
            <h2 style={{ color: '#667eea', marginBottom: '20px' }}>Nearby Safe Locations</h2>
            
            {/* Show error with more detailed instructions */}
            {error && (
                <div style={{ 
                    color: '#ff4d4d', 
                    marginBottom: '20px', 
                    padding: '15px', 
                    backgroundColor: 'rgba(255,77,77,0.15)', 
                    borderRadius: '8px',
                    border: '1px solid #ff4d4d',
                    maxWidth: '600px',
                    width: '100%'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '24px', marginRight: '10px' }}>⚠️</span>
                        <strong style={{ fontSize: '18px' }}>Location Error</strong>
                    </div>
                    <p>{error}</p>
                    {error.includes('denied') && (
                        <div style={{ marginTop: '10px', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '5px' }}>
                            <strong>How to enable location access:</strong>
                            <div style={{ textAlign: 'left', margin: '10px 0' }}>
                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Chrome:</p>
                                <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                    <li>Click the lock/info icon in the address bar</li>
                                    <li>Click on "Site settings"</li>
                                    <li>Set "Location" permission to "Allow"</li>
                                    <li>Refresh this page</li>
                                </ol>
                                
                                <p style={{ fontWeight: 'bold', marginBottom: '5px', marginTop: '10px' }}>Firefox:</p>
                                <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                    <li>Click the lock icon in the address bar</li>
                                    <li>Click on "Connection secure" &gt; "More Information"</li>
                                    <li>Go to "Permissions" tab</li>
                                    <li>Set "Access Your Location" to "Allow"</li>
                                    <li>Refresh this page</li>
                                </ol>
                                
                                <p style={{ fontWeight: 'bold', marginBottom: '5px', marginTop: '10px' }}>Safari:</p>
                                <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                    <li>Click Safari &gt; Preferences &gt; Websites &gt; Location</li>
                                    <li>Find this website and set permission to "Allow"</li>
                                    <li>Refresh this page</li>
                                </ol>
                                
                                <p style={{ fontWeight: 'bold', marginBottom: '5px', marginTop: '10px' }}>Mobile Devices:</p>
                                <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                    <li>Go to your device settings</li>
                                    <li>Find app permissions or privacy settings</li>
                                    <li>Enable location services for your browser</li>
                                    <li>Return to this app and refresh</li>
                                </ol>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={handleRetry}
                        style={{
                            marginTop: '15px',
                            padding: '12px 20px',
                            backgroundColor: '#ff4d4d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            fontSize: '16px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ marginRight: '8px', fontSize: '18px' }}>🔄</span> Force Location Update Now
                    </button>
                    <div style={{ marginTop: '10px', fontSize: '12px', opacity: '0.8', textAlign: 'center' }}>
                        The app will continue to track your location automatically in the background.
                    </div>
                </div>
            )}
            
            {/* Show loading status with retry information */}
            {isLoading && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                    <strong>Getting your location...</strong>
                    {retryCount > 0 && (
                        <div style={{ marginTop: '5px', fontSize: '14px' }}>
                            <span>Auto-retry attempt: {retryCount}/{maxAutoRetries}</span>
                            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', marginTop: '5px', borderRadius: '2px' }}>
                                <div 
                                    style={{ 
                                        width: `${(retryCount / maxAutoRetries) * 100}%`, 
                                        height: '100%', 
                                        backgroundColor: '#ff4d4d',
                                        borderRadius: '2px'
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Show location info and map */}
            {location ? (
                <>
                    <div style={{ 
                        marginBottom: '20px', 
                        padding: '20px', 
                        backgroundColor: '#fff', 
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '600px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        border: '1px solid #e1e1e1'
                    }}>
                        <strong style={{ fontSize: '18px', color: '#667eea' }}>Your Current Location</strong>
                        
                        {addressLoading ? (
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    borderRadius: '50%', 
                                    border: '3px solid rgba(255,255,255,0.3)', 
                                    borderTopColor: '#ff4d4d',
                                    animation: 'spin 1s linear infinite',
                                    marginRight: '10px'
                                }}></div>
                                <span>Getting your address...</span>
                            </div>
                        ) : address ? (
                            <div style={{ marginTop: '10px', textAlign: 'left' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    marginBottom: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    padding: '8px',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ marginRight: '8px', fontSize: '16px' }}>📍</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{address.road}</div>
                                        <div style={{ fontSize: '14px', opacity: '0.8' }}>{address.neighborhood}</div>
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    padding: '8px',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ marginRight: '8px', fontSize: '16px' }}>🏙️</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{address.city}</div>
                                        <div style={{ fontSize: '14px', opacity: '0.8' }}>{address.state}, {address.country}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginTop: '10px', opacity: '0.8' }}>
                                <p>Address information unavailable</p>
                            </div>
                        )}
                    </div>
                    
                    <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        height: '400px',
                        border: '2px solid #667eea',
                        borderRadius: '12px',
                        marginTop: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
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

                    {/* Nearby police stations list */}
                    <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        marginTop: '20px',
                        backgroundColor: '#fff',
                        border: '1px solid #e1e1e1',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <strong style={{ color: '#667eea', fontSize: '18px' }}>Nearby Police Stations</strong>
                            {isFetchingStations && <span style={{ fontSize: 14, color: '#6c757d' }}>Loading...</span>}
                        </div>
                        {policeStations.length === 0 && !isFetchingStations && (
                            <div style={{ 
                                padding: '20px', 
                                textAlign: 'center', 
                                backgroundColor: '#f8f9fa', 
                                borderRadius: '8px',
                                color: '#6c757d' 
                            }}>
                                <span style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}>🔍</span>
                                No police stations found within 1 km of your location.
                            </div>
                        )}
                        {policeStations.map((ps) => (
                            <div key={ps.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '15px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                marginTop: 10,
                                border: '1px solid #e1e1e1'
                            }}>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>🚓 {ps.name}</div>
                                    <div style={{ fontSize: 14, color: '#6c757d' }}>{ps.distance} m away</div>
                                </div>
                                <a
                                    href={`https://www.openstreetmap.org/directions?engine=graphhopper_car&route=${location.latitude}%2C${location.longitude}%3B${ps.lat}%2C${ps.lon}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ 
                                        backgroundColor: '#667eea',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        fontSize: 14,
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                >
                                    Get Directions
                                </a>
                            </div>
                        ))}
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