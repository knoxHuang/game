type Sound = 'attack' | 'hit' | 'hurt' | 'dodge' | 'loot' | 'task' | 'upgrade' | 'ui';
type Mode = 'shop' | 'dungeon' | 'silent';

/** Quiet, gesture-unlocked procedural audio. No network assets or playback dependencies. */
export class AudioManager {
  private nextLootSound = 0;
  settings = { music: true, sound: true };
  private context?: AudioContext;
  private output?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private mode: Mode = 'silent';
  private beat = 0;
  private disposed = false;

  async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      this.context ??= new AudioContext();
      if (!this.output) {
        this.output = this.context.createGain();
        this.output.gain.value = 0.16;
        this.output.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      this.startLoop();
    } catch { /* Audio is optional on browsers without a usable output. */ }
  }

  setMode(mode: Mode): void {
    if (this.mode !== mode) this.beat = 0;
    this.mode = mode;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.startLoop();
  }

  private startLoop(): void {
    if (this.timer || !this.context || this.disposed || this.mode === 'silent') return;
    const melody = this.mode === 'shop'
      ? [220, 277.18, 329.63, 277.18, 246.94, 329.63, 369.99, 329.63, 220, 277.18, 329.63, 440, 369.99, 329.63, 277.18, 246.94]
      : [146.83, 0, 220, 164.81, 146.83, 0, 174.61, 164.81, 130.81, 0, 196, 146.83, 130.81, 0, 164.81, 146.83];
    this.timer = setInterval(() => {
      if (!this.settings.music || this.context?.state !== 'running') return;
      const index = this.beat++ % melody.length;
      const note = melody[index];
      if (note) this.tone(note, 0.38, 'triangle', 0.075);
      if (index % 4 === 0) this.tone(this.mode === 'shop' ? 110 : 73.42, 1.1, 'sine', 0.08);
    }, this.mode === 'shop' ? 430 : 360);
  }

  play(kind: Sound): void {
    if (!this.settings.sound || this.context?.state !== 'running' || this.disposed) return;
    if(kind==='loot'){
      if(this.context.currentTime<this.nextLootSound)return;
      this.nextLootSound=this.context.currentTime+.08;
    }
    const notes: Record<Sound, [number, number, OscillatorType, number]> = {
      attack: [280, 0.09, 'triangle', 75], hit: [130, 0.11, 'square', 55],
      hurt: [170, 0.20, 'sawtooth', 65], dodge: [480, 0.10, 'sine', 150],
      loot: [660, 0.10, 'sine', 880], task: [440, 0.24, 'triangle', 660],
      upgrade: [330, 0.38, 'triangle', 880], ui: [430, 0.045, 'sine', 470],
    };
    const [frequency, duration, shape, end] = notes[kind];
    this.tone(frequency, duration, shape, kind === 'hit' || kind === 'hurt' ? 0.10 : 0.18, end);
    if (kind === 'task' || kind === 'upgrade') {
      this.tone(660, 0.22, 'sine', 0.12, 660, 0.12);
      this.tone(880, 0.30, 'sine', 0.10, 880, 0.24);
    }
  }

  private tone(frequency: number, duration: number, shape: OscillatorType, volume: number, end = frequency, delay = 0): void {
    const context = this.context;
    if (!context || !this.output || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    void this.context?.close().catch(() => {});
  }
}
