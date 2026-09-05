import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Shield, Radiation, Activity, Info } from "lucide-react";
import { EducationLevel } from "../../types";
import { KatexMath } from "../../utils/katexHelper";
import { sonifier } from "../../utils/sonification";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

type DecayType = "alpha" | "beta" | "gamma" | "rutherford";
type ShieldType = "none" | "paper" | "aluminum" | "lead";

// Isotopes specs moved to module scope to prevent re-instantiation on every render
const ISOTOPE_DETAILS = {
  alpha: {
    name: "Uranium-238 (α-decay)",
    equation: "^{238}_{92}\\text{U} \\to ^{234}_{90}\\text{Th} + ^4_2\\alpha + 4.27\\text{ MeV}",
    halfLifeSec: 15, // scaled for lab observation
    particleName: "Alpha particle (⁴₂He²⁺)",
    particleSpeed: 3.5,
    color: "#ef4444", // Red
    description: "Heavy helium-4 nucleus with +2e charge and high linear energy transfer (LET). Stopped by a sheet of paper.",
  },
  beta: {
    name: "Carbon-14 (β⁻-decay)",
    equation: "^{14}_6\\text{C} \\to ^{14}_7\\text{N} + e^- + \\bar{\\nu}_e + 0.156\\text{ MeV}",
    halfLifeSec: 20,
    particleName: "Beta electron (e⁻)",
    particleSpeed: 6.5,
    color: "#3b82f6", // Blue
    description: "High-speed relativistic electron emitted with an antineutrino. Penetrates paper; stopped by aluminum.",
  },
  gamma: {
    name: "Technetium-99m (γ-decay)",
    equation: "^{99m}_{43}\\text{Tc} \\to ^{99}_{43}\\text{Tc} + \\gamma\\,(140.5\\text{ keV})",
    halfLifeSec: 12,
    particleName: "Gamma photon (γ)",
    particleSpeed: 9.0,
    color: "#a855f7", // Purple
    description: "High-energy electromagnetic photon of zero rest mass. Highly penetrating; attenuated exponentially by dense lead.",
  },
  rutherford: {
    name: "Rutherford Scattering",
    equation: "\\frac{d\\sigma}{d\\Omega} = \\left( \\frac{z Z e^2}{4\\pi\\varepsilon_0 \\cdot 4 E_k} \\right)^2 \\frac{1}{\\sin^4(\\theta/2)}",
    halfLifeSec: 30,
    particleName: "Alpha beam on Gold nucleus",
    particleSpeed: 5.0,
    color: "#eab308", // Gold
    description: "Coulomb repulsion reveals the atomic nucleus: most alphas pass straight through, rare ones backscatter at large angles.",
  },
};

