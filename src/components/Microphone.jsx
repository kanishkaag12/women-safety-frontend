import React, { useState, useRef } from 'react';

const Microphone = ({ user }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState([]);
    const [currentPlaying, setCurrentPlaying] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    const startRecording = async () => {
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
            
            // Try different MIME types
            let mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/wav';
                }
            }
            
            console.log('Using MIME type:', mimeType);
            
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                console.log('Data available event:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log('Audio chunk received:', event.data.size, 'bytes');
                } else {
                    console.warn('Empty audio chunk received');
                }
            };

            mediaRecorderRef.current.onstart = () => {
                console.log('MediaRecorder started successfully');
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                alert(`Recording error: ${event.error.message}`);
            };

            mediaRecorderRef.current.onstop = () => {
                console.log('Recording stopped, processing audio...');
                console.log('Total chunks:', audioChunksRef.current.length);
                console.log('Total size:', audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0));
                
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
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
                    
                    // Automatically send voice alert to police
                    sendVoiceAlert(audioBlob);
                } else {
                    console.error('Recording failed: No audio data captured');
                    alert('No audio was captured. Please check your microphone permissions and try again.');
                }
            };

            // Start recording with smaller time slices for better data capture
            mediaRecorderRef.current.start(500); // Capture data every 500ms
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
            const userId = user._id || user.id;
            
            // Get current location
            let location = 'Location not available';
            let coordinates = '';
            
            if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
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
                        }
                    }
                } catch (geocodeError) {
                    console.log('Geocoding failed, using coordinates:', geocodeError);
                    location = coordinates;
                }
            }
            
            // Create FormData to send audio file
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-alert.webm');
            formData.append('userId', userId);
            formData.append('userName', user.name);
            formData.append('location', location);
            formData.append('coordinates', coordinates);
            formData.append('type', 'voice');
            formData.append('priority', 'high');
            formData.append('status', 'active');
            
            // Send voice alert to backend
            const response = await fetch('/api/alerts/voice', {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });
            
            if (response.ok) {
                alert('Voice alert sent successfully! Police have been notified.');
            } else {
                const error = await response.json();
                alert(`Failed to send voice alert: ${error.message}`);
            }
            
        } catch (error) {
            console.error('Error sending voice alert:', error);
            alert('Error sending voice alert. Please try again.');
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
                    style={{
                        backgroundColor: isRecording ? '#4d4d4d' : '#ff4d4d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '15px 30px',
                        fontSize: '18px',
                        cursor: 'pointer',
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
                    <p>No recordings yet. Start recording to see your audio files here.</p>
                </div>
            )}
        </div>
    );
};

export default Microphone;