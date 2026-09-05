import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Orbit } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

export const OrbitalGravitySim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parameters
  const [eccentricity, setEccentricity] = useState<number>(0.55); // 0 (circle) to 0.8 (eccentric ellipse)
  const [semiMajorAxis, setSemiMajorAxis] = useState<number>(140); // pixels
  const [starMass, setStarMass] = useState<number>(1.0); // solar masses
  const [showArealSectors, setShowArealSectors] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Orbital state (mean anomaly M)
  const stateRef = useRef({
    meanAnomaly: 0,
    orbitTrail: [] as Array<{ x: number; y: number }>,
    sectors: [] as Array<{ x: number; y: number }>,
  });

  const [currentMetrics, setCurrentMetrics] = useState({
    speedKmS: "29.8",
    distanceAU: "1.00",
    orbitalPeriod: "1.00",
    angularMomentum: "1.00",
  });
  const lastMetricsTimeRef = useRef<number>(0);

  // Solve Kepler's equation: M = E - e * sin(E) for Eccentric Anomaly E using Newton-Raphson
  const solveKepler = (M: number, e: number): number => {
    let E = M;
    for (let i = 0; i < 6; i++) {
      const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= delta;
      if (Math.abs(delta) < 1e-6) break;
    }
    return E;
  };

  const handleReset = () => {
    stateRef.current.meanAnomaly = 0;
    stateRef.current.orbitTrail = [];
    stateRef.current.sectors = [];
  };

  // Main animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const a = semiMajorAxis;
      const e = eccentricity;
      // Semi-minor axis: b = a * sqrt(1 - e^2)
      const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
      // Focus distance from center: c = a * e
      const c = a * e;

      // Kepler's 3rd law: mean motion n = sqrt(mu / a^3)
      const meanMotion = 0.8 * Math.sqrt(starMass / Math.pow(a / 120, 3));

      if (isRunning) {
        stateRef.current.meanAnomaly = (stateRef.current.meanAnomaly + meanMotion * dt) % (2 * Math.PI);
      }

      // Calculate position
      const M = stateRef.current.meanAnomaly;
      const E = solveKepler(M, e);

      // Coordinates relative to central star (placed at origin focus):
      // Planet position:
      const xPlanet = a * (Math.cos(E) - e);
      const yPlanet = b * Math.sin(E);
      const r = Math.sqrt(xPlanet * xPlanet + yPlanet * yPlanet);

      // Vis-viva equation: v^2 = GM * (2/r - 1/a)
      const vNorm = Math.sqrt(Math.max(0.1, starMass * (2 / r - 1 / a))) * 35;

      if (now - lastMetricsTimeRef.current > 100) {
        lastMetricsTimeRef.current = now;
        setCurrentMetrics({
          speedKmS: vNorm.toFixed(1),
          distanceAU: (r / 120).toFixed(2),
          orbitalPeriod: (Math.pow(a / 120, 1.5) / Math.sqrt(starMass)).toFixed(2),
          angularMomentum: (Math.sqrt(starMass * a * (1 - e * e)) / 10).toFixed(2),
        });
      }

      // Harmonices Mundi Multi-Sensory Sonification:
      if (sonificationEnabled && isRunning) {
        const pan = Math.max(-1, Math.min(1, xPlanet / (a * 1.5)));
        const normY = Math.max(0, Math.min(1, (yPlanet + a * 1.2) / (a * 2.4)));
        const gField = Math.min(1.0, (starMass * 1000) / (r * r));
        const centripetalAcc = (vNorm * vNorm) / (r || 1);
        const orbitalPhase = Math.atan2(yPlanet, xPlanet);

        sonifier.updatePhysicsState({
          velocity: vNorm * 1.6,
          positionX: pan,
          positionY: normY,
          energy: 0.2 + (1 - e) * 0.5,
          acceleration: centripetalAcc * 0.8,
          fieldStrength: gField,
          phase: orbitalPhase,
          quantizePentatonic: level === "explorer" || level === "middle_school",
        });
      } else {
        sonifier.stopContinuousTone();
      }

      // Canvas Rendering
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Deep cosmic backdrop
          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, w, h);

          // Starfield particles
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          const seed = 42;
          for (let i = 0; i < 40; i++) {
            const sx = ((i * 97 + seed) % w);
            const sy = ((i * 131 + seed) % h);
            ctx.fillRect(sx, sy, 1.5, 1.5);
          }

          // Center of view
          const starX = w * 0.45;
          const starY = h * 0.5;

          // Draw full orbit ellipse
          ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // Ellipse center is shifted from star focus by -c
          ctx.ellipse(starX - c, starY, a, b, 0, 0, 2 * Math.PI);
          ctx.stroke();

          // Second empty focus marker
          ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
          ctx.beginPath();
          ctx.arc(starX - 2 * c, starY, 3, 0, 2 * Math.PI);
          ctx.stroke();

          // Equal Areas Sector Sweeps (Kepler's 2nd Law)
          if (showArealSectors) {
            // Draw sector triangle from Star to Planet
            ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
            ctx.beginPath();
            ctx.moveTo(starX, starY);
            ctx.lineTo(starX + xPlanet, starY + yPlanet);
            // Draw previous arc segment
            const prevE = solveKepler((M - 0.2 + 2 * Math.PI) % (2 * Math.PI), e);
            const prevX = a * (Math.cos(prevE) - e);
            const prevY = b * Math.sin(prevE);
            ctx.lineTo(starX + prevX, starY + prevY);
            ctx.closePath();
            ctx.fill();
          }

          // Radius vector line from Star to Planet
          ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(starX, starY);
          ctx.lineTo(starX + xPlanet, starY + yPlanet);
          ctx.stroke();
          ctx.setLineDash([]);

          // Central Star (Sun)
          const starRadius = 14 + starMass * 3;
          const starGrad = ctx.createRadialGradient(starX, starY, 2, starX, starY, starRadius);
          starGrad.addColorStop(0, "#fef08a");
          starGrad.addColorStop(0.6, "#f59e0b");
          starGrad.addColorStop(1, "rgba(217, 119, 6, 0)");
          ctx.fillStyle = starGrad;
          ctx.beginPath();
          ctx.arc(starX, starY, starRadius + 6, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(starX, starY, starRadius, 0, 2 * Math.PI);
          ctx.fill();

          // Orbiting Planet
          const px = starX + xPlanet;
          const py = starY + yPlanet;
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Velocity vector tangent
          // vx = -a * sin(E) * E_dot, vy = b * cos(E) * E_dot
          const edot = meanMotion / (1 - e * Math.cos(E));
          const vx = -a * Math.sin(E) * edot * 1.5;
          const vy = b * Math.cos(E) * edot * 1.5;
          drawArrow(ctx, px, py, px + vx, py + vy, "#10b981", "v");

          // Perihelion / Aphelion annotations
          ctx.fillStyle = "#94a3b8";
          ctx.font = "10px sans-serif";
          ctx.fillText("Perihelion (Max Speed)", starX + a * (1 - e) - 20, starY - 14);
          ctx.fillText("Aphelion (Min Speed)", starX - a * (1 + e) - 40, starY - 14);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      sonifier.stopContinuousTone();
    };
  }, [eccentricity, semiMajorAxis, starMass, showArealSectors, isRunning, sonificationEnabled, level]);

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
    ctx.fillText(label, toX + 5, toY - 3);
  };

  const speakState = () => {
    const desc = `Orbital mechanics simulation: Orbit eccentricity is ${eccentricity}, semi-major axis is ${(semiMajorAxis / 120).toFixed(2)} astronomical units. Current distance from star is ${currentMetrics.distanceAU} AU, and current orbital speed is ${currentMetrics.speedKmS} kilometers per second. Perihelion speed is maximum and aphelion speed is minimum.`;
    sonifier.speakNarration(desc);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              Orbital Mechanics & Kepler's Laws
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">
              {level === "explorer"
                ? "Explorer: Planets Circling the Sun"
                : level === "middle_school"
                ? "Middle School: Gravity & Orbit Speeds"
                : level === "high_school"
                ? "High School: Kepler's Laws of Planetary Motion"
                : level === "college"
                ? "College: Vis-Viva & Orbital Energy"
                : "Master's: Runge-Lenz Vector & Symplectic Manifolds"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Johannes Kepler's "Music of the Spheres" (Harmonices Mundi): listen to the orbital pitch surge at perihelion and fall at aphelion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-orbit-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="reset-orbit-btn"
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Reset Orbit"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="toggle-orbit-btn"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isRunning ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-blue-600 text-white hover:bg-blue-700"
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
          className="w-full h-full object-contain"
          title="Keplerian Orbit Simulation Canvas"
        />

        {/* Live Metrics HUD */}
        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-sm text-xs text-white grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <span className="text-slate-400 block text-[10px]">Speed v:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{currentMetrics.speedKmS} km/s</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Radius r:</span>
            <span className="font-bold text-amber-400 font-mono text-sm">{currentMetrics.distanceAU} AU</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Period T:</span>
            <span className="font-mono text-slate-300">{currentMetrics.orbitalPeriod} yr</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Angular Mom L:</span>
            <span className="font-mono text-blue-300">{currentMetrics.angularMomentum}</span>
          </div>
        </div>

        {/* Sensory Mode Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-md text-[11px] text-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Kepler's Harmonices Mundi (Pitch ∝ Speed)</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="orbit-eccentricity" className="font-medium">Eccentricity e: {eccentricity.toFixed(2)}</label>
          </div>
          <input
            id="orbit-eccentricity"
            type="range"
            min="0.0"
            max="0.75"
            step="0.05"
            value={eccentricity}
            onChange={(e) => setEccentricity(parseFloat(e.target.value))}
            className="w-full accent-amber-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="orbit-semi-major-axis" className="font-medium">Semi-Major Axis a: {(semiMajorAxis / 120).toFixed(2)} AU</label>
          </div>
          <input
            id="orbit-semi-major-axis"
            type="range"
            min="80"
            max="180"
            step="5"
            value={semiMajorAxis}
            onChange={(e) => setSemiMajorAxis(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="orbit-star-mass" className="font-medium">Central Star Mass M: {starMass.toFixed(1)} M☉</label>
          </div>
          <input
            id="orbit-star-mass"
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={starMass}
            onChange={(e) => setStarMass(parseFloat(e.target.value))}
            className="w-full accent-yellow-600"
          />
        </div>
      </div>

      {/* Footer & Equations */}
      <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Kepler's Laws of Planetary Motion:</span>
        <KatexMath math="v^2 = G M \left(\frac{2}{r} - \frac{1}{a}\right), \quad T^2 = \frac{4\pi^2}{G M} a^3, \quad \frac{dA}{dt} = \frac{L}{2m} = \text{const}" inline />
      </div>
    </div>
  );
};
