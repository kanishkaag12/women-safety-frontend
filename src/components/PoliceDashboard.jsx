import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import AlertMap from './AlertMap';
import LiveAudioListener from './LiveAudioListener';
import config from '../config';
import './Dashboard.css';

const PoliceDashboard = ({ user }) => {
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [assignedCases, setAssignedCases] = useState([]);
    const [acknowledgedCases, setAcknowledgedCases] = useState([]);
    const [inProgressCases, setInProgressCases] = useState([]);
    const [resolvedCases, setResolvedCases] = useState([]);
    const [stats, setStats] = useState({
        activeAlerts: 0,
        assignedCases: 0,
        acknowledgedCases: 0,
        inProgressCases: 0,
        resolvedCases: 0,
        responseTime: 0
    });
    const [listeningAlertId, setListeningAlertId] = useState(null);
    const [liveMap, setLiveMap] = useState({}); // alertId -> isLive
    const [recordingsMap, setRecordingsMap] = useState({}); // alertId -> recordings[]

    useEffect(() => {
        console.log('PoliceDashboard user object:', user);
        console.log('User ID:', user?.id);
        console.log('User _id:', user?._id);
        fetchDashboardData();
    }, []);

    // Subscribe to global live-status to enable/disable Listen buttons
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const socket = io(config.BACKEND_URL, { auth: { token } });
        socket.on('live-status', ({ alertId, isLive }) => {
            if (!alertId) return;
            setLiveMap(prev => ({ ...prev, [alertId]: !!isLive }));
        });
        return () => { try { socket.disconnect(); } catch(_) {} };
    }, []);

    // Fetch saved recordings when selecting an alert to listen
    useEffect(() => {
        const fetchRecordings = async () => {
            if (!listeningAlertId) return;
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${config.BACKEND_URL}/api/alerts/${listeningAlertId}/recordings`, {
                    headers: { 'x-auth-token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRecordingsMap(prev => ({ ...prev, [listeningAlertId]: data }));
                }
            } catch (_) { /* ignore */ }
        };
        fetchRecordings();
    }, [listeningAlertId]);

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
                // Filter to show only active alerts (not assigned to anyone)
                const activeAlerts = alerts.filter(alert => alert.status === 'active' && !alert.assignedPoliceOfficer);
                setActiveAlerts(activeAlerts);
                setStats(prev => ({
                    ...prev,
                    activeAlerts: activeAlerts.length
                }));
            }

            // Fetch assigned cases
            const userId = user._id || user.id;
            console.log('Fetching assigned cases for user ID:', userId);
            const casesResponse = await fetch(`${config.ALERTS_BASE}/assigned/${userId}`, {
                headers: {
                    'x-auth-token': token
                }
            });
            
            if (casesResponse.ok) {
                const cases = await casesResponse.json();
                console.log('Assigned cases:', cases); // Debug log
                
                // Separate cases by status
                const assigned = cases.filter(c => c.status === 'assigned');
                const acknowledged = cases.filter(c => c.status === 'acknowledged');
                const inProgress = cases.filter(c => c.status === 'in-progress');
                const resolved = cases.filter(c => c.status === 'resolved');
                
                setAssignedCases(assigned);
                setAcknowledgedCases(acknowledged);
                setInProgressCases(inProgress);
                setResolvedCases(resolved);
                setStats(prev => ({
                    ...prev,
                    assignedCases: assigned.length,
                    acknowledgedCases: acknowledged.length,
                    inProgressCases: inProgress.length,
                    resolvedCases: resolved.length
                }));
            } else {
                console.error('Failed to fetch assigned cases:', casesResponse.status);
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
                const actionMessages = {
                    'acknowledge': 'Alert acknowledged successfully!',
                    'in-progress': 'Case marked as in progress!',
                    'resolved': 'Case resolved successfully!',
                    'escalate': 'Case escalated successfully!'
                };
                alert(actionMessages[action] || 'Action completed successfully!');
                fetchDashboardData(); // Refresh data
            } else {
                const error = await response.json();
                alert(`Failed to perform action: ${error.message}`);
            }
        } catch (error) {
            console.error('Error performing alert action:', error);
            alert('Error performing action. Please try again.');
        }
    };

    const handleAssignCase = async (alertId) => {
        try {
            const token = localStorage.getItem('token');
            const userId = user._id || user.id;
            console.log('Assigning case:', alertId, 'to user:', userId);
            
            const response = await fetch(`${config.ALERTS_BASE}/${alertId}/assign`, {
                method: 'PUT',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assignedPoliceOfficer: userId,
                    policeStation: user.policeStation,
                    badgeNumber: user.badgeNumber,
                    jurisdiction: user.jurisdiction
                })
            });

            console.log('Assign response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Assign result:', result);
                alert('Case assigned successfully!');
                fetchDashboardData(); // Refresh data
            } else {
                const error = await response.json();
                console.error('Assign error:', error);
                alert(`Failed to assign case: ${error.message}`);
            }
        } catch (error) {
            console.error('Error assigning case:', error);
            alert('Error assigning case. Please try again.');
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
                    <h3>Acknowledged</h3>
                    <p className="stat-number">{stats.acknowledgedCases}</p>
                </div>
                <div className="stat-card">
                    <h3>In Progress</h3>
                    <p className="stat-number">{stats.inProgressCases}</p>
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
                <p className="section-description">
                    New alerts that require police attention. Use "Assign Case" to take ownership or "Acknowledge" to confirm you've seen the alert. All cases are treated with high priority.
                </p>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Location</th>
                                <th>Time</th>
                                <th>Priority</th>
                                <th>Actions</th>
                                <th>Live Audio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeAlerts.map(alert => (
                                <tr key={alert._id} className={alert.priority === 'high' ? 'high-priority' : ''}>
                                    <td>{alert.userId?.name || alert.userName}</td>
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
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm"
        									title={liveMap[alert._id] ? 'Listen to live audio' : 'You can still try to listen; player will wait for live stream'}
                                            onClick={() => setListeningAlertId(alert._id)}
                                        >
                                            {liveMap[alert._id] ? 'Listen' : 'Listen (Waiting for Live)'} {listeningAlertId === alert._id ? '(Active)' : ''}
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
                <p className="section-description">
                    Cases you're currently working on. Use "In Progress" when you start working or "Resolve" when completed.
                </p>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>User</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Assigned Time</th>
                                <th>Actions</th>
                                <th>Live Audio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignedCases.map(caseItem => (
                                <tr key={caseItem._id}>
                                    <td>{caseItem._id.slice(-6)}</td>
                                    <td>{caseItem.userId?.name || caseItem.userName}</td>
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
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            title={liveMap[caseItem._id] ? 'Listen to live audio' : 'You can still try to listen; player will wait for live stream'}
                                            onClick={() => setListeningAlertId(caseItem._id)}
                                        >
                                            {liveMap[caseItem._id] ? 'Listen' : 'Listen (Waiting for Live)'} {listeningAlertId === caseItem._id ? '(Active)' : ''}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Acknowledged Cases */}
            <div className="dashboard-section">
                <h2>Acknowledged Cases</h2>
                <p className="section-description">
                    Cases you've acknowledged but haven't started working on yet. Use "In Progress" when you begin active work.
                </p>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>User</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Acknowledged Time</th>
                                <th>Actions</th>
                                <th>Live Audio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {acknowledgedCases.map(caseItem => (
                                <tr key={caseItem._id} className="acknowledged-case">
                                    <td>{caseItem._id.slice(-6)}</td>
                                    <td>{caseItem.userId?.name || caseItem.userName}</td>
                                    <td>{caseItem.location}</td>
                                    <td>
                                        <span className={`status-badge status-${caseItem.status}`}>
                                            {caseItem.status}
                                        </span>
                                    </td>
                                    <td>{new Date(caseItem.acknowledgedAt || caseItem.updatedAt).toLocaleString()}</td>
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
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setListeningAlertId(caseItem._id)}
                                        >
                                            Listen {listeningAlertId === caseItem._id ? '(Active)' : ''}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* In Progress Cases */}
            <div className="dashboard-section">
                <h2>In Progress Cases</h2>
                <p className="section-description">
                    Cases you're actively working on. Use "Resolve" when the case is completed.
                </p>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>User</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Started Time</th>
                                <th>Actions</th>
                                <th>Live Audio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inProgressCases.map(caseItem => (
                                <tr key={caseItem._id} className="in-progress-case">
                                    <td>{caseItem._id.slice(-6)}</td>
                                    <td>{caseItem.userId?.name || caseItem.userName}</td>
                                    <td>{caseItem.location}</td>
                                    <td>
                                        <span className={`status-badge status-${caseItem.status}`}>
                                            {caseItem.status}
                                        </span>
                                    </td>
                                    <td>{new Date(caseItem.inProgressAt || caseItem.updatedAt).toLocaleString()}</td>
                                    <td>
                                        <button 
                                            onClick={() => handleAlertAction(caseItem._id, 'resolved')}
                                            className="btn btn-success btn-sm"
                                        >
                                            Resolve
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setListeningAlertId(caseItem._id)}
                                        >
                                            Listen {listeningAlertId === caseItem._id ? '(Active)' : ''}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resolved Cases */}
            <div className="dashboard-section">
                <h2>Resolved Cases</h2>
                <p className="section-description">
                    Successfully completed cases. These cases have been resolved and no longer require action.
                </p>
                <div className="table-container table-scroll-3">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>User</th>
                                <th>Location</th>
                                <th>Resolved Time</th>
                                <th>Resolution Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resolvedCases.map(caseItem => (
                                <tr key={caseItem._id} className="resolved-case">
                                    <td>{caseItem._id.slice(-6)}</td>
                                    <td>{caseItem.userId?.name || caseItem.userName}</td>
                                    <td>{caseItem.location}</td>
                                    <td>{new Date(caseItem.resolvedAt || caseItem.updatedAt).toLocaleString()}</td>
                                    <td>
                                        <span className="status-badge status-resolved">
                                            Resolved
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Guide */}
            <div className="dashboard-section">
                <h2>Action Guide</h2>
                <div className="action-guide">
                    <div className="action-item">
                        <h4>Acknowledge</h4>
                        <p>Use when you've seen an alert but haven't started working on it yet. Confirms awareness without taking ownership.</p>
                    </div>
                    <div className="action-item">
                        <h4>Assign Case</h4>
                        <p>Take ownership of a case. Moves it to your assigned cases and makes you responsible for resolution.</p>
                    </div>
                    <div className="action-item">
                        <h4>In Progress</h4>
                        <p>Mark a case as actively being worked on. Use when you start investigating or responding.</p>
                    </div>
                    <div className="action-item">
                        <h4>Resolve</h4>
                        <p>Mark a case as completed. Moves it to resolved cases and removes it from active work.</p>
                    </div>
                </div>
            </div>

            {/* Alert Map View */}
            <div className="dashboard-section">
                <AlertMap alerts={activeAlerts} />
            </div>
            {listeningAlertId && (
                <div className="dashboard-section">
                    <h3>Live Audio Stream</h3>
                    <LiveAudioListener alertId={listeningAlertId} />
                    <h4 style={{ marginTop: 12 }}>Saved Recordings</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table table-striped table-dark">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>User</th>
                                    <th>MIME</th>
                                    <th>Size</th>
                                    <th>Play/Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(recordingsMap[listeningAlertId] || []).map((rec) => (
                                    <tr key={rec._id}>
                                        <td>{new Date(rec.createdAt).toLocaleString()}</td>
                                        <td>{rec.userId?.name || rec.userName} {rec.userId?.email ? `(${rec.userId.email})` : ''}</td>
                                        <td>{rec.mimeType}</td>
                                        <td>{(rec.size/1024).toFixed(1)} KB</td>
                                        <td>
                                            <audio controls src={`${config.BACKEND_URL}${rec.fileUrl}`} style={{ maxWidth: 220 }} />
                                            <a className="btn btn-sm btn-secondary" style={{ marginLeft: 8 }} href={`${config.BACKEND_URL}${rec.fileUrl}`} target="_blank" rel="noreferrer">Download</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 10 }}
                        onClick={() => setListeningAlertId(null)}
                    >
                        Stop Listening
                    </button>
                </div>
            )}
            
            <DashboardFooter />
        </div>
    );
};

export default PoliceDashboard;
