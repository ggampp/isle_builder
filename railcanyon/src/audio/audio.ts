/**
 * Áudio 100% sintetizado com WebAudio — nenhum arquivo de som no repositório.
 * O contexto só nasce depois de um gesto do usuário (política de autoplay).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private chuffTimer = 0;
  muted = false;

  /** Chamar no primeiro clique/tecla: cria (ou retoma) o contexto de áudio. */
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
    master.gain.value = this.muted ? 0 : 0.55;
    master.connect(ctx.destination);

    // Ruído reutilizado por bufado, explosão e vento.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 380;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();

    this.ctx = ctx;
    this.master = master;
    this.noiseBuffer = buffer;
    this.windGain = windGain;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  /** Bufado da locomotiva, com cadência proporcional à velocidade. */
  updateTrain(dt: number, speed: number, maxSpeed: number): void {
    if (!this.ctx || speed < 1.5) return;
    const rate = 0.75 - (speed / Math.max(1, maxSpeed)) * 0.45;
    this.chuffTimer -= dt;
    if (this.chuffTimer > 0) return;
    this.chuffTimer = rate;
    this.chuff(Math.min(1, speed / Math.max(1, maxSpeed)));
  }

  private chuff(intensity: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320 + intensity * 220;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09 + intensity * 0.06, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    source.connect(filter).connect(gain).connect(master);
    source.start(now, Math.random(), 0.25);
    source.stop(now + 0.22);
  }

  /** Apito de duas vozes, tocado ao chegar numa estação. */
  whistle(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.07);
    gain.gain.setValueAtTime(0.16, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    gain.connect(master);
    for (const freq of [523, 659, 784]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.97, now + 0.9);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 1);
    }
  }

  /** Toque curto — assentar trilho, construir. */
  click(pitch = 660): void {
    this.blip(pitch, 0.09, 'square', 0.07);
  }

  /** Arpejo alegre de recompensa. */
  coins(): void {
    [784, 988, 1319].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, 0.14, 'sine', 0.09), i * 70);
    });
  }

  error(): void {
    this.blip(150, 0.18, 'square', 0.06);
  }

  /** Estouro grave da dinamite. */
  boom(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.6);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    source.connect(filter).connect(gain).connect(master);
    source.start(now, Math.random(), 0.8);
    source.stop(now + 0.75);
  }

  /** Sopro do vento acompanha a altura da câmera: mais alto, mais vento. */
  setWind(intensity: number): void {
    if (!this.windGain || !this.ctx) return;
    const target = 0.03 + Math.max(0, Math.min(1, intensity)) * 0.06;
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.6);
  }

  private blip(freq: number, duration: number, type: OscillatorType, peak: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
