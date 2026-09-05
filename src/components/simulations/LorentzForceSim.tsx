import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Zap } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number }>;
}

export const LorentzForceSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parameters
  const [chargeType, setChargeType] = useState<"positive" | "negative" | "neutral">("positive");
  const [magFieldB, setMagFieldB] = useState<number>(1.2); // Tesla (positive = out of screen, negative = into screen)
  const [electricFieldE, setElectricFieldE] = useState<number>(0.0); // V/m (vertical)
  const [initialSpeed, setInitialSpeed] = useState<number>(40); // m/s
  const [particleMass, setParticleMass] = useState<number>(1.0); // relative mass
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Particle tracking
  const particleRef = useRef<ParticleState>({
    x: 100,
    y: 160,
    vx: 40,
    vy: 0,
    trail: [],
  });

  const qValue = chargeType === "positive" ? 1.0 : chargeType === "negative" ? -1.0 : 0.0;

  // Cyclotron angular frequency: omega_c = |q * B| / m
  const omegaC = Math.abs(qValue * magFieldB) / particleMass;
  // Cyclotron radius: r = m * v / (|q| * B)
  const cyclotronRadius = magFieldB !== 0 && qValue !== 0 ? (particleMass * initialSpeed) / (Math.abs(qValue * magFieldB)) : 0;

  const handleReset = () => {
    particleRef.current = {
      x: 80,
      y: 160,
      vx: initialSpeed,
      vy: 0,
      trail: [],
    };
  };

  useEffect(() => {
    if (!sonificationEnabled || !isRunning) {
      sonifier.stopContinuousTone();
    }
  }, [isRunning, sonificationEnabled]);

  // Main animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      if (isRunning) {
        // Multi-substep Boris / Verlet pusher for magnetic Lorentz force
        const subSteps = 8;
        const subDt = dt / subSteps;

        for (let s = 0; s < subSteps; s++) {
          const p = particleRef.current;
          // Lorentz force: F = q * (E + v x B)
          // B is along z-axis (perpendicular to screen)
          // v x B = (vy * B, -vx * B, 0)
          // E is along y-axis
          const fx = qValue * (p.vy * magFieldB);
          const fy = qValue * (electricFieldE * 0.1 - p.vx * magFieldB);

          const ax = fx / particleMass;
          const ay = fy / particleMass;

          p.vx += ax * subDt;
          p.vy += ay * subDt;
          p.x += p.vx * subDt * 2.2;
          p.y += p.vy * subDt * 2.2;

          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 400) {
            p.trail.shift();
          }

          // Wrap around or bounce boundary
          if (p.x > 710) p.x = 20;
          if (p.x < 10) p.x = 700;
          if (p.y > 310) p.y = 20;
          if (p.y < 10) p.y = 300;
        }

        // Real-time Multi-Sensory Sonification
        if (sonificationEnabled) {
          const p = particleRef.current;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const pan = Math.min(1.0, Math.max(-1.0, (p.x / 360) - 1.0));
          const normY = Math.min(1.0, Math.max(0, p.y / 320));
          const fStrength = Math.min(1.0, Math.abs(magFieldB) / 4.0);
          const orbitalPhase = Math.atan2(p.vy, p.vx);
          const centripetalAcc = Math.abs(qValue * magFieldB * speed) / particleMass;

          sonifier.updatePhysicsState({
            velocity: speed * 1.8,
            positionX: pan,
            positionY: normY,
            energy: Math.min(1.0, (0.5 * particleMass * speed * speed) / 800),
            acceleration: centripetalAcc,
            fieldStrength: fStrength,
            phase: orbitalPhase,
          });
        }
      } else {
        if (sonificationEnabled) {
          sonifier.stopContinuousTone();
        }
      }

      // Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Draw Magnetic Field Grid Symbols (x for into screen, dot for out of screen)
          const isIntoScreen = magFieldB < 0;
          const fieldAbs = Math.abs(magFieldB);
          ctx.strokeStyle = isIntoScreen ? "#cbd5e1" : "#bfdbfe";
          ctx.fillStyle = isIntoScreen ? "#94a3b8" : "#93c5fd";
          ctx.lineWidth = 1;

          const gridSpacing = 40;
          for (let gx = 30; gx < w; gx += gridSpacing) {
            for (let gy = 30; gy < h; gy += gridSpacing) {
              if (fieldAbs > 0.1) {
                if (isIntoScreen) {
                  // Draw 'X'
                  ctx.beginPath();
                  ctx.moveTo(gx - 4, gy - 4);
                  ctx.lineTo(gx + 4, gy + 4);
                  ctx.moveTo(gx + 4, gy - 4);
                  ctx.lineTo(gx - 4, gy + 4);
                  ctx.stroke();
                } else {
                  // Draw Dot with circle
                  ctx.beginPath();
                  ctx.arc(gx, gy, 2, 0, 2 * Math.PI);
                  ctx.fill();
                  ctx.beginPath();
                  ctx.arc(gx, gy, 5, 0, 2 * Math.PI);
                  ctx.stroke();
                }
              }
            }
          }

          // Electric Field Arrows (vertical) if electricFieldE !== 0
          if (Math.abs(electricFieldE) > 0.1) {
            ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
            ctx.fillStyle = "rgba(249, 115, 22, 0.35)";
            ctx.lineWidth = 1.5;
            const dir = electricFieldE > 0 ? 1 : -1;
            for (let ex = 60; ex < w; ex += 90) {
              for (let ey = 60; ey < h - 40; ey += 70) {
                const arrowLen = 22 * dir;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex, ey + arrowLen);
                ctx.stroke();
              }
            }
          }

          // Particle Trail
          const p = particleRef.current;
          if (p.trail.length > 1) {
            ctx.beginPath();
            p.trail.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.strokeStyle = chargeType === "positive" ? "#ef4444" : chargeType === "negative" ? "#3b82f6" : "#64748b";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Particle Body
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = chargeType === "positive" ? "#dc2626" : chargeType === "negative" ? "#2563eb" : "#475569";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Charge sign on particle
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px monospace";
          const sign = chargeType === "positive" ? "+" : chargeType === "negative" ? "-" : "0";
          ctx.fillText(sign, p.x - 3.5, p.y + 4);

          // Force and Velocity Vectors
          const vScale = 0.5;
          // Velocity (Green)
          drawArrow(ctx, p.x, p.y, p.x + p.vx * vScale, p.y + p.vy * vScale, "#10b981", "v");

          // Magnetic Force Vector (Purple)
          if (fieldAbs > 0.05 && qValue !== 0) {
            const fMagX = qValue * (p.vy * magFieldB) * 0.8;
            const fMagY = -qValue * (p.vx * magFieldB) * 0.8;
            drawArrow(ctx, p.x, p.y, p.x + fMagX, p.y + fMagY, "#8b5cf6", "F_B");
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
  }, [chargeType, magFieldB, electricFieldE, particleMass, isRunning, qValue, sonificationEnabled]);

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) => {
    const headLen = 6;
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

  const speakState = () => {
    const desc = `Lorentz force simulation: Particle charge is ${chargeType}, mass is ${particleMass}. Magnetic field is ${magFieldB} Tesla. Cyclotron frequency is ${omegaC.toFixed(2)} radians per second, and cyclotron radius is ${cyclotronRadius.toFixed(1)} meters.`;
    sonifier.speakNarration(desc);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              Lorentz Force & Cyclotron Dynamics
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">
              {level === "explorer"
                ? "Explorer: Magnets & Sparks"
                : level === "middle_school"
                ? "Middle School: Magnetic Deflection"
                : level === "high_school"
                ? "High School: Lorentz Force F = q(E + v×B)"
                : level === "college"
                ? "College: Cyclotron Frequency & Helices"
                : "Master's: Guiding Center Drift & Invariants"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hear the cyclotron resonance pitch: tune the magnetic field B to pitch-shift the orbital frequency in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-lorentz-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="reset-lorentz-btn"
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Reset Particle Position"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="toggle-lorentz-btn"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isRunning
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full h-80 bg-slate-900/5 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={320}
          className="w-full h-full object-contain cursor-crosshair"
          title="Lorentz Force Simulator Canvas"
        />

        {/* Live HUD Floating Card */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-500">Cyclotron Freq ω_c:</span>
            <span className="font-bold text-purple-700">{omegaC.toFixed(2)} rad/s</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-500">Orbit Radius r:</span>
            <span className="font-semibold text-slate-800">{cyclotronRadius.toFixed(1)} m</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-500">Magnetic Field B:</span>
            <span className="font-bold text-blue-600">
              {magFieldB.toFixed(1)} T ({magFieldB > 0 ? "Out of screen ⊙" : "Into screen ⊗"})
            </span>
          </div>
        </div>

        {/* Sensory Mode Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 rounded-md text-[11px] text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>Pitch = Cyclotron Resonance ω_c = qB/m</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label htmlFor="lorentz-charge-type" className="font-medium text-slate-700 block mb-1">Particle Charge:</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              id="charge-pos-btn"
              onClick={() => setChargeType("positive")}
              className={`py-1 text-center rounded border ${
                chargeType === "positive"
                  ? "bg-red-50 border-red-500 text-red-700 font-bold"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              +q (Proton)
            </button>
            <button
              id="charge-neg-btn"
              onClick={() => setChargeType("negative")}
              className={`py-1 text-center rounded border ${
                chargeType === "negative"
                  ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              -q (Electron)
            </button>
            <button
              id="charge-neu-btn"
              onClick={() => setChargeType("neutral")}
              className={`py-1 text-center rounded border ${
                chargeType === "neutral"
                  ? "bg-slate-100 border-slate-500 text-slate-800 font-bold"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              0 (Neutron)
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="lorentz-mag-field" className="font-medium">Magnetic Field B: {magFieldB.toFixed(1)} T</label>
          </div>
          <input
            id="lorentz-mag-field"
            type="range"
            min="-2.5"
            max="2.5"
            step="0.1"
            value={magFieldB}
            onChange={(e) => setMagFieldB(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="lorentz-electric-field" className="font-medium">Electric Field E: {electricFieldE.toFixed(0)} V/m</label>
          </div>
          <input
            id="lorentz-electric-field"
            type="range"
            min="-80"
            max="80"
            step="5"
            value={electricFieldE}
            onChange={(e) => setElectricFieldE(parseFloat(e.target.value))}
            className="w-full accent-amber-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="lorentz-initial-speed" className="font-medium">Initial Speed v: {initialSpeed} m/s</label>
          </div>
          <input
            id="lorentz-initial-speed"
            type="range"
            min="10"
            max="70"
            step="2"
            value={initialSpeed}
            onChange={(e) => setInitialSpeed(parseInt(e.target.value))}
            className="w-full accent-emerald-600"
          />
        </div>
      </div>

      {/* Key Formula Footer */}
      <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Lorentz Force Law:</span>
        <KatexMath math="\mathbf{F} = q(\mathbf{E} + \mathbf{v} \times \mathbf{B}), \quad \omega_c = \frac{q B}{m}" inline />
      </div>
    </div>
  );
};
