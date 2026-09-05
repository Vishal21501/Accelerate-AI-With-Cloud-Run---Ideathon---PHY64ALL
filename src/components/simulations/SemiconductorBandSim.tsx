import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Cpu, Activity, Info } from "lucide-react";
import { EducationLevel } from "../../types";
import { KatexMath } from "../../utils/katexHelper";
import { sonifier } from "../../utils/sonification";

interface Props {
  level: EducationLevel;
  sonificationEnabled: boolean;
}

export const SemiconductorBandSim: React.FC<Props> = ({ level, sonificationEnabled }) => {
  // Parameters
  const [vBias, setVBias] = useState<number>(0.0); // -2.0 V to +0.8 V
  const [temperature, setTemperature] = useState<number>(300); // 100K to 450K
  const [dopingLevel, setDopingLevel] = useState<"standard" | "degenerate">("standard");
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [material, setMaterial] = useState<"silicon" | "germanium" | "gaas">("silicon");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const carriersRef = useRef<Array<{ x: number; y: number; vx: number; type: "electron" | "hole" }>>([]);

  // Material bandgaps in eV
  const bandgaps = {
    silicon: 1.12,
    germanium: 0.67,
    gaas: 1.42,
  };
  const Eg = bandgaps[material];

  // Built-in potential approx 0.7V for Si at 300K
  const Vbi = material === "silicon" ? 0.72 : material === "germanium" ? 0.35 : 0.95;

  // Diode Shockley current: I = I_s * (exp(qV / k T) - 1)
  const kB = 8.617333e-5; // eV / K
  const thermalVoltage = kB * temperature; // ~ 0.0259 eV at 300K
  const Is = material === "silicon" ? 1e-12 : material === "germanium" ? 1e-7 : 1e-15; // Amps
  const currentAmps = vBias > -2.5
    ? Is * (Math.exp(Math.min(30, vBias / thermalVoltage)) - 1)
    : -1e-3; // breakdown

  // Effective barrier height
  const effectiveBarrier = Math.max(0.02, Vbi - vBias);
  const depletionWidthFactor = Math.sqrt(effectiveBarrier / Vbi);

  // Initialize carriers
  useEffect(() => {
    const list: Array<{ x: number; y: number; vx: number; type: "electron" | "hole" }> = [];
    // P-side (x: 50 to 250): mostly holes, few minority electrons
    for (let i = 0; i < 40; i++) {
      list.push({
        x: 50 + Math.random() * 160,
        y: 180 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 1.5,
        type: "hole",
      });
    }
    // N-side (x: 350 to 550): mostly electrons, few minority holes
    for (let i = 0; i < 40; i++) {
      list.push({
        x: 390 + Math.random() * 160,
        y: 60 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 1.5,
        type: "electron",
      });
    }
    carriersRef.current = list;
  }, [material, dopingLevel]);

  // Audio effect based on current, temperature and depletion field
  useEffect(() => {
    if (!sonificationEnabled || !isRunning) {
      sonifier.stopContinuousTone();
      return;
    }

    if (vBias < -2.0) {
      // breakdown: heavy field, dynamic modulation
      sonifier.updatePhysicsState({
        frequency: 85,
        energy: 0.95,
        fieldStrength: 1.0,
        acceleration: 8,
        temperature: temperature / 450,
        positionY: 0.8,
      });
    } else if (vBias > 0.25) {
      // forward exponential conduction
      const normCurrent = Math.min(1.0, Math.max(0.05, (vBias - 0.25) / 0.5));
      const freq = 120 + normCurrent * 280;
      sonifier.updatePhysicsState({
        frequency: freq,
        energy: normCurrent,
        fieldStrength: normCurrent * 0.8,
        temperature: (temperature - 100) / 350,
        positionY: 0.2 + normCurrent * 0.5,
      });
    } else {
      const fieldNorm = Math.min(1.0, Math.abs(vBias) / 2.0);
      sonifier.updatePhysicsState({
        frequency: 65,
        fieldStrength: fieldNorm * 0.35,
        temperature: (temperature - 100) / 350,
        positionY: 0.1,
      });
    }

    return () => {
      sonifier.stopContinuousTone();
    };
  }, [vBias, temperature, isRunning, sonificationEnabled]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Junction center is at x = 300
      const jx = 300;
      const depW = 70 * depletionWidthFactor;

      const isDark = document.documentElement.classList.contains("dark-mode");

      // Draw P-type and N-type regions
      ctx.fillStyle = isDark ? "rgba(30, 58, 138, 0.25)" : "#eff6ff"; // P region
      ctx.fillRect(40, 30, jx - 40, 240);
      ctx.fillStyle = isDark ? "rgba(6, 78, 59, 0.25)" : "#f0fdf4"; // N region
      ctx.fillRect(jx, 30, w - 80 - jx, 240);

      // Depletion region highlight
      ctx.fillStyle = isDark ? "rgba(234, 179, 8, 0.2)" : "rgba(254, 240, 138, 0.45)"; // yellow tint
      ctx.fillRect(jx - depW, 30, depW * 2, 240);

      // Depletion boundaries lines
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(jx - depW, 30);
      ctx.lineTo(jx - depW, 270);
      ctx.moveTo(jx + depW, 30);
      ctx.lineTo(jx + depW, 270);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center metallurgical junction line
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(jx, 30);
      ctx.lineTo(jx, 270);
      ctx.stroke();

      // Region Labels
      ctx.fillStyle = "#1e3a8a";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("p-type region (Acceptors N_A)", 60, 52);
      ctx.fillStyle = "#14532d";
      ctx.fillText("n-type region (Donors N_D)", 380, 52);

      ctx.fillStyle = "#854d0e";
      ctx.font = "11px sans-serif";
      ctx.fillText(`Depletion Zone (W = ${(depW * 0.1).toFixed(2)} µm)`, jx - 65, 285);

      // Energy Band Diagram Curves
      // Conduction band Ec and Valence band Ev
      const pEc = 90;
      const nEc = 90 + effectiveBarrier * 90;
      const pEv = pEc + Eg * 70;
      const nEv = nEc + Eg * 70;

      // Draw Ec curve
      ctx.beginPath();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      for (let x = 40; x <= w - 80; x++) {
        let y: number;
        if (x < jx - depW) {
          y = pEc;
        } else if (x > jx + depW) {
          y = nEc;
        } else {
          // Smooth sinusoidal transition across depletion zone
          const s = (x - (jx - depW)) / (depW * 2);
          const factor = 0.5 - 0.5 * Math.cos(s * Math.PI);
          y = pEc + (nEc - pEc) * factor;
        }
        if (x === 40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Ev curve
      ctx.beginPath();
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2.5;
      for (let x = 40; x <= w - 80; x++) {
        let y: number;
        if (x < jx - depW) {
          y = pEv;
        } else if (x > jx + depW) {
          y = nEv;
        } else {
          const s = (x - (jx - depW)) / (depW * 2);
          const factor = 0.5 - 0.5 * Math.cos(s * Math.PI);
          y = pEv + (nEv - pEv) * factor;
        }
        if (x === 40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Band labels
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 11px monospace";
      ctx.fillText("E_c (Conduction)", 45, pEc - 8);
      ctx.fillStyle = "#059669";
      ctx.fillText("E_v (Valence)", 45, pEv + 16);

      // Fermi level dashed line
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      if (Math.abs(vBias) < 0.05) {
        // Flat equilibrium Fermi level
        const efY = (pEc + pEv) / 2 + 10;
        ctx.moveTo(40, efY);
        ctx.lineTo(w - 80, efY);
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.fillText("E_F (Equilibrium)", w - 180, efY - 5);
      } else {
        // Quasi-Fermi levels split by q * V_bias
        const efpY = pEv - 18;
        const efnY = efpY + vBias * 40;
        ctx.moveTo(40, efpY);
        ctx.lineTo(jx - depW / 2, efpY);
        ctx.moveTo(jx + depW / 2, efnY);
        ctx.lineTo(w - 80, efnY);
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.fillText("E_{Fp}", 45, efpY - 5);
        ctx.fillText("E_{Fn}", w - 120, efnY - 5);
      }
      ctx.setLineDash([]);

      // Update & Draw Carriers
      if (isRunning) {
        carriersRef.current.forEach((c) => {
          // thermal drift
          c.x += c.vx;

          // Electric field inside depletion zone pushes electrons right and holes left
          if (c.x > jx - depW && c.x < jx + depW) {
            const fieldStrength = (effectiveBarrier / (depW * 2)) * 18;
            if (c.type === "electron") {
              c.x += fieldStrength * dt * 60; // swept to N-side
            } else {
              c.x -= fieldStrength * dt * 60; // swept to P-side
            }
          }

          // Boundary bounce or regenerate
          if (c.type === "electron") {
            if (c.x > w - 85) c.x = jx + Math.random() * (w - 90 - jx);
            if (c.x < 45) c.x = jx + depW + Math.random() * 80;
          } else {
            if (c.x < 45) c.x = 45 + Math.random() * (jx - depW - 45);
            if (c.x > w - 85) c.x = 45 + Math.random() * 80;
          }

          // Draw carrier
          ctx.beginPath();
          if (c.type === "electron") {
            ctx.fillStyle = "#2563eb"; // blue dot for electron
            ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = "#ef4444"; // red circle for hole
            ctx.strokeStyle = "#991b1b";
            ctx.lineWidth = 1.5;
            ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }

      // Small inset: IV Characteristic Curve
      const graphX = w - 170;
      const graphY = 40;
      const graphW = 120;
      const graphH = 100;

      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.fillRect(graphX, graphY, graphW, graphH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(graphX, graphY, graphW, graphH);

      // Axes inside inset
      ctx.strokeStyle = "#64748b";
      ctx.beginPath();
      // zero voltage is at graphX + 60
      const originX = graphX + 50;
      const originY = graphY + 70;
      ctx.moveTo(graphX + 10, originY);
      ctx.lineTo(graphX + graphW - 10, originY); // V axis
      ctx.moveTo(originX, graphY + 10);
      ctx.lineTo(originX, graphY + graphH - 10); // I axis
      ctx.stroke();

      // Draw Diode curve
      ctx.beginPath();
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 2;
      for (let vx = -1.5; vx <= 0.8; vx += 0.05) {
        const px = originX + vx * 40;
        const cur = vx > 0 ? 0.001 * Math.exp(vx * 7) : 0;
        const py = originY - cur * 3000;
        const clampedPy = Math.max(graphY + 5, Math.min(graphY + graphH - 5, py));
        if (vx === -1.5) ctx.moveTo(px, clampedPy);
        else ctx.lineTo(px, clampedPy);
      }
      ctx.stroke();

      // Current operating point on IV curve
      const opX = originX + vBias * 40;
      const opI = vBias > 0 ? 0.001 * Math.exp(vBias * 7) : 0;
      const opY = Math.max(graphY + 5, Math.min(graphY + graphH - 5, originY - opI * 3000));
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(opX, opY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#475569";
      ctx.font = "9px sans-serif";
      ctx.fillText("I-V Characteristic", graphX + 15, graphY + 18);
      ctx.fillText(`I = ${formatCurrent(currentAmps)}`, graphX + 10, graphY + graphH - 8);

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [vBias, temperature, material, effectiveBarrier, depletionWidthFactor, currentAmps, isRunning]);

  function formatCurrent(amps: number): string {
    if (Math.abs(amps) < 1e-9) return `${(amps * 1e12).toFixed(1)} pA`;
    if (Math.abs(amps) < 1e-6) return `${(amps * 1e9).toFixed(1)} nA`;
    if (Math.abs(amps) < 1e-3) return `${(amps * 1e6).toFixed(1)} µA`;
    return `${(amps * 1e3).toFixed(2)} mA`;
  }

  const handleReset = () => {
    setVBias(0.0);
    setTemperature(300);
    setIsRunning(true);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              Solid State Physics & Electronics
            </span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
              {level === "explorer"
                ? "Explorer: Computer Chips & Solar Cells"
                : level === "middle_school"
                ? "Middle School: Conductors & Insulators"
                : level === "high_school"
                ? "High School: Diode P-N Junction"
                : level === "college"
                ? "College: Band Bending & Fermi Levels"
                : "Master's: Carrier Drift-Diffusion & Shockley"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Semiconductor Diode & Energy Band Structure
          </h2>
          <p className="text-xs text-slate-600">
            Observe Fermi level alignment, carrier diffusion vs drift, depletion barrier modulation, and exponential Shockley conduction.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            id="semiconductor-play-pause-btn"
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Pause Carriers" : "Resume"}
          </button>
          <button
            id="semiconductor-reset-btn"
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Reset junction to thermal equilibrium"
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
              <Cpu className="w-4 h-4 text-blue-600" />
              Live Band Diagram & Depletion Zone
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                Electrons ($e^-$)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-red-600 inline-block" />
                Holes ($h^+$)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-red-600 inline-block" />
                Fermi Level $E_F$
              </span>
            </div>
          </div>

          <div className="w-full relative flex justify-center bg-slate-50 rounded-lg p-2 border border-slate-100 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={660}
              height={300}
              className="w-full max-w-[660px] h-auto object-contain rounded-md"
            />
          </div>

          {/* Quick Guidance */}
          <div className="w-full mt-3 p-3 bg-blue-50/70 border border-blue-200/60 rounded-lg text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Physical Intuition:</span>
              In <strong>Forward Bias (V &gt; 0)</strong>, the applied field lowers the potential barrier (<KatexMath math="V_{bi} - V" inline />). Electrons easily surge over the barrier into the P-side, causing exponential forward current and audio resonance. In <strong>Reverse Bias (V &lt; 0)</strong>, the depletion zone widens (<KatexMath math="W \propto \sqrt{V_{bi} - V}" inline />), and current drops to the nanoamp saturation limit <KatexMath math="I_s" inline />.
            </div>
          </div>
        </div>

        {/* Controls & Governing Math */}
        <div className="lg:col-span-4 space-y-4">
          {/* Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Junction Operating Controls
            </h3>

            {/* Bias Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="vbias-slider" className="font-semibold text-slate-700 flex items-center gap-1">
                  Applied Bias Voltage (<KatexMath math="V_{\text{bias}}" inline />):
                </label>
                <span className={`font-mono font-bold ${vBias > 0 ? "text-emerald-600" : vBias < 0 ? "text-amber-600" : "text-slate-600"}`}>
                  {vBias.toFixed(2)} V {vBias > 0 ? "(Forward)" : vBias < 0 ? "(Reverse)" : "(Equilibrium)"}
                </span>
              </div>
              <input
                id="vbias-slider"
                type="range"
                min="-2.5"
                max="0.8"
                step="0.05"
                value={vBias}
                onChange={(e) => setVBias(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>-2.5V (Reverse)</span>
                <span>0V (Flat)</span>
                <span>+0.8V (Forward)</span>
              </div>
            </div>

            {/* Material Choice */}
            <div className="space-y-1.5">
              <label htmlFor="semiconductor-material-select" className="text-xs font-semibold text-slate-700 block">Semiconductor Material:</label>
              <div id="semiconductor-material-select" className="grid grid-cols-3 gap-1.5 text-xs">
                {(["silicon", "germanium", "gaas"] as const).map((mat) => (
                  <button
                    key={mat}
                    id={`mat-${mat}`}
                    onClick={() => setMaterial(mat)}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium capitalize transition-all ${
                      material === mat
                        ? "bg-blue-600 text-white border-blue-600 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {mat === "gaas" ? "GaAs" : mat}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-600 block">
                Bandgap: <KatexMath math={`E_g = ${Eg}\\text{ eV}`} inline />, Built-in <KatexMath math={`V_{bi} = ${Vbi}\\text{ V}`} inline />
              </span>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="temp-slider" className="font-semibold text-slate-700">Temperature ($T$):</label>
                <span className="font-mono font-bold text-slate-800">{temperature} K</span>
              </div>
              <input
                id="temp-slider"
                type="range"
                min="100"
                max="450"
                step="10"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                className="w-full h-1.5 accent-blue-600"
              />
              <span className="text-[10px] text-slate-600 block">
                Thermal voltage <KatexMath math={`V_T = \\frac{k_B T}{q} = ${(thermalVoltage * 1000).toFixed(1)}\\text{ mV}`} inline />
              </span>
            </div>

            {/* Live Numerical Readouts */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Diode Current:</span>
                <span className="font-mono font-bold text-blue-700">{formatCurrent(currentAmps)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Depletion Barrier Height:</span>
                <span className="font-mono text-slate-800">{effectiveBarrier.toFixed(2)} eV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Depletion Width ($W$):</span>
                <span className="font-mono text-slate-800">{(depletionWidthFactor * 0.45).toFixed(2)} µm</span>
              </div>
            </div>
          </div>

          {/* Governing Math Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2.5">
            <span className="font-bold text-slate-800 block">Governing Physical Laws:</span>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <KatexMath math="I = I_s \left( e^{\frac{q V_{\text{bias}}}{k_B T}} - 1 \right)" inline={false} />
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                Shockley Ideal Diode Equation
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <KatexMath math="W = \sqrt{\frac{2\varepsilon_s}{q} \left( \frac{N_A + N_D}{N_A N_D} \right) (V_{bi} - V_{\text{bias}})}" inline={false} />
              <span className="text-[10px] text-slate-500 block text-center mt-1">
                Depletion Layer Width
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
