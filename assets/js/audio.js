/**
 * CYBER BBS — Procedural Web Audio Engine (Mega Edition v3.0)
 * Pure synthesized 14.4k USRobotics Courier handshake, terminal bells,
 * Netmail chimes, Trivia fanfare, key clicks, and optional basement PC fan + HDD seek ambiance.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.phoneFilter = null;
      this.muted = false;
      this.volume = 0.75;
      this.isHandshaking = false;
      this.activeNodes = [];
      this.timeouts = [];
      this.ambientEnabled = false;
      this.ambientNodes = [];
      this.ambientTimer = null;

      try {
        const savedMute = localStorage.getItem('cyberbbs.mute');
        if (savedMute !== null) this.muted = savedMute === 'true';
        const savedVol = localStorage.getItem('cyberbbs.volume');
        if (savedVol !== null) {
          const parsed = Number(savedVol);
          if (Number.isFinite(parsed)) this.volume = Math.max(0, Math.min(1, parsed));
        }
        const savedAmb = localStorage.getItem('cyberbbs.ambient');
        if (savedAmb === 'true') this.ambientEnabled = true;
      } catch (e) {}
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.updateGain();

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
        this.ctx.resume().catch(() => {});
      }
      if (this.ambientEnabled && this.ambientNodes.length === 0 && !this.muted) {
        this.startAmbient();
      }
    }

    setMute(mute) {
      this.muted = !!mute;
      try { localStorage.setItem('cyberbbs.mute', this.muted); } catch (e) {}
      this.updateGain();
      if (this.muted) this.stopAmbient();
      else if (this.ambientEnabled) this.startAmbient();
      return this.muted;
    }

    toggleMute() { return this.setMute(!this.muted); }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      try { localStorage.setItem('cyberbbs.volume', this.volume); } catch (e) {}
      this.updateGain();
    }

    updateGain() {
      if (!this.masterGain) return;
      const targetGain = this.muted ? 0 : this.volume * 0.45;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx ? this.ctx.currentTime : 0);
    }

    trackNode(node) { this.activeNodes.push(node); return node; }

    trackTimeout(fn, delayMs) {
      const id = setTimeout(fn, delayMs);
      this.timeouts.push(id);
      return id;
    }

    clearTimeouts() {
      for (const id of this.timeouts) clearTimeout(id);
      this.timeouts = [];
    }

    stopAll() {
      this.isHandshaking = false;
      this.clearTimeouts();
      for (const node of this.activeNodes) {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      }
      this.activeNodes = [];
    }

    toggleAmbient() {
      this.ambientEnabled = !this.ambientEnabled;
      try { localStorage.setItem('cyberbbs.ambient', String(this.ambientEnabled)); } catch (e) {}
      if (this.ambientEnabled && !this.muted) this.startAmbient();
      else this.stopAmbient();
      return this.ambientEnabled;
    }

    startAmbient() {
      if (this.muted || !this.ambientEnabled) return;
      this.ensureContext();
      if (!this.ctx || this.ambientNodes.length > 0) return;

      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const fanSource = this.ctx.createBufferSource();
      fanSource.buffer = noiseBuffer;
      fanSource.loop = true;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 140;

      const fanGain = this.ctx.createGain();
      fanGain.gain.value = 0.028 * this.volume;

      fanSource.connect(lowpass);
      lowpass.connect(fanGain);
      fanGain.connect(this.ctx.destination);
      fanSource.start();
      this.ambientNodes.push(fanSource, lowpass, fanGain);

      this.ambientTimer = setInterval(() => {
        if (this.muted || !this.ambientEnabled || !this.ctx) return;
        if (Math.random() < 0.45) this.playHddSeek();
      }, 4200);
    }

    stopAmbient() {
      if (this.ambientTimer) { clearInterval(this.ambientTimer); this.ambientTimer = null; }
      for (const n of this.ambientNodes) {
        try { if (n.stop) n.stop(); if (n.disconnect) n.disconnect(); } catch (e) {}
      }
      this.ambientNodes = [];
    }

    playHddSeek() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const clicks = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < clicks; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220 + Math.random() * 120, now + i * 0.045);
        g.gain.setValueAtTime(0.018 * this.volume, now + i * 0.045);
        g.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.045 + 0.025);
        osc.connect(g); g.connect(this.ctx.destination);
        osc.start(now + i * 0.045); osc.stop(now + i * 0.045 + 0.03);
      }
    }

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
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.018);
    }

    playDegauss() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Heavy resonant CRT degauss coil hum
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);

      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.46);

      // High relay metallic snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(1200, now);
      snap.frequency.exponentialRampToValueAtTime(180, now + 0.035);
      snapGain.gain.setValueAtTime(0.22 * this.volume, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      snap.connect(snapGain); snapGain.connect(this.ctx.destination);
      snap.start(now); snap.stop(now + 0.045);
    }

    playDtmf(digit, duration = 0.12) {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const dtmfFreqs = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      };
      const freqs = dtmfFreqs[String(digit)] || dtmfFreqs['0'];
      const now = this.ctx.currentTime;

      [freqs[0], freqs[1]].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08 * this.volume, now);
        gain.gain.setValueAtTime(0.08 * this.volume, now + duration - 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + duration + 0.01);
      });
    }

    playBell() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.11 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.13);
    }

    playMailChime() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [660, 990].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.1 * this.volume, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09); osc.stop(now + idx * 0.09 + 0.13);
      });
    }

    playFanfare() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.08 * this.volume, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.11);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.12);
      });
    }

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
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.016);
    }

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
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.16);
    }

    startModemHandshake(callbacks = {}) {
      this.ensureContext();
      this.stopAll();
      this.isHandshaking = true;

      const onProgress = callbacks.onProgress || (() => {});
      const onComplete = callbacks.onComplete || (() => {});
      const setLed = (ledId, state) => {
        const el = document.getElementById('led-' + ledId);
        if (el) el.classList.toggle('on', !!state);
      };

      setLed('mr', true); setLed('tr', true); setLed('oh', true);

      if (!this.ctx) {
        this.trackTimeout(() => { this.isHandshaking = false; onComplete(); }, 500);
        return;
      }

      const t0 = this.ctx.currentTime;
      onProgress(0.1, 'DIAL TONE DETECTED...', 'OH');
      const dt1 = this.ctx.createOscillator();
      const dt2 = this.ctx.createOscillator();
      const dtGain = this.ctx.createGain();
      dt1.type = 'sine'; dt1.frequency.value = 350;
      dt2.type = 'sine'; dt2.frequency.value = 440;
      dtGain.gain.setValueAtTime(0.18, t0);
      dtGain.gain.setValueAtTime(0, t0 + 1.0);
      dt1.connect(dtGain); dt2.connect(dtGain); dtGain.connect(this.masterGain);
      dt1.start(t0); dt2.start(t0); dt1.stop(t0 + 1.0); dt2.stop(t0 + 1.0);
      this.trackNode(dt1); this.trackNode(dt2);

      const dtmfPairs = [[770, 1336], [770, 1336], [770, 1336], [941, 1336], [697, 1209], [852, 1477], [697, 1336]];
      let dtmfTime = t0 + 1.1;
      dtmfPairs.forEach((pair) => {
        const o1 = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o1.frequency.value = pair[0]; o2.frequency.value = pair[1];
        g.gain.setValueAtTime(0.2, dtmfTime); g.gain.setValueAtTime(0, dtmfTime + 0.08);
        o1.connect(g); o2.connect(g); g.connect(this.masterGain);
        o1.start(dtmfTime); o2.start(dtmfTime); o1.stop(dtmfTime + 0.08); o2.stop(dtmfTime + 0.08);
        this.trackNode(o1); this.trackNode(o2);
        dtmfTime += 0.14;
      });

      this.trackTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(2.4, 'RINGING REMOTE NODE...', 'OH,SD');
        setLed('sd', true);
        this.trackTimeout(() => setLed('sd', false), 200);
      }, 1100);

      const rb1 = this.ctx.createOscillator();
      const rb2 = this.ctx.createOscillator();
      const rbGain = this.ctx.createGain();
      rb1.frequency.value = 440; rb2.frequency.value = 480;
      rbGain.gain.setValueAtTime(0, t0 + 2.3);
      rbGain.gain.setValueAtTime(0.15, t0 + 2.4);
      rbGain.gain.setValueAtTime(0, t0 + 4.2);
      rb1.connect(rbGain); rb2.connect(rbGain); rbGain.connect(this.masterGain);
      rb1.start(t0 + 2.3); rb2.start(t0 + 2.3); rb1.stop(t0 + 4.3); rb2.stop(t0 + 4.3);
      this.trackNode(rb1); this.trackNode(rb2);

      this.trackTimeout(() => {
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
      ansOsc.connect(ansGain); ansGain.connect(this.masterGain);
      ansOsc.start(t0 + 4.5); ansOsc.stop(t0 + 6.7);
      this.trackNode(ansOsc);

      this.trackTimeout(() => {
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
      chirpOsc.connect(chirpGain); chirpGain.connect(this.masterGain);
      chirpOsc.start(t0 + 6.7); chirpOsc.stop(t0 + 8.6);
      this.trackNode(chirpOsc);

      this.trackTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(8.6, 'LINE PROBING & V.32bis EQUALIZATION...', 'OH,CD,RD,SD');
        setLed('sd', true);
      }, 8600);

      const bufferSize = this.ctx.sampleRate * 3.0;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1700; noiseFilter.Q.value = 1.2;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t0 + 8.6);
      noiseGain.gain.linearRampToValueAtTime(0.24, t0 + 9.0);
      noiseGain.gain.setValueAtTime(0.22, t0 + 10.8);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 11.6);
      noiseNode.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.masterGain);
      noiseNode.start(t0 + 8.6); noiseNode.stop(t0 + 11.7);
      this.trackNode(noiseNode);

      this.trackTimeout(() => {
        if (!this.isHandshaking) return;
        onProgress(11.8, 'CONNECT 14400/ARQ/V42B/LAPM', 'HS,CD,OH');
        setLed('hs', true); setLed('cd', true); setLed('sd', false); setLed('rd', false);
        this.playBell();
        this.isHandshaking = false;
        this.clearTimeouts();
        onComplete();
      }, 11800);
    }

    skipHandshake(onComplete) {
      this.stopAll();
      const setLed = (ledId, state) => {
        const el = document.getElementById('led-' + ledId);
        if (el) el.classList.toggle('on', !!state);
      };
      setLed('hs', true); setLed('cd', true); setLed('oh', true);
      setLed('mr', true); setLed('tr', true); setLed('rd', false); setLed('sd', false);
      this.playBell();
      if (typeof onComplete === 'function') onComplete();
    }
  }

  window.CyberBBS.Audio = new BBSAudio();

  class BBSRadio {
    constructor() {
      this.audio = null;
      this.analyser = null;
      this.dataArray = null;
      this.currentStation = null;
      this.isPlaying = false;
      this.volume = 0.8;
    }

    init() {
      if (this.audio) return;
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.audio.volume = this.volume;
      this.audio.addEventListener('playing', () => { this.isPlaying = true; });
      this.audio.addEventListener('pause', () => { this.isPlaying = false; });
      this.audio.addEventListener('error', () => { this.isPlaying = false; });
      try {
        const audioCtx = window.CyberBBS.Audio?.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(this.audio);
        this.analyser = audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.analyser.connect(audioCtx.destination);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      } catch (e) {
        // Fallback without web audio analyser if CORS blocks element source
      }
    }

    play(station) {
      this.init();
      this.currentStation = station;
      this.audio.src = station.url;
      this.audio.play().then(() => { this.isPlaying = true; }).catch(() => { this.isPlaying = false; });
    }

    pause() {
      if (this.audio) { this.audio.pause(); this.isPlaying = false; }
    }

    toggle() {
      if (!this.audio || !this.currentStation) return false;
      if (this.isPlaying) this.pause();
      else this.audio.play().then(() => { this.isPlaying = true; }).catch(() => {});
      return this.isPlaying;
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      if (this.audio) this.audio.volume = this.volume;
    }

    getVuLevels() {
      if (!this.isPlaying) return [0, 0, 0, 0, 0, 0, 0, 0];
      if (!this.analyser || !this.dataArray) {
        const t = Date.now() / 150;
        return [
          Math.floor(Math.sin(t) * 3 + 4),
          Math.floor(Math.cos(t * 1.3) * 3 + 4),
          Math.floor(Math.sin(t * 0.7) * 3 + 4),
          Math.floor(Math.cos(t * 1.1) * 3 + 4),
          Math.floor(Math.sin(t * 1.7) * 3 + 4),
          Math.floor(Math.cos(t * 0.9) * 3 + 4),
          Math.floor(Math.sin(t * 1.4) * 3 + 4),
          Math.floor(Math.cos(t * 2.1) * 3 + 4)
        ];
      }
      this.analyser.getByteFrequencyData(this.dataArray);
      const bins = 8;
      const step = Math.floor(this.dataArray.length / bins);
      const result = [];
      for (let i = 0; i < bins; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += this.dataArray[i * step + j] || 0;
        result.push(Math.min(7, Math.floor((sum / step) / 32)));
      }
      return result;
    }
  }

  window.CyberBBS.Radio = new BBSRadio();
})();
