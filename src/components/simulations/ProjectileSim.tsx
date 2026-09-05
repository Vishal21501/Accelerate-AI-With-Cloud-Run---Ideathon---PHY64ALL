import React, { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, Sparkles, Target } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

export const ProjectileSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parameters
  const [angleDeg, setAngleDeg] = useState<number>(45);
  const [initialSpeed, setInitialSpeed] = useState<number>(35); // m/s
  const [launchHeight, setLaunchHeight] = useState<number>(0); // m
  const [gravity, setGravity] = useState<number>(9.81);
  const [dragCoeff, setDragCoeff] = useState<number>(0.0); // quadratic drag
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [isFlying, setIsFlying] = useState<boolean>(false);

  // Active projectile state
  const simState = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    t: 0,
    path: [] as TrajectoryPoint[],
    ghostPaths: [] as TrajectoryPoint[][],
  });

  const [metrics, setMetrics] = useState({
    timeOfFlight: "0.00",
    maxHeight: "0.00",
    totalRange: "0.00",
    currentSpeed: "0.00",
    currentX: "0.00",
    currentY: "0.00",
  });
  const lastMetricsTimeRef = useRef<number>(0);

  // Fire cannon
  const handleFire = () => {
    // If currently flying, save previous path to ghost paths
    if (simState.current.path.length > 0) {
      simState.current.ghostPaths.push([...simState.current.path]);
      if (simState.current.ghostPaths.length > 3) {
        simState.current.ghostPaths.shift();
      }
    }

    const rad = (angleDeg * Math.PI) / 180;
    simState.current.x = 0;
    simState.current.y = launchHeight;
    simState.current.vx = initialSpeed * Math.cos(rad);
    simState.current.vy = initialSpeed * Math.sin(rad);
    simState.current.t = 0;
    simState.current.path = [
      {
        x: 0,
        y: launchHeight,
        vx: simState.current.vx,
        vy: simState.current.vy,
        t: 0,
      },
    ];

    setIsFlying(true);

    if (sonificationEnabled) {
      sonifier.playImpact(0.8, -0.8); // cannon blast trigger
    }
  };

  const handleClearPaths = () => {
    simState.current.path = [];
    simState.current.ghostPaths = [];
    setIsFlying(false);
    sonifier.stopContinuousTone();
  };

  // Main physics animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (isFlying) {
        // Multi-substep numerical integration
        const subSteps = 6;
        const subDt = dt / subSteps;

        for (let i = 0; i < subSteps; i++) {
          const v = Math.sqrt(
            simState.current.vx * simState.current.vx + simState.current.vy * simState.current.vy
          );

          // Drag force magnitude: F_d = 0.5 * rho * Cd * A * v^2 -> simplified as dragCoeff * v^2
          const dragFx = -dragCoeff * v * simState.current.vx;
          const dragFy = -dragCoeff * v * simState.current.vy;

          const ax = dragFx;
          const ay = -gravity + dragFy;

          simState.current.vx += ax * subDt;
          simState.current.vy += ay * subDt;
          simState.current.x += simState.current.vx * subDt;
          simState.current.y += simState.current.vy * subDt;
          simState.current.t += subDt;

          simState.current.path.push({
            x: simState.current.x,
            y: simState.current.y,
            vx: simState.current.vx,
            vy: simState.current.vy,
            t: simState.current.t,
          });

          // Check ground impact
          if (simState.current.y <= 0 && simState.current.t > 0.05) {
            simState.current.y = 0;
            setIsFlying(false);

            if (sonificationEnabled) {
              const impactVel = Math.min(1.0, v / 50);
              const pan = Math.min(1.0, simState.current.x / 120);
              sonifier.playImpact(impactVel, pan);
              sonifier.stopContinuousTone();
            }
            break;
          }
        }

        // Compute metrics
        const maxH = simState.current.path.reduce((max, p) => Math.max(max, p.y), 0);
        const curV = Math.sqrt(
          simState.current.vx * simState.current.vx + simState.current.vy * simState.current.vy
        );

        if (!simState.current.isFlying || now - lastMetricsTimeRef.current > 100) {
          lastMetricsTimeRef.current = now;
          setMetrics({
            timeOfFlight: simState.current.t.toFixed(2),
            maxHeight: maxH.toFixed(2),
            totalRange: simState.current.x.toFixed(2),
            currentSpeed: curV.toFixed(2),
            currentX: simState.current.x.toFixed(2),
            currentY: simState.current.y.toFixed(2),
          });
        }

        // Real-time Multi-Sensory Sonification:
        if (sonificationEnabled) {
          const pan = Math.min(1.0, Math.max(-1.0, (simState.current.x / 100) * 2 - 1));
          const normY = Math.min(1.0, Math.max(0, simState.current.y / (maxH || 40)));
          const totalE = 0.5 * curV * curV + gravity * simState.current.y;
          const maxE = 0.5 * (initialSpeed * initialSpeed) + 0.1;
          const normE = Math.min(1.0, totalE / maxE);
          const ax = -dragCoeff * curV * simState.current.vx;
          const ay = -gravity - dragCoeff * curV * simState.current.vy;
          const totalAcc = Math.sqrt(ax * ax + ay * ay);

          sonifier.updatePhysicsState({
            velocity: curV * 1.5,
            positionX: pan,
            positionY: normY,
            energy: normE,
            acceleration: totalAcc,
            fieldStrength: Math.min(1.0, gravity / 25),
            quantizePentatonic: level === "explorer" || level === "middle_school",
          });
        }
      }

      // Drawing to Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          ctx.clearRect(0, 0, w, h);

          // Grid coordinates
          const originX = 50;
          const groundY = h - 45;
          // Dynamic scale: 1 meter = 4.2 pixels
          const meterScale = 4.2;

          // Check theme mode
          const isDark = document.documentElement.classList.contains("dark-mode");

          // Sky / background
          ctx.fillStyle = isDark ? "#070c18" : "#f8fafc";
          ctx.fillRect(0, 0, w, groundY);

          // Ground
          ctx.fillStyle = isDark ? "#111827" : "#e2e8f0";
          ctx.fillRect(0, groundY, w, h - groundY);
          ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, groundY);
          ctx.lineTo(w, groundY);
          ctx.stroke();

          // Distance distance tick marks
          ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
          ctx.font = "10px monospace";
          for (let m = 20; m <= 160; m += 20) {
            const tx = originX + m * meterScale;
            if (tx < w) {
              ctx.beginPath();
              ctx.moveTo(tx, groundY);
              ctx.lineTo(tx, groundY + 8);
              ctx.stroke();
              ctx.fillText(`${m}m`, tx - 8, groundY + 20);
            }
          }

          // Launch tower / cliff if launchHeight > 0
          if (launchHeight > 0) {
            const cliffH = launchHeight * meterScale;
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(originX - 25, groundY - cliffH, 30, cliffH);
            ctx.strokeStyle = "#64748b";
            ctx.strokeRect(originX - 25, groundY - cliffH, 30, cliffH);
          }

          // Cannon barrel
          const cannonBaseY = groundY - launchHeight * meterScale;
          const rad = (angleDeg * Math.PI) / 180;
          const barrelLen = 28;
          const barrelEndX = originX + barrelLen * Math.cos(rad);
          const barrelEndY = cannonBaseY - barrelLen * Math.sin(rad);

          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 7;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(originX, cannonBaseY);
          ctx.lineTo(barrelEndX, barrelEndY);
          ctx.stroke();

          // Cannon base wheel
          ctx.beginPath();
          ctx.arc(originX, cannonBaseY, 10, 0, 2 * Math.PI);
          ctx.fillStyle = "#475569";
          ctx.fill();

          // Ghost Paths from previous trials
          simState.current.ghostPaths.forEach((ghost) => {
            if (ghost.length < 2) return;
            ctx.beginPath();
            ghost.forEach((p, idx) => {
              const px = originX + p.x * meterScale;
              const py = groundY - p.y * meterScale;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          });

          // Active Path
          if (simState.current.path.length > 1) {
            ctx.beginPath();
            simState.current.path.forEach((p, idx) => {
              const px = originX + p.x * meterScale;
              const py = groundY - p.y * meterScale;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = "#2563eb";
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Current projectile position
          if (simState.current.path.length > 0) {
            const cur = simState.current.path[simState.current.path.length - 1];
            const px = originX + cur.x * meterScale;
            const py = groundY - cur.y * meterScale;

            ctx.beginPath();
            ctx.arc(px, py, 7, 0, 2 * Math.PI);
            ctx.fillStyle = "#ef4444";
            ctx.fill();
            ctx.strokeStyle = "#b91c1c";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Vector decomposition
            if (showVectors && isFlying) {
              const scaleVec = 1.0;
              // vx (green)
              drawArrow(ctx, px, py, px + cur.vx * scaleVec, py, "#10b981", "vx");
              // vy (blue)
              drawArrow(ctx, px, py, px, py - cur.vy * scaleVec, "#3b82f6", "vy");
              // Resultant v (orange)
              drawArrow(ctx, px, py, px + cur.vx * scaleVec, py - cur.vy * scaleVec, "#f59e0b", "v");
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
  }, [angleDeg, initialSpeed, launchHeight, gravity, dragCoeff, isFlying, showVectors, sonificationEnabled, level]);

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) => {
    const headLen = 7;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3) return;

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
    ctx.fillText(label, toX + 4, toY - 2);
  };

  const speakState = () => {
    const desc = `Projectile simulation: Launch angle is ${angleDeg} degrees, initial speed ${initialSpeed} meters per second. Flight time is ${metrics.timeOfFlight} seconds. Maximum height achieved is ${metrics.maxHeight} meters, total range is ${metrics.totalRange} meters.`;
    sonifier.speakNarration(desc);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              2D Projectile Kinematics & Aerodynamic Drag
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-medium">
              {level === "explorer"
                ? "Explorer: Kicking a Ball"
                : level === "middle_school"
                ? "Middle School: Speed & Free Fall"
                : level === "high_school"
                ? "High School: Parabolic Trajectory & Vectors"
                : level === "college"
                ? "College: Aerodynamic Drag & ODEs"
                : "Master's: Ballistic Numerical Integration"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time trajectory integration with orthogonal vector decomposition, Doppler sonification, and atmospheric drag.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-projectile-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="clear-projectile-btn"
            onClick={handleClearPaths}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Clear all trajectories"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="fire-projectile-btn"
            onClick={handleFire}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95"
          >
            <Target className="w-3.5 h-3.5" />
            {isFlying ? "Fire Again" : "Launch Projectile"}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full h-80 bg-slate-50 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={320}
          className="w-full h-full object-contain cursor-crosshair"
          title="Interactive Projectile Motion Canvas"
        />

        {/* Live Metrics Floating HUD */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <span className="text-slate-500 block text-[10px]">Range:</span>
            <span className="font-bold text-blue-600 font-mono text-sm">{metrics.totalRange} m</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Max Altitude:</span>
            <span className="font-bold text-purple-600 font-mono text-sm">{metrics.maxHeight} m</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Time of Flight:</span>
            <span className="font-mono text-slate-800">{metrics.timeOfFlight} s</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Speed v:</span>
            <span className="font-mono text-emerald-600 font-semibold">{metrics.currentSpeed} m/s</span>
          </div>
        </div>

        {/* Sensory Mode Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 rounded-md text-[11px] text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Pitch = Velocity | Panning = Distance</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="projectile-angle" className="font-medium">Launch Angle θ: {angleDeg}°</label>
          </div>
          <input
            id="projectile-angle"
            type="range"
            min="5"
            max="85"
            step="1"
            value={angleDeg}
            onChange={(e) => setAngleDeg(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="projectile-speed" className="font-medium">Speed v₀: {initialSpeed} m/s</label>
          </div>
          <input
            id="projectile-speed"
            type="range"
            min="10"
            max="60"
            step="1"
            value={initialSpeed}
            onChange={(e) => setInitialSpeed(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="projectile-height" className="font-medium">Platform Height: {launchHeight} m</label>
          </div>
          <input
            id="projectile-height"
            type="range"
            min="0"
            max="30"
            step="1"
            value={launchHeight}
            onChange={(e) => setLaunchHeight(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="projectile-gravity" className="font-medium">Gravity Field: {gravity} m/s²</label>
          </div>
          <select
            id="projectile-gravity"
            value={gravity}
            onChange={(e) => setGravity(parseFloat(e.target.value))}
            className="w-full p-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
          >
            <option value="9.81">Earth (g = 9.81 m/s²)</option>
            <option value="1.62">Moon (g = 1.62 m/s²)</option>
            <option value="3.71">Mars (g = 3.71 m/s²)</option>
            <option value="24.79">Jupiter (g = 24.79 m/s²)</option>
          </select>
        </div>
      </div>

      {/* Advanced Level: Air Drag and Vectors */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showVectors}
            onChange={(e) => setShowVectors(e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-slate-700">Display Orthogonal Velocity Components (vx, vy)</span>
        </label>

        <div className="flex items-center gap-3">
          <span className="text-slate-600 font-medium">Air Resistance Drag Cd:</span>
          <input
            type="range"
            min="0.0"
            max="0.015"
            step="0.001"
            value={dragCoeff}
            onChange={(e) => setDragCoeff(parseFloat(e.target.value))}
            className="w-28 accent-red-600"
          />
          <span className="text-slate-500 font-mono text-[11px]">
            {dragCoeff === 0 ? "Vacuum (0.0)" : dragCoeff.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Key Formula Footer */}
      <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Kinematic Law:</span>
        <KatexMath
          math={
            level === "explorer" || level === "middle_school"
              ? "v = \\frac{d}{t}, \\quad d = \\frac{1}{2} g t^2"
              : level === "high_school"
              ? "x(t) = v_0 \\cos\\theta \\cdot t, \\quad y(t) = v_0 \\sin\\theta \\cdot t - \\frac{1}{2} g t^2, \\quad R = \\frac{v_0^2 \\sin(2\\theta)}{g}"
              : "m \\frac{d\\mathbf{v}}{dt} = m \\mathbf{g} - \\frac{1}{2} C_d \\rho A |\\mathbf{v}| \\mathbf{v}"
          }
          inline
        />
      </div>
    </div>
  );
};
