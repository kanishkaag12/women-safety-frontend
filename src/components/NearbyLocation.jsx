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
    const success = (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log('Location obtained:', { latitude, longitude });
        setLocation({ latitude, longitude });
        setError(null);
        setIsLoading(false);
        
        // Get address from coordinates
        getAddressFromCoordinates(latitude, longitude);
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
    
    // Manual retry function - resets retry count and starts fresh
    const handleRetry = () => {
        // Reset retry count to 0 to allow for a fresh set of auto-retries
        setRetryCount(0);
    };

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
                                    <li>Click on "Connection secure" > "More Information"</li>
                                    <li>Go to "Permissions" tab</li>
                                    <li>Set "Access Your Location" to "Allow"</li>
                                    <li>Refresh this page</li>
                                </ol>
                                
                                <p style={{ fontWeight: 'bold', marginBottom: '5px', marginTop: '10px' }}>Safari:</p>
                                <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                    <li>Click Safari > Preferences > Websites > Location</li>
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
                        marginBottom: '10px', 
                        padding: '15px', 
                        backgroundColor: 'rgba(255,255,255,0.1)', 
                        borderRadius: '8px',
                        width: '100%',
                        maxWidth: '600px'
                    }}>
                        <strong style={{ fontSize: '18px', color: '#ff4d4d' }}>Your Current Location</strong>
                        
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