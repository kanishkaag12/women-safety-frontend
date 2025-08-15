import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Auth from './Auth.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import PoliceDashboard from './components/PoliceDashboard.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import config from './config';

function App() {
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Validate token and get user info
    const validateToken = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;

            const response = await fetch(`${config.AUTH_VALIDATE}`, {
                headers: {
                    'x-auth-token': token
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setToken(token);
                return true;
            } else {
                // Token is invalid, try to refresh
                const refreshResponse = await fetch(`${config.AUTH_REFRESH}`, {
                    method: 'POST',
                    headers: {
                        'x-auth-token': token
                    }
                });

                if (refreshResponse.ok) {
                    const { token: newToken } = await refreshResponse.json();
                    localStorage.setItem('token', newToken);
                    setToken(newToken);
                    
                    // Validate the new token
                    const validateResponse = await fetch(`${config.AUTH_VALIDATE}`, {
                        headers: {
                            'x-auth-token': newToken
                        }
                    });
                    
                    if (validateResponse.ok) {
                        const userData = await validateResponse.json();
                        setUser(userData);
                        return true;
                    }
                } else {
                    // Both token and refresh failed, clear everything
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Token validation error:', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            return false;
        }
    };

    // Initialize app with token validation
    useEffect(() => {
        const initializeApp = async () => {
            const storedToken = localStorage.getItem('token');
            
            if (storedToken) {
                setToken(storedToken);
                const isValid = await validateToken();
                if (!isValid) {
                    console.log('Stored token is invalid, user needs to login again');
                }
            }
            
            setIsLoading(false);
        };

        initializeApp();
    }, []);

    // Handle token updates
    const handleTokenUpdate = (newToken, userData) => {
        if (newToken) {
            localStorage.setItem('token', newToken);
            setToken(newToken);
            if (userData) {
                setUser(userData);
                console.log('User data set:', userData); // Debug log
            }
        } else {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    // Auto-refresh token before it expires (optional enhancement)
    useEffect(() => {
        if (!token) return;

        const refreshToken = async () => {
            try {
                const response = await fetch(`${config.AUTH_REFRESH}`, {
                    headers: {
                        'x-auth-token': token
                    }
                });

                if (response.ok) {
                    const { token: newToken } = await response.json();
                    handleTokenUpdate(newToken);
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        };

        // Refresh token every 30 minutes
        const interval = setInterval(refreshToken, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [token]);

    // Render appropriate dashboard based on user role
    const renderDashboard = () => {
        console.log('=== renderDashboard called ===');
        console.log('Token:', token);
        console.log('User:', user);
        
        if (!user) {
            console.log('No user data available');
            return (
                <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>Loading user data...</h2>
                    <p>Please wait while we load your dashboard.</p>
                </div>
            );
        }
        
        console.log('Rendering dashboard for user:', user);
        console.log('User role:', user.role);
        
        switch (user.role) {
            case 'admin':
                console.log('Rendering Admin Dashboard');
                return <AdminDashboard user={user} />;
            case 'police':
                console.log('Rendering Police Dashboard');
                return <PoliceDashboard user={user} />;
            case 'user':
                console.log('Rendering User Dashboard');
                return <UserDashboard user={user} />;
            default:
                console.log('Unknown role, defaulting to User Dashboard');
                return <UserDashboard user={user} />;
        }
    };

    // Show loading screen while initializing
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#1a1a1a',
                color: '#fff'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '3px solid #ff4d4d',
                        borderTop: '3px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p>Loading your app...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/register" element={<Auth setToken={handleTokenUpdate} />} />
                    <Route path="/login" element={<Auth setToken={handleTokenUpdate} />} />
                    <Route
                        path="/dashboard"
                        element={token && user ? renderDashboard() : <Navigate to="/login" replace />}
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;