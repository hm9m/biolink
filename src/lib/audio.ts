class AmbientAudioController {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private intervalId: number | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private playing = false;
  private muted = false;

  public start(source: string) {
    this.stop();
    if (!source) return;

    if (source.startsWith('synth:')) {
      this.startSynth(source.replace('synth:', ''));
      return;
    }

    try {
      const audio = new Audio(source);
      audio.loop = true;
      audio.volume = this.muted ? 0 : 0.35;
      this.htmlAudio = audio;
      this.playing = true;
      void audio.play().catch(() => {
        this.playing = false;
      });
    } catch {
      this.playing = false;
    }
  }

  private startSynth(preset: string) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.08;
      master.connect(ctx.destination);

      const freqs =
        preset === 'midnight'
          ? [110, 164.81, 220, 261.63]
          : preset === 'pulse'
          ? [98, 146.83, 196]
          : [73.42, 110, 146.83];

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset === 'pulse' ? 520 : 380;
      filter.connect(master);

      const createdOscs: OscillatorNode[] = freqs.map((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.25 / freqs.length;
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
        return osc;
      });

      if (preset === 'pulse') {
        let step = 0;
        this.intervalId = window.setInterval(() => {
          if (!this.ctx || !filter) return;
          step = (step + 1) % 4;
          filter.frequency.setTargetAtTime(step === 0 ? 780 : 340, ctx.currentTime, 0.2);
        }, 1200);
      }

      this.ctx = ctx;
      this.gainNode = master;
      this.oscillators = createdOscs;
      this.playing = true;
    } catch {
      this.playing = false;
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(muted ? 0 : 0.08, this.ctx.currentTime, 0.08);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = muted ? 0 : 0.35;
    }
  }

  public isPlaying() {
    return this.playing;
  }

  public stop() {
    this.playing = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore cleanup error
      }
    }
    this.oscillators = [];
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // ignore cleanup error
      }
      this.ctx = null;
      this.gainNode = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.src = '';
      this.htmlAudio = null;
    }
  }
}

export const ambientAudio = new AmbientAudioController();
