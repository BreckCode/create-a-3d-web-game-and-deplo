/**
 * AudioManager — procedurally generated sound effects and ambient music
 * using the Web Audio API. No external audio files needed.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: AudioNode[] = [];
  private musicPlaying = false;
  private muted = false;

  /** Lazily create the AudioContext (must happen after user gesture). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ── Sound Effects ───────────────────────────────────────────

  /** Short laser-like shoot sound. */
  public shoot(): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  /** Explosion — noise burst with low-pass filter sweep. */
  public explosion(): void {
    const ctx = this.ensureContext();
    const duration = 0.4;

    // White noise via buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
  }

  /** Power-up pickup — ascending arpeggio. */
  public pickup(): void {
    const ctx = this.ensureContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Player hit — low thud with distortion feel. */
  public hit(): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  // ── Background Music ────────────────────────────────────────

  /** Start ambient background music (layered drones). */
  public startMusic(): void {
    if (this.musicPlaying) return;
    const ctx = this.ensureContext();
    this.musicPlaying = true;

    // Layer 1: deep bass drone
    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 55; // A1
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.3;
    bass.connect(bassGain);
    bassGain.connect(this.musicGain!);
    bass.start();
    this.musicNodes.push(bass, bassGain);

    // Layer 2: slow LFO-modulated pad
    const pad = ctx.createOscillator();
    pad.type = 'triangle';
    pad.frequency.value = 110; // A2
    const padGain = ctx.createGain();
    padGain.gain.value = 0.12;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    pad.connect(padGain);
    padGain.connect(this.musicGain!);
    pad.start();
    lfo.start();
    this.musicNodes.push(pad, padGain, lfo, lfoGain);

    // Layer 3: high ethereal tone
    const high = ctx.createOscillator();
    high.type = 'sine';
    high.frequency.value = 330; // E4
    const highGain = ctx.createGain();
    highGain.gain.value = 0.05;
    const highLfo = ctx.createOscillator();
    highLfo.type = 'sine';
    highLfo.frequency.value = 0.08;
    const highLfoGain = ctx.createGain();
    highLfoGain.gain.value = 0.03;
    highLfo.connect(highLfoGain);
    highLfoGain.connect(highGain.gain);
    high.connect(highGain);
    highGain.connect(this.musicGain!);
    high.start();
    highLfo.start();
    this.musicNodes.push(high, highGain, highLfo, highLfoGain);
  }

  /** Stop background music. */
  public stopMusic(): void {
    for (const node of this.musicNodes) {
      try {
        if (node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch { /* already stopped */ }
    }
    this.musicNodes = [];
    this.musicPlaying = false;
  }

  // ── Controls ────────────────────────────────────────────────

  public toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 1;
    }
  }

  public get isMuted(): boolean {
    return this.muted;
  }

  public dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
