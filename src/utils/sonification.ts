// Web Audio API Physics Sonification Engine
// Implements the 8-Dimensional Multi-Sensory Physics Sonification Framework:
// 1. Velocity        -> Pitch (50 - 2000 Hz)
// 2. Position X      -> Stereo Pan (L / R)
// 3. Position Y      -> Volume / Intensity (Soft / Loud)
// 4. Energy          -> Harmonic Richness (Timbre Variation: Harmonics 1-4)
// 5. Acceleration    -> Modulation (Dynamic Vibrato Depth & Rate)
// 6. Temperature     -> Pitch Drift (Thermal Brownian Detuning)
// 7. Field Strength  -> Amplitude & Sub-harmonic Field Hum
// 8. Phase           -> Stereo Phase (Binaural Spatial Delay)

export interface PhysicsAudioParams {
  velocity?: number; // m/s or px/s -> Pitch (50 - 2000 Hz)
  frequency?: number; // Explicit frequency override in Hz (50 - 2000 Hz)
  positionX?: number; // Normalized -1 to +1 (or normalized 0 to 1) -> Stereo Pan
  positionY?: number; // Normalized 0 to 1 -> Volume / Intensity
  energy?: number; // Normalized 0 to 1 -> Harmonic Richness (overtones)
  acceleration?: number; // m/s^2 or magnitude -> Dynamic Vibrato Modulation
  temperature?: number; // Kelvin -> Pitch Drift / Thermal Shimmer
  fieldStrength?: number; // Normalized 0 to 1 -> Field Hum & Amplitude
  phase?: number; // 0 to 2*PI radians -> Stereo Phase spatial delay
  quantizePentatonic?: boolean;
}

export type AudioDimensionKey =
  | "velocity"
  | "positionX"
  | "positionY"
  | "energy"
  | "acceleration"
  | "temperature"
  | "fieldStrength"
  | "phase";

export interface AudioDimensionInfo {
  key: AudioDimensionKey;
  observable: string;
  dimension: string;
  innovation: string;
  description: string;
  formula: string;
}

export const AUDIO_DIMENSIONS: AudioDimensionInfo[] = [
  {
    key: "velocity",
    observable: "Velocity (v)",
    dimension: "Pitch (50 - 2000 Hz)",
    innovation: "Standard",
    description: "Instantaneous speed maps smoothly to acoustic carrier pitch; high speed yields soprano tones, slow motion yields deep bass.",
    formula: "f = 50 + 1950 \\cdot (v / v_{\\max})^{0.85} \\text{ Hz}",
  },
  {
    key: "positionX",
    observable: "Position X (x)",
    dimension: "Stereo Pan (L / R)",
    innovation: "Spatial Audio",
    description: "Horizontal location pans dynamically between left and right audio channels for immersive spatial localization.",
    formula: "\\text{Pan} = \\text{clamp}(-1.0, 1.0, 2(x - x_0)/W - 1)",
  },
  {
    key: "positionY",
    observable: "Position Y (y)",
    dimension: "Volume (Soft / Loud)",
    innovation: "Intensity Envelope",
    description: "Vertical altitude or potential height modulates sound intensity envelope, creating intuitive auditory elevation.",
    formula: "A_y = A_{\\text{base}} \\cdot (0.2 + 0.8 \\cdot y / y_{\\max})",
  },
  {
    key: "energy",
    observable: "Energy (E)",
    dimension: "Harmonic Richness",
    innovation: "Timbre Variation",
    description: "Total energy modulates overtone structure from pure fundamental sine wave to a rich multi-harmonic spectrum (2nd, 3rd, 4th harmonics).",
    formula: "I_h(E) = \\sum_{n=1}^4 \\frac{E^{n-1}}{n} \\sin(n \\omega t)",
  },
  {
    key: "acceleration",
    observable: "Acceleration (a)",
    dimension: "Modulation Depth",
    innovation: "Dynamic Vibrato",
    description: "Rapid acceleration or force produces dynamic frequency modulation (vibrato flutter) whose depth and rate scale with |a|.",
    formula: "\\Delta f(t) = k_a |a| \\sin(\\omega_{\\text{vibrato}} t)",
  },
  {
    key: "temperature",
    observable: "Temperature (T)",
    dimension: "Pitch Drift",
    innovation: "Thermal Brownian Effects",
    description: "Thermal agitation introduces pink/Brownian pitch jitter and thermal micro-shimmer; at 0 K, pitch is crystal stable.",
    formula: "\\delta f_T \\propto \\sqrt{k_B T / m} \\cdot \\xi(t)",
  },
  {
    key: "fieldStrength",
    observable: "Field Strength (|B|, |E|, g)",
    dimension: "Amplitude & Field Hum",
    innovation: "Field Intensity",
    description: "Electromagnetic or gravitational field magnitude adds a low resonant sub-harmonic drone (60-80 Hz) and modulates carrier presence.",
    formula: "A_{\\text{field}} = k_B |\\vec{B}| \\sin(2\\pi \\cdot 60 t)",
  },
  {
    key: "phase",
    observable: "Phase (φ, Δφ)",
    dimension: "Stereo Phase",
    innovation: "Spatial Binaural Delay",
    description: "Wave interference or quantum state phase rotates interaural time difference (0 to 1.5 ms), swirling sound through 3D stereo space.",
    formula: "\\Delta t_{\\text{interaural}} = \\frac{\\Delta \\phi}{2\\pi} \\cdot 1.5 \\text{ ms}",
  },
];

class SonificationEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private delayL: DelayNode | null = null;
  private delayR: DelayNode | null = null;

  // Multi-Harmonic Synth Oscillators (Fundamental + 2nd, 3rd, 4th harmonics)
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private osc4: OscillatorNode | null = null;
  private gain1: GainNode | null = null;
  private gain2: GainNode | null = null;
  private gain3: GainNode | null = null;
  private gain4: GainNode | null = null;

  // Acceleration LFO Vibrato
  private vibratoOsc: OscillatorNode | null = null;
  private vibratoGain: GainNode | null = null;

  // Field Strength Sub-Hum Oscillator
  private fieldOsc: OscillatorNode | null = null;
  private fieldGain: GainNode | null = null;

  // Master Continuous Output Gain
  private continuousMasterGain: GainNode | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.5;
  private isInitialized: boolean = false;
  private lastBaseFreq: number = 220;

  // Pentatonic scale frequencies for school level quantizing
  private pentatonicNotes: number[] = [
    65.41, 73.42, 82.41, 98.0, 110.0, 130.81, 146.83, 164.81, 196.0, 220.0,
    261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
    880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 1975.53,
  ];

  constructor() {
    // Automatically bind user gesture handlers so audio is unblocked seamlessly
    if (typeof window !== "undefined") {
      const unlock = () => {
        this.ensureInitialized();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("click", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { once: true });
      window.addEventListener("click", unlock, { once: true });
    }
  }

  public init() {
    this.ensureInitialized();
  }

  public ensureInitialized() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Stereo Phase Binaural Network
      this.delayL = this.ctx.createDelay();
      this.delayR = this.ctx.createDelay();
      this.delayL.delayTime.value = 0;
      this.delayR.delayTime.value = 0;

      // Stereo Panner
      if (this.ctx.createStereoPanner) {
        this.panner = this.ctx.createStereoPanner();
        this.panner.pan.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.connect(this.panner);
        this.panner.connect(this.ctx.destination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }

      // Continuous Master Gain Node
      this.continuousMasterGain = this.ctx.createGain();
      this.continuousMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.continuousMasterGain.connect(this.masterGain);

      // Acceleration LFO (Vibrato)
      this.vibratoOsc = this.ctx.createOscillator();
      this.vibratoOsc.type = "sine";
      this.vibratoOsc.frequency.setValueAtTime(5.0, this.ctx.currentTime); // 5 Hz baseline rate

      this.vibratoGain = this.ctx.createGain();
      this.vibratoGain.gain.setValueAtTime(0, this.ctx.currentTime); // 0 Hz depth initially
      this.vibratoOsc.connect(this.vibratoGain);
      this.vibratoOsc.start();

      // Multi-Harmonic Synth (Fundamental + 2nd, 3rd, 4th harmonics for Energy Timbre)
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.osc3 = this.ctx.createOscillator();
      this.osc4 = this.ctx.createOscillator();

      this.osc1.type = "sine";
      this.osc2.type = "sine";
      this.osc3.type = "sine";
      this.osc4.type = "sine";

      this.gain1 = this.ctx.createGain();
      this.gain2 = this.ctx.createGain();
      this.gain3 = this.ctx.createGain();
      this.gain4 = this.ctx.createGain();

      this.gain1.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.gain2.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.gain3.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.gain4.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Connect vibrato LFO to oscillators frequency
      this.vibratoGain.connect(this.osc1.frequency);
      this.vibratoGain.connect(this.osc2.frequency);
      this.vibratoGain.connect(this.osc3.frequency);
      this.vibratoGain.connect(this.osc4.frequency);

      // Connect harmonic oscillators to individual gains
      this.osc1.connect(this.gain1);
      this.osc2.connect(this.gain2);
      this.osc3.connect(this.gain3);
      this.osc4.connect(this.gain4);

      this.gain1.connect(this.continuousMasterGain);
      this.gain2.connect(this.continuousMasterGain);
      this.gain3.connect(this.continuousMasterGain);
      this.gain4.connect(this.continuousMasterGain);

      this.osc1.start();
      this.osc2.start();
      this.osc3.start();
      this.osc4.start();

      // Field Strength Sub-Hum Oscillator (60 Hz resonant field drone)
      this.fieldOsc = this.ctx.createOscillator();
      this.fieldOsc.type = "triangle";
      this.fieldOsc.frequency.setValueAtTime(65.0, this.ctx.currentTime);
      this.fieldGain = this.ctx.createGain();
      this.fieldGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.fieldOsc.connect(this.fieldGain);
      this.fieldGain.connect(this.masterGain);
      this.fieldOsc.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn("AudioContext init deferred:", e);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
    if (muted) {
      this.stopContinuousTone();
    }
  }

  public setEnabled(enabled: boolean) {
    this.setMuted(!enabled);
    if (enabled) {
      this.ensureInitialized();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public setMasterVolume(vol: number) {
    this.setVolume(vol);
  }

  public getVolume(): number {
    return this.volume;
  }

  public resume() {
    this.ensureInitialized();
  }

  // ---------------------------------------------------------------------------
  // Unified 8-Dimensional Multi-Sensory Physics State Update
  // ---------------------------------------------------------------------------
  public updatePhysicsState(params: PhysicsAudioParams) {
    this.ensureInitialized();
    if (!this.ctx || !this.continuousMasterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Velocity -> Pitch (50 - 2000 Hz)
    let baseFreq = this.lastBaseFreq;
    if (params.frequency !== undefined) {
      baseFreq = Math.max(50, Math.min(2000, params.frequency));
    } else if (params.velocity !== undefined) {
      // Non-linear mapping from speed to standard 50-2000 Hz pitch
      const normV = Math.max(0, Math.min(100, Math.abs(params.velocity)));
      baseFreq = 50 + Math.pow(normV / 100, 0.82) * 1950;
    }

    if (params.quantizePentatonic) {
      baseFreq = this.quantizeToPentatonic(baseFreq);
    }

    // 6. Temperature -> Pitch Drift (Thermal Brownian effects)
    if (params.temperature !== undefined && params.temperature > 0) {
      // At T=0K: no drift. At T=300K..600K: noticeable thermal pitch jitter
      const driftScale = Math.min(0.06, (Math.sqrt(params.temperature) / 25) * 0.04);
      const thermalJitter = (Math.random() - 0.5) * 2 * driftScale;
      baseFreq *= 1 + thermalJitter;
    }

    this.lastBaseFreq = baseFreq;

    // Update fundamental and harmonic oscillator frequencies
    if (this.osc1 && this.osc2 && this.osc3 && this.osc4) {
      this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.03);
      this.osc2.frequency.setTargetAtTime(Math.min(3800, baseFreq * 2), now, 0.03);
      this.osc3.frequency.setTargetAtTime(Math.min(3800, baseFreq * 3), now, 0.03);
      this.osc4.frequency.setTargetAtTime(Math.min(3800, baseFreq * 4), now, 0.03);
    }

    // 4. Energy -> Harmonic Richness (Timbre variation)
    const energy = Math.max(0, Math.min(1, params.energy ?? 0.3));
    if (this.gain1 && this.gain2 && this.gain3 && this.gain4) {
      // Low energy = mostly fundamental sine; High energy = rich overtones
      const g1 = Math.max(0.3, 0.9 - energy * 0.3);
      const g2 = energy * 0.55;
      const g3 = Math.pow(energy, 1.4) * 0.35;
      const g4 = Math.pow(energy, 2.0) * 0.22;

      this.gain1.gain.setTargetAtTime(g1, now, 0.03);
      this.gain2.gain.setTargetAtTime(g2, now, 0.03);
      this.gain3.gain.setTargetAtTime(g3, now, 0.03);
      this.gain4.gain.setTargetAtTime(g4, now, 0.03);
    }

    // 5. Acceleration -> Modulation (Dynamic vibrato depth & rate)
    if (this.vibratoOsc && this.vibratoGain) {
      const acc = Math.max(0, Math.min(50, Math.abs(params.acceleration ?? 0)));
      // Rate: 4 Hz up to 11 Hz
      const rate = 4.0 + (acc / 50) * 7.0;
      // Depth: 0 Hz (zero acceleration = solid tone) up to 32 Hz (dynamic flutter)
      const depth = (acc / 50) * 32.0;

      this.vibratoOsc.frequency.setTargetAtTime(rate, now, 0.03);
      this.vibratoGain.gain.setTargetAtTime(depth, now, 0.03);
    }

    // 2. Position X -> Stereo Pan (L/R)
    if (this.panner && params.positionX !== undefined) {
      const safePan = Math.max(-1, Math.min(1, params.positionX));
      this.panner.pan.setTargetAtTime(safePan, now, 0.03);
    }

    // 3. Position Y -> Volume / Intensity (Soft/Loud)
    let intensityGain = 0.32;
    if (params.positionY !== undefined) {
      const normY = Math.max(0, Math.min(1, params.positionY));
      intensityGain = 0.12 + normY * 0.36; // Range: soft (0.12) to assertive (0.48)
    }

    this.continuousMasterGain.gain.setTargetAtTime(intensityGain, now, 0.03);

    // 7. Field Strength -> Amplitude & Sub-harmonic Field Hum
    if (this.fieldGain && this.fieldOsc) {
      const fStrength = Math.max(0, Math.min(1, params.fieldStrength ?? 0));
      const humGain = fStrength * 0.18; // Max 0.18 sub-bass field presence
      this.fieldGain.gain.setTargetAtTime(humGain, now, 0.03);
    }

    // 8. Phase -> Stereo Phase (Spatial delay)
    if (params.phase !== undefined && this.delayR) {
      // Phase 0..2*PI maps to 0..1.2 ms binaural spatial delay
      const normPhase = ((params.phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const delaySec = (normPhase / (2 * Math.PI)) * 0.0012;
      this.delayR.delayTime.setTargetAtTime(delaySec, now, 0.03);
    }
  }

  // Backward-compatible continuous tone setter
  public setContinuousTone(
    frequency: number,
    amplitude: number,
    pan: number = 0,
    quantizePentatonic: boolean = false
  ) {
    this.updatePhysicsState({
      frequency,
      positionY: amplitude,
      positionX: pan,
      quantizePentatonic,
    });
  }

  public stopContinuousTone() {
    if (this.continuousMasterGain && this.ctx) {
      this.continuousMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
    if (this.fieldGain && this.ctx) {
      this.fieldGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
  }

  // ---------------------------------------------------------------------------
  // Interactive Dimension Preview
  // ---------------------------------------------------------------------------
  public previewDimension(dimension: AudioDimensionKey) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    this.stopContinuousTone();

    const now = this.ctx.currentTime;

    switch (dimension) {
      case "velocity": {
        // Sweep pitch 50 Hz to 1800 Hz over 1.4s
        this.updatePhysicsState({ frequency: 65, positionY: 0.7, positionX: 0 });
        setTimeout(() => this.updatePhysicsState({ frequency: 220, positionY: 0.7 }), 250);
        setTimeout(() => this.updatePhysicsState({ frequency: 440, positionY: 0.7 }), 500);
        setTimeout(() => this.updatePhysicsState({ frequency: 880, positionY: 0.7 }), 750);
        setTimeout(() => this.updatePhysicsState({ frequency: 1650, positionY: 0.7 }), 1050);
        setTimeout(() => this.stopContinuousTone(), 1450);
        break;
      }
      case "positionX": {
        // Pan hard left (-1) to hard right (+1)
        this.updatePhysicsState({ frequency: 330, positionY: 0.6, positionX: -1.0 });
        setTimeout(() => this.updatePhysicsState({ positionX: -0.5 }), 300);
        setTimeout(() => this.updatePhysicsState({ positionX: 0.0 }), 600);
        setTimeout(() => this.updatePhysicsState({ positionX: 0.5 }), 900);
        setTimeout(() => this.updatePhysicsState({ positionX: 1.0 }), 1200);
        setTimeout(() => this.stopContinuousTone(), 1600);
        break;
      }
      case "positionY": {
        // Volume crescendo from whisper (0.05) to loud (1.0)
        this.updatePhysicsState({ frequency: 260, positionY: 0.05, positionX: 0 });
        setTimeout(() => this.updatePhysicsState({ positionY: 0.25 }), 350);
        setTimeout(() => this.updatePhysicsState({ positionY: 0.65 }), 700);
        setTimeout(() => this.updatePhysicsState({ positionY: 1.0 }), 1050);
        setTimeout(() => this.stopContinuousTone(), 1500);
        break;
      }
      case "energy": {
        // Timbre sweep from pure fundamental (E=0) to rich harmonics (E=1)
        this.updatePhysicsState({ frequency: 196, positionY: 0.6, energy: 0.0 });
        setTimeout(() => this.updatePhysicsState({ energy: 0.3 }), 350);
        setTimeout(() => this.updatePhysicsState({ energy: 0.65 }), 750);
        setTimeout(() => this.updatePhysicsState({ energy: 1.0 }), 1100);
        setTimeout(() => this.stopContinuousTone(), 1600);
        break;
      }
      case "acceleration": {
        // Zero acceleration (straight tone) ramping to heavy dynamic vibrato
        this.updatePhysicsState({ frequency: 392, positionY: 0.6, acceleration: 0 });
        setTimeout(() => this.updatePhysicsState({ acceleration: 12 }), 350);
        setTimeout(() => this.updatePhysicsState({ acceleration: 30 }), 750);
        setTimeout(() => this.updatePhysicsState({ acceleration: 50 }), 1100);
        setTimeout(() => this.stopContinuousTone(), 1600);
        break;
      }
      case "temperature": {
        // Crystal stability at 0K -> intense thermal pitch jitter at 600K
        this.updatePhysicsState({ frequency: 440, positionY: 0.6, temperature: 0 });
        let intervalCount = 0;
        const thermalTimer = setInterval(() => {
          intervalCount++;
          const simTemp = intervalCount * 60;
          this.updatePhysicsState({ temperature: simTemp });
          if (intervalCount >= 12) {
            clearInterval(thermalTimer);
            this.stopContinuousTone();
          }
        }, 110);
        break;
      }
      case "fieldStrength": {
        // Swell of resonant 65Hz electromagnetic / gravity field sub-hum
        this.updatePhysicsState({ frequency: 220, positionY: 0.4, fieldStrength: 0.1 });
        setTimeout(() => this.updatePhysicsState({ fieldStrength: 0.4 }), 350);
        setTimeout(() => this.updatePhysicsState({ fieldStrength: 0.8 }), 750);
        setTimeout(() => this.updatePhysicsState({ fieldStrength: 1.0 }), 1150);
        setTimeout(() => this.stopContinuousTone(), 1600);
        break;
      }
      case "phase": {
        // Binaural stereo phase rotation around head
        this.updatePhysicsState({ frequency: 293.66, positionY: 0.6, phase: 0 });
        setTimeout(() => this.updatePhysicsState({ phase: Math.PI / 2 }), 300);
        setTimeout(() => this.updatePhysicsState({ phase: Math.PI }), 650);
        setTimeout(() => this.updatePhysicsState({ phase: (3 * Math.PI) / 2 }), 1000);
        setTimeout(() => this.updatePhysicsState({ phase: 2 * Math.PI }), 1350);
        setTimeout(() => this.stopContinuousTone(), 1700);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Discrete Acoustic Events & Lab Soundscapes
  // ---------------------------------------------------------------------------

  // Impact sound (ball bounce, elastic wall collision)
  public playImpact(intensity: number = 0.5, pan: number = 0) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      const startFreq = 120 + intensity * 320;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

      const amp = Math.min(0.55, intensity * 0.42);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      if (this.ctx.createStereoPanner) {
        const localPanner = this.ctx.createStereoPanner();
        localPanner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
        osc.connect(gain);
        gain.connect(localPanner);
        localPanner.connect(this.masterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.masterGain);
      }

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // ignore
    }
  }

  // Quantum barrier tunneling event
  public playTunnelingChirp() {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.28);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // ignore
    }
  }

  // Quantum wavefunction collapse upon measurement (Born rule: <psi|X|psi> or energy eigenstate)
  public playWavefunctionCollapse(eigenstateIndex: number = 1, panX: number = 0) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Dispersion shimmer cluster (superposition states before collapse)
      const freqs = [180, 290, 470, 720, 1100];
      freqs.forEach((f) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * (1 + (Math.random() - 0.5) * 0.3), now + 0.12);
        g.gain.setValueAtTime(0.07, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.15);
      });

      // 2. Pure resonant eigenstate chime at collapse instant
      const n = Math.max(1, Math.min(4, eigenstateIndex));
      const eigenFreq = 140 * (n * n); // E_n ~ n^2
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();

      bellOsc.type = "sine";
      bellOsc.frequency.setValueAtTime(eigenFreq, now + 0.12);

      const amp = 0.35;
      bellGain.gain.setValueAtTime(0.001, now);
      bellGain.gain.setValueAtTime(amp, now + 0.12);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), now + 0.12);
        bellOsc.connect(bellGain);
        bellGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        bellOsc.connect(bellGain);
        bellGain.connect(this.masterGain);
      }

      bellOsc.start(now + 0.12);
      bellOsc.stop(now + 0.8);
    } catch {
      // ignore
    }
  }

  // Quantum energy level transition (photon emission/absorption: delta E = h nu)
  public playQuantumTransition(nInitial: number, nFinal: number) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const isEmission = nInitial > nFinal;
      const deltaN2 = Math.abs(nInitial * nInitial - nFinal * nFinal);
      const startF = 180 + (nInitial * nInitial) * 45;
      const endF = 180 + (nFinal * nFinal) * 45;
      const photonFreq = Math.min(2200, 220 + deltaN2 * 110);

      // Transition sweep oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isEmission ? "sine" : "triangle";
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + 0.38);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      // Radiant photon burst chime
      const photonOsc = this.ctx.createOscillator();
      const photonGain = this.ctx.createGain();
      photonOsc.type = "sine";
      photonOsc.frequency.setValueAtTime(photonFreq, now + 0.2);
      photonGain.gain.setValueAtTime(0.001, now);
      photonGain.gain.setValueAtTime(0.28, now + 0.2);
      photonGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);
      photonOsc.connect(photonGain);
      photonGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.48);
      photonOsc.start(now + 0.2);
      photonOsc.stop(now + 0.75);
    } catch {
      // ignore
    }
  }

  // Quantum detector position probe: volume scales with local probability density |Psi(x)|^2
  public playQuantumProbe(probDensity: number, panX: number = 0) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const clampedProb = Math.min(1.0, Math.max(0, probDensity));
    // If probe is at a node (|Psi|^2 = 0), tone completely fades into acoustic silence!
    if (clampedProb < 0.01) {
      this.stopContinuousTone();
      return;
    }

    const freq = 220 + clampedProb * 520;
    this.updatePhysicsState({
      frequency: freq,
      positionY: clampedProb * 0.85,
      positionX: panX,
      energy: clampedProb,
      phase: clampedProb * Math.PI,
    });
  }

  // Wavepacket tunneling through finite potential barrier
  public playWavepacketTunneling(
    transmissionT: number | "transmitted" | "reflected" = 0.5,
    onFinish?: (tunnelSuccess: boolean) => void
  ) {
    this.ensureInitialized();
    const willTunnel =
      typeof transmissionT === "string"
        ? transmissionT === "transmitted"
        : Math.random() < Math.max(0.05, Math.min(0.95, transmissionT));

    if (!this.ctx || !this.masterGain || this.isMuted) {
      if (onFinish) onFinish(willTunnel);
      return;
    }

    try {
      const now = this.ctx.currentTime;

      // Phase 1: Incident wavepacket approaching from left
      const approachOsc = this.ctx.createOscillator();
      const approachGain = this.ctx.createGain();
      approachOsc.type = "sine";
      approachOsc.frequency.setValueAtTime(320, now);
      approachOsc.frequency.linearRampToValueAtTime(420, now + 0.3);

      approachGain.gain.setValueAtTime(0.02, now);
      approachGain.gain.linearRampToValueAtTime(0.25, now + 0.25);
      approachGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      let pannerNode: StereoPannerNode | null = null;
      if (this.ctx.createStereoPanner) {
        pannerNode = this.ctx.createStereoPanner();
        pannerNode.pan.setValueAtTime(-0.8, now);
        pannerNode.pan.linearRampToValueAtTime(-0.1, now + 0.3);
        approachOsc.connect(approachGain);
        approachGain.connect(pannerNode);
        pannerNode.connect(this.masterGain);
      } else {
        approachOsc.connect(approachGain);
        approachGain.connect(this.masterGain);
      }

      approachOsc.start(now);
      approachOsc.stop(now + 0.34);

      // Phase 2: At barrier interface (300ms onwards)
      setTimeout(() => {
        if (willTunnel) {
          // Tunneling breakout: bright rising chirp on the right speaker
          this.playTunnelingChirp();
          if (pannerNode && this.ctx) {
            pannerNode.pan.setValueAtTime(0.8, this.ctx.currentTime);
          }
        } else {
          // Quantum reflection: echoing bounce reflecting back to the left
          this.playImpact(0.45, -0.7);
        }
        if (onFinish) onFinish(willTunnel);
      }, 300);
    } catch {
      if (onFinish) onFinish(willTunnel);
    }
  }

  // Resonance chime: played when driving frequency matches natural harmonic frequency
  public playResonanceHarmonic(fundamentalFreq: number = 440) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const harmonics = [1, 2, 3, 4];
      harmonics.forEach((h, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(fundamentalFreq * h, now);

        const amp = 0.28 / (idx + 1);
        gain.gain.setValueAtTime(amp, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } catch {
      // ignore
    }
  }

  // Double-slit optical fringe scanning
  public playFringeTone(intensity: number, yPan: number = 0) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Intensity maps to pitch (220 Hz to 980 Hz) and volume
    const freq = 220 + intensity * 760;
    const phaseRad = intensity * Math.PI;
    this.updatePhysicsState({
      frequency: freq,
      positionY: Math.max(0.1, intensity * 0.8),
      positionX: yPan,
      energy: intensity,
      phase: phaseRad,
    });
  }

  // Cyclotron audio note
  public playCyclotronTone(cyclotronOmega: number) {
    this.ensureInitialized();
    const audibleFreq = Math.min(1800, Math.max(80, cyclotronOmega * 24));
    this.updatePhysicsState({
      frequency: audibleFreq,
      positionY: 0.5,
      fieldStrength: 0.6,
      acceleration: 15,
    });
  }

  // Geiger Counter click burst for radioactive decay & nuclear radiation
  public playGeigerClick(pan: number = 0) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.012);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2600 + (Math.random() - 0.5) * 600;
      filter.Q.value = 5.0;

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.42, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      whiteNoise.connect(filter);
      filter.connect(clickGain);

      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
        clickGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        clickGain.connect(this.masterGain);
      }

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.025);
    } catch {
      // ignore
    }
  }

  // Semiconductor P-N junction conduction hum & breakdown sound
  public playDiodeHum(currentRatio: number, isBreakdown: boolean = false) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    if (currentRatio <= 0.01 && !isBreakdown) {
      this.stopContinuousTone();
      return;
    }

    if (isBreakdown) {
      this.updatePhysicsState({
        frequency: 110,
        positionY: 0.8,
        energy: 0.9,
        acceleration: 40,
        temperature: 450,
      });
    } else {
      const freq = 130 + Math.min(1, currentRatio) * 680;
      this.updatePhysicsState({
        frequency: freq,
        positionY: Math.min(0.85, Math.max(0.15, currentRatio * 0.7)),
        energy: currentRatio,
      });
    }
  }

  // Photoelectric effect: electron ejection ping
  public playPhotoelectricEmission(kineticEnergyEv: number) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      const freq = 380 + Math.min(4, Math.max(0, kineticEnergyEv)) * 340;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.09);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // ignore
    }
  }

  // Wall/gas collision alias
  public playWallCollision(intensity: number = 0.5, pan: number = 0) {
    this.playImpact(intensity, pan);
  }

  // Auditory Doppler frequency shift effect
  public playDopplerShift(velocity: number = 20, sourceFreq: number = 440) {
    this.ensureInitialized();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      const factor = 1 + Math.min(0.5, Math.max(-0.5, velocity / 343));
      osc.frequency.setValueAtTime(sourceFreq * factor, now);
      osc.frequency.exponentialRampToValueAtTime(sourceFreq / (factor || 1), now + 0.75);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.85);
    } catch {
      // ignore
    }
  }

  // Play rich Multi-Sensory Quiz Soundscape for any quiz cue
  public playQuizSoundscape(soundType: string) {
    this.ensureInitialized();
    switch (soundType) {
      case "geiger": {
        for (let i = 0; i < 8; i++) {
          setTimeout(() => this.playGeigerClick((Math.random() - 0.5) * 1.2), i * 130);
        }
        break;
      }
      case "photoelectric": {
        this.playPhotoelectricEmission(1.8);
        setTimeout(() => this.playPhotoelectricEmission(2.5), 180);
        setTimeout(() => this.playPhotoelectricEmission(3.2), 360);
        break;
      }
      case "diode": {
        this.playDiodeHum(0.7, false);
        setTimeout(() => this.stopContinuousTone(), 1400);
        break;
      }
      case "fringe": {
        this.playFringeTone(0.85, 0);
        setTimeout(() => this.stopContinuousTone(), 1400);
        break;
      }
      case "tunneling": {
        this.playTunnelingChirp();
        break;
      }
      case "gas_collision": {
        for (let i = 0; i < 7; i++) {
          setTimeout(() => this.playWallCollision(0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 1.6), i * 140);
        }
        break;
      }
      case "doppler": {
        this.playDopplerShift(35, 440);
        break;
      }
      case "cyclotron": {
        this.playCyclotronTone(30);
        setTimeout(() => this.stopContinuousTone(), 1400);
        break;
      }
      default: {
        this.playResonanceHarmonic(523.25);
        setTimeout(() => this.playResonanceHarmonic(659.25), 160);
        setTimeout(() => this.playResonanceHarmonic(783.99), 320);
        break;
      }
    }
  }

  // Verbal speech readout for accessibility & visually impaired learners
  public speakNarration(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis || this.isMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  }

  private quantizeToPentatonic(freq: number): number {
    let closest = this.pentatonicNotes[0];
    let minDiff = Math.abs(freq - closest);
    for (const note of this.pentatonicNotes) {
      const diff = Math.abs(freq - note);
      if (diff < minDiff) {
        minDiff = diff;
        closest = note;
      }
    }
    return closest;
  }
}

export const sonifier = new SonificationEngine();
