/**
 * Web Audio API Ringtone & Call Audio Synthesizer
 * Zero external audio assets, zero network fetch overhead, 100% native client-side synthesis.
 */

let audioCtx: AudioContext | null = null;
let activeLoopTimer: NodeJS.Timeout | null = null;
let activeOscillators: OscillatorNode[] = [];

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const CallAudioEngine = {
  /**
   * Start Outgoing Ringtone (Standard gentle telephone dual-tone 440Hz + 480Hz)
   */
  startOutgoingRingtone() {
    this.stopAll();
    const playBurst = () => {
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        // Smooth volume envelope: 1.5s ring, gentle fade
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.45);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.55);
        osc2.stop(now + 1.55);

        activeOscillators.push(osc1, osc2);
      } catch {}
    };

    playBurst();
    activeLoopTimer = setInterval(playBurst, 4000);
  },

  /**
   * Start Incoming Call Ringtone (Gentle melodic arpeggio C5 -> E5 -> G5 -> C6)
   */
  startIncomingRingtone() {
    this.stopAll();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    const playMelody = () => {
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.15;
          const endTime = startTime + 0.35;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, endTime);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(endTime);

          activeOscillators.push(osc);
        });
      } catch {}
    };

    playMelody();
    activeLoopTimer = setInterval(playMelody, 2500);
  },

  /**
   * Play short hang up descending tone
   */
  playHangupTone() {
    this.stopAll();
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.25);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  },

  /**
   * Stop all active ringtones and clean timers
   */
  stopAll() {
    if (activeLoopTimer) {
      clearInterval(activeLoopTimer);
      activeLoopTimer = null;
    }
    for (const osc of activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    activeOscillators = [];
  },
};
