export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.5;
    master.connect(ctx.destination);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx;
    this.master = master;
    this.noise = buffer;
    this.startRiver(ctx, master, buffer);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  magic(): void {
    this.blip(740, 0.16, 'triangle', 0.11);
    this.blip(980, 0.2, 'sine', 0.08);
    this.noiseBurst(1800, 0.09, 0.12);
  }

  melee(): void {
    this.noiseBurst(420, 0.08, 0.09);
    this.blip(220, 0.1, 'square', 0.06);
  }

  hit(): void {
    this.blip(180, 0.09, 'sawtooth', 0.05);
  }

  heal(): void {
    this.blip(523, 0.14, 'sine', 0.07);
    this.blip(659, 0.16, 'sine', 0.05);
  }

  levelUp(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1046];
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      const t = now + i * 0.09;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.38);
    }
  }

  death(): void {
    this.blip(196, 0.35, 'sawtooth', 0.1);
    this.blip(130, 0.4, 'triangle', 0.08);
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.7), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private noiseBurst(freq: number, vol: number, dur: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(now, Math.random(), dur + 0.05);
    src.stop(now + dur + 0.05);
  }

  private startRiver(ctx: AudioContext, master: GainNode, buffer: AudioBuffer): void {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 680;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    src.connect(filter).connect(gain).connect(master);
    src.start();
  }
}
