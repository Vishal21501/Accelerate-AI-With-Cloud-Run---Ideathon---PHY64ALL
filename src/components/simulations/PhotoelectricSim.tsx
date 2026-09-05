import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Sun, Zap, Activity, Info } from "lucide-react";
import { EducationLevel } from "../../types";
import { KatexMath } from "../../utils/katexHelper";
import { sonifier } from "../../utils/sonification";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

interface TargetMetal {
  name: string;
  symbol: string;
  workFunctionEv: number;
  color: string;
}

const METALS: TargetMetal[] = [
  { name: "Cesium", symbol: "Cs", workFunctionEv: 2.14, color: "#d97706" },
  { name: "Potassium", symbol: "K", workFunctionEv: 2.30, color: "#eab308" },
  { name: "Sodium", symbol: "Na", workFunctionEv: 2.36, color: "#ca8a04" },
  { name: "Zinc", symbol: "Zn", workFunctionEv: 4.30, color: "#94a3b8" },
  { name: "Platinum", symbol: "Pt", workFunctionEv: 6.35, color: "#64748b" },
];

export const PhotoelectricSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  const [wavelengthNm, setWavelengthNm] = useState<number>(380); // 200 nm (UV) to 750 nm (IR)
  const [intensityPercent, setIntensityPercent] = useState<number>(60); // 0% to 100%
  const [retardingVoltage, setRetardingVoltage] = useState<number>(0.0); // -4.0 V to +4.0 V
  const [selectedMetal, setSelectedMetal] = useState<TargetMetal>(METALS[0]);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const electronsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);

  // Physical constants
  const hcEvNm = 1239.84; // hc in eV*nm
  const photonEnergyEv = hcEvNm / wavelengthNm;
  const maxKineticEnergyEv = Math.max(0, photonEnergyEv - selectedMetal.workFunctionEv);
  const stoppingPotentialV = maxKineticEnergyEv; // V_stop = K_max / e
  const thresholdWavelengthNm = hcEvNm / selectedMetal.workFunctionEv;
  const isEmissionAllowed = photonEnergyEv >= selectedMetal.workFunctionEv;

  // Effective velocity at anode: v_final = sqrt(2 * (K_max + e * V) / m_e)
  // If retarding voltage V is negative and |V| >= V_stop, electrons turn around before reaching anode
  const reachesAnode = isEmissionAllowed && (retardingVoltage >= -stoppingPotentialV);

  // Photocurrent calculation in microamps
  const photocurrentMicroAmps = reachesAnode
    ? (intensityPercent / 100) * (maxKineticEnergyEv * 2.5 + 1.2)
    : 0;

  // Helper to convert wavelength to RGB color
  function wavelengthToRgb(wl: number): string {
    if (wl < 380) return "#8b5cf6"; // Violet / UV
    if (wl < 450) return "#3b82f6"; // Blue
    if (wl < 495) return "#06b6d4"; // Cyan
    if (wl < 570) return "#22c55e"; // Green
    if (wl < 590) return "#eab308"; // Yellow
    if (wl < 620) return "#f97316"; // Orange
    return "#ef4444"; // Red
  }

  // Periodic electron emission & sonification
  useEffect(() => {
    if (!isRunning || !isEmissionAllowed || intensityPercent <= 0) return;

    const interval = setInterval(() => {
      // Spawn rate proportional to intensity
      const spawnChance = (intensityPercent / 100) * 0.7;
      if (Math.random() < spawnChance) {
        const initialSpeed = Math.sqrt(maxKineticEnergyEv) * 3.5;
        electronsRef.current.push({
          x: 180, // Cathode plate position
          y: 80 + Math.random() * 120,
          vx: initialSpeed * (0.8 + Math.random() * 0.4),
          vy: (Math.random() - 0.5) * 1.5,
          life: 0,
        });

        // Trigger electron emission sound
        if (sonificationEnabled) {
          sonifier.playPhotoelectricEmission(maxKineticEnergyEv);
        }
      }
    }, 80);

    return () => clearInterval(interval);
  }, [intensityPercent, isEmissionAllowed, isRunning, maxKineticEnergyEv, sonificationEnabled]);

  // Continuous Photocurrent and Electric Field Sonification
  useEffect(() => {
    if (sonificationEnabled && isRunning && photocurrentMicroAmps > 0) {
      const freq = 180 + maxKineticEnergyEv * 140;
      const normCur = Math.min(1.0, photocurrentMicroAmps / 10);
      const eField = Math.min(1.0, Math.abs(retardingVoltage) / 5.0);

      sonifier.updatePhysicsState({
        frequency: freq,
        positionY: 0.2 + normCur * 0.45,
        energy: normCur,
        fieldStrength: eField,
        acceleration: Math.abs(retardingVoltage) * 4,
      });
    } else {
      sonifier.stopContinuousTone();
    }
  }, [photocurrentMicroAmps, maxKineticEnergyEv, retardingVoltage, isRunning, sonificationEnabled]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const isDark = document.documentElement.classList.contains("dark-mode");

      // Vacuum Glass Bulb Chamber
      ctx.fillStyle = isDark ? "#070c18" : "#f8fafc";
      ctx.fillRect(0, 0, w, h);

      // Glass bulb outline
      ctx.beginPath();
      ctx.ellipse(320, 140, 260, 110, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "rgba(71, 85, 105, 0.5)" : "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.5)";
      ctx.fill();

      // Light Source & Incoming Beam (Top Left)
      const lightColor = wavelengthToRgb(wavelengthNm);
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(70, 60, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`${wavelengthNm} nm`, 50, 64);

      // Incoming Light Rays towards Cathode
      ctx.strokeStyle = lightColor;
      ctx.lineWidth = Math.max(1, (intensityPercent / 100) * 4);
      for (let i = -15; i <= 15; i += 7) {
        ctx.beginPath();
        ctx.moveTo(90, 60 + i);
        ctx.lineTo(178, 140 + i * 2);
        ctx.stroke();
      }

      // Cathode Plate (Emmiter, x: 180, y: 70 to 210)
      ctx.fillStyle = selectedMetal.color;
      ctx.fillRect(175, 70, 10, 140);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(175, 70, 10, 140);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`Cathode (${selectedMetal.symbol})`, 130, 235);
      ctx.fillText(`Φ = ${selectedMetal.workFunctionEv} eV`, 140, 250);

      // Anode Plate (Collector, x: 460, y: 70 to 210)
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(455, 70, 10, 140);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(455, 70, 10, 140);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("Anode (+/–)", 445, 235);

      // Circuit wire and Ammeter
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      // From cathode down
      ctx.moveTo(180, 210);
      ctx.lineTo(180, 270);
      ctx.lineTo(320, 270);
      // From anode down
      ctx.moveTo(460, 210);
      ctx.lineTo(460, 270);
      ctx.lineTo(320, 270);
      ctx.stroke();

      // Battery / Retarding Voltage Symbol at bottom center
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(300, 255, 40, 30);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(300, 255, 40, 30);
      ctx.fillStyle = retardingVoltage < 0 ? "#ef4444" : "#10b981";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`${retardingVoltage >= 0 ? "+" : ""}${retardingVoltage.toFixed(1)}V`, 305, 274);

      // Digital Ammeter Display Box (Top Center)
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(265, 25, 110, 45);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(265, 25, 110, 45);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px monospace";
      ctx.fillText("MICRO-AMMETER", 275, 40);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${photocurrentMicroAmps.toFixed(2)} µA`, 280, 60);

      // Update & Draw Ejected Electrons
      if (isRunning) {
        electronsRef.current.forEach((el) => {
          // Acceleration from electric field between plates: a = (e * V) / (m * d)
          // Positive retardingVoltage attracts electrons; negative retardingVoltage repels them
          const accX = (retardingVoltage / 280) * 0.4;
          el.vx += accX;
          el.x += el.vx;
          el.y += el.vy;
          el.life++;

          // Draw blue electron
          ctx.beginPath();
          ctx.fillStyle = "#2563eb";
          ctx.arc(el.x, el.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Electron trail
          ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
          ctx.beginPath();
          ctx.moveTo(el.x - el.vx * 3, el.y - el.vy * 3);
          ctx.lineTo(el.x, el.y);
          ctx.stroke();
        });

        // Filter out electrons that hit anode, turned around back into cathode, or escaped
        electronsRef.current = electronsRef.current.filter(
          (el) => el.life < 160 && el.x < 460 && el.x > 175
        );
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [intensityPercent, isEmissionAllowed, isRunning, maxKineticEnergyEv, photocurrentMicroAmps, retardingVoltage, selectedMetal, wavelengthNm]);

  const handleReset = () => {
    setWavelengthNm(380);
    setIntensityPercent(60);
    setRetardingVoltage(0.0);
    setSelectedMetal(METALS[0]);
    electronsRef.current = [];
    setIsRunning(true);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              Atomic & Quantum Physics
            </span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">
              {level === "explorer"
                ? "Explorer: Light Knocking Electrons Free"
                : level === "middle_school"
                ? "Middle School: Solar Cells & Photons"
                : level === "high_school"
                ? "High School: Einstein Photoelectric Law hf = Φ + K_max"
                : level === "college"
                ? "College: Stopping Potential & Work Function"
                : "Master's: Quantum Efficiency & Surface Dipoles"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Photoelectric Effect & Stopping Potential
          </h2>
          <p className="text-xs text-slate-600">
            Verify quantum particle nature of light ($E = h\nu$): electrons are only emitted above threshold frequency $\nu_0$, independent of light intensity!
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="photoelectric-play-pause-btn"
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause Electrons" : "Resume"}
          </button>
          <button
            id="photoelectric-reset-btn"
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Reset photoelectric parameters"
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
              <Sun className="w-4 h-4 text-amber-500" />
              Evacuated Photocell & Photocurrent Ammeter
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-medium text-slate-700">
                Photon Energy: <strong className="text-purple-600">{photonEnergyEv.toFixed(2)} eV</strong>
              </span>
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <KatexMath math="K_{\max}:" inline /> <strong className="text-blue-600">{maxKineticEnergyEv.toFixed(2)} eV</strong>
              </span>
            </div>
          </div>

          <div className="w-full relative flex justify-center bg-slate-100 rounded-lg p-2 border border-slate-200 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={660}
              height={300}
              className="w-full max-w-[660px] h-auto object-contain rounded-md"
            />
          </div>

          {/* Quick Guidance Box */}
          <div className="w-full mt-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Crucial Einstein Insight:</span>
              Classical wave theory predicted that high intensity (bright light) could eject electrons at any wavelength. Einstein proved light consists of discrete quanta ($E = h\nu$). If photon energy is below work function ($h\nu &lt; \Phi$), <strong>zero electrons are ejected</strong> regardless of brightness!
            </div>
          </div>
        </div>

        {/* Controls & Governing Math */}
        <div className="lg:col-span-4 space-y-4">
          {/* Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Photocell Controls
            </h3>

            {/* Target Metal Selection */}
            <div className="space-y-1.5">
              <label htmlFor="target-metal-select" className="text-xs font-semibold text-slate-700 block">Cathode Metal (Work Function $\Phi$):</label>
              <div id="target-metal-select" className="grid grid-cols-3 gap-1.5 text-xs">
                {METALS.map((m) => (
                  <button
                    key={m.symbol}
                    id={`metal-${m.symbol}`}
                    onClick={() => setSelectedMetal(m)}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                      selectedMetal.symbol === m.symbol
                        ? "bg-amber-600 text-white border-amber-600 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {m.name} ({m.workFunctionEv} eV)
                  </button>
                ))}
              </div>
            </div>

            {/* Wavelength Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="wavelength-slider" className="font-semibold text-slate-700">Light Wavelength ($\lambda$):</label>
                <span className="font-mono font-bold text-slate-800">{wavelengthNm} nm</span>
              </div>
              <input
                id="wavelength-slider"
                type="range"
                min="200"
                max="750"
                step="5"
                value={wavelengthNm}
                onChange={(e) => setWavelengthNm(parseInt(e.target.value))}
                className="w-full h-1.5 accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>200nm (UV)</span>
                <span>400nm (Violet)</span>
                <span>550nm (Green)</span>
                <span>750nm (IR)</span>
              </div>
            </div>

            {/* Retarding Voltage Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="retarding-voltage-slider" className="font-semibold text-slate-700">Retarding / Bias Voltage ($V$):</label>
                <span className={`font-mono font-bold ${retardingVoltage < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {retardingVoltage.toFixed(2)} V
                </span>
              </div>
              <input
                id="retarding-voltage-slider"
                type="range"
                min="-4.0"
                max="3.0"
                step="0.1"
                value={retardingVoltage}
                onChange={(e) => setRetardingVoltage(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-blue-600"
              />
              <span className="text-[10px] text-slate-500 block">
                Required Stopping Potential: <KatexMath math={`V_{\\text{stop}} = ${stoppingPotentialV.toFixed(2)}\\text{ V}`} inline />
              </span>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="intensity-slider" className="font-semibold text-slate-700">Light Intensity / Photon Flux:</label>
                <span className="font-mono font-bold text-slate-800">{intensityPercent}%</span>
              </div>
              <input
                id="intensity-slider"
                type="range"
                min="0"
                max="100"
                step="5"
                value={intensityPercent}
                onChange={(e) => setIntensityPercent(parseInt(e.target.value))}
                className="w-full h-1.5 accent-amber-600"
              />
            </div>

            {/* Live Readouts */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Photocurrent:</span>
                <span className="font-mono font-bold text-blue-600">{photocurrentMicroAmps.toFixed(2)} µA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Threshold Wavelength ($\lambda_0$):</span>
                <span className="font-mono text-slate-800">{thresholdWavelengthNm.toFixed(1)} nm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Emission Status:</span>
                <span className={`font-bold ${isEmissionAllowed ? "text-emerald-600" : "text-red-600"}`}>
                  {isEmissionAllowed ? "Active Emission" : "No Emission (hν < Φ)"}
                </span>
              </div>
            </div>
          </div>

          {/* Governing Math Card Adapted to 5 Levels */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2.5">
            <span className="font-bold text-slate-800 block">
              {level === "explorer"
                ? "Photon Packet Rule:"
                : level === "middle_school"
                ? "Energy Threshold Condition:"
                : level === "high_school"
                ? "Einstein Photoelectric Equation:"
                : level === "college"
                ? "Stopping Potential & Quantum Efficiency:"
                : "Photoemission Matrix Element & Density of States:"}
            </span>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <KatexMath
                math={
                  level === "explorer"
                    ? "E_{\\text{photon}} = h \\nu > \\Phi \\implies \\text{Electron Pops Free!}"
                    : level === "middle_school"
                    ? "E = h \\nu = \\frac{hc}{\\lambda}, \\quad K_{\\max} = E - \\Phi"
                    : level === "high_school"
                    ? "K_{\\max} = h\\nu - \\Phi = \\frac{hc}{\\lambda} - \\Phi = e V_{\\text{stop}}"
                    : level === "college"
                    ? "e V_{\\text{stop}} = \\frac{hc}{\\lambda} - \\Phi, \\quad I_{\\text{photo}} = \\eta \\cdot \\left(\\frac{P}{h\\nu}\\right) e"
                    : "\\frac{dI}{dE} \\propto \\rho(E) |\\langle \\psi_f | \\mathbf{A} \\cdot \\mathbf{p} | \\psi_i \\rangle|^2 f(E, T)"
                }
                inline={false}
              />
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                {level === "explorer"
                  ? "Light acts like tiny discrete energy packets knocking electrons loose."
                  : level === "middle_school"
                  ? "Increasing brightness adds more photons, but only high-frequency light has enough punch."
                  : level === "high_school"
                  ? "Stopping voltage V_stop depends purely on photon frequency, not light intensity."
                  : level === "college"
                  ? "Photocurrent scales with quantum efficiency η and incident photon flux P/(hν)."
                  : "First-order perturbation theory with dipole transition operator in condensed matter."}
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <KatexMath math="\\nu_0 = \\frac{\\Phi}{h}, \\quad \\lambda_0 = \\frac{hc}{\\Phi}" inline={false} />
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                Threshold Frequency & Cutoff Wavelength
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
