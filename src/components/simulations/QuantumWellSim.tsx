import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Zap, Radio, Target, Info } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

export const QuantumWellSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mode: "infinite_well" or "tunneling_barrier"
  const [mode, setMode] = useState<"infinite_well" | "tunneling_barrier">("infinite_well");

  // Infinite Well Superposition Weights (n=1, 2, 3, 4)
  const [c1, setC1] = useState<number>(1.0);
  const [c2, setC2] = useState<number>(0.6);
  const [c3, setC3] = useState<number>(0.0);
  const [c4, setC4] = useState<number>(0.0);

  // Quantum Position Detector Probe (Acoustic scanning of probability density)
  const [probeEnabled, setProbeEnabled] = useState<boolean>(false);
  const [probeX, setProbeX] = useState<number>(0.5); // 0.0 to 1.0
  const [currentProbeProb, setCurrentProbeProb] = useState<number>(0.0);

  // Wavefunction Collapse Measurement Event
  const [collapseEvent, setCollapseEvent] = useState<{
    xNorm: number;
    eigenstate: number;
    timestamp: number;
  } | null>(null);

  // Barrier Tunneling Parameters
  const [barrierHeightV0, setBarrierHeightV0] = useState<number>(5.0); // eV
  const [particleEnergyE, setParticleEnergyE] = useState<number>(3.5); // eV
  const [barrierWidthA, setBarrierWidthA] = useState<number>(0.3); // nm
  const [tunnelingTriggered, setTunnelingTriggered] = useState<boolean>(false);
  const [lastTunnelResult, setLastTunnelResult] = useState<"transmitted" | "reflected" | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const timeRef = useRef<number>(0);
  const lastProbeUpdateTime = useRef<number>(0);

  // Transmission coefficient calculation:
  // T ~ 16 (E/V0)(1 - E/V0) * exp(-2 * kappa * a)
  const kappa = Math.sqrt(Math.max(0, barrierHeightV0 - particleEnergyE)) * 5.12; // in 1/nm approx
  const transmissionT =
    particleEnergyE < barrierHeightV0
      ? 16 *
        (particleEnergyE / barrierHeightV0) *
        (1 - particleEnergyE / barrierHeightV0) *
        Math.exp(-2 * kappa * barrierWidthA)
      : 1.0;

  // Quantum Sonification Loop
  useEffect(() => {
    if (!sonificationEnabled || !isRunning) {
      sonifier.stopContinuousTone();
      return;
    }

    if (probeEnabled && mode === "infinite_well") {
      // In Probe mode: audio is governed continuously inside render loop directly by local probability
      return;
    }

    if (mode === "infinite_well") {
      const norm = Math.sqrt(c1 * c1 + c2 * c2 + c3 * c3 + c4 * c4) || 1;
      // Real quantum eigenfrequencies scale as n^2
      const effectiveFreq =
        (c1 * 140 * 1 + c2 * 140 * 4 + c3 * 140 * 9 + c4 * 140 * 16) / (c1 + c2 + c3 + c4 || 1);
      // Harmonic richness proportional to higher state superposition
      const richness = (c2 * 0.4 + c3 * 0.7 + c4 * 1.0) / (c1 + c2 + c3 + c4 || 1);

      // Bohr beat dynamic panning: when n=1 and n=2 are mixed, wave sloshes at delta omega = 3 omega_1
      let spatialPan = 0;
      if (c1 > 0 && c2 > 0) {
        // Bohr beat frequency oscillation
        const bohrPhase = (4 - 1) * timeRef.current; // (E2 - E1)/hbar
        spatialPan = -Math.cos(bohrPhase) * (c1 * c2 / (norm * norm)) * 1.6;
        spatialPan = Math.max(-1, Math.min(1, spatialPan));
      }

      sonifier.updatePhysicsState({
        frequency: effectiveFreq,
        positionY: 0.45,
        energy: richness,
        positionX: spatialPan,
        quantizePentatonic: level === "explorer",
      });
    } else {
      // Barrier mode: frequency proportional to energy E, barrier height V0 as field strength
      const freq = 180 + particleEnergyE * 90;
      const fStrength = Math.min(1.0, barrierHeightV0 / 12);
      sonifier.updatePhysicsState({
        frequency: freq,
        positionY: 0.4,
        fieldStrength: fStrength,
        energy: Math.min(1.0, particleEnergyE / 10),
      });
    }
  }, [
    mode,
    c1,
    c2,
    c3,
    c4,
    particleEnergyE,
    barrierHeightV0,
    isRunning,
    sonificationEnabled,
    probeEnabled,
    probeX,
    level,
  ]);

  // Trigger quantum tunneling event with 3D audio staging
  const handleLaunchWavepacket = () => {
    setTunnelingTriggered(true);
    setLastTunnelResult(null);

    if (sonificationEnabled) {
      sonifier.playWavepacketTunneling(transmissionT, (didTunnel) => {
        setLastTunnelResult(didTunnel ? "transmitted" : "reflected");
      });
    } else {
      const willTunnel = Math.random() < Math.max(0.05, transmissionT);
      setLastTunnelResult(willTunnel ? "transmitted" : "reflected");
    }

    setTimeout(() => {
      setTunnelingTriggered(false);
    }, 1400);
  };

  // Trigger Born Rule Wavefunction Collapse (Position Measurement)
  const handleCollapseWavefunction = () => {
    // Generate position measurement weighted by probability density
    // For simplicity, sample a position where prob density is high
    let chosenX = probeX;
    let maxP = 0;
    for (let s = 0; s < 15; s++) {
      const testX = Math.random();
      const phi1 = Math.sin(1 * Math.PI * testX);
      const phi2 = Math.sin(2 * Math.PI * testX);
      const testP = Math.pow(c1 * phi1 + c2 * phi2, 2);
      if (testP > maxP) {
        maxP = testP;
        chosenX = testX;
      }
    }

    const dominantEigenstate = c4 > 0.5 ? 4 : c3 > 0.5 ? 3 : c2 > 0.5 ? 2 : 1;
    setCollapseEvent({
      xNorm: chosenX,
      eigenstate: dominantEigenstate,
      timestamp: performance.now(),
    });

    if (sonificationEnabled) {
      sonifier.playWavefunctionCollapse(dominantEigenstate, (chosenX - 0.5) * 2);
    }
  };

  // Trigger Quantum Transition (Photon Emission / Absorption)
  const handleQuantumTransition = (nInit: number, nFinal: number) => {
    if (nFinal === 1) {
      setC1(1.0);
      setC2(0.0);
      setC3(0.0);
      setC4(0.0);
    } else if (nFinal === 2) {
      setC1(0.0);
      setC2(1.0);
      setC3(0.0);
      setC4(0.0);
    } else if (nFinal === 3) {
      setC1(0.0);
      setC2(0.0);
      setC3(1.0);
      setC4(0.0);
    }

    if (sonificationEnabled) {
      sonifier.playQuantumTransition(nInit, nFinal);
    }
  };

  // Canvas Mouse Move for Probe Dragging
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "infinite_well") return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const wellLeft = 100 * (rect.width / canvas.width);
    const wellRight = (canvas.width - 100) * (rect.width / canvas.width);

    if (clickX >= wellLeft && clickX <= wellRight) {
      const u = (clickX - wellLeft) / (wellRight - wellLeft);
      setProbeX(Math.max(0.02, Math.min(0.98, u)));
      if (!probeEnabled) setProbeEnabled(true);
    }
  };

  // Main canvas animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (isRunning) {
        timeRef.current += dt * 2.5;
      }
      const time = timeRef.current;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          if (mode === "infinite_well") {
            // Render 1D Infinite Well
            const wellLeft = 100;
            const wellRight = w - 100;
            const wellWidth = wellRight - wellLeft;
            const baselineY = h * 0.58;

            // Infinite potential walls (Hatched barriers)
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(0, 20, wellLeft, h - 40);
            ctx.fillRect(wellRight, 20, w - wellRight, h - 40);

            // Wall boundary lines
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(wellLeft, 20);
            ctx.lineTo(wellLeft, h - 20);
            ctx.moveTo(wellRight, 20);
            ctx.lineTo(wellRight, h - 20);
            ctx.stroke();

            // Zero line
            ctx.strokeStyle = "#334155";
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(wellLeft, baselineY);
            ctx.lineTo(wellRight, baselineY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Calculate complex wavefunction: psi(x, t) = sum c_n * sin(n pi x / L) * exp(-i E_n t)
            const norm = Math.sqrt(c1 * c1 + c2 * c2 + c3 * c3 + c4 * c4) || 1;
            const n1 = c1 / norm;
            const n2 = c2 / norm;
            const n3 = c3 / norm;
            const n4 = c4 / norm;

            // Draw Real part (cyan) and Probability Density (amber filled)
            const numPoints = 180;
            const rePoints: Array<{ x: number; y: number }> = [];
            const imPoints: Array<{ x: number; y: number }> = [];
            const probPoints: Array<{ x: number; y: number }> = [];

            let calculatedProbeProb = 0;

            for (let i = 0; i <= numPoints; i++) {
              const u = i / numPoints; // 0 to 1
              const px = wellLeft + u * wellWidth;

              // Spatial eigenfunctions: sin(n * pi * u)
              const phi1 = Math.sin(1 * Math.PI * u);
              const phi2 = Math.sin(2 * Math.PI * u);
              const phi3 = Math.sin(3 * Math.PI * u);
              const phi4 = Math.sin(4 * Math.PI * u);

              // Time evolution phases: E_n = n^2 * omega_1
              const phase1 = 1 * time;
              const phase2 = 4 * time;
              const phase3 = 9 * time;
              const phase4 = 16 * time;

              // Complex sum:
              const re =
                n1 * phi1 * Math.cos(phase1) +
                n2 * phi2 * Math.cos(phase2) +
                n3 * phi3 * Math.cos(phase3) +
                n4 * phi4 * Math.cos(phase4);

              const im =
                -n1 * phi1 * Math.sin(phase1) -
                n2 * phi2 * Math.sin(phase2) -
                n3 * phi3 * Math.sin(phase3) -
                n4 * phi4 * Math.sin(phase4);

              const prob = re * re + im * im;

              if (Math.abs(u - probeX) < 0.015) {
                calculatedProbeProb = prob;
              }

              const waveScale = 65;
              const probScale = 95;

              rePoints.push({ x: px, y: baselineY - re * waveScale });
              imPoints.push({ x: px, y: baselineY - im * waveScale });
              probPoints.push({ x: px, y: baselineY - prob * probScale });
            }

            if (probeEnabled) {
              if (sonificationEnabled && isRunning) {
                const panX = (probeX - 0.5) * 2;
                sonifier.playQuantumProbe(calculatedProbeProb, panX);
              }
              if (now - lastProbeUpdateTime.current > 150) {
                lastProbeUpdateTime.current = now;
                setCurrentProbeProb(calculatedProbeProb);
              }
            }

            // Fill Probability Density |psi|^2 (Gold glowing gradient)
            const probGrad = ctx.createLinearGradient(0, baselineY - 100, 0, baselineY);
            probGrad.addColorStop(0, "rgba(245, 158, 11, 0.45)");
            probGrad.addColorStop(1, "rgba(245, 158, 11, 0.02)");
            ctx.fillStyle = probGrad;
            ctx.beginPath();
            ctx.moveTo(wellLeft, baselineY);
            probPoints.forEach((pt) => ctx.lineTo(pt.x, pt.y));
            ctx.lineTo(wellRight, baselineY);
            ctx.closePath();
            ctx.fill();

            // Probability Density Stroke
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            probPoints.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();

            // Real Part Stroke (Cyan)
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            rePoints.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();

            // Center of mass expectation value <x>(t) indicator
            let sumXProb = 0;
            let sumProb = 0;
            probPoints.forEach((pt, idx) => {
              const u = idx / numPoints;
              sumXProb += u * (baselineY - pt.y);
              sumProb += baselineY - pt.y;
            });
            const meanU = sumProb > 0 ? sumXProb / sumProb : 0.5;
            const meanPx = wellLeft + meanU * wellWidth;

            // Center of mass bead
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(meanPx, baselineY + 12, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = "#94a3b8";
            ctx.font = "9px monospace";
            ctx.fillText("⟨x⟩(t)", meanPx - 10, baselineY + 26);

            // Render Acoustic Position Detector Probe if enabled
            if (probeEnabled) {
              const probePx = wellLeft + probeX * wellWidth;
              const probeProbY = baselineY - calculatedProbeProb * 95;

              // Vertical dashed probe scanner
              ctx.strokeStyle = "#fbbf24";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(probePx, 30);
              ctx.lineTo(probePx, h - 30);
              ctx.stroke();
              ctx.setLineDash([]);

              // Golden detector bead
              ctx.fillStyle = "#f59e0b";
              ctx.beginPath();
              ctx.arc(probePx, probeProbY, 7, 0, 2 * Math.PI);
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.stroke();

              // Probe sound wave acoustic ripples if probe has sound
              if (calculatedProbeProb > 0.05) {
                ctx.strokeStyle = `rgba(245, 158, 11, ${Math.min(0.8, calculatedProbeProb * 0.9)})`;
                ctx.lineWidth = 1.5;
                const rippleR = Math.max(1, 10 + ((now * 0.05) % 15));
                ctx.beginPath();
                ctx.arc(probePx, probeProbY, rippleR, 0, 2 * Math.PI);
                ctx.stroke();
              }

              // Readout box above probe
              ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
              ctx.fillRect(probePx - 45, 35, 90, 24);
              ctx.strokeStyle = "#fbbf24";
              ctx.lineWidth = 1;
              ctx.strokeRect(probePx - 45, 35, 90, 24);
              ctx.fillStyle = "#fef3c7";
              ctx.font = "bold 9px monospace";
              ctx.fillText(`|Ψ|²: ${calculatedProbeProb.toFixed(3)}`, probePx - 38, 50);
            }

            // Render Wavefunction Collapse Measurement Needle if active (< 1000ms ago)
            if (collapseEvent && now - collapseEvent.timestamp < 1000 && now - collapseEvent.timestamp >= 0) {
              const age = Math.max(0, Math.min(1, (now - collapseEvent.timestamp) / 1000));
              const alpha = Math.max(0, 1 - age);
              const colPx = wellLeft + collapseEvent.xNorm * wellWidth;

              // Vertical golden laser collapse beam
              ctx.strokeStyle = `rgba(234, 179, 8, ${alpha})`;
              ctx.lineWidth = 4 * (1 - age * 0.5);
              ctx.beginPath();
              ctx.moveTo(colPx, 20);
              ctx.lineTo(colPx, baselineY);
              ctx.stroke();

              // Expanding measurement flash ring
              const flashRadius = Math.max(0, age * 70);
              ctx.strokeStyle = `rgba(253, 224, 71, ${alpha * 0.8})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(colPx, baselineY, flashRadius, 0, 2 * Math.PI);
              ctx.stroke();

              ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
              ctx.font = "bold 11px monospace";
              ctx.fillText(`COLLAPSED: x = ${collapseEvent.xNorm.toFixed(3)}L`, colPx - 60, baselineY - 45);
            }

            // Legend on canvas
            ctx.font = "11px sans-serif";
            ctx.fillStyle = "#f59e0b";
            ctx.fillText("● Probability Density |Ψ(x,t)|²", wellLeft + 10, 35);
            ctx.fillStyle = "#06b6d4";
            ctx.fillText("— Real Part Re(Ψ)", wellLeft + 195, 35);
            ctx.fillStyle = "#38bdf8";
            ctx.fillText("● Expectation ⟨x⟩(t)", wellLeft + 325, 35);
          } else {
            // Render Quantum Tunneling Barrier
            const barrierLeft = w * 0.44;
            const barrierRight = w * 0.44 + barrierWidthA * 260;
            const baselineY = h * 0.7;

            // Ground baseline
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(30, baselineY);
            ctx.lineTo(w - 30, baselineY);
            ctx.stroke();

            // Barrier Rectangular Step
            const barrierPixelH = barrierHeightV0 * 24;
            ctx.fillStyle = "rgba(100, 116, 139, 0.35)";
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 2;
            ctx.fillRect(barrierLeft, baselineY - barrierPixelH, barrierRight - barrierLeft, barrierPixelH);
            ctx.strokeRect(barrierLeft, baselineY - barrierPixelH, barrierRight - barrierLeft, barrierPixelH);

            // Energy Level Line E
            const energyPixelY = baselineY - particleEnergyE * 24;
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(30, energyPixelY);
            ctx.lineTo(w - 30, energyPixelY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "#f87171";
            ctx.font = "bold 11px monospace";
            ctx.fillText(`Particle Energy E = ${particleEnergyE} eV`, 40, energyPixelY - 6);

            ctx.fillStyle = "#94a3b8";
            ctx.fillText(`Barrier V₀ = ${barrierHeightV0} eV`, barrierLeft + 8, baselineY - barrierPixelH - 6);

            // Wavepacket Propagation
            // Region 1 (Left): Incident sinusoidal wave e^(i k x)
            // Region 2 (Barrier): Exponentially decaying evanescent wave e^(-kappa x)
            // Region 3 (Right): Transmitted sinusoidal wave of reduced amplitude sqrt(T) * e^(i k x)
            ctx.strokeStyle = "#a855f7";
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            const k1 = Math.sqrt(particleEnergyE) * 0.25;
            for (let px = 40; px < barrierLeft; px += 2) {
              const osc = Math.sin(k1 * (px - 40) - time * 3) * 22;
              const y = energyPixelY + osc;
              if (px === 40) ctx.moveTo(px, y);
              else ctx.lineTo(px, y);
            }

            // Inside barrier: Exponential decay
            for (let px = barrierLeft; px <= barrierRight; px += 2) {
              const u = (px - barrierLeft) / (barrierRight - barrierLeft);
              const decay = Math.exp(-kappa * barrierWidthA * u);
              const osc = decay * 22 * Math.sin(-time * 3);
              ctx.lineTo(px, energyPixelY + osc);
            }

            // Region 3: Transmitted wave
            const transAmp = Math.sqrt(Math.max(0.01, transmissionT)) * 22;
            for (let px = barrierRight; px < w - 40; px += 2) {
              const osc = Math.sin(k1 * (px - barrierRight) - time * 3) * transAmp;
              ctx.lineTo(px, energyPixelY + osc);
            }
            ctx.stroke();

            // Tunneling packet burst visual if triggered
            if (tunnelingTriggered) {
              const burstX = lastTunnelResult === "transmitted" ? barrierRight + 50 : barrierLeft - 50;
              ctx.fillStyle =
                lastTunnelResult === "transmitted"
                  ? "rgba(168, 85, 247, 0.4)"
                  : "rgba(239, 68, 68, 0.4)";
              ctx.beginPath();
              ctx.arc(burstX, energyPixelY, 28, 0, 2 * Math.PI);
              ctx.fill();

              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 10px monospace";
              ctx.fillText(
                lastTunnelResult === "transmitted" ? "TUNNELED! (Right Audio)" : "REFLECTED! (Left Audio)",
                burstX - 45,
                energyPixelY - 35
              );
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      sonifier.stopContinuousTone();
    };
  }, [
    mode,
    c1,
    c2,
    c3,
    c4,
    barrierHeightV0,
    particleEnergyE,
    barrierWidthA,
    isRunning,
    kappa,
    transmissionT,
    tunnelingTriggered,
    probeEnabled,
    probeX,
    collapseEvent,
    lastTunnelResult,
  ]);

  const speakState = () => {
    const desc =
      mode === "infinite_well"
        ? `Quantum infinite well simulation: Superposition of eigenstates n=1 weight ${c1}, n=2 weight ${c2}, n=3 weight ${c3}, n=4 weight ${c4}. Energy levels follow n squared scaling.`
        : `Quantum tunneling simulation: Incident particle energy is ${particleEnergyE} electron-volts, barrier height is ${barrierHeightV0} electron-volts, barrier thickness is ${barrierWidthA} nanometers. Quantum transmission coefficient T is ${(transmissionT * 100).toFixed(2)} percent.`;
    sonifier.speakNarration(desc);
  };

  // Preset Superposition States for easy discovery
  const applyPreset = (preset: "ground" | "excited" | "bohr_beat" | "high_harmonic") => {
    if (preset === "ground") {
      setC1(1.0);
      setC2(0.0);
      setC3(0.0);
      setC4(0.0);
    } else if (preset === "excited") {
      setC1(0.0);
      setC2(1.0);
      setC3(0.0);
      setC4(0.0);
    } else if (preset === "bohr_beat") {
      setC1(0.8);
      setC2(0.8);
      setC3(0.0);
      setC4(0.0);
    } else if (preset === "high_harmonic") {
      setC1(0.2);
      setC2(0.4);
      setC3(0.8);
      setC4(1.0);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              Quantum Wave Mechanics, Superposition & Tunneling
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-800 font-medium">
              {level === "explorer"
                ? "Explorer: Bouncing Particle Waves"
                : level === "middle_school"
                ? "Middle School: Discrete Atoms & Energy Steps"
                : level === "high_school"
                ? "High School: de Broglie Standing Waves"
                : level === "college"
                ? "College: Schrödinger Eigenfunctions & Born Rule"
                : "Master's: Superposition Evolution, S-Matrix & WKB Barrier Tunneling"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-harmonic quantum chord sonification, spatial probability sloshing, wavefunction collapse, and probabilistic barrier tunneling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
            <button
              id="mode-infinite-well-btn"
              onClick={() => setMode("infinite_well")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                mode === "infinite_well" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1D Box Superposition
            </button>
            <button
              id="mode-tunneling-btn"
              onClick={() => setMode("tunneling_barrier")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                mode === "tunneling_barrier" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Barrier Tunneling
            </button>
          </div>

          <button
            id="speak-state-quantum-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="toggle-quantum-btn"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isRunning ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-cyan-600 text-white hover:bg-cyan-700"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full h-80 bg-slate-950 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={320}
          onClick={handleCanvasInteraction}
          className="w-full h-full object-contain cursor-crosshair"
          title={
            mode === "infinite_well"
              ? "Click anywhere to place the Acoustic Position Detector Probe"
              : "Quantum Barrier Tunneling Stage"
          }
        />

        {/* Live HUD Floating Card */}
        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-sm text-xs text-white flex flex-col gap-1 backdrop-blur-xs">
          {mode === "infinite_well" ? (
            <>
              <span className="text-slate-400 font-mono text-[10px]">Superposition State:</span>
              <span className="font-mono text-cyan-400 font-bold">
                Ψ = {c1.toFixed(1)}ψ₁ + {c2.toFixed(1)}ψ₂ + {c3.toFixed(1)}ψ₃ + {c4.toFixed(1)}ψ₄
              </span>
              <span className="text-amber-400 text-[10px]">Energy eigenvalues: E_n ∝ n² (1, 4, 9, 16)</span>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 font-mono">
                <span className="text-slate-400">Transmission T:</span>
                <span className="font-bold text-violet-400">{(transmissionT * 100).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between gap-4 font-mono">
                <span className="text-slate-400">Decay κ:</span>
                <span className="font-mono text-slate-300">{kappa.toFixed(2)} nm⁻¹</span>
              </div>
            </>
          )}
        </div>

        {/* Interactive Features Quick Bar on Canvas Top-Right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {mode === "infinite_well" && (
            <button
              id="collapse-btn-hud"
              onClick={handleCollapseWavefunction}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-bold rounded-md text-[11px] shadow-sm transition-all"
              title="Measure position according to Born rule and hear wavefunction collapse"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Measure (Collapse)</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-md text-[11px] text-cyan-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {mode === "infinite_well"
                ? probeEnabled
                  ? "Probe Scanning |Ψ|²"
                  : "Harmonic Chord Superposition"
                : "Stereo Incident & Transmit"}
            </span>
          </div>
        </div>

        {/* Click tip banner if probe disabled in infinite well */}
        {mode === "infinite_well" && !probeEnabled && (
          <div className="absolute bottom-2 left-3 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-400">
            💡 Click on canvas or enable "Acoustic Probe" below to hear probability nodes and antinodes.
          </div>
        )}
      </div>

      {/* Controls Bar */}
      {mode === "infinite_well" ? (
        <div className="p-4 border-t border-slate-200 bg-white space-y-4 text-xs">
          {/* Presets & Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Quick Presets:</span>
              <button
                onClick={() => applyPreset("ground")}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Ground State (n=1)
              </button>
              <button
                onClick={() => applyPreset("excited")}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Excited (n=2)
              </button>
              <button
                onClick={() => applyPreset("bohr_beat")}
                className="px-2 py-1 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-semibold border border-cyan-200 transition-colors"
                title="Superposition of n=1 and n=2 causing spatial wave sloshing between left and right speakers"
              >
                Bohr Beat Sloshing (n=1+2)
              </button>
              <button
                onClick={() => applyPreset("high_harmonic")}
                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium border border-amber-200 transition-colors"
              >
                Rich Chords (n=1..4)
              </button>
            </div>

            {/* Quantum Transitions & Measurement */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Quantum Jump:</span>
              <button
                onClick={() => handleQuantumTransition(2, 1)}
                className="flex items-center gap-1 px-2 py-1 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded font-medium transition-colors"
                title="Emit photon with energy delta E = 3 E1"
              >
                <Zap className="w-3 h-3" />
                n=2 → n=1 Emission
              </button>
              <button
                onClick={() => handleQuantumTransition(1, 3)}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-medium transition-colors"
                title="Absorb photon with energy delta E = 8 E1"
              >
                <Zap className="w-3 h-3" />
                n=1 → n=3 Absorption
              </button>
            </div>
          </div>

          {/* Superposition Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <label htmlFor="quantum-c1" className="font-medium">
                  State n=1 (c₁): {c1.toFixed(1)} <span className="text-slate-400">(f₁)</span>
                </label>
              </div>
              <input
                id="quantum-c1"
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={c1}
                onChange={(e) => setC1(parseFloat(e.target.value))}
                className="w-full accent-cyan-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <label htmlFor="quantum-c2" className="font-medium">
                  State n=2 (c₂): {c2.toFixed(1)} <span className="text-slate-400">(4f₁)</span>
                </label>
              </div>
              <input
                id="quantum-c2"
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={c2}
                onChange={(e) => setC2(parseFloat(e.target.value))}
                className="w-full accent-cyan-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <label htmlFor="quantum-c3" className="font-medium">
                  State n=3 (c₃): {c3.toFixed(1)} <span className="text-slate-400">(9f₁)</span>
                </label>
              </div>
              <input
                id="quantum-c3"
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={c3}
                onChange={(e) => setC3(parseFloat(e.target.value))}
                className="w-full accent-cyan-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <label htmlFor="quantum-c4" className="font-medium">
                  State n=4 (c₄): {c4.toFixed(1)} <span className="text-slate-400">(16f₁)</span>
                </label>
              </div>
              <input
                id="quantum-c4"
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={c4}
                onChange={(e) => setC4(parseFloat(e.target.value))}
                className="w-full accent-cyan-600"
              />
            </div>
          </div>

          {/* Acoustic Position Detector Probe Bar */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-900">
                <input
                  type="checkbox"
                  checked={probeEnabled}
                  onChange={(e) => setProbeEnabled(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <Target className="w-4 h-4 text-amber-600" />
                <span>Acoustic Probability Detector Probe:</span>
              </label>
              <span className="text-xs text-amber-800">
                Position x = <strong>{(probeX * 100).toFixed(1)}% L</strong> | Probability |Ψ|² ={" "}
                <strong>{currentProbeProb.toFixed(3)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-sm">
              <span className="text-[11px] text-slate-500 font-mono">0</span>
              <input
                type="range"
                min="0.02"
                max="0.98"
                step="0.01"
                value={probeX}
                onChange={(e) => {
                  setProbeX(parseFloat(e.target.value));
                  if (!probeEnabled) setProbeEnabled(true);
                }}
                className="w-full accent-amber-600"
                title="Scan detector probe across the quantum well"
              />
              <span className="text-[11px] text-slate-500 font-mono">L</span>
            </div>

            <button
              onClick={handleCollapseWavefunction}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs transition-colors shadow-xs"
            >
              Measure & Collapse
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <label htmlFor="quantum-energy-e" className="font-medium">
                Particle Energy E: {particleEnergyE.toFixed(1)} eV
              </label>
            </div>
            <input
              id="quantum-energy-e"
              type="range"
              min="1.0"
              max="7.0"
              step="0.1"
              value={particleEnergyE}
              onChange={(e) => setParticleEnergyE(parseFloat(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <label htmlFor="quantum-barrier-v0" className="font-medium">
                Barrier Height V₀: {barrierHeightV0.toFixed(1)} eV
              </label>
            </div>
            <input
              id="quantum-barrier-v0"
              type="range"
              min="2.0"
              max="8.0"
              step="0.1"
              value={barrierHeightV0}
              onChange={(e) => setBarrierHeightV0(parseFloat(e.target.value))}
              className="w-full accent-slate-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <label htmlFor="quantum-barrier-width" className="font-medium">
                Barrier Width a: {barrierWidthA.toFixed(2)} nm
              </label>
            </div>
            <input
              id="quantum-barrier-width"
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={barrierWidthA}
              onChange={(e) => setBarrierWidthA(parseFloat(e.target.value))}
              className="w-full accent-slate-600"
            />
          </div>

          <div className="flex items-end">
            <button
              id="launch-packet-btn"
              onClick={handleLaunchWavepacket}
              className="w-full py-2 px-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Launch Wavepacket (3D Audio)
            </button>
          </div>
        </div>
      )}

      {/* Key Formula & Educational Guidance Footer */}
      <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-600 shrink-0" />
          <span className="font-semibold text-slate-800">
            {level === "explorer"
              ? "Wave Rule:"
              : level === "middle_school"
              ? "Energy Quantization:"
              : level === "high_school"
              ? "de Broglie Condition:"
              : level === "college"
              ? "Schrödinger Equation:"
              : "Hamiltonian & WKB:"}
          </span>
        </div>
        <KatexMath
          math={
            mode === "infinite_well"
              ? level === "explorer" || level === "middle_school"
                ? "E_n = n^2 \\cdot E_1 \\quad (n = 1, 2, 3, \\dots)"
                : level === "high_school"
                ? "L = n \\frac{\\lambda}{2}, \\quad E_n = \\frac{n^2 h^2}{8 m L^2}"
                : "i\\hbar \\frac{\\partial \\Psi}{\\partial t} = \\hat{H}\\Psi, \\quad \\Psi(x,t) = \\sum c_n \\sqrt{\\frac{2}{L}}\\sin\\left(\\frac{n\\pi x}{L}\\right)e^{-i E_n t/\\hbar}"
              : "T \\approx 16\\frac{E}{V_0}\\left(1 - \\frac{E}{V_0}\\right)e^{-2\\kappa a}, \\quad \\kappa = \\frac{\\sqrt{2m(V_0 - E)}}{\\hbar}"
          }
          inline
        />
      </div>
    </div>
  );
};
