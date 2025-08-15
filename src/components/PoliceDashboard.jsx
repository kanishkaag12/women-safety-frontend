import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import AlertMap from './AlertMap';
import config from '../config';
import './Dashboard.css';

const PoliceDashboard = ({ user }) => {
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [assignedCases, setAssignedCases] = useState([]);
    const [stats, setStats] = useState({
        activeAlerts: 0,
        assignedCases: 0,
        resolvedCases: 0,
        responseTime: 0
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Fetch all active alerts (police can see all alerts)
            const alertsResponse = await fetch(`${config.ALERTS_BASE}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            if (alertsResponse.ok) {
                const alerts = await alertsResponse.json();
                // Filter to show only active alerts
                const activeAlerts = alerts.filter(alert => alert.status === 'active');
                setActiveAlerts(activeAlerts);
                setStats(prev => ({
                    ...prev,
                    activeAlerts: activeAlerts.length
                }));
            }

            // Fetch assigned cases
            const casesResponse = await fetch(`${config.ALERTS_BASE}/assigned/${user.id}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            if (casesResponse.ok) {
                const cases = await casesResponse.json();
                setAssignedCases(cases);
                setStats(prev => ({
                    ...prev,
                    assignedCases: cases.length,
                    resolvedCases: cases.filter(c => c.status === 'resolved').length
                }));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const handleAlertAction = async (alertId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.ALERTS_BASE}/${alertId}/${action}`, {
                method: 'PUT',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                fetchDashboardData(); // Refresh data
            }
        } catch (error) {
            console.error('Error performing alert action:', error);
        }
    };

    const handleAssignCase = async (alertId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.ALERTS_BASE}/${alertId}/assign`, {
                method: 'PUT',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assignedPoliceOfficer: user.id,
                    policeStation: user.policeStation,
                    badgeNumber: user.badgeNumber,
                    jurisdiction: user.jurisdiction
                })
            });

            if (response.ok) {
                fetchDashboardData(); // Refresh data
            }
        } catch (error) {
            console.error('Error assigning case:', error);
        }
    };

    return (
        <div className="dashboard police-dashboard">
            <DashboardHeader 
                user={user}
                title="Police Dashboard"
                subtitle={`${user?.policeStation || 'Police Station'} - ${user?.jurisdiction || 'Jurisdiction'}`}
            />

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Active Alerts</h3>
                    <p className="stat-number">{stats.activeAlerts}</p>
                </div>
                <div className="stat-card">
                    <h3>Assigned Cases</h3>
                    <p className="stat-number">{stats.assignedCases}</p>
                </div>
                <div className="stat-card">
                    <h3>Resolved Cases</h3>
                    <p className="stat-number">{stats.resolvedCases}</p>
                </div>
                <div className="stat-card">
                    <h3>Badge Number</h3>
                    <p className="stat-number">{user?.badgeNumber || 'N/A'}</p>
                </div>
            </div>

            {/* Active Alerts in Jurisdiction */}
            <div className="dashboard-section">
                <h2>All Active Alerts</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Location</th>
                                <th>Time</th>
                                <th>Priority</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeAlerts.map(alert => (
                                <tr key={alert._id} className={alert.priority === 'high' ? 'high-priority' : ''}>
                                    <td>{alert.userName}</td>
                                    <td>{alert.location}</td>
                                    <td>{new Date(alert.createdAt).toLocaleString()}</td>
                                    <td>
                                        <span className={`priority-badge priority-${alert.priority || 'medium'}`}>
                                            {alert.priority || 'medium'}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => handleAssignCase(alert._id)}
                                            className="btn btn-primary btn-sm"
                                        >
                                            Assign Case
                                        </button>
                                        <button 
                                            onClick={() => handleAlertAction(alert._id, 'acknowledge')}
                                            className="btn btn-info btn-sm"
                                        >
                                            Acknowledge
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assigned Cases */}
            <div className="dashboard-section">
                <h2>Your Assigned Cases</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>User</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Assigned Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignedCases.map(caseItem => (
                                <tr key={caseItem._id}>
                                    <td>{caseItem._id.slice(-6)}</td>
                                    <td>{caseItem.userName}</td>
                                    <td>{caseItem.location}</td>
                                    <td>
                                        <span className={`status-badge status-${caseItem.status}`}>
                                            {caseItem.status}
                                        </span>
                                    </td>
                                    <td>{new Date(caseItem.assignedAt || caseItem.createdAt).toLocaleString()}</td>
                                    <td>
                                        <button 
                                            onClick={() => handleAlertAction(caseItem._id, 'in-progress')}
                                            className="btn btn-warning btn-sm"
                                        >
                                            In Progress
                                        </button>
                                        <button 
                                            onClick={() => handleAlertAction(caseItem._id, 'resolved')}
                                            className="btn btn-success btn-sm"
                                        >
                                            Resolve
                                        </button>
                                        <button 
                                            onClick={() => handleAlertAction(caseItem._id, 'escalate')}
                                            className="btn btn-danger btn-sm"
                                        >
                                            Escalate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions">
                    <button className="btn btn-primary">Report Incident</button>
                    <button className="btn btn-success">Update Case Status</button>
                    <button className="btn btn-info">Contact Support</button>
                    <button className="btn btn-warning">Emergency Response</button>
                </div>
            </div>

            {/* Alert Map View */}
            <div className="dashboard-section">
                <AlertMap alerts={activeAlerts} />
            </div>
            
            <DashboardFooter />
        </div>
    );
};

export default PoliceDashboard;
