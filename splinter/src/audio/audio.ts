const FILES: Record<string, string> = {
  ambience: 'desert-ambience.mp3',
  shotgun: 'shotgun.mp3',
  bullet: 'pistol.mp3',
  rifle: 'rifle.mp3',
  bomb: 'explosion.mp3',
  laser: 'laser.mp3',
  break: 'wood-break.mp3',
  click: 'ui-click.mp3',
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private ambienceSource: AudioBufferSourceNode | null = null;
  private lastBreak = 0;
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
    master.gain.value = this.muted ? 0 : 0.7;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    void this.loadAll();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
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
        // fallback silencioso — o jogo continua jogável
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
    gain.gain.value = 0.28;
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

  playBreak(): void {
    const now = performance.now();
    if (now - this.lastBreak < 80) return;
    this.lastBreak = now;
    this.play('break', 0.7);
  }

  stopAmbience(): void {
    this.ambienceSource?.stop();
    this.ambienceSource = null;
  }
}
