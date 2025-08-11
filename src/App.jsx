import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Auth from './Auth.jsx';
import Home from './Home.jsx'; // Import the new Home component

function App() {
    const [token, setToken] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/register" element={<Auth setToken={setToken} />} />
                    <Route path="/login" element={<Auth setToken={setToken} />} />
                    <Route
                        path="/home"
                        element={token ? <Home /> : <Navigate to="/login" replace />}
                    />
                    <Route path="/" element={<Navigate to="/home" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;