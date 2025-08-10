import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = ({ setToken }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isLogin ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';
        const body = isLogin ? { email, password } : { name, email, password, aadhaarNumber };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (response.ok) {
                if (isLogin) {
                    setToken(data.token);
                    localStorage.setItem('token', data.token);
                    navigate('/dashboard');
                } else {
                    alert('Registration successful! Please log in.');
                    setIsLogin(true);
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
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