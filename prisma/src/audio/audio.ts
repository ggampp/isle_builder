const FILES: Record<string, string> = {
  ambience: 'atelier-ambience.mp3',
  place: 'place-mirror.mp3',
  flip: 'flip-mirror.mp3',
  remove: 'remove-mirror.mp3',
  mix: 'mix-beam.mp3',
  target: 'target-lit.mp3',
  win: 'win.mp3',
  click: 'ui-click.mp3',
  error: 'ui-error.mp3',
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private ambienceSource: AudioBufferSourceNode | null = null;
  private lastMix = 0;
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
    master.gain.value = this.muted ? 0 : 0.72;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    void this.loadAll();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.05);
    }
  }

  private async loadAll(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    const base = import.meta.env.BASE_URL;
    await Promise.all(Object.entries(FILES).map(async ([id, file]) => {
      try {
        const res = await fetch(`${base}assets/audio/${file}`);
        if (!res.ok) return;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(id, buf);
      } catch {
        // o jogo segue sem aquele SFX
      }
    }));
    this.startAmbience();
  }

  private startAmbience(): void {
    const ctx = this.ctx;
    const master = this.master;
    const buf = this.buffers.get('ambience');
    if (!ctx || !master || !buf || this.ambienceSource) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.32;
    src.connect(gain).connect(master);
    src.start();
    this.ambienceSource = src;
  }

  play(id: keyof typeof FILES, volume = 1): void {
    const ctx = this.ctx;
    const master = this.master;
    const buf = this.buffers.get(id);
    if (!ctx || !master || !buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(master);
    src.start();
  }

  playMix(): void {
    const now = performance.now();
    if (now - this.lastMix < 180) return;
    this.lastMix = now;
    this.play('mix', 0.55);
  }
}
