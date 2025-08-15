import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Auth from './Auth.jsx';
import Home from './Home.jsx';

function App() {
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Validate token and get user info
    const validateToken = async (token) => {
        try {
            const response = await fetch('https://women-safety-backend-rkkh.onrender.com/api/auth/validate', {
                headers: {
                    'x-auth-token': token
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                return true;
            } else {
                // Token is invalid, remove it
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
                return false;
            }
        } catch (error) {
            console.error('Token validation error:', error);
            // On network error, assume token is valid for better UX
            return true;
        }
    };

    // Initialize app with token validation
    useEffect(() => {
        const initializeApp = async () => {
            const storedToken = localStorage.getItem('token');
            
            if (storedToken) {
                setToken(storedToken);
                const isValid = await validateToken(storedToken);
                if (!isValid) {
                    console.log('Stored token is invalid, user needs to login again');
                }
            }
            
            setIsLoading(false);
        };

        initializeApp();
    }, []);

    // Handle token updates
    const handleTokenUpdate = (newToken) => {
        if (newToken) {
            localStorage.setItem('token', newToken);
            setToken(newToken);
            // Validate the new token immediately
            validateToken(newToken);
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
                const response = await fetch('https://women-safety-backend-rkkh.onrender.com/api/auth/refresh', {
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
                        path="/home"
                        element={token ? <Home user={user} /> : <Navigate to="/login" replace />}
                    />
                    <Route path="/" element={<Navigate to="/home" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;