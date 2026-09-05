import React, { useState } from "react";
import {
  Volume2,
  X,
  Play,
  Square,
  Sparkles,
  Layers,
  Compass,
  Headphones,
  Activity,
  Maximize2,
} from "lucide-react";
import {
  sonifier,
  AUDIO_DIMENSIONS,
  AudioDimensionKey,
} from "../../utils/sonification";

interface SonificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "dark" | "light";
}

export function SonificationGuideModal({
  isOpen,
  onClose,
  theme = "dark",
}: SonificationGuideModalProps) {
  const [playingKey, setPlayingKey] = useState<AudioDimensionKey | null>(null);

  if (!isOpen) return null;

  const handlePlayDemo = (key: AudioDimensionKey) => {
    if (playingKey === key) {
      sonifier.stopContinuousTone();
      setPlayingKey(null);
      return;
    }

    setPlayingKey(key);
    sonifier.previewDimension(key);

    const durations: Record<AudioDimensionKey, number> = {
      velocity: 1500,
      positionX: 1650,
      positionY: 1550,
      energy: 1650,
      acceleration: 1650,
      temperature: 1500,
      fieldStrength: 1650,
      phase: 1750,
    };

    setTimeout(() => {
      setPlayingKey((prev) => (prev === key ? null : prev));
    }, durations[key]);
  };

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark
              ? "border-slate-800 bg-slate-950/80 text-white"
              : "border-slate-100 bg-slate-50 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Physics Sonification Architecture
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  8-Dimensional Framework
                </span>
              </h2>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Mapping physical observables into acoustic dimensions for
                intuitive multi-sensory learning
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sonifier.stopContinuousTone();
              onClose();
            }}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            }`}
            aria-label="Close Sonification Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Conceptual Intro Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isDark
                ? "bg-purple-950/30 border-purple-800/40 text-purple-200"
                : "bg-purple-50/80 border-purple-200 text-purple-950"
            }`}
          >
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">
                Why Sonify Physics Equations & Observables?
              </h4>
              <p className="leading-relaxed opacity-90">
                Auditory perception excels at temporal pattern recognition, phase
                resolution, micro-frequency jitter, and spatial localization. By
                translating continuous equations of motion, thermodynamics, and
                quantum superposition into distinct audio parameters, learners
                can <em>hear</em> physical transformations and gain deeper
                kinematic and quantum intuition.
              </p>
            </div>
          </div>

          {/* Interactive 8-Dimensional Observables Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Physical Observables to Audio Dimensions Mapping
              </h3>
              <span
                className={`text-[11px] ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Click any row button to audition the dimension
              </span>
            </div>

            <div
              className={`rounded-xl border overflow-hidden ${
                isDark
                  ? "border-slate-800 bg-slate-950/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isDark
                        ? "border-slate-800 bg-slate-900/80 text-slate-400"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <th className="py-2.5 px-3.5">Physics Observable</th>
                    <th className="py-2.5 px-3.5">Audio Dimension</th>
                    <th className="py-2.5 px-3.5">Innovation Category</th>
                    <th className="py-2.5 px-3.5">Acoustic Mapping Details</th>
                    <th className="py-2.5 px-3.5 text-right">Audition</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isDark ? "divide-slate-800/80" : "divide-slate-100"
                  }`}
                >
                  {AUDIO_DIMENSIONS.map((dim) => {
                    const isCurrentPlaying = playingKey === dim.key;
                    return (
                      <tr
                        key={dim.key}
                        className={`transition-colors ${
                          isCurrentPlaying
                            ? isDark
                              ? "bg-purple-950/40"
                              : "bg-purple-50"
                            : isDark
                            ? "hover:bg-slate-900/40"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-3 px-3.5 font-bold text-blue-400 whitespace-nowrap">
                          {dim.observable}
                        </td>
                        <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] ${
                              isDark
                                ? "bg-slate-800 text-slate-200"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {dim.dimension}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {dim.innovation}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-3.5 text-[11px] leading-snug max-w-xs ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          {dim.description}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <button
                            id={`preview-dim-${dim.key}`}
                            onClick={() => handlePlayDemo(dim.key)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs ${
                              isCurrentPlaying
                                ? "bg-purple-600 text-white animate-pulse ring-2 ring-purple-400"
                                : isDark
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                            }`}
                          >
                            {isCurrentPlaying ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                Demo
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Simulation Reference Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Real-Time Active Mappings Across Simulation Labs
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Projectile Kinematics & Free Fall</span>
                  <span className="text-[10px] text-blue-400 font-semibold">
                    Mechanics
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Instantaneous velocity dictates carrier pitch (50-2000Hz); downrange
                  distance smoothly shifts stereo pan from left to right; kinetic
                  energy dynamically blends higher overtones; impact velocity
                  triggers proportional bass thump.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Harmonic Oscillator & Resonance</span>
                  <span className="text-[10px] text-purple-400 font-semibold">
                    Waves
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bob horizontal position pans stereo audio; tangential speed maps
                  to frequency; mechanical potential height scales intensity;
                  tangential acceleration modulates dynamic vibrato; driving
                  resonance triggers multi-harmonic chimes.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Double Slit Optics & Interference</span>
                  <span className="text-[10px] text-cyan-400 font-semibold">
                    Optics
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Optical wavelength inverse scales pitch (violet = high, red =
                  low); fringe intensity modulates amplitude and harmonic richness;
                  spatial phase angle rotates binaural stereo phase across headphones.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Kinetic Gas Theory & Thermodynamics</span>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    Stat Mech
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Temperature drives thermal pitch drift and Brownian frequency
                  jitter; RMS speed sets baseline pitch; piston volume sets stereo
                  balance; discrete elastic wall strikes trigger spatialized impact
                  clicks.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Magnetic Lorentz Force & Cyclotrons</span>
                  <span className="text-[10px] text-indigo-400 font-semibold">
                    Electromagnetism
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Orbital cyclotron frequency sets fundamental carrier; particle
                  orbit coordinates pan circular stereo trajectory; magnetic field
                  intensity drives 65Hz resonant sub-bass field hum.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Quantum Well & Tunneling</span>
                  <span className="text-[10px] text-rose-400 font-semibold">
                    Quantum
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Eigenstate quantum numbers map to harmonic overtone series; barrier
                  potential height scales field drone; probabilistic barrier
                  penetration triggers ascending tunneling chirps.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between ${
            isDark
              ? "border-slate-800 bg-slate-950/80 text-slate-400"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[11px]">
            <Headphones className="w-4 h-4 text-purple-400" />
            <span>Best experienced with stereo headphones for spatial panning and binaural phase effects.</span>
          </div>

          <button
            onClick={() => {
              sonifier.stopContinuousTone();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
