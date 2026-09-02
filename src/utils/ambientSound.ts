// Procedural Web Audio API soundscape generator - 100% self-contained with no external audio files required.

export type SoundscapeType = 'hearth' | 'rain' | 'chimes' | 'night' | 'forest' | 'stream' | 'none';

export interface SoundscapeOption {
  id: SoundscapeType;
  label: string;
  icon: string;
  description: string;
  moodColor: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeOption[] = [
  {
    id: 'none',
    label: 'Silent Reading',
    icon: '🔇',
    description: 'Quiet ambient reading without background sound',
    moodColor: '#78716A',
  },
  {
    id: 'hearth',
    label: 'Cozy Hearth',
    icon: '🔥',
    description: 'Warm fireplace glow with gentle ember crackles',
    moodColor: '#B45F3C',
  },
  {
    id: 'rain',
    label: 'Woodland Rain',
    icon: '🌧️',
    description: 'Soft pattering raindrops over forest leaves',
    moodColor: '#4A6B82',
  },
  {
    id: 'chimes',
    label: 'Starlight Chimes',
    icon: '✨',
    description: 'Magical gentle bell tones and celestial warmth',
    moodColor: '#8C6D38',
  },
  {
    id: 'night',
    label: 'Peaceful Night',
    icon: '🌙',
    description: 'Calm evening breeze with soft nocturnal crickets',
    moodColor: '#4E4668',
  },
  {
    id: 'forest',
    label: 'Whispering Woods',
    icon: '🍃',
    description: 'Gentle rustling leaves and distant songbird melodies',
    moodColor: '#5B6B56',
  },
  {
    id: 'stream',
    label: 'Mountain Brook',
    icon: '💧',
    description: 'Crisp water bubbling peacefully over river stones',
    moodColor: '#3A7D7E',
  },
];

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: SoundscapeType = 'none';
  private currentVolume: number = 0.35;
  private isRunning: boolean = false;
  private activeIntervals: number[] = [];
  private activeNodes: (AudioNode | { stop?: () => void; disconnect?: () => void })[] = [];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getCurrentType(): SoundscapeType {
    return this.currentType;
  }

  public isPlaying(): boolean {
    return this.isRunning && this.currentType !== 'none';
  }

  public stop() {
    this.activeIntervals.forEach((id) => clearInterval(id));
    this.activeIntervals = [];

    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
        if ('disconnect' in node && typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch {
        // Ignore disconnection errors
      }
    });
    this.activeNodes = [];
    this.isRunning = false;
    this.currentType = 'none';
  }

  public play(type: SoundscapeType, volume?: number) {
    if (volume !== undefined) {
      this.setVolume(volume);
    }

    if (type === 'none') {
      this.stop();
      return;
    }

    this.stop();
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.currentType = type;
    this.isRunning = true;

    try {
      switch (type) {
        case 'hearth':
          this.buildHearthSound();
          break;
        case 'rain':
          this.buildRainSound();
          break;
        case 'chimes':
          this.buildChimesSound();
          break;
        case 'night':
          this.buildNightSound();
          break;
        case 'forest':
          this.buildForestSound();
          break;
        case 'stream':
          this.buildStreamSound();
          break;
      }
    } catch (e) {
      console.warn('Error starting ambient sound:', e);
    }
  }

  // Pink noise generator buffer
  private createNoiseBuffer(duration = 3): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext missing');
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // --- Soundscape Implementations ---

  private buildHearthSound() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer(3);

    // Warm base roar
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource, filter, gain);

    // Random crackle generator
    const crackleInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isRunning) return;
      if (Math.random() > 0.4) {
        const osc = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        const freq = 1200 + Math.random() * 2500;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const duration = 0.01 + Math.random() * 0.03;
        crackleGain.gain.setValueAtTime(0.12 * Math.random(), this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(crackleGain);
        crackleGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      }
    }, 120);

    this.activeIntervals.push(crackleInterval);
  }

  private buildRainSound() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer(4);

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1100, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    noiseSource.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource, bandpass, gain);

    // Subtle droplet pops
    const dropInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isRunning) return;
      if (Math.random() > 0.3) {
        const osc = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        const freq = 800 + Math.random() * 1400;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.05);

        dropGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

        osc.connect(dropGain);
        dropGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }
    }, 180);

    this.activeIntervals.push(dropInterval);
  }

  private buildChimesSound() {
    if (!this.ctx || !this.masterGain) return;

    // Gentle warm pad
    const padOsc = this.ctx.createOscillator();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    padOsc.connect(padGain);
    padGain.connect(this.masterGain);
    padOsc.start();
    this.activeNodes.push(padOsc, padGain);

    // Pentatonic chime notes (C5, D5, E5, G5, A5, C6)
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

    const chimeInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isRunning) return;
      if (Math.random() > 0.35) {
        const note = notes[Math.floor(Math.random() * notes.length)];
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, this.ctx.currentTime);

        const chimeGain = this.ctx.createGain();
        const duration = 1.8 + Math.random() * 1.5;
        chimeGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(chimeGain);
        chimeGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      }
    }, 900);

    this.activeIntervals.push(chimeInterval);
  }

  private buildNightSound() {
    if (!this.ctx || !this.masterGain) return;

    // Night wind
    const noiseBuffer = this.createNoiseBuffer(3);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource, filter, gain);

    // Gentle crickets
    const cricketInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isRunning) return;
      if (Math.random() > 0.4) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4500 + Math.random() * 400, this.ctx.currentTime);

        const cricketGain = this.ctx.createGain();
        cricketGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        cricketGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

        osc.connect(cricketGain);
        cricketGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      }
    }, 280);

    this.activeIntervals.push(cricketInterval);
  }

  private buildForestSound() {
    if (!this.ctx || !this.masterGain) return;

    // Rustling trees
    const noiseBuffer = this.createNoiseBuffer(3);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource, filter, gain);

    // Soft bird chirps
    const birdInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isRunning) return;
      if (Math.random() > 0.6) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        const startFreq = 2200 + Math.random() * 800;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.3, this.ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, this.ctx.currentTime + 0.2);

        const birdGain = this.ctx.createGain();
        birdGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        birdGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

        osc.connect(birdGain);
        birdGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
      }
    }, 1400);

    this.activeIntervals.push(birdInterval);
  }

  private buildStreamSound() {
    if (!this.ctx || !this.masterGain) return;

    const noiseBuffer = this.createNoiseBuffer(3);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource, filter, gain);
  }
}

export const ambientSound = new AmbientSoundEngine();
