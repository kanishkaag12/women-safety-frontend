import React, { useState, useEffect, useRef } from 'react';
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
    // Separate which alert is selected vs whether we are actively listening
    const [selectedAlertId, setSelectedAlertId] = useState(null);
    const [isListening, setIsListening] = useState(false);

    const [liveMap, setLiveMap] = useState({}); // alertId -> isLive
    const [recordingsMap, setRecordingsMap] = useState({}); // alertId -> recordings[]
    const socketRef = useRef(null);

    useEffect(() => {
        console.log('PoliceDashboard user object:', user);
        console.log('User ID:', user?.id);
        console.log('User _id:', user?._id);
        // Restore last selected alert if available
        try {
            const saved = localStorage.getItem('pd_selected_alert');
            if (saved) setSelectedAlertId(saved);
        } catch (_) {}
        fetchDashboardData();
    }, []);

    // Subscribe to global live-status to enable/disable Listen buttons
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const socket = io(config.BACKEND_URL, { auth: { token } });
        socketRef.current = socket;
        socket.on('live-status', ({ alertId, isLive }) => {
            if (!alertId) return;
            setLiveMap(prev => ({ ...prev, [alertId]: !!isLive }));
            // If the current selection ended, clear listening flag
            if (!isLive && selectedAlertId === alertId) {
                setIsListening(false);
                // Refresh recordings as the final blob should be saved now
                try { 
                    loadRecordings(alertId); 
                    // Retry once after a short delay to avoid race with upload finalize
                    setTimeout(() => { try { loadRecordings(alertId); } catch(_) {} }, 1500);
                    // Start a short polling to ensure it shows up
                    pollRecordings(alertId, 3, 1000);
                } catch(_) {}
            }
        });
        // When a client reports a recording has been saved, refresh immediately if viewing that alert
        socket.on('recording-saved', ({ alertId }) => {
            if (alertId && alertId === selectedAlertId) {
                loadRecordings(alertId);
            }
        });
        return () => { try { socket.disconnect(); } catch(_) {} };
    }, [selectedAlertId]);

    // Helper to load saved recordings for an alert
    const loadRecordings = async (id) => {
        if (!id) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${config.BACKEND_URL}/api/alerts/${id}/recordings`, {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setRecordingsMap(prev => ({ ...prev, [id]: data }));
            } else {
                let msg = `${res.status}`;
                try { const e = await res.json(); msg = e?.message || msg; } catch (_) {}
                console.warn('Failed to load recordings for alert', id, msg);
            }
        } catch (_) { /* ignore */ }
    };

    // Polling helper to overcome race conditions
    const pollRecordings = async (id, attempts = 5, delayMs = 1200) => {
        for (let i = 0; i < attempts; i++) {
            await loadRecordings(id);
            await new Promise(r => setTimeout(r, delayMs));
        }
    };

    // Fetch saved recordings when selecting an alert (regardless of listening state)
    useEffect(() => {
        if (selectedAlertId) loadRecordings(selectedAlertId);
    }, [selectedAlertId]);

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
                                <th>Live Audio / Message</th>
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
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {liveMap[alert._id] ? (
                                                <>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        title={'Listen to live audio'}
                                                        onClick={() => { setSelectedAlertId(alert._id); setIsListening(true); try { localStorage.setItem('pd_selected_alert', alert._id); } catch(_) {}; loadRecordings(alert._id); }}
                                                    >
                                                        Listen {selectedAlertId === alert._id && isListening ? '(Active)' : ''}
                                                    </button>
                                                    <button
                                                        className="btn btn-warning btn-sm"
                                                        title="Stop this live recording and save now"
                                                        onClick={() => { 
                                                            setSelectedAlertId(alert._id); 
                                                            try { localStorage.setItem('pd_selected_alert', alert._id); } catch(_) {}; 
                                                            try { socketRef.current?.emit('stop-recording', { alertId: alert._id }); } catch(e) { console.warn('stop-recording emit failed', e); } 
                                                            // Proactively refresh and poll
                                                            loadRecordings(alert._id);
                                                            pollRecordings(alert._id, 3, 1000);
                                                        }}
                                                    >
                                                        Stop & Save
                                                    </button>
                                                </>
                                            ) : (
                                                alert.description ? (
                                                    <div style={{
                                                        background: '#fff3cd',
                                                        color: '#856404',
                                                        border: '1px solid #ffeeba',
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        maxWidth: 280
                                                    }}>
                                                        <strong>Message:</strong> {alert.description}
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        title={'Waiting for live stream'}
                                                        onClick={() => { setSelectedAlertId(alert._id); setIsListening(true); try { localStorage.setItem('pd_selected_alert', alert._id); } catch(_) {}; loadRecordings(alert._id); }}
                                                    >
                                                        Waiting for Live {selectedAlertId === alert._id && isListening ? '(Active)' : ''}
                                                    </button>
                                                )
                                            )}
                                        </div>
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
                                <th>Live Audio / Message</th>
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
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {liveMap[caseItem._id] ? (
                                                <>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        title={'Listen to live audio'}
                                                        onClick={() => { setSelectedAlertId(caseItem._id); setIsListening(true); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; loadRecordings(caseItem._id); }}
                                                    >
                                                        Listen {selectedAlertId === caseItem._id && isListening ? '(Active)' : ''}
                                                    </button>
                                                    <button
                                                        className="btn btn-warning btn-sm"
                                                        title="Stop this live recording and save now"
                                                        onClick={() => { 
                                                            setSelectedAlertId(caseItem._id); 
                                                            try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; 
                                                            try { socketRef.current?.emit('stop-recording', { alertId: caseItem._id }); } catch(e) { console.warn('stop-recording emit failed', e); } 
                                                            loadRecordings(caseItem._id);
                                                            pollRecordings(caseItem._id, 3, 1000);
                                                        }}
                                                    >
                                                        Stop & Save
                                                    </button>
                                                </>
                                            ) : (
                                                caseItem.description ? (
                                                    <div style={{
                                                        background: '#fff3cd',
                                                        color: '#856404',
                                                        border: '1px solid #ffeeba',
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        maxWidth: 280
                                                    }}>
                                                        <strong>Message:</strong> {caseItem.description}
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        title={'Waiting for live stream'}
                                                        onClick={() => { setSelectedAlertId(caseItem._id); setIsListening(true); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; loadRecordings(caseItem._id); }}
                                                    >
                                                        Waiting for Live {selectedAlertId === caseItem._id && isListening ? '(Active)' : ''}
                                                    </button>
                                                )
                                            )}
                                        </div>
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
                                <th>Live Audio / Message</th>
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
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {liveMap[caseItem._id] ? (
                                                <>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => { setSelectedAlertId(caseItem._id); setIsListening(true); loadRecordings(caseItem._id); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; }}
                                                    >
                                                        Listen {selectedAlertId === caseItem._id && isListening ? '(Active)' : ''}
                                                    </button>
                                                    <button
                                                        className="btn btn-warning btn-sm"
                                                        title="Stop this live recording and save now"
                                                        onClick={() => { setSelectedAlertId(caseItem._id); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; try { socketRef.current?.emit('stop-recording', { alertId: caseItem._id }); } catch(_) {} }}
                                                    >
                                                        Stop & Save
                                                    </button>
                                                </>
                                            ) : (
                                                caseItem.description ? (
                                                    <div style={{
                                                        background: '#fff3cd',
                                                        color: '#856404',
                                                        border: '1px solid #ffeeba',
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        maxWidth: 280
                                                    }}>
                                                        <strong>Message:</strong> {caseItem.description}
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => { setSelectedAlertId(caseItem._id); setIsListening(true); loadRecordings(caseItem._id); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; }}
                                                    >
                                                        Waiting for Live {selectedAlertId === caseItem._id && isListening ? '(Active)' : ''}
                                                    </button>
                                                )
                                            )}
                                        </div>
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
                                <th>Live Audio / Message</th>
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
                                        {liveMap[caseItem._id] ? (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                title={'Listen to live audio'}
                                                onClick={() => { setSelectedAlertId(caseItem._id); setIsListening(true); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; loadRecordings(caseItem._id); }}
                                            >
                                                Listen {selectedAlertId === caseItem._id && isListening ? '(Active)' : ''}
                                            </button>
                                        ) : (
                                            caseItem.description ? (
                                                <div style={{
                                                    background: '#fff3cd',
                                                    color: '#856404',
                                                    border: '1px solid #ffeeba',
                                                    padding: '6px 10px',
                                                    borderRadius: 6,
                                                    maxWidth: 280
                                                }}>
                                                    <strong>Message:</strong> {caseItem.description}
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    title={'Waiting for live stream'}
                                                    onClick={() => { setSelectedAlertId(caseItem._id); setIsListening(true); try { localStorage.setItem('pd_selected_alert', caseItem._id); } catch(_) {}; loadRecordings(caseItem._id); }}
                                                >
                                                    Waiting for Live {selectedAlertId === caseItem._id && isListening ? '(Active)' : ''}
                                                </button>
                                            )
                                        )}
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
            <div className="dashboard-section">
                <h3>Live Recording</h3>
                {selectedAlertId && isListening ? (
                    <LiveAudioListener 
                        alertId={selectedAlertId}
                        onLiveStart={({ alertId }) => setLiveMap(prev => ({ ...prev, [alertId]: true }))}
                        onLiveEnd={({ alertId }) => {
                            setLiveMap(prev => ({ ...prev, [alertId]: false }));
                            setIsListening(false);
                            loadRecordings(alertId);
                            // Retry after short delay
                            setTimeout(() => { try { loadRecordings(alertId); } catch(_) {} }, 1500);
                        }}
                    />
                ) : (
                    <div className="section-placeholder">{selectedAlertId ? 'Not listening. Press Listen to start.' : 'Select an alert and press the Live button to start listening.'}</div>
                )}
                <h4 style={{ marginTop: 12 }}>All Recordings</h4>
                {selectedAlertId ? (
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
                                {(recordingsMap[selectedAlertId] || []).map((rec) => (
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
                ) : (
                    <div className="section-placeholder">No alert selected. Choose an alert to view its recordings.</div>
                )}
                {selectedAlertId && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => { setIsListening(false); setSelectedAlertId(null); try { localStorage.removeItem('pd_selected_alert'); } catch(_) {}; }}
                        >
                            Clear Selection
                        </button>
                        {isListening && (
                            <button
                                className="btn btn-warning btn-sm"
                                onClick={() => { try { socketRef.current?.emit('stop-recording', { alertId: selectedAlertId }); } catch(_) {} }}
                                title="Ask the recording device to stop and save now"
                            >
                                Stop Recording & Save
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            <DashboardFooter />
        </div>
    );
};

export default PoliceDashboard;
