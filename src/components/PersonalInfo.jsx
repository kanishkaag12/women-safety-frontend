import React, { useEffect, useState } from 'react';

const PersonalInfo = () => {
    const [profile, setProfile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('token');

    const fetchProfile = async () => {
        setError('');
        try {
            const response = await fetch('https://women-safety-backend-rkkh.onrender.com/api/auth/profile', {
                headers: {
                    'x-auth-token': token
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }
            const data = await response.json();
            setProfile({
                name: data.name || '',
                email: data.email || '',
                aadhaarNumber: data.aadhaarNumber || '',
                phoneNumber: data.phoneNumber || '',
                age: data.age || '',
                gender: data.gender || '',
                homeAddress: data.homeAddress || '',
                relativeAddress: data.relativeAddress || '',
                guardianContactNumber: data.guardianContactNumber || ''
            });
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch('https://women-safety-backend-rkkh.onrender.com/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    name: profile.name,
                    phoneNumber: profile.phoneNumber,
                    age: profile.age ? Number(profile.age) : undefined,
                    gender: profile.gender,
                    homeAddress: profile.homeAddress,
                    relativeAddress: profile.relativeAddress,
                    guardianContactNumber: profile.guardianContactNumber
                })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to save profile');
            }
            const data = await response.json();
            setProfile((prev) => ({ ...prev, ...data }));
            setSuccess('Profile updated successfully');
            setTimeout(() => setSuccess(''), 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!token) {
        return <div style={{ padding: '20px', color: '#fff' }}>Please log in to view your profile.</div>;
    }

    if (!profile) {
        return (
            <div style={{ padding: '20px', color: '#fff' }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                Loading profile...
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', color: '#333' }}>
            <h2 style={{ color: '#667eea' }}>Your Profile</h2>

            {error && (
                <div style={{
                    color: '#ff4757',
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: 'rgba(255,71,87,0.1)',
                    borderRadius: '5px',
                    border: '1px solid #ff4757'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    color: '#2ed573',
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: 'rgba(46,213,115,0.1)',
                    borderRadius: '5px',
                    border: '1px solid #2ed573'
                }}>
                    {success}
                </div>
            )}

            <form onSubmit={handleSave} style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e1e1e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
                        <input name="name" value={profile.name} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
                        <input name="email" value={profile.email} disabled style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e1e1e1', background: '#f8f9fa', color: '#6c757d' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6 }}>Aadhaar Number</label>
                        <input name="aadhaarNumber" value={profile.aadhaarNumber} disabled style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e1e1e1', background: '#f8f9fa', color: '#6c757d' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6 }}>Contact Number</label>
                        <input name="phoneNumber" value={profile.phoneNumber} onChange={handleChange} placeholder="Enter your phone number" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6 }}>Age</label>
                        <input name="age" type="number" min="0" value={profile.age} onChange={handleChange} placeholder="Enter your age" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6 }}>Gender</label>
                        <select name="gender" value={profile.gender} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }}>
                            <option value="">Select</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Home Address</label>
                        <textarea name="homeAddress" value={profile.homeAddress} onChange={handleChange} rows={2} placeholder="Enter your home address" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }} />
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Close Relative Address</label>
                        <textarea name="relativeAddress" value={profile.relativeAddress} onChange={handleChange} rows={2} placeholder="Enter your close relative's address" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }} />
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Guardian Contact Number</label>
                        <input name="guardianContactNumber" value={profile.guardianContactNumber} onChange={handleChange} placeholder="Enter guardian's phone number" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #667eea', background: '#fff', color: '#333' }} />
                    </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <button type="submit" disabled={isSaving} style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.3s ease' }}>
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button type="button" onClick={fetchProfile} disabled={isSaving} style={{ background: '#f8f9fa', color: '#6c757d', border: '1px solid #e1e1e1', borderRadius: 6, padding: '10px 16px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                        Refresh
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PersonalInfo;


