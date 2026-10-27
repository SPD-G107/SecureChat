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
  User as UserIcon,
} from 'lucide-react';
import { Contact } from '@/types';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected';

interface CallModalProps {
  callState: CallState;
  peer: Contact | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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
  isMuted,
  isCameraOff,
  onAccept,
  onReject,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);

  // Bind local stream to local preview video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Bind remote stream to remote video and audio element
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callState]);

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

          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 font-mono">
            <span>WebRTC DTLS-SRTP</span>
          </div>
        </div>

        {/* Video or Audio Stage */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-0">
          {isVideo ? (
            <>
              {/* Remote Video Stream (Main Window) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Placeholder when remote video is not yet received */}
              {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center space-y-4 p-6 z-10">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-slate-800 border-4 border-emerald-500/80 shadow-2xl flex items-center justify-center text-3xl font-bold text-white">
                      {peer.avatarUrl ? (
                        <img src={peer.avatarUrl} alt={peer.displayName || peer.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>{peer.avatarInitials || peer.username.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    {callState === 'calling' && (
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white">{peer.displayName || `@${peer.username}`}</h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {callState === 'calling' ? 'Ringing...' : 'Connecting secure video feed...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Local Video Stream (Floating Picture-in-Picture window) */}
              {localStream && (
                <div className="absolute bottom-24 right-4 sm:bottom-24 sm:right-6 w-28 sm:w-44 aspect-video rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-500/70 shadow-2xl bg-slate-900 z-20 transition-all">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isCameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-[10px] text-slate-400 font-mono">
                      Camera Off
                    </div>
                  )}
                </div>
              )}
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
