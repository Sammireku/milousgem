class StoryNarrationManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private onStateChange: ((speaking: boolean, currentWordIndex?: number) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      voiceName?: string;
      onBoundary?: (charIndex: number) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    if (!this.synth) {
      console.warn('Speech synthesis not available in this environment');
      return;
    }

    this.stop();

    const cleanText = text.replace(/[*#_~`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    // Pick best natural sounding English voice
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      let voice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Daniel') ||
            v.name.includes('Samantha') ||
            v.name.includes('Serena') ||
            v.name.includes('Premium'))
      );
      if (!voice) {
        voice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChange) this.onStateChange(true);
    };

    utterance.onboundary = (e) => {
      if (options.onBoundary) options.onBoundary(e.charIndex);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange(false);
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange(false);
      if (options.onError) options.onError(e);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.isSpeaking = false;
      if (this.onStateChange) this.onStateChange(false);
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isSpeaking = true;
      if (this.onStateChange) this.onStateChange(true);
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange(false);
    }
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }

  public setListener(cb: (speaking: boolean) => void) {
    this.onStateChange = cb;
  }
}

export const narrator = new StoryNarrationManager();
