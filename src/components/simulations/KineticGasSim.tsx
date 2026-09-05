import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Thermometer } from "lucide-react";
import { sonifier } from "../../utils/sonification";
import { KatexMath } from "../../utils/katexHelper";
import { EducationLevel } from "../../types";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const KineticGasSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parameters
  const [temperature, setTemperature] = useState<number>(300); // Kelvin
  const [pistonWidthPercent, setPistonWidthPercent] = useState<number>(75); // % of chamber width
  const [particleCount, setParticleCount] = useState<number>(60);
  const [gasType, setGasType] = useState<"helium" | "nitrogen" | "xenon">("nitrogen");
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Gas particle mass
  const massRatio = gasType === "helium" ? 4 : gasType === "nitrogen" ? 28 : 131;

  // Particles state
  const moleculesRef = useRef<Molecule[]>([]);
  const wallCollisionsRef = useRef<number>(0);

  const [pressureAtm, setPressureAtm] = useState<string>("1.00");
  const [vRms, setVRms] = useState<string>("515");

  // Initialize or re-scale molecules
  const initMolecules = () => {
    const arr: Molecule[] = [];
    const chamberW = (700 * pistonWidthPercent) / 100;
    const speedBase = Math.sqrt(temperature / massRatio) * 14;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = speedBase * (0.6 + Math.random() * 0.8);
      arr.push({
        x: 30 + Math.random() * (chamberW - 60),
        y: 30 + Math.random() * (300 - 60),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: gasType === "helium" ? 4 : gasType === "nitrogen" ? 5 : 6,
      });
    }
    moleculesRef.current = arr;
  };

  useEffect(() => {
    initMolecules();
  }, [particleCount, gasType]);

  // Adjust speeds when temperature changes
  useEffect(() => {
    const targetSpeedBase = Math.sqrt(temperature / massRatio) * 14;
    moleculesRef.current.forEach((m) => {
      const currentSpeed = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
      const angle = Math.atan2(m.vy, m.vx);
      const newSpeed = targetSpeedBase * (0.6 + Math.random() * 0.8);
      m.vx = Math.cos(angle) * newSpeed;
      m.vy = Math.sin(angle) * newSpeed;
    });
  }, [temperature, massRatio]);

  // Periodic pressure calculation
  useEffect(() => {
    const interval = setInterval(() => {
      // Pressure = (Collisions * momentum) / Area
      const vRmsVal = Math.sqrt(temperature / massRatio) * 94;
      const volFrac = pistonWidthPercent / 100;
      const pressureVal = ((particleCount * temperature) / (60 * 300 * volFrac)).toFixed(2);

      setPressureAtm(pressureVal);
      setVRms(vRmsVal.toFixed(0));
      wallCollisionsRef.current = 0;
    }, 250);
    return () => clearInterval(interval);
  }, [temperature, particleCount, pistonWidthPercent, massRatio]);

  // Sonification update
  useEffect(() => {
    if (sonificationEnabled && isRunning) {
      // Mean molecular speed maps to base pitch; temperature maps to thermal pitch drift & jitter
      const vRmsEst = Math.sqrt((3 * 8.314 * temperature) / (massRatio * 10)) * 14;
      const panPiston = (pistonWidthPercent / 50) - 1.0;
      const normEnergy = Math.min(1.0, temperature / 750);

      sonifier.updatePhysicsState({
        velocity: vRmsEst * 0.4,
        temperature: temperature,
        energy: normEnergy,
        positionX: panPiston * 0.5,
        positionY: 0.35,
      });
    } else {
      sonifier.stopContinuousTone();
    }
  }, [temperature, isRunning, pistonWidthPercent, massRatio, sonificationEnabled]);

  // Main animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Chamber boundary
      const chamberLeft = 20;
      const chamberTop = 20;
      const chamberBottom = h - 20;
      const chamberRight = chamberLeft + ((w - 180 - chamberLeft) * pistonWidthPercent) / 100;

      // Update positions & collisions if running
      if (isRunning) {
        const subSteps = 4;
        const subDt = dt / subSteps;

        for (let s = 0; s < subSteps; s++) {
          const mols = moleculesRef.current;
          for (let i = 0; i < mols.length; i++) {
            const m = mols[i];
            m.x += m.vx * subDt;
            m.y += m.vy * subDt;

            // Left wall
            if (m.x - m.radius < chamberLeft) {
              m.x = chamberLeft + m.radius;
              m.vx = -m.vx;
              wallCollisionsRef.current++;
              if (sonificationEnabled && Math.random() < 0.15) {
                sonifier.playImpact(0.2, -0.8);
              }
            }
            // Right piston wall
            if (m.x + m.radius > chamberRight) {
              m.x = chamberRight - m.radius;
              m.vx = -m.vx;
              wallCollisionsRef.current++;
              if (sonificationEnabled && Math.random() < 0.15) {
                sonifier.playImpact(0.2, 0.8);
              }
            }
            // Top wall
            if (m.y - m.radius < chamberTop) {
              m.y = chamberTop + m.radius;
              m.vy = -m.vy;
              wallCollisionsRef.current++;
            }
            // Bottom wall
            if (m.y + m.radius > chamberBottom) {
              m.y = chamberBottom - m.radius;
              m.vy = -m.vy;
              wallCollisionsRef.current++;
            }
          }
        }
      }

      const isDark = document.documentElement.classList.contains("dark-mode");

      // Draw Chamber interior
      ctx.fillStyle = isDark ? "#070c18" : "#f8fafc";
      ctx.fillRect(chamberLeft, chamberTop, chamberRight - chamberLeft, chamberBottom - chamberTop);

      // Chamber outer walls
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(chamberRight, chamberTop);
      ctx.lineTo(chamberLeft, chamberTop);
      ctx.lineTo(chamberLeft, chamberBottom);
      ctx.lineTo(chamberRight, chamberBottom);
      ctx.stroke();

      // Movable Piston Head (Right wall)
      ctx.fillStyle = "#475569";
      ctx.fillRect(chamberRight, chamberTop - 4, 14, chamberBottom - chamberTop + 8);
      // Piston rod
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(chamberRight + 14, h / 2 - 8, w - 180 - chamberRight, 16);

      // Draw Molecules with color according to speed
      const avgSpeed = Math.sqrt(temperature / massRatio) * 14;
      moleculesRef.current.forEach((m) => {
        const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        const ratio = speed / (avgSpeed || 1);

        // Cold blue -> medium green -> hot red
        ctx.fillStyle = ratio < 0.8 ? "#3b82f6" : ratio < 1.3 ? "#10b981" : "#ef4444";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Maxwell-Boltzmann Distribution Graph on right panel
      const graphLeft = w - 160;
      const graphTop = 30;
      const graphW = 140;
      const graphH = 120;

      ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
      ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.7)" : "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.fillRect(graphLeft, graphTop, graphW, graphH);
      ctx.strokeRect(graphLeft, graphTop, graphW, graphH);

      ctx.fillStyle = isDark ? "#cbd5e1" : "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText("Speed Distribution f(v)", graphLeft + 6, graphTop + 14);

      // Theoretical Maxwell-Boltzmann curve: f(v) ~ v^2 * exp(-v^2 / (2 a^2))
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const aParam = avgSpeed;
      for (let vx = 0; vx <= graphW; vx += 2) {
        const v = (vx / graphW) * avgSpeed * 3;
        const f = (v * v) * Math.exp(-(v * v) / (2 * aParam * aParam));
        const maxF = aParam * aParam * 0.36; // peak normalization
        const gy = graphTop + graphH - (f / maxF) * (graphH - 25) - 4;
        if (vx === 0) ctx.moveTo(graphLeft + vx, gy);
        else ctx.lineTo(graphLeft + vx, gy);
      }
      ctx.stroke();

      // Pressure Gauge
      const gaugeY = graphTop + graphH + 45;
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`P = ${pressureAtm} atm`, graphLeft + 15, gaugeY);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px monospace";
      ctx.fillText(`v_rms = ${vRms} m/s`, graphLeft + 15, gaugeY + 18);
      ctx.fillText(`T = ${temperature} K`, graphLeft + 15, gaugeY + 36);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      sonifier.stopContinuousTone();
    };
  }, [pistonWidthPercent, temperature, isRunning, sonificationEnabled, massRatio, pressureAtm, vRms]);

  const speakState = () => {
    const desc = `Kinetic gas simulation: Gas is ${gasType}, temperature is ${temperature} Kelvin. Piston chamber volume is at ${pistonWidthPercent} percent. Measured container pressure is ${pressureAtm} atmospheres, and root mean square molecular speed is ${vRms} meters per second.`;
    sonifier.speakNarration(desc);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Simulation Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              Kinetic Gas Theory & Maxwell-Boltzmann Distribution
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 font-medium">
              {level === "explorer"
                ? "Explorer: Bouncing Gas Molecules"
                : level === "middle_school"
                ? "Middle School: Temperature & Pressure"
                : level === "high_school"
                ? "High School: Ideal Gas Law PV = nRT"
                : level === "college"
                ? "College: Maxwell-Boltzmann Distribution"
                : "Master's: Partition Functions & Microstates"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hear macroscopic pressure as stereo collision clicks and thermal energy as ambient acoustic drone.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="speak-state-gas-btn"
            onClick={speakState}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Read state aloud (Auditory Accessibility)"
            aria-label="Read state aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            id="reset-gas-btn"
            onClick={initMolecules}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Re-randomize gas particles"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="toggle-gas-btn"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isRunning ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause" : "Simulate"}
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full h-80 bg-slate-50 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={720}
          height={320}
          className="w-full h-full object-contain"
          title="Kinetic Gas Collision Canvas"
        />

        {/* Sensory Mode Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 rounded-md text-[11px] text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-red-500" />
          <span>Pitch = Temp T | Clicks = Wall Collisions (Pressure)</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="gas-temperature" className="font-medium flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-red-500" />
              Temperature T: {temperature} K
            </label>
          </div>
          <input
            id="gas-temperature"
            type="range"
            min="100"
            max="750"
            step="10"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            className="w-full accent-red-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="gas-volume-piston" className="font-medium">Chamber Volume (Piston): {pistonWidthPercent}%</label>
          </div>
          <input
            id="gas-volume-piston"
            type="range"
            min="40"
            max="100"
            step="5"
            value={pistonWidthPercent}
            onChange={(e) => setPistonWidthPercent(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-600 mb-1">
            <label htmlFor="gas-molecule-count" className="font-medium">Particle Count N: {particleCount}</label>
          </div>
          <input
            id="gas-molecule-count"
            type="range"
            min="20"
            max="100"
            step="5"
            value={particleCount}
            onChange={(e) => setParticleCount(parseInt(e.target.value))}
            className="w-full accent-emerald-600"
          />
        </div>

        <div>
          <label htmlFor="gas-type-select" className="font-medium text-slate-600 block mb-1">Gas Element:</label>
          <select
            id="gas-type-select"
            value={gasType}
            onChange={(e) => setGasType(e.target.value as any)}
            className="w-full p-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
          >
            <option value="helium">Helium (He, 4 g/mol)</option>
            <option value="nitrogen">Nitrogen (N₂, 28 g/mol)</option>
            <option value="xenon">Xenon (Xe, 131 g/mol)</option>
          </select>
        </div>
      </div>

      {/* Key Formula Footer */}
      <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Thermodynamic State Equation:</span>
        <KatexMath math="P V = N k_B T, \quad v_{\text{rms}} = \sqrt{\frac{3 k_B T}{m}}, \quad f(v) = 4\pi \left(\frac{m}{2\pi k_B T}\right)^{3/2} v^2 e^{-\frac{m v^2}{2 k_B T}}" inline />
      </div>
    </div>
  );
};
