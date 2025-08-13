import React, { useState, useRef } from 'react';

const Microphone = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.start();
            setIsRecording(true);
            
            // In a real app, you would stream this data to your backend
            // For now, we'll just log a message
            console.log("Recording started...");

            // You can also stop the stream manually later
            // mediaRecorderRef.current.stop();
            // stream.getTracks().forEach(track => track.stop());

        } catch (err) {
            console.error("Error accessing microphone: ", err);
            alert("Error accessing microphone. Please allow access.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            console.log("Recording stopped.");
        }
    };

    return (
        <div className="microphone-container" style={{
            padding: '20px',
            color: '#fff',
            textAlign: 'center',
        }}>
            <h2 style={{ color: '#ff4d4d' }}>Microphone</h2>
            <p>Click the button to start or stop recording the surrounding audio.</p>
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
                }}
            >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {isRecording && <p style={{ marginTop: '10px' }}>Recording... Click again to stop.</p>}
        </div>
    );
};

export default Microphone;