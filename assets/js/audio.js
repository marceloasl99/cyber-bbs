/**
 * CYBER BBS — Procedural Web Audio Engine
 * Pure synthesized modem handshake, terminal bells, key clicks, and line acoustics.
 * Zero external audio files required.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      this.volume = 0.75;
      this.isHandshaking = false;
      this.activeNodes = [];

      // Load saved preferences
      try {
        const savedMute = localStorage.getItem('cyberbbs.mute');
        if (savedMute !== null) this.muted = savedMute === 'true';
        const savedVol = localStorage.getItem('cyberbbs.volume');
        if (savedVol !== null) this.volume = parseFloat(savedVol) || 0.75;
      } catch (e) {}
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.updateGain();

      // Soft Telephone Bandpass filter (300Hz - 3400Hz)
      this.phoneFilter = this.ctx.createBiquadFilter();
      this.phoneFilter.type = 'bandpass';
      this.phoneFilter.frequency.value = 1800;
      this.phoneFilter.Q.value = 0.8;

      this.masterGain.connect(this.phoneFilter);
      this.phoneFilter.connect(this.ctx.destination);
    }

    ensureContext() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMute(mute) {
      this.muted = !!mute;
      try { localStorage.setItem('cyberbbs.mute', this.muted); } catch(e){}
      this.updateGain();
      return this.muted;
    }

    toggleMute() {
      return this.setMute(!this.muted);
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      try { localStorage.setItem('cyberbbs.volume', this.volume); } catch(e){}
      this.updateGain();
    }

    updateGain() {
      if (!this.masterGain) return;
      const targetGain = this.muted ? 0 : this.volume * 0.45;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx ? this.ctx.currentTime : 0);
    }

    trackNode(node) {
      this.activeNodes.push(node);
      return node;
    }

    stopAll() {
      this.isHandshaking = false;
      for (const node of this.activeNodes) {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      }
      this.activeNodes = [];
    }

    // Key Click sound on typing
    playKeyClick() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

      gain.gain.setValueAtTime(0.04 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.018);
    }

    // Terminal Bell (BEL / ASCII 0x07)
    playBell() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now); // Standard 880Hz terminal beep

      gain.gain.setValueAtTime(0.12 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    }

    // Zmodem Transfer Tick
    playTransferTick() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.03 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.016);
    }

    // Hangup Sound (Carrier drop + Relay click)
    playHangup() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    }

    /**
     * Synthesize Full 14.4k USRobotics Courier Handshake
     * @param {Object} callbacks: onProgress(time, label, status), onComplete()
     */
    startModemHandshake(callbacks = {}) {
      this.ensureContext();
      this.stopAll();
      this.isHandshaking = true;

      const onProgress = callbacks.onProgress || (() => {});
      const onComplete = callbacks.onComplete || (() => {});

      if (!this.ctx) {
        setTimeout(onComplete, 500);
        return;
      }

      const t0 = this.ctx.currentTime;

      // Update modem LEDs via helper
      const setLed = (ledId, state) => {
        const el = document.getElementById('led-' + ledId);
        if (el) {
          if (state) el.classList.add('on');
          else el.classList.remove('on');
        }
      };

      setLed('mr', true);
      setLed('tr', true);
      setLed('oh', true); // Off-hook

      // 1. Dial Tone (350Hz + 440Hz) 0.0 - 1.0s
      onProgress(0.1, 'DIAL TONE DETECTED...', 'OH');
      const dt1 = this.ctx.createOscillator();
      const dt2 = this.ctx.createOscillator();
      const dtGain = this.ctx.createGain();

      dt1.type = 'sine'; dt1.frequency.value = 350;
      dt2.type = 'sine'; dt2.frequency.value = 440;
      dtGain.gain.setValueAtTime(0.18, t0);
      dtGain.gain.setValueAtTime(0, t0 + 1.0);

      dt1.connect(dtGain); dt2.connect(dtGain);
      dtGain.connect(this.masterGain);

      dt1.start(t0); dt2.start(t0);
      dt1.stop(t0 + 1.0); dt2.stop(t0 + 1.0);
      this.trackNode(dt1); this.trackNode(dt2);

      // 2. DTMF Dialing (555-0192) 1.1s - 2.2s
      const dtmfPairs = [
        [770, 1336], // 5
        [770, 1336], // 5
        [770, 1336], // 5
        [941, 1336], // 0
        [697, 1209], // 1
        [852, 1477], // 9
        [697, 1336]  // 2
      ];

      let dtmfTime = t0 + 1.1;
      dtmfPairs.forEach((pair, idx) => {
        const o1 = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o1.frequency.value = pair[0];
        o2.frequency.value = pair[1];

        g.gain.setValueAtTime(0.2, dtmfTime);
        g.gain.setValueAtTime(0, dtmfTime + 0.08);

        o1.connect(g); o2.connect(g);
        g.connect(this.masterGain);

        o1.start(dtmfTime); o2.start(dtmfTime);
        o1.stop(dtmfTime + 0.08); o2.stop(dtmfTime + 0.08);

        this.trackNode(o1); this.trackNode(o2);
        dtmfTime += 0.14;
      });

      // 3. Ringback (440Hz + 480Hz) 2.4s - 4.4s
      setTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(2.4, 'RINGING REMOTE NODE...', 'OH,SD');
        setLed('sd', true);
        setTimeout(() => setLed('sd', false), 200);
      }, 1100);

      const rb1 = this.ctx.createOscillator();
      const rb2 = this.ctx.createOscillator();
      const rbGain = this.ctx.createGain();

      rb1.frequency.value = 440; rb2.frequency.value = 480;
      rbGain.gain.setValueAtTime(0, t0 + 2.3);
      rbGain.gain.setValueAtTime(0.15, t0 + 2.4);
      rbGain.gain.setValueAtTime(0, t0 + 4.2);

      rb1.connect(rbGain); rb2.connect(rbGain);
      rbGain.connect(this.masterGain);

      rb1.start(t0 + 2.3); rb2.start(t0 + 2.3);
      rb1.stop(t0 + 4.3); rb2.stop(t0 + 4.3);
      this.trackNode(rb1); this.trackNode(rb2);

      // 4. Remote Answer & V.25 Tone (2100Hz) 4.5s - 6.5s
      setTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(4.5, 'ANSWER TONE DETECTED (V.25 2100Hz)...', 'OH,CD');
        setLed('cd', true);
      }, 4500);

      const ansOsc = this.ctx.createOscillator();
      const ansGain = this.ctx.createGain();
      ansOsc.frequency.value = 2100;
      ansGain.gain.setValueAtTime(0, t0 + 4.5);
      ansGain.gain.setValueAtTime(0.22, t0 + 4.6);
      ansGain.gain.setValueAtTime(0, t0 + 6.6);

      ansOsc.connect(ansGain);
      ansGain.connect(this.masterGain);
      ansOsc.start(t0 + 4.5); ansOsc.stop(t0 + 6.7);
      this.trackNode(ansOsc);

      // 5. V.8 CM/JM Chirps & Line Probing (6.7s - 8.5s)
      setTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(6.7, 'CARRIER NEGOTIATION (V.8 DUAL TONES)...', 'OH,CD,RD');
        setLed('rd', true);
      }, 6700);

      const chirpOsc = this.ctx.createOscillator();
      const chirpGain = this.ctx.createGain();
      chirpOsc.type = 'square';
      chirpOsc.frequency.setValueAtTime(1650, t0 + 6.7);
      chirpOsc.frequency.setValueAtTime(1850, t0 + 7.2);
      chirpOsc.frequency.setValueAtTime(1650, t0 + 7.7);
      chirpOsc.frequency.setValueAtTime(2400, t0 + 8.1);

      chirpGain.gain.setValueAtTime(0, t0 + 6.7);
      chirpGain.gain.setValueAtTime(0.12, t0 + 6.8);
      chirpGain.gain.setValueAtTime(0, t0 + 8.5);

      chirpOsc.connect(chirpGain);
      chirpGain.connect(this.masterGain);
      chirpOsc.start(t0 + 6.7); chirpOsc.stop(t0 + 8.6);
      this.trackNode(chirpOsc);

      // 6. Scrambler / Training White Noise bursts (8.6s - 11.5s)
      setTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(8.6, 'LINE PROBING & V.32bis EQUALIZATION...', 'OH,CD,RD,SD');
        setLed('sd', true);
      }, 8600);

      // Synthesize noise buffer
      const bufferSize = this.ctx.sampleRate * 3.0;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1700;
      noiseFilter.Q.value = 1.2;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t0 + 8.6);
      noiseGain.gain.linearRampToValueAtTime(0.24, t0 + 9.0);
      noiseGain.gain.setValueAtTime(0.22, t0 + 10.8);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 11.6);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseNode.start(t0 + 8.6);
      noiseNode.stop(t0 + 11.7);
      this.trackNode(noiseNode);

      // 7. Connect! (11.8s)
      setTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(11.8, 'CONNECT 14400/ARQ/V42B/LAPM', 'HS,CD,OH');
        setLed('hs', true);
        setLed('cd', true);
        setLed('sd', false);
        setLed('rd', false);
        this.playBell();
        this.isHandshaking = false;
        onComplete();
      }, 11800);
    }

    // Immediate skip to CONNECT
    skipHandshake(onComplete) {
      this.stopAll();
      const setLed = (ledId, state) => {
        const el = document.getElementById('led-' + ledId);
        if (el) el.classList.toggle('on', !!state);
      };
      setLed('hs', true);
      setLed('cd', true);
      setLed('oh', true);
      setLed('mr', true);
      setLed('tr', true);
      setLed('rd', false);
      setLed('sd', false);
      this.playBell();
      if (typeof onComplete === 'function') onComplete();
    }
  }

  window.CyberBBS.Audio = new BBSAudio();
})();
