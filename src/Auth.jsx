import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from './config';

const Auth = ({ setToken }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const url = isLogin ? config.AUTH_LOGIN : config.AUTH_REGISTER;
            console.log('Attempting to connect to:', url);
            
            let body;
            if (isLogin) {
                body = { email, password };
            } else {
                // Only allow user registration - no role selection
                body = { 
                    name, 
                    email, 
                    password, 
                    aadhaarNumber, 
                    phoneNumber,
                    role: 'user' // Force role to be 'user' only
                };
            }
            
            console.log('Sending request with body:', { ...body, password: '[HIDDEN]' });
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body),
            });
            
            const data = await response.json();
            if (response.ok) {
                if (isLogin) {
                    setToken(data.token, data.user);
                    navigate('/dashboard');
                } else {
                    alert('Registration successful! Please log in.');
                    setIsLogin(true);
                    // Reset form
                    setName('');
                    setEmail('');
                    setPassword('');
                    setAadhaarNumber('');
                    setPhoneNumber('');
                }
            } else {
                setError(data.message || 'An error occurred');
                alert(data.message || 'An error occurred');
            }
        } catch (error) {
            console.error('Auth error:', error);
            let errorMessage = 'Network error. ';
            
            if (!navigator.onLine) {
                errorMessage += 'Please check your internet connection.';
            } else {
                errorMessage += 'Please make sure the backend server is running at ' + config.BACKEND_URL;
            }
            
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <h1 style={{ color: '#ff4d4d' }}>WE ARE SAFE</h1>
            <div className="auth-form-box" style={{
                backgroundColor: '#333',
                padding: '40px',
                borderRadius: '10px',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
                width: '350px',
            }}>
                <h2 style={{ color: '#ff4d4d', textAlign: 'center' }}>{isLogin ? 'Login' : 'Register'}</h2>
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ff4d4d',
                                    backgroundColor: '#444',
                                    color: '#fff'
                                }}
                            />
                        </div>
                    )}
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '5px',
                                border: '1px solid #ff4d4d',
                                backgroundColor: '#444',
                                color: '#fff'
                            }}
                        />
                    </div>
                    {!isLogin && (
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Aadhaar Number:</label>
                            <input
                                type="text"
                                value={aadhaarNumber}
                                onChange={(e) => setAadhaarNumber(e.target.value)}
                                required={!isLogin}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ff4d4d',
                                    backgroundColor: '#444',
                                    color: '#fff'
                                }}
                            />
                        </div>
                    )}
                    {!isLogin && (
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Contact Number:</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required={!isLogin}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ff4d4d',
                                    backgroundColor: '#444',
                                    color: '#fff'
                                }}
                            />
                        </div>
                    )}
                    
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '5px',
                                border: '1px solid #ff4d4d',
                                backgroundColor: '#444',
                                color: '#fff'
                            }}
                        />
                    </div>
                    <button type="submit" style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#ff4d4d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginTop: '10px',
                    }}>
                        {isLogin ? 'Login' : 'Register'}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button onClick={() => setIsLogin(!isLogin)} style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff4d4d',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                    }}>
                        {isLogin ? 'New user? Register here' : 'Already have an account? Login here'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;