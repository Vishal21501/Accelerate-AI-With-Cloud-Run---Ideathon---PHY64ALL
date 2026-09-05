import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Sparkles, Sliders } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

// Convert wavelength (nm) to RGB color
function wavelengthToRGB(wavelength: number): string {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0.0;
    b = 1.0;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0.0;
    g = (wavelength - 440) / (490 - 440);
    b = 1.0;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0.0;
    g = 1.0;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1.0;
    b = 0.0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1.0;
    g = -(wavelength - 645) / (645 - 580);
    b = 0.0;
  } else if (wavelength >= 645 && wavelength <= 750) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  }

  // Intensity falloff near limits
  let factor = 1.0;
  if (wavelength < 420) {
    factor = 0.3 + (0.7 * (wavelength - 380)) / (420 - 380);
  } else if (wavelength > 700) {
    factor = 0.3 + (0.7 * (750 - wavelength)) / (750 - 700);
  }

  const R = Math.round(r * factor * 255);
  const G = Math.round(g * factor * 255);
  const B = Math.round(b * factor * 255);
  return `rgb(${R}, ${G}, ${B})`;
}

export const DoubleSlitOpticsSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parameters
  const [wavelength, setWavelength] = useState<number>(550); // nm (Green default)
  const [slitSeparation, setSlitSeparation] = useState<number>(0.15); // mm
  const [slitWidth, setSlitWidth] = useState<number>(0.03); // mm
  const [screenDistance, setScreenDistance] = useState<number>(1.2); // meters
  const [detectorY, setDetectorY] = useState<number>(0); // mm from center
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const scanDirectionRef = useRef<number>(1);

  // Calculated fringe separation: Delta y = (lambda * D) / d
  const lambdaMeters = wavelength * 1e-9;
  const dMeters = slitSeparation * 1e-3;
  const aMeters = slitWidth * 1e-3;
  const fringeSpacingMm = ((lambdaMeters * screenDistance) / dMeters) * 1000;

  // Compute optical intensity at offset y (in mm)
  const calculateIntensity = (yMm: number): number => {
    const y = yMm * 1e-3; // meters
    const theta = Math.atan2(y, screenDistance);

    // Double-slit phase difference beta:
    const beta = (Math.PI * dMeters * Math.sin(theta)) / lambdaMeters;
    // Single-slit diffraction envelope alpha:
    const alpha = (Math.PI * aMeters * Math.sin(theta)) / lambdaMeters;

    const interferenceTerm = Math.cos(beta) * Math.cos(beta);
    const diffractionTerm = alpha === 0 ? 1 : Math.pow(Math.sin(alpha) / alpha, 2);

    return interferenceTerm * diffractionTerm;
  };

  const currentIntensity = calculateIntensity(detectorY);

  // Auto-scan probe effect
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setDetectorY((prev) => {
        let next = prev + 0.15 * scanDirectionRef.current;
        if (next >= 12) {
          scanDirectionRef.current = -1;
          next = 12;
        } else if (next <= -12) {
          scanDirectionRef.current = 1;
          next = -12;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Sonification update on detector probe position
  useEffect(() => {
    if (sonificationEnabled) {
      const wavelengthPitchScale = 1.0 + (550 - wavelength) / 500;
      const baseFreq = (180 + currentIntensity * 720) * wavelengthPitchScale;
      const phaseRad = (detectorY / 12) * Math.PI * 2;

      sonifier.updatePhysicsState({
        frequency: baseFreq,
        positionX: Math.max(-1, Math.min(1, detectorY / 12)),
        positionY: Math.max(0.15, currentIntensity * 0.85),
        energy: currentIntensity,
        phase: phaseRad,
      });
    } else {
      sonifier.stopContinuousTone();
    }
  }, [detectorY, currentIntensity, wavelength, sonificationEnabled]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const laserColor = wavelengthToRGB(wavelength);

    // Layout geometry:
    // Left: Laser source (x: 40)
    // Middle-left: Double slit barrier (x: 160)
    // Center: Wave propagation field (x: 160 to 480)
    // Right: Detection Screen (x: 520)
    // Far Right: Intensity Curve Graph (x: 580 to 700)

    const barrierX = 140;
    const screenX = 460;
    const centerY = h / 2;

    // Laser incoming beam
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(10, centerY);
    ctx.lineTo(barrierX, centerY);
    ctx.stroke();

    // Laser emitter housing
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(5, centerY - 15, 30, 30);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(35, centerY - 10, 8, 20);

    // Double Slit Barrier
    ctx.fillStyle = "#334155";
    ctx.fillRect(barrierX - 4, 10, 8, h - 20);

    // Slits aperture gaps
    const slitPixelSep = Math.min(60, Math.max(12, slitSeparation * 240));
    const slitPixelWidth = Math.max(4, slitWidth * 80);

    const s1Y = centerY - slitPixelSep / 2;
    const s2Y = centerY + slitPixelSep / 2;

    // Clear aperture openings
    ctx.clearRect(barrierX - 5, s1Y - slitPixelWidth / 2, 10, slitPixelWidth);
    ctx.clearRect(barrierX - 5, s2Y - slitPixelWidth / 2, 10, slitPixelWidth);

    // Wave propagation visualization (Huygens wave crests)
    const numRipples = 14;
    const rippleSpacing = (wavelength / 550) * 16;

    for (let r = 1; r <= numRipples; r++) {
      const radius = Math.max(0, r * rippleSpacing);
      if (radius <= 0 || radius > screenX - barrierX + 20) continue;

      ctx.strokeStyle = laserColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = Math.max(0.1, 0.4 - (r / numRipples) * 0.3);

      // Arc from slit 1
      ctx.beginPath();
      ctx.arc(barrierX, s1Y, radius, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();

      // Arc from slit 2
      ctx.beginPath();
      ctx.arc(barrierX, s2Y, radius, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Detection Projection Screen (Realistic interference bands)
    const screenWidth = 24;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(screenX, 15, screenWidth, h - 30);

    // Render continuous fringe gradient on the screen
    for (let py = 15; py < h - 15; py += 2) {
      // Map py to physical y in mm
      const yMm = ((py - centerY) / (h / 2)) * 14;
      const intensity = calculateIntensity(yMm);

      ctx.fillStyle = laserColor;
      ctx.globalAlpha = Math.min(1.0, intensity * 0.95);
      ctx.fillRect(screenX, py, screenWidth, 2);
    }
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, 15, screenWidth, h - 30);

    // Intensity Profile Graph I(y) on the right
    const graphLeft = screenX + screenWidth + 15;
    const graphWidth = w - graphLeft - 20;

    // Graph baseline & axis
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(graphLeft, 15);
    ctx.lineTo(graphLeft, h - 15);
    ctx.stroke();

    // Plot I(y) curve
    ctx.beginPath();
    for (let py = 15; py < h - 15; py++) {
      const yMm = ((py - centerY) / (h / 2)) * 14;
      const intensity = calculateIntensity(yMm);
      const gx = graphLeft + intensity * graphWidth;
      if (py === 15) ctx.moveTo(gx, py);
      else ctx.lineTo(gx, py);
    }
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Detector Probe Marker
    const probePixelY = centerY + (detectorY / 14) * (h / 2);
    ctx.strokeStyle = "#f59e0b";
    ctx.fillStyle = "#f59e0b";
    ctx.lineWidth = 2;

    // Horizontal indicator line across screen and graph
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(screenX - 10, probePixelY);
    ctx.lineTo(w - 15, probePixelY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Probe icon / handle
    ctx.beginPath();
    ctx.arc(screenX + screenWidth / 2, probePixelY, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#d97706";
    ctx.fillText(`Probe: ${detectorY.toFixed(1)}mm (${(currentIntensity * 100).toFixed(0)}%)`, graphLeft + 10, probePixelY - 6);

    // Labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    ctx.fillText("Double Slit Barrier", barrierX - 45, h - 6);
    ctx.fillText("Screen", screenX - 5, h - 6);
    ctx.fillText("Intensity I(y)", graphLeft + 15, 25);
  }, [wavelength, slitSeparation, slitWidth, screenDistance, detectorY]);

  const speakState = () => {
    const desc = `Wave optics experiment: Wavelength is ${wavelength} nanometers, slit separation is ${slitSeparation} millimeters. Calculated fringe spacing is ${fringeSpacingMm.toFixed(2)} millimeters. Current audio probe position is at ${detectorY.toFixed(1)} millimeters with optical intensity of ${(currentIntensity * 100).toFixed(0)} percent.`;
    sonifier.speakNarration(desc);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              Wave Optics & Young's Double Slit Interference
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-violet-100 text-violet-800 font-medium">
              {level === "explorer"
                ? "Explorer: Rainbow Wave Ripples"
                : level === "middle_school"
                ? "Middle School: Wave Crests & Troughs"
                : level === "high_school"
                ? "High School: Young's Double Slit Interference"
                : level === "college"
                ? "College: Fraunhofer Diffraction Envelope"
                : "Master's: Fourier Optics & Spatial Coherence"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hear light waves with the interactive audio probe: bright constructive fringes ring at high pitches, dark destructive nodes are silent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-optics-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="scan-optics-btn"
            onClick={() => setIsScanning(!isScanning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isScanning
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {isScanning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isScanning ? "Stop Probe Scan" : "Auto-Scan Audio Probe"}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full h-80 bg-slate-900/5 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={320}
          className="w-full h-full object-contain cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const scaledY = ((clickY - rect.height / 2) / (rect.height / 2)) * 14;
            setDetectorY(Math.max(-13, Math.min(13, scaledY)));
          }}
          title="Click anywhere on the screen to position the audio probe"
        />

        {/* Live Fringe Metric Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-500">Fringe Spacing Δy:</span>
            <span className="font-bold text-violet-700">{fringeSpacingMm.toFixed(2)} mm</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-500">Wavelength λ:</span>
            <span className="font-semibold text-slate-800">{wavelength} nm</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-500">Probe Intensity:</span>
            <span className="font-bold text-amber-600">{(currentIntensity * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Sensory Mode Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 rounded-md text-[11px] text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span>Pitch & Volume = Fringe Light Intensity</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="optics-wavelength" className="font-medium">Wavelength λ: {wavelength} nm</label>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full border border-slate-300"
              style={{ backgroundColor: wavelengthToRGB(wavelength) }}
            />
          </div>
          <input
            id="optics-wavelength"
            type="range"
            min="400"
            max="700"
            step="5"
            value={wavelength}
            onChange={(e) => setWavelength(parseInt(e.target.value))}
            className="w-full accent-violet-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="optics-slit-sep" className="font-medium">Slit Separation d: {slitSeparation.toFixed(2)} mm</label>
          </div>
          <input
            id="optics-slit-sep"
            type="range"
            min="0.05"
            max="0.35"
            step="0.01"
            value={slitSeparation}
            onChange={(e) => setSlitSeparation(parseFloat(e.target.value))}
            className="w-full accent-violet-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="optics-slit-width" className="font-medium">Slit Width a: {slitWidth.toFixed(2)} mm</label>
          </div>
          <input
            id="optics-slit-width"
            type="range"
            min="0.01"
            max="0.08"
            step="0.005"
            value={slitWidth}
            onChange={(e) => setSlitWidth(parseFloat(e.target.value))}
            className="w-full accent-violet-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="optics-screen-dist" className="font-medium">Screen Distance D: {screenDistance.toFixed(1)} m</label>
          </div>
          <input
            id="optics-screen-dist"
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={screenDistance}
            onChange={(e) => setScreenDistance(parseFloat(e.target.value))}
            className="w-full accent-violet-600"
          />
        </div>
      </div>

      {/* Audio Probe Manual Slider */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-slate-700">Scan Audio Detector Probe manually:</span>
        </div>
        <div className="flex-1 max-w-md flex items-center gap-3">
          <span className="font-mono text-slate-500 text-[11px]">-12mm</span>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.1"
            value={detectorY}
            onChange={(e) => {
              setIsScanning(false);
              setDetectorY(parseFloat(e.target.value));
            }}
            className="w-full accent-amber-600"
          />
          <span className="font-mono text-slate-500 text-[11px]">+12mm</span>
        </div>
        <span className="font-mono font-bold text-amber-700 w-16 text-right">
          {detectorY > 0 ? `+${detectorY.toFixed(1)}` : detectorY.toFixed(1)} mm
        </span>
      </div>

      {/* Key Formula Footer Adapted to 5 Levels */}
      <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">
          {level === "explorer"
            ? "Wave Interference Rule:"
            : level === "middle_school"
            ? "Fringe Spacing Relation:"
            : level === "high_school"
            ? "Young's Double-Slit Condition:"
            : level === "college"
            ? "Fraunhofer Interference & Diffraction:"
            : "Quantum Superposition & Path Integrals:"}
        </span>
        <KatexMath
          math={
            level === "explorer"
              ? "\\text{Crest} + \\text{Crest} = \\text{Bright Light (Loud Tone)}, \\quad \\text{Crest} + \\text{Trough} = \\text{Darkness (Silence)}"
              : level === "middle_school"
              ? "\\Delta y = \\frac{\\lambda D}{d}"
              : level === "high_school"
              ? "d \\sin\\theta = m \\lambda, \\quad \\Delta y = \\frac{\\lambda D}{d}"
              : level === "college"
              ? "I(\\theta) = I_0 \\cos^2\\left(\\frac{\\pi d \\sin\\theta}{\\lambda}\\right) \\left(\\frac{\\sin\\alpha}{\\alpha}\\right)^2, \\quad \\alpha = \\frac{\\pi a \\sin\\theta}{\\lambda}"
              : "\\Psi(y) = \\psi_1(y) + \\psi_2(y) = \\int_{\\text{slits}} \\mathcal{D}[x(t)]\\, e^{i \\mathcal{S}[x]/\\hbar}, \\quad P(y) = |\\Psi(y)|^2"
          }
          inline
        />
      </div>
    </div>
  );
};
