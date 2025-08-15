import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const DashboardHeader = ({ user, title, subtitle }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = () => {
        // Clear all stored data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        navigate('/login');
    };

    const handleGoToLogin = () => {
        navigate('/login');
    };

    const handleGoToRegister = () => {
        navigate('/register');
    };

    const toggleMenu = () => {
        setShowMenu(!showMenu);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="dashboard-header">
            <div className="header-left">
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            
            <div className="header-right">
                {user ? (
                    <div className="user-info">
                        <span className="user-name">Welcome, {user.name}</span>
                        <span className="user-role">{user.role}</span>
                        
                        {/* Navigation Menu */}
                        <div className="nav-menu" ref={menuRef}>
                            <button 
                                onClick={toggleMenu}
                                className="btn btn-menu"
                            >
                                ☰ Menu
                            </button>
                            
                            {showMenu && (
                                <div className="nav-dropdown">
                                    <button 
                                        onClick={() => navigate('/dashboard')}
                                        className="nav-item"
                                    >
                                        🏠 Dashboard
                                    </button>
                                    <button 
                                        onClick={() => navigate('/profile')}
                                        className="nav-item"
                                    >
                                        👤 Profile
                                    </button>
                                    <button 
                                        onClick={() => navigate('/')}
                                        className="nav-item"
                                    >
                                        🏠 Home
                                    </button>
                                    {user.role === 'admin' && (
                                        <button 
                                            onClick={() => navigate('/admin/users')}
                                            className="nav-item"
                                        >
                                            👥 Manage Users
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleLogout}
                                        className="nav-item nav-logout"
                                    >
                                        🚪 Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="auth-buttons">
                        <button 
                            onClick={handleGoToLogin}
                            className="btn btn-login"
                        >
                            Login
                        </button>
                        <button 
                            onClick={handleGoToRegister}
                            className="btn btn-register"
                        >
                            Register
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardHeader;