export const NuclearDecaySim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const [decayType, setDecayType] = useState<DecayType>("alpha");
  const [shield, setShield] = useState<ShieldType>("none");
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [timeSec, setTimeSec] = useState<number>(0);
  const [countsPerSec, setCountsPerSec] = useState<number>(0);
  const [totalDetected, setTotalDetected] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; type: DecayType; blocked: boolean }>>([]);
  const decayHistoryRef = useRef<Array<{ t: number; n: number }>>([{ t: 0, n: 1000 }]);

  const currentIso = ISOTOPE_DETAILS[decayType];
  const lambda = Math.LN2 / currentIso.halfLifeSec;

  // Compute remaining parent nuclei at time t
  const remainingN = Math.max(0, Math.floor(sampleSize * Math.exp(-lambda * timeSec)));
  const activityBq = remainingN * lambda;
  const activityBqRef = useRef<number>(activityBq);
  activityBqRef.current = activityBq;

  // Transmission factor through shield
  const transmissionFactor = (() => {
    if (shield === "none") return 1.0;
    if (decayType === "alpha") {
      return shield === "paper" || shield === "aluminum" || shield === "lead" ? 0.0 : 1.0;
    }
    if (decayType === "beta") {
      if (shield === "paper") return 0.9;
      if (shield === "aluminum" || shield === "lead") return 0.02;
      return 1.0;
    }
    if (decayType === "gamma") {
      if (shield === "paper") return 0.98;
      if (shield === "aluminum") return 0.85;
      if (shield === "lead") return 0.12; // 88% absorbed
      return 1.0;
    }
    // Rutherford: foil causes scattering
    return 0.75;
  })();

  // Periodic particle emission & Geiger sound
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeSec((prev) => {
        const nextT = prev + 0.1;
        // update history every 0.5s
        if (Math.floor(nextT * 2) !== Math.floor(prev * 2)) {
          const n = Math.max(0, Math.floor(sampleSize * Math.exp(-lambda * nextT)));
          decayHistoryRef.current.push({ t: nextT, n });
          if (decayHistoryRef.current.length > 50) decayHistoryRef.current.shift();
        }
        return nextT;
      });

      // Spawn particles proportionally to activity
      const spawnRate = (activityBqRef.current / 80) * 1.5;
      const numToSpawn = Math.random() < spawnRate ? 1 : 0;

      for (let i = 0; i < numToSpawn; i++) {
        const angle = (Math.random() - 0.5) * 0.7; // beam cone directed right
        particlesRef.current.push({
          x: 100,
          y: 150 + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * currentIso.particleSpeed,
          vy: Math.sin(angle) * currentIso.particleSpeed,
          life: 0,
          type: decayType,
          blocked: false,
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, currentIso.particleSpeed, decayType, lambda, sampleSize]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let detectorHitsThisSec = 0;
    let secCounter = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = "#0f172a"; // Deep navy
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 1. Source Lead Collimator Box (x: 40 to 100, y: 110 to 190)
      ctx.fillStyle = "#475569";
      ctx.fillRect(40, 110, 60, 80);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 110, 60, 80);

      // Radiation symbol inside source
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(70, 150, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("RAD", 60, 153);

      // Collimator aperture channel
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(85, 142, 20, 16);

      // 2. Shielding Barrier (x: 280 to 305)
      const shieldX = 280;
      if (shield !== "none") {
        let shieldColor = "#f8fafc";
        let shieldBorder = "#cbd5e1";
        let shieldLabel = "Paper";
        let shieldWidth = 6;

        if (shield === "paper") {
          shieldColor = "#fef08a";
          shieldBorder = "#ca8a04";
          shieldLabel = "Paper Sheet";
          shieldWidth = 8;
        } else if (shield === "aluminum") {
          shieldColor = "#94a3b8";
          shieldBorder = "#64748b";
          shieldLabel = "2mm Al Plate";
          shieldWidth = 16;
        } else if (shield === "lead") {
          shieldColor = "#334155";
          shieldBorder = "#0f172a";
          shieldLabel = "5cm Lead Brick";
          shieldWidth = 28;
        }

        ctx.fillStyle = shieldColor;
        ctx.fillRect(shieldX, 50, shieldWidth, 200);
        ctx.strokeStyle = shieldBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(shieldX, 50, shieldWidth, 200);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "10px sans-serif";
        ctx.fillText(shieldLabel, shieldX - 15, 42);
      }

      // Rutherford Gold Foil Target if in Rutherford mode
      if (decayType === "rutherford") {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(shieldX, 60, 6, 180);
        ctx.fillStyle = "#fef08a";
        ctx.font = "10px sans-serif";
        ctx.fillText("Gold Foil (Au)", shieldX - 25, 52);
      }

      // 3. Geiger-Müller Detector Tube (x: 480 to 580, y: 115 to 185)
      const detectorX = 480;
      const detectorY = 115;
      const detectorW = 100;
      const detectorH = 70;

      // Detector body cylinder
      const grad = ctx.createLinearGradient(detectorX, detectorY, detectorX, detectorY + detectorH);
      grad.addColorStop(0, "#475569");
      grad.addColorStop(0.5, "#64748b");
      grad.addColorStop(1, "#334155");
      ctx.fillStyle = grad;
      ctx.fillRect(detectorX, detectorY, detectorW, detectorH);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(detectorX, detectorY, detectorW, detectorH);

      // Mica thin window on left
      ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
      ctx.fillRect(detectorX, detectorY + 12, 6, detectorH - 24);

      // High voltage anode central wire
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(detectorX + 6, detectorY + detectorH / 2);
      ctx.lineTo(detectorX + detectorW - 8, detectorY + detectorH / 2);
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("G-M Detector Tube", detectorX + 12, detectorY - 6);
      ctx.fillStyle = "#f8fafc";
      ctx.fillText("Anode (+450V)", detectorX + 16, detectorY + 40);

      // 4. Update and Draw Radiation Particles
      if (isRunning) {
        particlesRef.current.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;

          // Shield Collision check
          if (!p.blocked && shield !== "none" && p.x >= shieldX && p.x <= shieldX + 25) {
            if (Math.random() > transmissionFactor) {
              p.blocked = true;
              p.vx = 0;
              p.vy = 0;
            }
          }

          // Rutherford gold scattering
          if (decayType === "rutherford" && Math.abs(p.x - shieldX) < 8) {
            // small fraction undergo massive Coulomb backscattering
            if (Math.random() < 0.15) {
              const theta = Math.PI - (Math.random() * 0.8 + 0.3); // backscatter
              p.vx = -Math.cos(theta) * currentIso.particleSpeed;
              p.vy = Math.sin(theta) * currentIso.particleSpeed * (Math.random() > 0.5 ? 1 : -1);
            }
          }

          // Detector Entry check
          if (!p.blocked && p.x >= detectorX && p.x <= detectorX + 15 && p.y >= detectorY && p.y <= detectorY + detectorH) {
            detectorHitsThisSec++;
            setTotalDetected((prev) => prev + 1);
            p.blocked = true;

            // Geiger audio click
            if (sonificationEnabled) {
              sonifier.playGeigerClick(0.6);
            }
          }

          // Draw particle
          ctx.beginPath();
          if (p.type === "gamma") {
            // wavy photon ray
            ctx.strokeStyle = p.blocked ? "rgba(168, 85, 247, 0.2)" : currentIso.color;
            ctx.lineWidth = 2;
            ctx.arc(p.x, p.y + Math.sin(p.life * 0.8) * 4, 3, 0, Math.PI * 2);
            ctx.fillStyle = currentIso.color;
            ctx.fill();
          } else {
            ctx.fillStyle = p.blocked ? "rgba(148, 163, 184, 0.4)" : currentIso.color;
            ctx.arc(p.x, p.y, p.type === "alpha" ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Filter out dead or escaped particles
        particlesRef.current = particlesRef.current.filter((p) => p.life < 140 && p.x < w && p.x > 0);

        // Update CPS counter once every ~30 frames (0.5s)
        secCounter++;
        if (secCounter % 30 === 0) {
          setCountsPerSec(detectorHitsThisSec * 2);
          detectorHitsThisSec = 0;
        }
      }

      // Small Live Decay Graph in bottom right
      const gX = w - 170;
      const gY = h - 95;
      const gW = 150;
      const gH = 75;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(gX, gY, gW, gH);
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(gX, gY, gW, gH);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px sans-serif";
      ctx.fillText("N(t) = N₀ e^(-λt)", gX + 8, gY + 12);

      const history = decayHistoryRef.current;
      if (history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        history.forEach((pt, i) => {
          const px = gX + 10 + (i / (history.length - 1)) * (gW - 20);
          const py = gY + gH - 10 - (pt.n / sampleSize) * (gH - 25);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [currentIso, decayType, isRunning, sampleSize, shield, sonificationEnabled, transmissionFactor]);

  const handleReset = () => {
    setTimeSec(0);
    setTotalDetected(0);
    setCountsPerSec(0);
    particlesRef.current = [];
    decayHistoryRef.current = [{ t: 0, n: sampleSize }];
    setIsRunning(true);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Nuclear & Particle Physics
            </span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-medium">
              {level === "explorer"
                ? "Explorer: Glowing Atoms & Decay"
                : level === "middle_school"
                ? "Middle School: Half-Life & Shielding"
                : level === "high_school"
                ? "High School: Exponential Decay N(t) = N₀e^(-λt)"
                : level === "college"
                ? "College: Activity A(t) = λN & Decay Chains"
                : "Master's: Fermi's Golden Rule & Mass Formula"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Radioactivity, Half-Life & Rutherford Scattering Lab
          </h2>
          <p className="text-xs text-slate-600">
            Simulate alpha, beta, and gamma radiation, test matter attenuation with paper, aluminum, and lead, and hear real Geiger counter sonification.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="nuclear-play-pause-btn"
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-xs"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause Emission" : "Resume"}
          </button>
          <button
            id="nuclear-reset-btn"
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Reset sample and decay timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas & Live Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs text-slate-600 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Radiation className="w-4 h-4 text-purple-600" />
              Ionizing Beam Chamber & Geiger Counter
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                Alpha ($^4_2\alpha$)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Beta ($e^-$)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                Gamma ($\gamma$)
              </span>
            </div>
          </div>

          <div className="w-full relative flex justify-center bg-slate-900 rounded-lg p-2 border border-slate-800 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={660}
              height={300}
              className="w-full max-w-[660px] h-auto object-contain rounded-md"
            />
          </div>

          {/* Quick Guidance Box */}
          <div className="w-full mt-3 p-3 bg-purple-50/70 border border-purple-200/60 rounded-lg text-xs text-purple-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Penetration & Shielding Rule:</span>
              <strong>Alpha (<KatexMath math="{}^4_2\\text{He}" inline />)</strong> particles are heavy and doubly charged (+2e), so they deposit intense energy across short distances and are stopped by a mere <strong>sheet of paper</strong> or air. <strong>Beta (<KatexMath math="e^-" inline />)</strong> particles penetrate paper easily but are shielded by a few millimeters of <strong>aluminum</strong>. <strong>Gamma (<KatexMath math="\\gamma" inline />)</strong> rays are massless high-energy photons requiring dense <strong>lead</strong> shielding to attenuate.
            </div>
          </div>
        </div>

        {/* Controls & Governing Math */}
        <div className="lg:col-span-4 space-y-4">
          {/* Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Isotope & Shielding Controls
            </h3>

            {/* Isotope Selection */}
            <div className="space-y-1.5">
              <label htmlFor="isotope-select" className="text-xs font-semibold text-slate-700 block">Radioactive Isotope / Mode:</label>
              <div id="isotope-select" className="grid grid-cols-2 gap-1.5 text-xs">
                {(["alpha", "beta", "gamma", "rutherford"] as const).map((iso) => (
                  <button
                    key={iso}
                    id={`iso-${iso}`}
                    onClick={() => {
                      setDecayType(iso);
                      handleReset();
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium capitalize transition-all ${
                      decayType === iso
                        ? "bg-purple-600 text-white border-purple-600 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {iso === "rutherford" ? "Rutherford Foil" : iso.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Shielding Material Choice */}
            <div className="space-y-1.5">
              <label htmlFor="shield-material-select" className="text-xs font-semibold text-slate-700 block">Radiation Shield Barrier:</label>
              <div id="shield-material-select" className="grid grid-cols-4 gap-1 text-xs">
                {(["none", "paper", "aluminum", "lead"] as const).map((s) => (
                  <button
                    key={s}
                    id={`shield-${s}`}
                    onClick={() => setShield(s)}
                    className={`py-1 px-1 rounded-lg border text-center font-medium capitalize transition-all ${
                      shield === s
                        ? "bg-slate-800 text-white border-slate-800 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Barrier Transmission: {(transmissionFactor * 100).toFixed(0)}%
              </span>
            </div>

            {/* Live Readouts */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Geiger Rate (CPS):</span>
                <span className="font-mono font-bold text-purple-700">{countsPerSec} counts/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Counts Detected:</span>
                <span className="font-mono font-bold text-slate-800">{totalDetected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Parent Nuclei:</span>
                <span className="font-mono text-slate-800">{remainingN} / {sampleSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sample Half-Life ($T_{1/2}$):</span>
                <span className="font-mono text-slate-800">{currentIso.halfLifeSec} s (Scaled)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Decay Constant ($\lambda$):</span>
                <span className="font-mono text-slate-800">{lambda.toFixed(3)} s⁻¹</span>
              </div>
            </div>
          </div>

          {/* Governing Math Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2.5">
            <span className="font-bold text-slate-800 block">Governing Nuclear Equations:</span>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <KatexMath math={currentIso.equation} inline={false} />
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                Disintegration Reaction
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <KatexMath math="N(t) = N_0 e^{-\lambda t}, \quad A(t) = -\frac{dN}{dt} = \lambda N(t)" inline={false} />
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                Exponential Radioactive Decay Law
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
