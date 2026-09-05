import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

export const HarmonicOscillatorSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Simulation Parameters
  const [length, setLength] = useState<number>(1.8); // meters (0.5m to 3.0m)
  const [mass, setMass] = useState<number>(1.0); // kg
  const [gravity, setGravity] = useState<number>(9.81); // m/s^2
  const [damping, setDamping] = useState<number>(0.05); // damping coefficient b
  const [drivingForce, setDrivingForce] = useState<number>(0.0); // external drive F0
  const [drivingFreq, setDrivingFreq] = useState<number>(2.3); // rad/s
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showPhaseSpace, setShowPhaseSpace] = useState<boolean>(level === "college" || level === "masters");

  // Interaction State for dragging pendulum bob
  const isDraggingRef = useRef<boolean>(false);

  // Physics State (preserved across renders)
  const stateRef = useRef({
    theta: Math.PI / 4, // 45 degrees initial
    omega: 0.0,
    time: 0,
    phaseHistory: [] as Array<{ theta: number; omega: number }>,
  });

  // Natural frequency omega_0 = sqrt(g / L)
  const omega0 = Math.sqrt(gravity / length);

  // Mutable params container for 60FPS animation loop without restarting effect
  const paramsRef = useRef({
    length,
    mass,
    gravity,
    damping,
    drivingForce,
    drivingFreq,
    showVectors,
    showPhaseSpace,
    sonificationEnabled,
    omega0,
    level,
  });

  // Keep paramsRef up to date on each render
  useEffect(() => {
    paramsRef.current = {
      length,
      mass,
      gravity,
      damping,
      drivingForce,
      drivingFreq,
      showVectors,
      showPhaseSpace,
      sonificationEnabled,
      omega0,
      level,
    };
  }, [
    length,
    mass,
    gravity,
    damping,
    drivingForce,
    drivingFreq,
    showVectors,
    showPhaseSpace,
    sonificationEnabled,
    omega0,
    level,
  ]);

  // Dynamic values for UI display (throttled updates)
  const [currentMetrics, setCurrentMetrics] = useState({
    thetaDeg: "45.0",
    speed: "0.00",
    kineticEnergy: "0.00",
    potentialEnergy: "0.00",
    naturalFreq: "2.33",
    resonanceRatio: "1.00",
  });

  const lastMetricsTimeRef = useRef<number>(0);
  const lastResonanceTriggerRef = useRef<number>(0);

  // Reset function
  const handleReset = () => {
    stateRef.current = {
      theta: Math.PI / 4,
      omega: 0.0,
      time: 0,
      phaseHistory: [],
    };
  };

  // Check resonance chime with debounce
  useEffect(() => {
    if (drivingForce > 0 && Math.abs(drivingFreq - omega0) < 0.15 && sonificationEnabled) {
      const now = performance.now();
      if (now - lastResonanceTriggerRef.current > 1500) {
        lastResonanceTriggerRef.current = now;
        sonifier.playResonanceHarmonic(440);
      }
    }
  }, [drivingFreq, drivingForce, omega0, sonificationEnabled]);

  // Main animation and physics rendering loop
  // Decoupled from parameter state to prevent cancelling/restarting the loop on slider adjustments
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;

      const p = paramsRef.current;
      const isDragging = isDraggingRef.current;

      if (isRunning && !isDragging) {
        // RK4 Integration for the nonlinear damped driven pendulum:
        // dθ/dt = ω
        // dω/dt = -(g/L)*sin(θ) - (b/m)*ω + (F0/m)*cos(ω_d * t)
        const subSteps = 6;
        const subDt = dt / subSteps;

        const getAlpha = (theta: number, omega: number, t: number) => {
          const drive = p.drivingForce > 0 ? (p.drivingForce / p.mass) * Math.cos(p.drivingFreq * t) : 0;
          return -(p.gravity / p.length) * Math.sin(theta) - (p.damping / p.mass) * omega + drive;
        };

        for (let i = 0; i < subSteps; i++) {
          const t0 = stateRef.current.time;
          const th0 = stateRef.current.theta;
          const om0 = stateRef.current.omega;

          // k1
          const k1_th = om0;
          const k1_om = getAlpha(th0, om0, t0);

          // k2
          const k2_th = om0 + 0.5 * subDt * k1_om;
          const k2_om = getAlpha(th0 + 0.5 * subDt * k1_th, om0 + 0.5 * subDt * k1_om, t0 + 0.5 * subDt);

          // k3
          const k3_th = om0 + 0.5 * subDt * k2_om;
          const k3_om = getAlpha(th0 + 0.5 * subDt * k2_th, om0 + 0.5 * subDt * k2_om, t0 + 0.5 * subDt);

          // k4
          const k4_th = om0 + subDt * k3_om;
          const k4_om = getAlpha(th0 + subDt * k3_th, om0 + subDt * k3_om, t0 + subDt);

          stateRef.current.theta += (subDt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
          stateRef.current.omega += (subDt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);
          stateRef.current.time += subDt;

          // Keep theta within [-π, π] for angle metrics while maintaining smooth phase
          if (stateRef.current.theta > Math.PI) stateRef.current.theta -= 2 * Math.PI;
          else if (stateRef.current.theta < -Math.PI) stateRef.current.theta += 2 * Math.PI;
        }

        // Store phase history for portrait
        stateRef.current.phaseHistory.push({
          theta: stateRef.current.theta,
          omega: stateRef.current.omega,
        });
        if (stateRef.current.phaseHistory.length > 260) {
          stateRef.current.phaseHistory.shift();
        }

        // Kinetic & Potential energy calculations
        const linSpeed = Math.abs(stateRef.current.omega * p.length);
        const ke = 0.5 * p.mass * linSpeed * linSpeed;
        const pe = p.mass * p.gravity * p.length * (1 - Math.cos(stateRef.current.theta));

        // Throttled UI metrics update (approx 10Hz) to prevent DOM thrashing
        if (now - lastMetricsTimeRef.current > 100) {
          lastMetricsTimeRef.current = now;
          setCurrentMetrics({
            thetaDeg: ((stateRef.current.theta * 180) / Math.PI).toFixed(1),
            speed: linSpeed.toFixed(2),
            kineticEnergy: ke.toFixed(2),
            potentialEnergy: pe.toFixed(2),
            naturalFreq: p.omega0.toFixed(2),
            resonanceRatio: (p.drivingFreq / (p.omega0 || 1)).toFixed(2),
          });
        }

        // Real-time Multi-Sensory Sonification
        if (p.sonificationEnabled) {
          const pan = Math.sin(stateRef.current.theta);
          const normY = Math.min(1.0, Math.max(0, 1 - Math.cos(stateRef.current.theta)));
          const totalE = ke + pe;
          const maxPossibleE = p.mass * p.gravity * p.length * 1.5 + 0.1;
          const normE = Math.min(1.0, totalE / maxPossibleE);
          const driveAcc = p.drivingForce > 0 ? (p.drivingForce / p.mass) * Math.cos(p.drivingFreq * stateRef.current.time) : 0;
          const tangAcc = Math.abs(-p.gravity * Math.sin(stateRef.current.theta) - (p.damping / p.mass) * stateRef.current.omega + driveAcc) * p.length;
          const phaseAngle = stateRef.current.theta + Math.PI / 2;

          sonifier.updatePhysicsState({
            velocity: linSpeed * 2.2,
            positionX: pan,
            positionY: 0.2 + normY * 0.8,
            energy: normE,
            acceleration: tangAcc,
            fieldStrength: Math.min(1.0, p.drivingForce / 10),
            phase: phaseAngle,
            quantizePentatonic: p.level === "explorer" || p.level === "middle_school",
          });
        }
      } else {
        if (p.sonificationEnabled && !isDragging) {
          sonifier.stopContinuousTone();
        }
      }

      // -----------------------------------------------------------------------
      // Canvas Rendering
      // -----------------------------------------------------------------------
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          ctx.clearRect(0, 0, width, height);

          // Dark mode detection
          const isDark = document.documentElement.classList.contains("dark-mode");

          // Background technical grid
          ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.45)" : "#f1f5f9";
          ctx.lineWidth = 1;
          const gridSize = 32;
          for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // -------------------------------------------------------------------
          // Geometry & Adaptive Pixel Scaling
          // Ensures the bob is ALWAYS fully visible even at length = 3.0m
          // -------------------------------------------------------------------
          const pivotX = p.showPhaseSpace ? width * 0.32 : width * 0.5;
          const pivotY = 38; // Compact top pivot bracket

          // Bob radius based on mass
          const bobRadius = 14 + Math.min(10, p.mass * 2.5);

          // Reserve margin at bottom for velocity & restoring force vector arrows
          const reservedBottomMargin = 45;
          const maxAvailableVertical = height - pivotY - bobRadius - reservedBottomMargin;

          // Scale factor (pixels per meter):
          // At max slider length (3.0m), length * pixelScale <= maxAvailableVertical
          const maxSliderLength = 3.0;
          const pixelScale = Math.min(95, maxAvailableVertical / maxSliderLength);

          // Rod pixel length
          const bobDist = p.length * pixelScale;

          // Bob coordinates
          const bobX = pivotX + bobDist * Math.sin(stateRef.current.theta);
          const bobY = pivotY + bobDist * Math.cos(stateRef.current.theta);

          // Support ceiling beam
          ctx.fillStyle = isDark ? "#475569" : "#64748b";
          ctx.fillRect(pivotX - 65, pivotY - 14, 130, 14);
          for (let i = -55; i <= 55; i += 14) {
            ctx.beginPath();
            ctx.moveTo(pivotX + i, pivotY - 14);
            ctx.lineTo(pivotX + i + 10, pivotY - 24);
            ctx.strokeStyle = isDark ? "#64748b" : "#94a3b8";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Equilibrium dotted reference line
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.4)" : "#cbd5e1";
          ctx.beginPath();
          ctx.moveTo(pivotX, pivotY);
          ctx.lineTo(pivotX, pivotY + bobDist + 28);
          ctx.stroke();
          ctx.setLineDash([]);

          // Arc for angle theta
          const arcRadius = Math.min(42, bobDist * 0.45);
          if (arcRadius > 15) {
            ctx.beginPath();
            ctx.arc(
              pivotX,
              pivotY,
              arcRadius,
              Math.PI / 2,
              Math.PI / 2 + stateRef.current.theta,
              stateRef.current.theta < 0
            );
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Pendulum Rod
          ctx.beginPath();
          ctx.moveTo(pivotX, pivotY);
          ctx.lineTo(bobX, bobY);
          ctx.strokeStyle = isDark ? "#94a3b8" : "#475569";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Pivot joint pin
          ctx.beginPath();
          ctx.arc(pivotX, pivotY, 6, 0, 2 * Math.PI);
          ctx.fillStyle = isDark ? "#cbd5e1" : "#1e293b";
          ctx.fill();
          ctx.strokeStyle = isDark ? "#0f172a" : "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Bob Circle (with 3D sphere gradient highlight)
          ctx.beginPath();
          ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
          const gradient = ctx.createRadialGradient(
            bobX - bobRadius * 0.3,
            bobY - bobRadius * 0.3,
            bobRadius * 0.1,
            bobX,
            bobY,
            bobRadius
          );
          gradient.addColorStop(0, "#93c5fd");
          gradient.addColorStop(0.3, "#3b82f6");
          gradient.addColorStop(1, "#1d4ed8");
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.strokeStyle = isDark ? "#60a5fa" : "#1e40af";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Interactive Drag Indicator ring when hovering / dragging
          if (isDragging) {
            ctx.beginPath();
            ctx.arc(bobX, bobY, bobRadius + 6, 0, 2 * Math.PI);
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Force & Velocity Vectors
          if (p.showVectors) {
            const linSpeed = stateRef.current.omega * p.length;
            // Tangential velocity vector (perpendicular to rod)
            const vScale = 22;
            const vx = linSpeed * Math.cos(stateRef.current.theta) * vScale;
            const vy = -linSpeed * Math.sin(stateRef.current.theta) * vScale;
            drawArrow(ctx, bobX, bobY, bobX + vx, bobY + vy, "#10b981", "v (velocity)");

            // Restoring force component: F_restoring = -m * g * sin(theta)
            const restoring = -p.gravity * Math.sin(stateRef.current.theta) * 2.8;
            const rx = restoring * Math.cos(stateRef.current.theta);
            const ry = -restoring * Math.sin(stateRef.current.theta);
            drawArrow(ctx, bobX, bobY, bobX + rx, bobY + ry, "#ef4444", "F_restoring");
          }

          // -------------------------------------------------------------------
          // Phase Space Portrait (θ vs ω)
          // -------------------------------------------------------------------
          if (p.showPhaseSpace) {
            const psX = width * 0.76;
            const psY = height * 0.46;
            const psSize = Math.min(140, Math.floor(width * 0.25));

            // Phase space frame
            ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.95)";
            ctx.strokeStyle = isDark ? "rgba(71, 85, 105, 0.8)" : "#e2e8f0";
            ctx.lineWidth = 1.5;
            ctx.fillRect(psX - psSize / 2, psY - psSize / 2, psSize, psSize);
            ctx.strokeRect(psX - psSize / 2, psY - psSize / 2, psSize, psSize);

            // Phase space axes
            ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.3)" : "#cbd5e1";
            ctx.beginPath();
            ctx.moveTo(psX - psSize / 2, psY);
            ctx.lineTo(psX + psSize / 2, psY);
            ctx.moveTo(psX, psY - psSize / 2);
            ctx.lineTo(psX, psY + psSize / 2);
            ctx.stroke();

            // Labels
            ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
            ctx.font = "bold 9px sans-serif";
            ctx.fillText("θ (angle)", psX + psSize / 2 - 38, psY - 4);
            ctx.fillText("ω (vel)", psX + 4, psY - psSize / 2 + 12);
            ctx.font = "bold 10px sans-serif";
            ctx.fillStyle = isDark ? "#cbd5e1" : "#334155";
            ctx.fillText("Phase Space", psX - psSize / 2 + 8, psY - psSize / 2 + 14);

            // Plot trajectory without spurious wrap-around streaks
            const history = stateRef.current.phaseHistory;
            if (history.length > 1) {
              const scaleTheta = (psSize / 2) / (Math.PI * 0.85);
              const scaleOmega = (psSize / 2) / 6.0;

              ctx.beginPath();
              for (let idx = 0; idx < history.length; idx++) {
                const pt = history[idx];
                const px = psX + pt.theta * scaleTheta;
                const py = psY - pt.omega * scaleOmega;

                // Detect wrap-around to avoid line crossing the portrait
                if (
                  idx === 0 ||
                  Math.abs(pt.theta - history[idx - 1].theta) > Math.PI * 0.8
                ) {
                  ctx.moveTo(px, py);
                } else {
                  ctx.lineTo(px, py);
                }
              }
              ctx.strokeStyle = "#8b5cf6";
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Current phase point
              const curX = psX + stateRef.current.theta * scaleTheta;
              const curY = psY - stateRef.current.omega * scaleOmega;
              ctx.beginPath();
              ctx.arc(curX, curY, 3.5, 0, 2 * Math.PI);
              ctx.fillStyle = "#a855f7";
              ctx.fill();
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
  }, [isRunning]);

  // Arrow drawing helper
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) => {
    const headLen = 8;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) return;

    const angle = Math.atan2(dy, dx);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = "bold 10px sans-serif";
    ctx.fillText(label, toX + 5, toY - 3);
  };

  // ---------------------------------------------------------------------------
  // Interactive Pointer / Touch Dragging of Pendulum Bob
  // ---------------------------------------------------------------------------
  const updateThetaFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    const pivotX = showPhaseSpace ? canvas.width * 0.32 : canvas.width * 0.5;
    const pivotY = 38;

    const dx = x - pivotX;
    const dy = y - pivotY;

    // Angle theta from vertical: theta = atan2(dx, dy)
    let newTheta = Math.atan2(dx, Math.max(10, dy));
    // Clamp to [-75 deg, +75 deg] for realistic natural release
    newTheta = Math.max(-1.3, Math.min(1.3, newTheta));

    stateRef.current.theta = newTheta;
    stateRef.current.omega = 0.0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateThetaFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      updateThetaFromPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  // Verbal description for screen-readers & auditory accessibility
  const speakState = () => {
    const desc = `Harmonic oscillator status: Pendulum length is ${length} meters, mass ${mass} kilograms. Current angle is ${currentMetrics.thetaDeg} degrees. Speed is ${currentMetrics.speed} meters per second. Kinetic energy is ${currentMetrics.kineticEnergy} Joules. Natural resonant frequency is ${currentMetrics.naturalFreq} radians per second.`;
    sonifier.speakNarration(desc);
  };

  // Kinetic & Potential energy bar split percentages
  const keVal = parseFloat(currentMetrics.kineticEnergy) || 0;
  const peVal = parseFloat(currentMetrics.potentialEnergy) || 0;
  const totalE = keVal + peVal;
  const kineticPct = totalE > 0.001 ? Math.min(100, Math.max(0, (keVal / totalE) * 100)) : 50;
  const potentialPct = 100 - kineticPct;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Harmonic Oscillator & Pendulum Dynamics
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium">
              {level === "explorer"
                ? "Explorer: Playground Swings"
                : level === "middle_school"
                ? "Middle School: Pendulum Periods"
                : level === "high_school"
                ? "High School: Simple Harmonic Motion"
                : level === "college"
                ? "College: Damped & Driven Resonance"
                : "Master's: Symplectic Phase Space & Liouville"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-sensory simulation with velocity-to-pitch sonification, interactive drag-and-release, and phase space portrait.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-pendulum-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="reset-pendulum-btn"
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Reset to Initial Angle (45°)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="play-pause-pendulum-btn"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs ${
              isRunning
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause" : "Simulate"}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage (Fixed Stable Height, Zero Layout Thrashing) */}
      <div
        ref={containerRef}
        className="relative w-full h-[380px] bg-slate-50 dark:bg-slate-950 overflow-hidden select-none border-b border-slate-200 dark:border-slate-800"
      >
        <canvas
          ref={canvasRef}
          width={720}
          height={380}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
          title="Drag the pendulum bob to displace it to any initial angle"
        />

        {/* Live HUD Floating Card (Fixed Width & Tabular Numerals to Prevent Vibration) */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-sm text-xs flex flex-col gap-1.5 w-48 pointer-events-none select-none">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-500 dark:text-slate-400">Angle θ:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
              {currentMetrics.thetaDeg}°
            </span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-500 dark:text-slate-400">Speed v:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {currentMetrics.speed} m/s
            </span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-500 dark:text-slate-400">Resonant ω₀:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {currentMetrics.naturalFreq} rad/s
            </span>
          </div>

          {/* Real-time Energy Split Bar */}
          <div className="w-full mt-0.5">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 font-medium tabular-nums">
              <span>Kinetic ({currentMetrics.kineticEnergy}J)</span>
              <span>Potential ({currentMetrics.potentialEnergy}J)</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${kineticPct}%` }}
              />
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${potentialPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sensory Mode Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[11px] text-slate-600 dark:text-slate-300 pointer-events-none select-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Pitch = Speed | Pan = Position | Drag Bob to Set</span>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
            <label htmlFor="pendulum-length" className="font-medium">
              Length L: <span className="font-mono tabular-nums">{length.toFixed(2)} m</span>
            </label>
          </div>
          <input
            id="pendulum-length"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={length}
            onChange={(e) => setLength(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0.5 m</span>
            <span>3.0 m</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
            <label htmlFor="pendulum-mass" className="font-medium">
              Mass m: <span className="font-mono tabular-nums">{mass.toFixed(2)} kg</span>
            </label>
          </div>
          <input
            id="pendulum-mass"
            type="range"
            min="0.2"
            max="5.0"
            step="0.1"
            value={mass}
            onChange={(e) => setMass(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0.2 kg</span>
            <span>5.0 kg</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
            <label htmlFor="pendulum-damping" className="font-medium">
              Damping b: <span className="font-mono tabular-nums">{damping.toFixed(3)}</span>
            </label>
          </div>
          <input
            id="pendulum-damping"
            type="range"
            min="0.0"
            max="0.4"
            step="0.01"
            value={damping}
            onChange={(e) => setDamping(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0 (undamped)</span>
            <span>0.40 (heavy)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
            <label htmlFor="pendulum-gravity" className="font-medium">
              Gravity g: <span className="font-mono tabular-nums">{gravity.toFixed(2)} m/s²</span>
            </label>
          </div>
          <select
            id="pendulum-gravity"
            value={gravity}
            onChange={(e) => setGravity(parseFloat(e.target.value))}
            className="w-full p-1.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value="9.81">Earth (9.81 m/s²)</option>
            <option value="1.62">Moon (1.62 m/s²)</option>
            <option value="3.71">Mars (3.71 m/s²)</option>
            <option value="24.79">Jupiter (24.79 m/s²)</option>
          </select>
        </div>
      </div>

      {/* Advanced Level Options (Middle School, High School, College & Master's) */}
      {level !== "explorer" && (
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300">Force & Velocity Vectors</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPhaseSpace}
                onChange={(e) => setShowPhaseSpace(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300">Phase Space Portrait (θ vs ω)</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-300">External Drive F₀:</span>
            <input
              type="range"
              min="0.0"
              max="2.5"
              step="0.1"
              value={drivingForce}
              onChange={(e) => setDrivingForce(parseFloat(e.target.value))}
              className="w-24 accent-purple-600 cursor-pointer"
            />
            {drivingForce > 0 && (
              <span className="text-purple-700 dark:text-purple-300 font-mono text-[11px] tabular-nums inline-block min-w-[170px]">
                ω_d: {drivingFreq.toFixed(1)} rad/s (ratio: {currentMetrics.resonanceRatio})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Key Formula Footer (Stable Layout, No Dynamic Scrollbar) */}
      <div className="p-3 bg-slate-100/70 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2 overflow-hidden">
        <span className="font-semibold text-slate-800 dark:text-slate-100">Governing Equation:</span>
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-0.5">
          {level === "explorer" || level === "middle_school" ? (
            <KatexMath math="T \approx 2\pi \sqrt{\frac{L}{g}}" inline />
          ) : level === "high_school" ? (
            <KatexMath math="\frac{d^2\theta}{dt^2} + \frac{g}{L}\theta = 0, \quad \omega_0 = \sqrt{\frac{g}{L}}" inline />
          ) : level === "college" ? (
            <KatexMath math="\frac{d^2\theta}{dt^2} + \frac{b}{m}\frac{d\theta}{dt} + \frac{g}{L}\sin\theta = \frac{F_0}{m}\cos(\omega_d t)" inline />
          ) : (
            <KatexMath math="\mathcal{H}(\theta, p_\theta) = \frac{p_\theta^2}{2m L^2} + m g L(1 - \cos\theta), \quad \dot{p}_\theta = -\frac{\partial \mathcal{H}}{\partial \theta}" inline />
          )}
        </div>
      </div>
    </div>
  );
};
