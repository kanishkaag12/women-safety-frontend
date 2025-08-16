import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import AlertMap from './AlertMap';
import config from '../config';
import './Dashboard.css';

const AdminDashboard = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [addressCache, setAddressCache] = useState({}); // id -> human-readable address
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAlerts: 0,
        activeAlerts: 0,
        policeOfficers: 0
    });
    // Live audio features removed for Admin dashboard
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        name: '',
        email: '',
        password: '',
        aadhaarNumber: '',
        phoneNumber: '',
        role: 'user',
        badgeNumber: '',
        policeStation: '',
        jurisdiction: ''
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Live audio subscription removed

    // Live audio recordings fetch removed

    // Utility: detect if a string looks like "lat, lng"
    const looksLikeCoords = (str) => {
        if (!str || typeof str !== 'string') return false;
        const re = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;
        return re.test(str.trim());
    };

    // Reverse geocode with OSM Nominatim, cache by alert id
    const reverseGeocode = async (alert) => {
        try {
            if (!alert || !alert.coordinates) return null;
            const [latStr, lngStr] = alert.coordinates.split(',');
            const lat = latStr?.trim();
            const lon = lngStr?.trim();
            if (!lat || !lon) return null;
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=16&addressdetails=1`;
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data?.display_name || null;
        } catch (e) {
            return null;
        }
    };

    // When alerts change, populate address cache for those that need it
    useEffect(() => {
        const fillAddresses = async () => {
            const toResolve = alerts.filter(a => (!a.location || looksLikeCoords(a.location)) && a.coordinates && !addressCache[a._id]);
            if (toResolve.length === 0) return;
            const updates = {};
            for (const a of toResolve) {
                const addr = await reverseGeocode(a);
                if (addr) updates[a._id] = addr;
            }
            if (Object.keys(updates).length) {
                setAddressCache(prev => ({ ...prev, ...updates }));
            }
        };
        if (alerts && alerts.length) {
            fillAddresses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alerts]);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Fetch users
            const usersResponse = await fetch(`${config.AUTH_USERS}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            if (usersResponse.ok) {
                const users = await usersResponse.json();
                setUsers(users);
                setStats(prev => ({
                    ...prev,
                    totalUsers: users.length,
                    policeOfficers: users.filter(u => u.role === 'police').length
                }));
            }

            // Fetch alerts
            const alertsResponse = await fetch(`${config.ALERTS_BASE}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            if (alertsResponse.ok) {
                const alerts = await alertsResponse.json();
                setAlerts(alerts);
                setStats(prev => ({
                    ...prev,
                    totalAlerts: alerts.length,
                    activeAlerts: alerts.filter(a => a.status === 'active').length
                }));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const handleUserAction = async (userId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.AUTH_USERS}/${userId}/${action}`, {
                method: 'PUT',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: action === 'suspend' ? 'suspended' : 'active'
                })
            });

            if (response.ok) {
                fetchDashboardData(); // Refresh data
            }
        } catch (error) {
            console.error('Error performing user action:', error);
        }
    };



    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Debug: Log what we're sending
            console.log('Creating account with data:', createFormData);
            console.log('Token:', token ? 'Present' : 'Missing');
            
            const response = await fetch(`${config.AUTH_CREATE_ACCOUNT}`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(createFormData)
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const result = await response.json();
                console.log('Success result:', result);
                alert('Account created successfully!');
                setShowCreateForm(false);
                setCreateFormData({
                    name: '',
                    email: '',
                    password: '',
                    aadhaarNumber: '',
                    phoneNumber: '',
                    role: 'user',
                    badgeNumber: '',
                    policeStation: '',
                    jurisdiction: ''
                });
                fetchDashboardData(); // Refresh data
            } else {
                const error = await response.json();
                console.error('Error response:', error);
                alert(`Failed to create account: ${error.message || 'Unknown error'}`);
                
                // Show more detailed error information
                if (error.errors && Array.isArray(error.errors)) {
                    alert(`Validation errors: ${error.errors.join(', ')}`);
                }
            }
        } catch (error) {
            console.error('Network error creating account:', error);
            alert(`Network error: ${error.message}`);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Split users by role for dedicated sections
    const adminUsers = users.filter(u => u.role === 'admin');
    const policeUsers = users.filter(u => u.role === 'police');
    const regularUsers = users.filter(u => u.role === 'user');

    return (
        <div className="dashboard admin-dashboard">
            <DashboardHeader 
                user={user}
                title="Admin Dashboard"
                subtitle="Manage users, alerts, and system operations"
            />

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <p className="stat-number">{stats.totalUsers}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Alerts</h3>
                    <p className="stat-number">{stats.totalAlerts}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Alerts</h3>
                    <p className="stat-number">{stats.activeAlerts}</p>
                </div>
                <div className="stat-card">
                    <h3>Police Officers</h3>
                    <p className="stat-number">{stats.policeOfficers}</p>
                </div>
            </div>

            {/* Account Creation Section */}
            <div className="dashboard-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>Account Management</h2>
                    <button 
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="btn btn-primary"
                    >
                        {showCreateForm ? 'Cancel' : '+ Create New Account'}
                    </button>
                </div>
                
                {showCreateForm && (
                    <div className="create-account-form" style={{
                        background: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '10px',
                        marginBottom: '20px'
                    }}>
                        <h3>Create New Account</h3>
                        <form onSubmit={handleCreateAccount}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label>Name:</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={createFormData.name}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                    />
                                </div>
                                <div>
                                    <label>Email:</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={createFormData.email}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                    />
                                </div>
                                <div>
                                    <label>Password:</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={createFormData.password}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                    />
                                </div>
                                <div>
                                    <label>Role:</label>
                                    <select
                                        name="role"
                                        value={createFormData.role}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                    >
                                        <option value="user">User</option>
                                        <option value="police">Police Officer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Aadhaar Number:</label>
                                    <input
                                        type="text"
                                        name="aadhaarNumber"
                                        value={createFormData.aadhaarNumber}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                    />
                                </div>
                                <div>
                                    <label>Phone Number:</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={createFormData.phoneNumber}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                    />
                                </div>
                            </div>
                            
                            {/* Police-specific fields */}
                            {createFormData.role === 'police' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                    <div>
                                        <label>Badge Number:</label>
                                        <input
                                            type="text"
                                            name="badgeNumber"
                                            value={createFormData.badgeNumber}
                                            onChange={handleInputChange}
                                            required
                                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                        />
                                    </div>
                                    <div>
                                        <label>Police Station:</label>
                                        <input
                                            type="text"
                                            name="policeStation"
                                            value={createFormData.policeStation}
                                            onChange={handleInputChange}
                                            required
                                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                        />
                                    </div>
                                    <div>
                                        <label>Jurisdiction:</label>
                                        <input
                                            type="text"
                                            name="jurisdiction"
                                            value={createFormData.jurisdiction}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Downtown, North District"
                                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <button type="submit" className="btn btn-success" style={{ marginTop: '15px' }}>
                                Create Account
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Role Management */}
            <div className="dashboard-section">
                <h2>Role Management</h2>

                {/* Admins Section */}
                <h3 style={{ marginTop: 10 }}>Admins</h3>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Phone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminUsers.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`role-badge role-${user.role}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.phoneNumber || 'N/A'}</td>
                                    <td>
                                        <button
                                            onClick={() => handleUserAction(user._id, 'suspend')}
                                            className="btn btn-warning btn-sm"
                                        >
                                            Suspend
                                        </button>
                                        <button
                                            onClick={() => handleUserAction(user._id, 'activate')}
                                            className="btn btn-success btn-sm"
                                        >
                                            Activate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {adminUsers.length === 0 && (
                                <tr><td colSpan="5">No admins</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Police Section */}
                <h3 style={{ marginTop: 20 }}>Police</h3>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Phone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policeUsers.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`role-badge role-${user.role}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.phoneNumber || 'N/A'}</td>
                                    <td>
                                        <button
                                            onClick={() => handleUserAction(user._id, 'suspend')}
                                            className="btn btn-warning btn-sm"
                                        >
                                            Suspend
                                        </button>
                                        <button
                                            onClick={() => handleUserAction(user._id, 'activate')}
                                            className="btn btn-success btn-sm"
                                        >
                                            Activate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {policeUsers.length === 0 && (
                                <tr><td colSpan="5">No police users</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Regular Users Section */}
                <h3 style={{ marginTop: 20 }}>Users</h3>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Phone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {regularUsers.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`role-badge role-${user.role}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.phoneNumber || 'N/A'}</td>
                                    <td>
                                        <button
                                            onClick={() => handleUserAction(user._id, 'suspend')}
                                            className="btn btn-warning btn-sm"
                                        >
                                            Suspend
                                        </button>
                                        <button
                                            onClick={() => handleUserAction(user._id, 'activate')}
                                            className="btn btn-success btn-sm"
                                        >
                                            Activate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {regularUsers.length === 0 && (
                                <tr><td colSpan="5">No users</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alerts Management */}
            <div className="dashboard-section">
                <h2>Alert Management</h2>
                <div className="table-container table-scroll-10">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                                <th>Created Time</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map(alert => (
                                <tr key={alert._id}>
                                    <td>{alert.userId?.name || alert.userName}</td>
                                    <td>
                                        <span
                                            style={{
                                                display: 'block',
                                                height: '4.8em', /* ~4 lines at 1.2em each */
                                                lineHeight: '1.2em',
                                                overflowY: 'auto',
                                                width: '100%',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {addressCache[alert._id] || (!alert.location || looksLikeCoords(alert.location) ? (alert.coordinates || 'Unknown location') : alert.location)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${alert.status}`}>
                                            {alert.status}
                                        </span>
                                    </td>
                                    <td>
                                        {alert.assignedPoliceOfficer ? 
                                            `${alert.policeStation || 'Unknown Station'} - ${alert.badgeNumber || 'No Badge'}` : 
                                            'Unassigned'
                                        }
                                    </td>
                                    <td>{new Date(alert.createdAt).toLocaleString()}</td>
                                    <td>
                                        {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() :
                                         alert.inProgressAt ? new Date(alert.inProgressAt).toLocaleString() :
                                         alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleString() :
                                         alert.assignedAt ? new Date(alert.assignedAt).toLocaleString() :
                                         'Not updated'}
                                    </td>
                                    
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Live audio panel removed for Admin dashboard */}
            </div>

            {/* Alert Map View */}
            <div className="dashboard-section">
                <AlertMap alerts={alerts} />
            </div>
            
            <DashboardFooter />
        </div>
    );
};

export default AdminDashboard;
