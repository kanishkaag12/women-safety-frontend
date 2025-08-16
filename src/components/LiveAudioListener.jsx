import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import config from '../config';

// Plays live audio for a given alertId by subscribing to Socket.IO 'audio-chunk' events.
// Uses MediaSource Extensions to append received chunks for continuous playback.
const LiveAudioListener = ({ alertId }) => {
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef = useRef([]); // queue of ArrayBuffers to append
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | listening | ended
  const [mimeType, setMimeType] = useState('');
  const [chunkCount, setChunkCount] = useState(0);

  // Append buffered chunks when possible
  const appendNext = () => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer || sourceBuffer.updating) return;
    const next = queueRef.current.shift();
    if (!next) return;
    try {
      sourceBuffer.appendBuffer(next);
    } catch (e) {
      // If append fails, push back and retry later
      queueRef.current.unshift(next);
      console.warn('appendBuffer failed, will retry:', e.message);
    }
  };

  useEffect(() => {
    if (!alertId) return;

    const token = localStorage.getItem('token');
    setStatus('connecting');

    // Setup MediaSource and audio element
    mediaSourceRef.current = new MediaSource();
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.src = URL.createObjectURL(mediaSourceRef.current);
    }

    const handleSourceOpen = () => {
      // Wait for first chunk to know mime type
    };

    mediaSourceRef.current.addEventListener('sourceopen', handleSourceOpen);

    // Socket connection to backend URL (avoid connecting to Vite dev server)
    const socket = io(config.BACKEND_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('listening');
      socket.emit('join-alert', { alertId });
    });

    // Reset pipeline on new live session
    socket.on('audio-start', ({ mimeType: mt }) => {
      try {
        setStatus('listening');
        setMimeType(mt || 'audio/webm;codecs=opus');
        setChunkCount(0);
        // Tear down previous MediaSource and re-init
        const audioEl = audioRef.current;
        if (audioEl) {
          if (mediaSourceRef.current) {
            try { audioEl.pause(); } catch(_) {}
            try { mediaSourceRef.current.endOfStream(); } catch(_) {}
          }
          mediaSourceRef.current = new MediaSource();
          audioEl.src = URL.createObjectURL(mediaSourceRef.current);
        }
        sourceBufferRef.current = null;
        queueRef.current = [];
      } catch(e) {
        console.warn('audio-start handling error:', e?.message);
      }
    });

    socket.on('audio-chunk', ({ mimeType: mt, chunk }) => {
      try {
        if (!sourceBufferRef.current) {
          // Initialize SourceBuffer on first chunk
          setMimeType(mt || 'audio/webm;codecs=opus');
          const ms = mediaSourceRef.current;
          if (ms && ms.readyState === 'open') {
            try {
              sourceBufferRef.current = ms.addSourceBuffer(mt || 'audio/webm;codecs=opus');
            } catch (e) {
              // Fallback to generic webm
              sourceBufferRef.current = ms.addSourceBuffer('audio/webm;codecs=opus');
            }
            sourceBufferRef.current.mode = 'sequence';
            sourceBufferRef.current.addEventListener('updateend', appendNext);
          }
        }
        // Ensure we have an ArrayBuffer
        let buf;
        if (chunk instanceof ArrayBuffer) {
          buf = chunk;
        } else if (chunk && chunk.type === 'Buffer' && Array.isArray(chunk.data)) {
          buf = new Uint8Array(chunk.data).buffer;
        } else if (ArrayBuffer.isView(chunk)) {
          buf = chunk.buffer;
        } else if (chunk && typeof chunk === 'object' && '0' in chunk) {
          // handle array-like
          buf = new Uint8Array(Object.values(chunk)).buffer;
        } else {
          // last resort: try to construct from any iterable numbers
          try { buf = new Uint8Array(chunk).buffer; } catch(_) { return; }
        }
        queueRef.current.push(buf);
        appendNext();
        setChunkCount((c) => c + 1);
        const audioEl = audioRef.current;
        if (audioEl && audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      } catch (e) {
        console.error('Error handling audio-chunk:', e);
      }
    });

    socket.on('audio-end', () => {
      setStatus('ended');
      const ms = mediaSourceRef.current;
      if (ms && ms.readyState === 'open') {
        try { ms.endOfStream(); } catch (_) {}
      }
    });

    return () => {
      try { socket.emit('leave-alert', { alertId }); } catch (_) {}
      try { socket.disconnect(); } catch (_) {}
      socketRef.current = null;

      try {
        const ms = mediaSourceRef.current;
        if (ms) {
          if (sourceBufferRef.current) {
            sourceBufferRef.current.removeEventListener('updateend', appendNext);
          }
          if (ms.readyState === 'open') {
            try { ms.endOfStream(); } catch (_) {}
          }
        }
      } catch (_) {}
      mediaSourceRef.current = null;
      sourceBufferRef.current = null;
      queueRef.current = [];
    };
  }, [alertId]);

  return (
    <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: 8 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Live Audio {mimeType ? `(${mimeType})` : ''}</div>
      <audio ref={audioRef} controls style={{ width: '100%' }} />
      <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>Status: {status} • Chunks: {chunkCount}</div>
    </div>
  );
};

export default LiveAudioListener;
