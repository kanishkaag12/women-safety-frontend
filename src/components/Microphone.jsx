import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import config from '../config';

const Microphone = ({ user, canRecord = true, alertId }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState([]);
    const [currentPlaying, setCurrentPlaying] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const socketRef = useRef(null);
    const mimeTypeRef = useRef('audio/webm');
    const skipFinalizeRef = useRef(false); // used for quick restart to resend init segment

    // Initialize socket connection when alertId becomes available
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !alertId) return;
        if (socketRef.current) {
            try { socketRef.current.disconnect(); } catch (_) {}
            socketRef.current = null;
        }
        const socket = io(config.BACKEND_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            timeout: 10000
        });
        socketRef.current = socket;
        // Try to join room immediately (queued until connected)
        try { socket.emit('join-alert', { alertId }); } catch (_) {}
        socket.on('connect', () => {
            console.log('Microphone socket connected', socket.id);
            socket.emit('join-alert', { alertId });
        });
        socket.on('connect_error', (err) => {
            console.error('Microphone socket connect_error:', err?.message || err);
        });
        socket.on('error', (err) => {
            console.error('Microphone socket error:', err);
        });
        // Allow police/dashboard to remotely stop & finalize this recording
        socket.on('stop-recording', ({ alertId: stopId }) => {
            if (!stopId || stopId !== alertId) return;
            console.log('Received stop-recording from server for alert', stopId);
            stopRecording();
        });
        // If a listener joins late, server asks us to resend init segment by quickly restarting
        socket.on('request-audio-restart', ({ alertId: reqAlertId }) => {
            if (!reqAlertId || reqAlertId !== alertId) return;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                console.log('Received request-audio-restart, performing quick restart to resend init segment');
                quickRestartRecorder();
            }
        });
        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-alert', { alertId });
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [alertId]);

    const startRecording = async () => {
        if (!canRecord || !alertId) {
            alert('Please send an Emergency Alert first to enable live recording.');
            return;
        }
        try {
            console.log('Starting microphone access...');

            // First, check if MediaRecorder is supported
            if (!window.MediaRecorder) {
                alert('MediaRecorder is not supported in this browser. Please use Chrome, Firefox, or Edge.');
                return;
            }

            // Request microphone access with basic constraints first
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false
            });
            
            console.log('Microphone stream obtained:', stream);
            console.log('Audio tracks:', stream.getAudioTracks());
            
            // Check if we have audio tracks
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio tracks found in the stream. Please check your microphone.');
                return;
            }
            
            console.log('Audio track settings:', audioTracks[0].getSettings());
            console.log('Audio track enabled:', audioTracks[0].enabled);
            
            // Choose best supported MIME type for recording that is also MSE-playable
            // Priority: 'audio/webm;codecs=opus' -> 'audio/webm' -> 'audio/mp4;codecs=mp4a.40.2' -> fallback 'audio/webm'
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
                    // Note: Some browsers (Safari/iOS) may only support MP4, but MSE playback of MP4 can be limited.
                    // We still emit the correct codec string so listeners can attempt to add a compatible SourceBuffer.
                    mimeType = 'audio/mp4;codecs=mp4a.40.2';
                } else {
                    // Final fallback
                    mimeType = 'audio/webm';
                }
            }
            mimeTypeRef.current = mimeType;
            
            console.log('Using MIME type:', mimeType);
            
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType
            });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = async (event) => {
                console.log('Data available event:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log('Audio chunk received:', event.data.size, 'bytes');
                    // Live stream chunk over socket
                    try {
                        if (socketRef.current && alertId) {
                            const arrayBuf = await event.data.arrayBuffer();
                            socketRef.current.emit('audio-chunk', {
                                alertId,
                                mimeType: mimeTypeRef.current,
                                chunk: arrayBuf
                            });
                        }
                    } catch (e) {
                        console.warn('Streaming chunk failed:', e);
                    }
                } else {
                    console.warn('Empty audio chunk received');
                }
            };

            mediaRecorderRef.current.onstart = () => {
                console.log('MediaRecorder started successfully');
                // Notify listeners that streaming is live
                try {
                    if (socketRef.current && alertId) {
                        socketRef.current.emit('audio-start', { alertId, mimeType: mimeTypeRef.current });
                    }
                } catch (_) {}
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                alert(`Recording error: ${event.error.message}`);
            };

            mediaRecorderRef.current.onstop = () => {
                console.log('Recording stopped, processing audio...');
                console.log('Total chunks:', audioChunksRef.current.length);
                console.log('Total size:', audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0));
                
                // During quick restart, skip finalization and do not emit audio-end
                if (skipFinalizeRef.current) {
                    console.log('Quick restart in progress: skipping finalize/upload and audio-end emit');
                    skipFinalizeRef.current = false;
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
                console.log('Audio blob created:', audioBlob.size, 'bytes');
                
                if (audioBlob.size > 0) {
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const timestamp = new Date().toLocaleString();
                    
                    setRecordings(prev => [...prev, {
                        id: Date.now(),
                        url: audioUrl,
                        timestamp: timestamp,
                        duration: 'Unknown',
                        size: audioBlob.size
                    }]);
                    console.log('Recording saved successfully');
                    
                    // Signal end of live stream
                    try {
                        if (socketRef.current && alertId) {
                            socketRef.current.emit('audio-end', { alertId });
                        }
                    } catch (_) {}
                    // Optional fallback upload of final blob
                    sendVoiceAlert(audioBlob);
                } else {
                    console.error('Recording failed: No audio data captured');
                    alert('No audio was captured. Please check your microphone permissions and try again.');
                }
            };

            // Start recording with smaller time slices for better data capture
            mediaRecorderRef.current.start(400); // Capture data roughly every 400ms
            setIsRecording(true);
            console.log("Recording started with stream:", stream);

            // Start audio level monitoring
            startAudioLevelMonitoring(stream);

        } catch (err) {
            console.error("Error accessing microphone: ", err);
            if (err.name === 'NotAllowedError') {
                alert("Microphone access denied. Please allow microphone permissions in your browser settings and try again.");
            } else if (err.name === 'NotFoundError') {
                alert("No microphone found. Please connect a microphone and try again.");
            } else if (err.name === 'NotSupportedError') {
                alert("Microphone not supported. Please use a different browser or device.");
            } else {
                alert(`Error accessing microphone: ${err.message}`);
            }
        }
    };

    // Perform a quick restart to resend the init segment for late-joining listeners
    const quickRestartRecorder = () => {
        try {
            const rec = mediaRecorderRef.current;
            if (!rec || rec.state !== 'recording') return;
            const stream = rec.stream;
            skipFinalizeRef.current = true; // prevent onstop finalize and audio-end
            rec.stop(); // do not stop tracks
            // Give a short delay to allow onstop to run, then recreate recorder on same stream
            setTimeout(() => {
                try {
                    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
                    audioChunksRef.current = [];

                    mediaRecorderRef.current.ondataavailable = async (event) => {
                        if (event.data && event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                            try {
                                if (socketRef.current && alertId) {
                                    const arrayBuf = await event.data.arrayBuffer();
                                    socketRef.current.emit('audio-chunk', { alertId, mimeType: mimeTypeRef.current, chunk: arrayBuf });
                                }
                            } catch (e) { console.warn('Streaming chunk failed:', e); }
                        }
                    };

                    mediaRecorderRef.current.onstart = () => {
                        console.log('MediaRecorder restarted to resend init segment');
                        try { if (socketRef.current && alertId) { socketRef.current.emit('audio-start', { alertId, mimeType: mimeTypeRef.current }); } } catch(_) {}
                    };

                    mediaRecorderRef.current.onerror = (event) => {
                        console.error('MediaRecorder error (restart):', event.error);
                    };

                    mediaRecorderRef.current.onstop = () => {
                        // Respect skip flag for subsequent restarts as well
                        if (skipFinalizeRef.current) { skipFinalizeRef.current = false; return; }
                        // Real stop: finalize like the primary onstop
                        try {
                            console.log('Restarted recorder stopped; finalizing and emitting audio-end');
                            const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
                            if (audioBlob.size > 0) {
                                const audioUrl = URL.createObjectURL(audioBlob);
                                const timestamp = new Date().toLocaleString();
                                setRecordings(prev => [...prev, {
                                    id: Date.now(),
                                    url: audioUrl,
                                    timestamp,
                                    duration: 'Unknown',
                                    size: audioBlob.size
                                }]);
                                // Upload the final blob so it appears in All Recordings on dashboards
                                sendVoiceAlert(audioBlob);
                            }
                            try { if (socketRef.current && alertId) { socketRef.current.emit('audio-end', { alertId }); } } catch(_) {}
                        } catch (e) {
                            console.error('Finalize failed in restart onstop:', e);
                        } finally {
                            setIsRecording(false);
                            stopAudioLevelMonitoring();
                        }
                    };

                    mediaRecorderRef.current.start(400);
                } catch (err) {
                    console.error('Failed to restart MediaRecorder:', err);
                }
            }, 60);
        } catch (e) {
            console.error('quickRestartRecorder failed:', e);
        }
    };

    const startAudioLevelMonitoring = (stream) => {
        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            
            source.connect(analyserRef.current);
            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            
            const updateAudioLevel = () => {
                if (analyserRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                    setAudioLevel(average);
                    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
                }
            };
            
            updateAudioLevel();
        } catch (err) {
            console.error('Audio level monitoring failed:', err);
        }
    };

    const stopAudioLevelMonitoring = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioLevel(0);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            stopAudioLevelMonitoring();
            console.log("Recording stopped.");
        }
    };

    const playRecording = (recording) => {
        if (currentPlaying) {
            // Stop current playing audio
            const currentAudio = document.getElementById(`audio-${currentPlaying}`);
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        }
        
        setCurrentPlaying(recording.id);
        
        const audio = document.getElementById(`audio-${recording.id}`);
        if (audio) {
            audio.play();
            audio.onended = () => setCurrentPlaying(null);
        }
    };

    const stopPlaying = () => {
        if (currentPlaying) {
            const audio = document.getElementById(`audio-${currentPlaying}`);
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            setCurrentPlaying(null);
        }
    };

    const deleteRecording = (recordingId) => {
        setRecordings(prev => {
            const updated = prev.filter(rec => rec.id !== recordingId);
            // Clean up the URL to prevent memory leaks
            const recordingToDelete = prev.find(rec => rec.id === recordingId);
            if (recordingToDelete) {
                URL.revokeObjectURL(recordingToDelete.url);
            }
            return updated;
        });
        
        if (currentPlaying === recordingId) {
            setCurrentPlaying(null);
        }
    };

    const sendVoiceAlert = async (audioBlob) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('You are not authenticated. Please log in again.');
                return;
            }
            const userId = user._id || user.id;

            // Get current location (non-blocking fallback behavior)
            let location = 'Location not available';
            let coordinates = '';
            try {
                if (navigator.geolocation) {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
                    });
                    const { latitude, longitude } = position.coords;
                    coordinates = `${latitude}, ${longitude}`;
                    try {
                        const geocodeResponse = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                        );
                        if (geocodeResponse.ok) {
                            const geocodeData = await geocodeResponse.json();
                            if (geocodeData.display_name) {
                                location = geocodeData.display_name;
                            } else {
                                location = coordinates;
                            }
                        } else {
                            location = coordinates;
                        }
                    } catch {
                        location = coordinates;
                    }
                }
            } catch (geoErr) {
                console.log('Geolocation unavailable, proceeding without it:', geoErr?.message || geoErr);
            }

            // Create FormData to send audio file
            const formData = new FormData();
            // Use appropriate extension based on mime type if available
            const mt = (mimeTypeRef.current || '').toLowerCase();
            const filename = mt.includes('wav') ? 'voice-alert.wav'
                : mt.includes('mp4') ? 'voice-alert.m4a'
                : 'voice-alert.webm';
            formData.append('audio', audioBlob, filename);
            formData.append('userId', userId);
            formData.append('userName', user.name || 'Unknown');
            formData.append('location', location);
            formData.append('coordinates', coordinates);
            formData.append('type', 'voice');
            formData.append('priority', 'high');
            formData.append('status', 'active');
            formData.append('mimeType', mimeTypeRef.current || 'audio/webm');
            if (alertId) formData.append('alertId', alertId);

            // Send voice alert to backend using configured URL
            const response = await fetch(`${config.BACKEND_URL}/api/alerts/voice`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });

            if (response.ok) {
                alert('Voice alert sent successfully! Police have been notified.');
                // Notify dashboards that a recording is available now
                try { if (socketRef.current && alertId) socketRef.current.emit('recording-saved', { alertId }); } catch(_) {}
            } else {
                let message = 'Unknown error';
                try {
                    const error = await response.json();
                    message = error?.message || JSON.stringify(error);
                } catch {}
                alert(`Failed to send voice alert: ${message}`);
            }

        } catch (error) {
            console.error('Error sending voice alert:', error);
            alert(`Error sending voice alert. ${error?.message || 'Please try again.'}`);
        }
    };

    return (
        <div className="microphone-container" style={{
            padding: '20px',
            color: '#fff',
            textAlign: 'center',
        }}>
            <h2 style={{ color: '#ff4d4d' }}>Voice Alert</h2>
            <p>Record audio to send an immediate voice alert to police. Your recording will be automatically sent when you stop recording.</p>
            
            {/* Recording Controls */}
            <div style={{ marginBottom: '30px' }}>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!isRecording && (!canRecord || !alertId)}
                    style={{
                        backgroundColor: (!isRecording && (!canRecord || !alertId)) ? '#888' : (isRecording ? '#4d4d4d' : '#ff4d4d'),
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '15px 30px',
                        fontSize: '18px',
                        cursor: (!isRecording && (!canRecord || !alertId)) ? 'not-allowed' : 'pointer',
                        marginTop: '20px',
                        marginRight: '10px',
                    }}
                >
                    {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
                </button>
                

                
                {currentPlaying && (
                    <button
                        onClick={stopPlaying}
                        style={{
                            backgroundColor: '#4d4d4d',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50px',
                            padding: '15px 30px',
                            fontSize: '18px',
                            cursor: 'pointer',
                            marginTop: '20px',
                        }}
                    >
                        ⏸️ Stop Playing
                    </button>
                )}
            </div>

            {isRecording && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    backgroundColor: 'rgba(255,77,77,0.1)', 
                    borderRadius: '5px',
                    border: '1px solid #ff4d4d'
                }}>
                    <div style={{ marginBottom: '10px' }}>
                        🔴 Recording... Click "Stop Recording" to save.
                    </div>
                    
                    {/* Audio Level Indicator */}
                    <div style={{ 
                        width: '100%', 
                        height: '20px', 
                        backgroundColor: '#333', 
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: `${(audioLevel / 255) * 100}%`,
                            height: '100%',
                            backgroundColor: audioLevel > 50 ? '#ff4d4d' : '#28a745',
                            transition: 'width 0.1s ease',
                            borderRadius: '10px'
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: '#fff',
                            fontSize: '12px',
                            lineHeight: '20px',
                            textShadow: '1px 1px 1px #000'
                        }}>
                            Audio Level: {Math.round((audioLevel / 255) * 100)}%
                        </div>
                    </div>
                </div>
            )}

            {/* Recordings List */}
            {recordings.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <h3 style={{ color: '#ff4d4d', marginBottom: '20px' }}>Recorded Audio Files</h3>
                    <div style={{ 
                        maxHeight: '400px', 
                        overflowY: 'auto',
                        border: '1px solid #333',
                        borderRadius: '10px',
                        padding: '10px'
                    }}>
                        {recordings.map((recording) => (
                            <div key={recording.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '15px',
                                margin: '10px 0',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                border: currentPlaying === recording.id ? '2px solid #ff4d4d' : '1px solid #333'
                            }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                        Recording {recording.id}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                                        {recording.timestamp}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => playRecording(recording)}
                                        disabled={currentPlaying === recording.id}
                                        style={{
                                            backgroundColor: currentPlaying === recording.id ? '#4d4d4d' : '#28a745',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '5px',
                                            padding: '8px 15px',
                                            cursor: currentPlaying === recording.id ? 'not-allowed' : 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {currentPlaying === recording.id ? '▶️ Playing...' : '▶️ Play'}
                                    </button>
                                    
                                    <button
                                        onClick={() => deleteRecording(recording.id)}
                                        style={{
                                            backgroundColor: '#dc3545',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '5px',
                                            padding: '8px 15px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                                
                                {/* Hidden audio element for playback */}
                                <audio
                                    id={`audio-${recording.id}`}
                                    src={recording.url}
                                    preload="metadata"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recordings.length === 0 && !isRecording && (
                <div style={{ 
                    marginTop: '30px', 
                    padding: '20px', 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    borderRadius: '10px',
                    border: '1px dashed #666'
                }}>
                    <p>No recordings yet. {(!canRecord || !alertId) ? 'Send an Emergency Alert to enable live recording.' : 'Start recording to see your audio files here.'}</p>
                </div>
            )}
        </div>
    );
};

export default Microphone;