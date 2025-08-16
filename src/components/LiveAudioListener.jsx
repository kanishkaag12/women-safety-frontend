import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import config from '../config';

// Plays live audio for a given alertId by subscribing to Socket.IO 'audio-chunk' events.
// Uses MediaSource Extensions to append received chunks for continuous playback.
const LiveAudioListener = ({ alertId, onLiveStart, onLiveEnd }) => {
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef = useRef([]); // queue of ArrayBuffers to append
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | listening | ended
  const [mimeType, setMimeType] = useState('');
  const [chunkCount, setChunkCount] = useState(0);
  const lastMimeRef = useRef('audio/webm;codecs=opus');
  // WebAudio fallback
  const useWebAudioRef = useRef(false);
  const audioCtxRef = useRef(null);
  const waLastEndRef = useRef(0);

  // Append buffered chunks when possible
  const appendNext = () => {
    const sourceBuffer = sourceBufferRef.current;
    const ms = mediaSourceRef.current;
    if (!sourceBuffer || !ms) return;
    if (sourceBuffer.updating || ms.readyState !== 'open') return;
    const next = queueRef.current.shift();
    if (!next) return;
    try {
      sourceBuffer.appendBuffer(next);
    } catch (e) {
      // If append fails, push back and retry slightly later
      queueRef.current.unshift(next);
      setTimeout(() => appendNext(), 50);
      console.warn('appendBuffer failed, will retry:', e?.message || e);
    }
  };

  useEffect(() => {
    if (!alertId) return;

    const token = localStorage.getItem('token');
    setStatus('connecting');

    // Do NOT create MediaSource yet. Wait for audio-start or first chunk to attach.
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.autoplay = false;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.muted = false;
      // Attach error listener for diagnostics only
      try {
        const onErr = () => {
          const err = audioEl.error;
          if (err) {
            console.warn('Audio element error:', { code: err.code, message: err.message });
          } else {
            console.warn('Audio element error event fired with no MediaError');
          }
        };
        audioEl.addEventListener('error', onErr);
      } catch (_) {}
    }

    const handleSourceOpen = () => {
      // If we missed audio-start and already have chunks queued, create SourceBuffer now
      try {
        const ms = mediaSourceRef.current;
        if (!ms || ms.readyState !== 'open' || sourceBufferRef.current) return;
        // Choose a supported codec using last seen mime
        let candidate = lastMimeRef.current || mimeType || 'audio/webm;codecs=opus';
        if (!('MediaSource' in window)) throw new Error('MediaSource not available');
        if (!MediaSource.isTypeSupported(candidate)) {
          if (MediaSource.isTypeSupported('audio/webm;codecs=opus')) candidate = 'audio/webm;codecs=opus';
          else if (MediaSource.isTypeSupported('audio/webm')) candidate = 'audio/webm';
          else if (MediaSource.isTypeSupported('audio/ogg;codecs=opus')) candidate = 'audio/ogg;codecs=opus';
          else if (MediaSource.isTypeSupported('audio/ogg')) candidate = 'audio/ogg';
          else if (MediaSource.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) candidate = 'audio/mp4;codecs=mp4a.40.2';
          else if (MediaSource.isTypeSupported('audio/aac')) candidate = 'audio/aac';
        }
        try {
          sourceBufferRef.current = ms.addSourceBuffer(candidate);
        } catch (e) {
          // If we cannot create SourceBuffer at all, fallback to WebAudio
          console.warn('Falling back to WebAudio playback due to SourceBuffer creation failure');
          useWebAudioRef.current = true;
          // Initialize AudioContext lazily
          if (!audioCtxRef.current) {
            try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) {}
          }
          // Clear <audio> element src to avoid unsupported source errors
          try { const a = audioRef.current; if (a) { a.pause(); a.removeAttribute('src'); a.load(); } } catch(_) {}
          return;
        }
        console.log('MSE sourceopen: readyState=', ms.readyState, 'creating SourceBuffer with', candidate);
        sourceBufferRef.current.mode = 'sequence';
        sourceBufferRef.current.addEventListener('updateend', appendNext);
        // Start draining any queued chunks
        appendNext();
        const a = audioRef.current;
        if (a && !useWebAudioRef.current && sourceBufferRef.current) {
          // Start muted to comply with autoplay policies
          try { a.muted = true; a.play().catch(() => {}); } catch(_) {}
        }
      } catch (e) {
        console.warn('sourceopen init failed:', e?.message || e);
      }
    };

    // Do not attach sourceopen yet; we will attach when we create MediaSource on audio-start/first-chunk

    // Socket connection to backend URL (avoid connecting to Vite dev server)
    const socket = io(config.BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });
    socketRef.current = socket;

    // Join desired alert room as early as possible (socket.io queues before connect)
    try { socket.emit('join-alert', { alertId }); } catch (_) {}

    socket.on('connect', () => {
      setStatus('listening');
      socket.emit('join-alert', { alertId });
    });

    socket.on('connect_error', (err) => {
      console.error('LiveAudioListener socket connect_error:', err?.message || err);
      setStatus('disconnected');
    });

    socket.on('error', (err) => {
      console.error('LiveAudioListener socket error:', err);
    });

    // Reset pipeline on new live session
    socket.on('audio-start', ({ mimeType: mt }) => {
      console.log('LiveAudioListener received audio-start. mime=', mt);
      try {
        setStatus('listening');
        setMimeType(mt || 'audio/webm;codecs=opus');
        lastMimeRef.current = mt || 'audio/webm;codecs=opus';
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
          // Attach sourceopen for the new MediaSource
          try { mediaSourceRef.current.addEventListener('sourceopen', handleSourceOpen); } catch(_) {}
          // Attempt autoplay muted, will unmute once playing
          try { audioEl.muted = true; audioEl.play().catch(() => {}); } catch(_) {}
        }
        sourceBufferRef.current = null;
        queueRef.current = [];
        useWebAudioRef.current = false; // attempt MSE first for each new live session
        try { if (typeof onLiveStart === 'function') onLiveStart({ alertId, mimeType: mt }); } catch(_) {}
      } catch(e) {
        console.warn('audio-start handling error:', e?.message);
      }
    });

    socket.on('audio-chunk', ({ mimeType: mt, chunk }) => {
      try {
        if (chunk) {
          let size = 0;
          try {
            if (chunk instanceof ArrayBuffer) size = chunk.byteLength;
            else if (chunk && chunk.type === 'Buffer' && Array.isArray(chunk.data)) size = chunk.data.length;
          } catch (_) {}
          if ((Math.random() * 10) < 1) console.log('LiveAudioListener received audio-chunk size=', size, 'mime=', mt);
        }
        if (!sourceBufferRef.current && !useWebAudioRef.current) {
          // Initialize SourceBuffer on first chunk
          const preferred = mt || lastMimeRef.current || 'audio/webm;codecs=opus';
          setMimeType(preferred);
          lastMimeRef.current = preferred;
          let ms = mediaSourceRef.current;
          // Lazily create MediaSource if not present
          if (!ms) {
            const a = audioRef.current;
            if (a) {
              mediaSourceRef.current = new MediaSource();
              a.src = URL.createObjectURL(mediaSourceRef.current);
              try { mediaSourceRef.current.addEventListener('sourceopen', handleSourceOpen); } catch(_) {}
              // Try autoplay muted
              try { a.muted = true; a.play().catch(() => {}); } catch(_) {}
            }
            ms = mediaSourceRef.current;
          }
          if (ms && ms.readyState === 'open') {
            // Choose a supported codec for MSE
            let candidate = preferred;
            try {
              if (!('MediaSource' in window)) throw new Error('MediaSource not available');
              const ok = MediaSource.isTypeSupported(candidate);
              if (!ok) {
                if (MediaSource.isTypeSupported('audio/webm;codecs=opus')) candidate = 'audio/webm;codecs=opus';
                else if (MediaSource.isTypeSupported('audio/webm')) candidate = 'audio/webm';
                else if (MediaSource.isTypeSupported('audio/ogg;codecs=opus')) candidate = 'audio/ogg;codecs=opus';
                else if (MediaSource.isTypeSupported('audio/ogg')) candidate = 'audio/ogg';
                else if (MediaSource.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) candidate = 'audio/mp4;codecs=mp4a.40.2';
                else if (MediaSource.isTypeSupported('audio/aac')) candidate = 'audio/aac';
                else candidate = preferred; // last attempt; may throw
              }
              console.log('First chunk MSE init: readyState=', ms.readyState, 'creating SourceBuffer with', candidate);
              sourceBufferRef.current = ms.addSourceBuffer(candidate);
            } catch (e) {
              console.warn('Failed to create SourceBuffer for', candidate, 'err:', e?.message || e);
              // Try minimal fallback once
              useWebAudioRef.current = true;
              if (!audioCtxRef.current) {
                try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) {}
              }
              // Switch to WebAudio path for this and future chunks
              // fall through to WebAudio handler below
              try { const a = audioRef.current; if (a) { a.pause(); a.removeAttribute('src'); a.load(); } } catch(_) {}
            }
            if (sourceBufferRef.current) {
              sourceBufferRef.current.mode = 'sequence';
              sourceBufferRef.current.addEventListener('updateend', appendNext);
            }
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
        if (useWebAudioRef.current) {
          // WebAudio fallback: decode and play
          try {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioCtxRef.current;
            // Safari may require resume after gesture
            try { if (ctx.state === 'suspended') ctx.resume(); } catch(_) {}
            ctx.decodeAudioData(buf.slice(0), (audioBuffer) => {
              const src = ctx.createBufferSource();
              src.buffer = audioBuffer;
              src.connect(ctx.destination);
              const now = ctx.currentTime;
              const startAt = Math.max(now, waLastEndRef.current || now);
              const duration = audioBuffer.duration || 0;
              src.start(startAt);
              waLastEndRef.current = startAt + duration;
            }, (err) => {
              // Ignore decode errors for partial chunks
            });
          } catch (_) {}
        } else {
          queueRef.current.push(buf);
          // Try immediate append and also schedule a retry to be safe
          appendNext();
          setTimeout(() => appendNext(), 25);
        }
        setChunkCount((c) => c + 1);
        const audioEl = audioRef.current;
        if (audioEl && !useWebAudioRef.current && sourceBufferRef.current) {
          audioEl.play().then(() => {
            // Unmute once it has started
            try { audioEl.muted = false; } catch(_) {}
          }).catch((e) => {
            console.warn('Autoplay failed:', e?.message || e);
          });
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
      try { if (typeof onLiveEnd === 'function') onLiveEnd({ alertId, mimeType }); } catch(_) {}
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
      // Close WebAudio context if used
      try { if (audioCtxRef.current) { audioCtxRef.current.close(); } } catch(_) {}
      audioCtxRef.current = null;
      useWebAudioRef.current = false;
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
