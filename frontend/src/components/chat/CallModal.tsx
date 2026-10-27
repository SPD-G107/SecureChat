'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Maximize2,
  Volume2,
} from 'lucide-react';
import { Contact } from '@/types';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected';

interface CallModalProps {
  callState: CallState;
  peer: Contact | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  streamVersion?: number;
  iceConnectionState?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onFlipCamera?: () => void;
}

export default function CallModal({
  callState,
  peer,
  isVideo,
  localStream,
  remoteStream,
  streamVersion = 0,
  iceConnectionState = 'new',
  isMuted,
  isCameraOff,
  onAccept,
  onReject,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
}: CallModalProps) {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Reset swap view when call ends
  useEffect(() => {
    if (callState === 'idle') {
      setIsSwapped(false);
      setAudioBlocked(false);
    }
  }, [callState]);

  // Bind remote audio stream to dedicated HTML5 audio element
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current
        .play()
        .then(() => setAudioBlocked(false))
        .catch((err) => {
          console.warn('[CallModal] Remote audio play error:', err);
          setAudioBlocked(true);
        });
    }
  }, [remoteStream, streamVersion, callState]);

  // Bind video streams to main and picture-in-picture video elements
  useEffect(() => {
    const mainStream = isSwapped ? localStream : remoteStream;
    const pipStream = isSwapped ? remoteStream : localStream;

    if (mainVideoRef.current && mainVideoRef.current.srcObject !== mainStream) {
      mainVideoRef.current.srcObject = mainStream || null;
    }
    if (mainStream && mainVideoRef.current) {
      mainVideoRef.current.play().catch((err) => {
        console.warn('[CallModal] Main video play error:', err);
      });
    }

    if (pipVideoRef.current && pipVideoRef.current.srcObject !== pipStream) {
      pipVideoRef.current.srcObject = pipStream || null;
    }
    if (pipStream && pipVideoRef.current) {
      pipVideoRef.current.play().catch((err) => {
        console.warn('[CallModal] PiP video play error:', err);
      });
    }
  }, [localStream, remoteStream, streamVersion, isSwapped, callState]);

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (callState === 'connected') {
      setDuration(0);
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  if (callState === 'idle' || !peer) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasRemoteVideo = Boolean(
    remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled)
  );

  const hasLocalVideo = Boolean(
    localStream &&
    localStream.getVideoTracks().length > 0 &&
    !isCameraOff
  );

  // 1. Incoming Call Floating Overlay (When recipient receives a call)
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-2xl font-bold text-white">
              {peer.avatarUrl ? (
                <img src={peer.avatarUrl} alt={peer.displayName || peer.username} className="w-full h-full object-cover" />
              ) : (
                <span>{peer.avatarInitials || peer.username.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            {/* Animated ringing pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">{peer.displayName || `@${peer.username}`}</h3>
            <p className="text-xs text-slate-400 font-mono flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Incoming {isVideo ? 'Video' : 'Voice'} Call...
            </p>
            <p className="text-[11px] text-emerald-400 font-medium">End-to-End Encrypted (DTLS-SRTP)</p>
          </div>

          {/* Accept & Decline Buttons */}
          <div className="flex items-center justify-center gap-8 w-full pt-2">
            <button
              onClick={onReject}
              type="button"
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-900/50 transition-all">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-red-400">Decline</span>
            </button>

            <button
              onClick={onAccept}
              type="button"
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all animate-bounce">
                {isVideo ? <Video className="w-6 h-6" /> : <PhoneCall className="w-6 h-6" />}
              </div>
              <span className="text-xs text-slate-400 group-hover:text-emerald-400 font-semibold">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Outgoing Calling or Active Connected Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Hidden remote audio element to ensure audio streams clearly */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full h-full max-w-5xl max-h-[92vh] sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {peer.avatarUrl ? (
                <img src={peer.avatarUrl} alt={peer.displayName || peer.username} className="w-full h-full object-cover" />
              ) : (
                <span>{peer.avatarInitials || peer.username.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                <span>{peer.displayName || `@${peer.username}`}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  E2EE
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {callState === 'calling' ? (
                  <span className="text-amber-400 animate-pulse">Calling peer...</span>
                ) : (
                  <span className="text-emerald-400 font-semibold">{formatDuration(duration)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVideo && (
              <button
                onClick={() => setIsSwapped((prev) => !prev)}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Swap primary and corner views"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Swap View</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${
                iceConnectionState === 'connected' || iceConnectionState === 'completed'
                  ? 'bg-emerald-400 animate-pulse'
                  : iceConnectionState === 'failed' || iceConnectionState === 'disconnected'
                  ? 'bg-red-500'
                  : 'bg-amber-400 animate-ping'
              }`} />
              <span className={
                iceConnectionState === 'connected' || iceConnectionState === 'completed'
                  ? 'text-emerald-400 font-semibold'
                  : iceConnectionState === 'failed'
                  ? 'text-red-400 font-semibold'
                  : 'text-amber-400'
              }>
                {iceConnectionState === 'connected' || iceConnectionState === 'completed'
                  ? 'E2EE Connected'
                  : iceConnectionState === 'failed'
                  ? 'Connection Failed'
                  : 'Connecting P2P...'}
              </span>
            </div>
          </div>
        </div>

        {/* Video or Audio Stage */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-0">
          {/* Floating Tap-to-Unmute Banner if mobile browser blocked audio autoplay */}
          {audioBlocked && (
            <button
              type="button"
              onClick={() => {
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => {});
                }
              }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer border border-emerald-400 backdrop-blur-md"
            >
              <Volume2 className="w-4 h-4" />
              <span>Tap to enable audio / ចុចបើកសំឡេង</span>
            </button>
          )}

          {isVideo ? (
            <>
              {/* Primary Video Window (Muted so browser never blocks autoplay) */}
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover bg-black"
              />

              {/* Placeholder when primary video stream has no active track */}
              {((!isSwapped && !hasRemoteVideo) || (isSwapped && !hasLocalVideo)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center space-y-4 p-6 z-10">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-slate-800 border-4 border-emerald-500/80 shadow-2xl flex items-center justify-center text-3xl font-bold text-white">
                      {!isSwapped && peer.avatarUrl ? (
                        <img src={peer.avatarUrl} alt={peer.displayName || peer.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>{!isSwapped ? (peer.avatarInitials || peer.username.slice(0, 2).toUpperCase()) : 'YOU'}</span>
                      )}
                    </div>
                    {callState === 'calling' && (
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white">
                      {!isSwapped ? (peer.displayName || `@${peer.username}`) : 'Your Camera'}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {callState === 'calling'
                        ? 'Ringing...'
                        : !isSwapped
                        ? 'Connecting secure video feed...'
                        : 'Camera is currently off'}
                    </p>
                  </div>
                </div>
              )}

              {/* Picture-in-Picture Floating Window (Click to swap views) */}
              <div
                onClick={() => setIsSwapped((prev) => !prev)}
                className="absolute bottom-24 right-4 sm:bottom-24 sm:right-6 w-32 sm:w-48 aspect-video rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-500/80 shadow-2xl bg-slate-900 z-20 transition-transform hover:scale-105 active:scale-95 cursor-pointer group"
                title="Click to swap views"
              >
                <video
                  ref={pipVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover bg-black"
                />

                {/* PiP Overlay when stream has no video */}
                {((!isSwapped && !hasLocalVideo) || (isSwapped && !hasRemoteVideo)) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-[10px] text-slate-300 font-mono p-2 text-center">
                    {!isSwapped ? 'Camera Off' : 'Waiting...'}
                  </div>
                )}

                {/* Pill label */}
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/70 text-white backdrop-blur-md flex items-center gap-1 pointer-events-none">
                  <span>{!isSwapped ? 'You' : peer.displayName || peer.username}</span>
                </div>

                {/* Swap Icon Badge on Hover */}
                <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white group-hover:bg-emerald-600 transition-colors pointer-events-none">
                  <RefreshCw className="w-3 h-3" />
                </div>
              </div>
            </>
          ) : (
            /* Audio Call Centered Stage */
            <div className="flex flex-col items-center justify-center text-center space-y-5 p-6">
              <div className="relative">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-slate-800 border-4 border-emerald-500 shadow-2xl flex items-center justify-center text-4xl font-bold text-white">
                  {peer.avatarUrl ? (
                    <img src={peer.avatarUrl} alt={peer.displayName || peer.username} className="w-full h-full object-cover" />
                  ) : (
                    <span>{peer.avatarInitials || peer.username.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                {/* Dynamic voice wave rings */}
                <div className="absolute -inset-2 rounded-full border border-emerald-500/40 animate-pulse pointer-events-none" />
                <div className="absolute -inset-6 rounded-full border border-emerald-500/20 animate-ping opacity-40 pointer-events-none" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold text-white">{peer.displayName || `@${peer.username}`}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {callState === 'calling' ? 'Calling...' : `Voice Call Connected (${formatDuration(duration)})`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Controls Floating Dock */}
        <div className="px-4 py-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-center gap-3 sm:gap-6 z-30 shrink-0">
          {/* Mute Mic Button */}
          <button
            onClick={onToggleMic}
            type="button"
            className={`p-3.5 sm:p-4 rounded-full transition-all active:scale-95 cursor-pointer ${
              isMuted
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera Button (Available on video calls) */}
          {isVideo && (
            <button
              onClick={onToggleCamera}
              type="button"
              className={`p-3.5 sm:p-4 rounded-full transition-all active:scale-95 cursor-pointer ${
                isCameraOff
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Flip / Switch Camera Button (Mobile cameras) */}
          {isVideo && onFlipCamera && (
            <button
              onClick={onFlipCamera}
              type="button"
              className="p-3.5 sm:p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Flip Camera (Front/Back)"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}

          {/* End Call / Hang Up Button */}
          <button
            onClick={onEndCall}
            type="button"
            className="p-3.5 sm:p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60 transition-all active:scale-95 cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
