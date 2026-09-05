import React, { useState, useEffect } from "react";
import {
  Atom,
  Volume2,
  VolumeX,
  Sparkles,
  Calculator,
  BookOpen,
  Layers,
  Activity,
  Orbit,
  Zap,
  Flame,
  HelpCircle,
  Eye,
  Moon,
  Compass,
} from "lucide-react";
import { EducationLevel, SimulationId, EDUCATION_LEVELS } from "./types";
import { sonifier } from "./utils/sonification";

// Simulation components
import { ProjectileSim } from "./components/simulations/ProjectileSim";
import { HarmonicOscillatorSim } from "./components/simulations/HarmonicOscillatorSim";
import { DoubleSlitOpticsSim } from "./components/simulations/DoubleSlitOpticsSim";
import { LorentzForceSim } from "./components/simulations/LorentzForceSim";
import { ElectricFieldSim } from "./components/simulations/ElectricFieldSim";
import { QuantumWellSim } from "./components/simulations/QuantumWellSim";
import { OrbitalGravitySim } from "./components/simulations/OrbitalGravitySim";
import { KineticGasSim } from "./components/simulations/KineticGasSim";
import { SemiconductorBandSim } from "./components/simulations/SemiconductorBandSim";
import { NuclearDecaySim } from "./components/simulations/NuclearDecaySim";
import { PhotoelectricSim } from "./components/simulations/PhotoelectricSim";

// Additional modules
import { ProblemSolver } from "./components/solver/ProblemSolver";
import { ConceptExplorer } from "./components/curriculum/ConceptExplorer";
import { PhysicsQuiz } from "./components/quiz/PhysicsQuiz";
import { NotebookView } from "./components/notebook/NotebookView";
import { SaveExperimentModal } from "./components/simulations/SaveExperimentModal";
import { SonificationGuideModal } from "./components/sonification/SonificationGuideModal";
import { UserMenu } from "./components/auth/UserMenu";
import { AuthScreen } from "./components/auth/AuthScreen";
import { useAuth } from "./context/AuthContext";
import { Cpu, Radiation, Sun, Award, BookMarked } from "lucide-react";
import { ActiveTab } from "./types";

export default function App() {
  const { user, profile, loading, updateEducationPreference } = useAuth();

  // Theme state: default to "dark" (Cool Dark Physics Lab)
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Global Education Level
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("high_school");

  // Sync educationLevel if user profile in Firestore changes
  useEffect(() => {
    if (profile?.educationLevel && profile.educationLevel !== educationLevel) {
      setEducationLevel(profile.educationLevel);
    }
  }, [profile?.educationLevel]);

  const handleEducationLevelChange = (lvl: EducationLevel) => {
    setEducationLevel(lvl);
    updateEducationPreference(lvl);
  };

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("simulations");

  // Selected Simulation
  const [selectedSim, setSelectedSim] = useState<SimulationId>("projectile");
  const [isSaveSimModalOpen, setIsSaveSimModalOpen] = useState<boolean>(false);

  // Multi-sensory sound controls
  const [sonificationEnabled, setSonificationEnabled] = useState<boolean>(true);
  const [masterVolume, setMasterVolume] = useState<number>(0.5);
  const [showSensoryGuide, setShowSensoryGuide] = useState<boolean>(false);

  // Sync theme to root class
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark-mode");
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.documentElement.classList.add("light-mode");
    }
  }, [theme]);

  // Sync sonification state
  useEffect(() => {
    sonifier.setEnabled(sonificationEnabled);
  }, [sonificationEnabled]);

  useEffect(() => {
    sonifier.setMasterVolume(masterVolume);
  }, [masterVolume]);

  const toggleAudio = () => {
    const next = !sonificationEnabled;
    setSonificationEnabled(next);
    if (next) {
      sonifier.playResonanceHarmonic(440);
    } else {
      sonifier.stopContinuousTone();
    }
  };

  const simulationList = [
    {
      id: "projectile" as SimulationId,
      name: "Kinematics & Ballistics",
      icon: Activity,
      tag: "Mechanics",
      description: "Trajectories, gravity, drag & auditory doppler velocities",
    },
    {
      id: "harmonic_oscillator" as SimulationId,
      name: "Harmonic Oscillations",
      icon: Atom,
      tag: "Waves",
      description: "Mass-spring & pendulums with kinetic-potential stereo panning",
    },
    {
      id: "double_slit" as SimulationId,
      name: "Wave Optics & Interference",
      icon: Eye,
      tag: "Optics",
      description: "Young's slits, diffraction & audible intensity detector probe",
    },
    {
      id: "lorentz_force" as SimulationId,
      name: "Electrodynamics & Lorentz",
      icon: Zap,
      tag: "E&M",
      description: "Charged particles in B & E fields with cyclotron frequency pitch",
    },
    {
      id: "em_field" as SimulationId,
      name: "Charges & Coulomb Field Lab",
      icon: Compass,
      tag: "E&M",
      description: "Place multiple charges, test charges, field lines & equipotential forces",
    },
    {
      id: "quantum_well" as SimulationId,
      name: "Quantum Mechanics & Tunneling",
      icon: Layers,
      tag: "Quantum",
      description: "Wavepacket superposition chords & barrier tunneling events",
    },
    {
      id: "orbital_gravity" as SimulationId,
      name: "Astrophysics & Kepler",
      icon: Orbit,
      tag: "Gravitation",
      description: "Keplerian orbits with 'Harmonices Mundi' speed sonification",
    },
    {
      id: "kinetic_gas" as SimulationId,
      name: "Thermodynamics & Gas",
      icon: Flame,
      tag: "Thermo",
      description: "Maxwell-Boltzmann speeds & acoustic chamber wall pressure clicks",
    },
    {
      id: "semiconductor" as SimulationId,
      name: "Semiconductors & P-N Bands",
      icon: Cpu,
      tag: "Solid State & Elec",
      description: "Bandgap bending, Fermi levels, depletion layer & diode conduction hum",
    },
    {
      id: "nuclear" as SimulationId,
      name: "Nuclear Decay & Geiger Lab",
      icon: Radiation,
      tag: "Nuclear & Particles",
      description: "Alpha/beta/gamma decay, Rutherford scattering & authentic Geiger counter audio",
    },
    {
      id: "photoelectric" as SimulationId,
      name: "Photoelectric Effect Lab",
      icon: Sun,
      tag: "Atomic & Quantum",
      description: "Einstein's photoelectric law, work function Φ & stopping potential pings",
    },
  ];

  // While checking Firebase Auth status, show clean loader
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <Atom className="w-7 h-7 text-blue-400 animate-spin" />
        </div>
        <p className="text-xs font-mono tracking-wider text-slate-400">
          INITIALIZING PHY64ALL LABORATORY...
        </p>
      </div>
    );
  }

  // Hide the entire app interface until the user signs in
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-300 ${
        theme === "dark"
          ? "dark-mode physics-cool-bg text-slate-100"
          : "physics-light-bg text-slate-900"
      }`}
    >
      {/* Top Header */}
      <header
        className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
          theme === "dark"
            ? "bg-slate-950/80 border-slate-800/80 text-slate-100 shadow-md"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-2xs"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo and Tagline */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-1 ring-blue-400/30 shadow-blue-500/10 shadow-lg"
                    : "bg-blue-600 text-white"
                }`}
              >
                <Atom className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className={`text-lg font-extrabold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    PHY64ALL
                  </h1>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      theme === "dark"
                        ? "bg-blue-950/70 text-blue-300 border-blue-800/60"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    Multi Sensory Physics
                  </span>
                </div>
                <p
                  className={`text-[11px] font-medium ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Learning Made Fun and Interactive
                </p>
              </div>
            </div>

            {/* Right Controls: Education Level & Sonification & Theme Toggle */}
            <div className="flex items-center gap-3">
              {/* Education Level Selector */}
              <div
                className={`flex items-center p-1 rounded-lg text-xs transition-colors overflow-x-auto ${
                  theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-slate-100"
                }`}
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    id={`level-${lvl.id}-btn`}
                    onClick={() => handleEducationLevelChange(lvl.id)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                      educationLevel === lvl.id
                        ? theme === "dark"
                          ? "bg-blue-600 text-white shadow-xs font-bold"
                          : "bg-white text-blue-700 shadow-xs font-bold"
                        : theme === "dark"
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={`${lvl.label} (${lvl.tagline}): ${lvl.description}`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>

              {/* Theme Mode Switcher */}
              <button
                id="theme-toggle-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  theme === "dark"
                    ? "bg-slate-900 text-cyan-300 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 shadow-xs"
                    : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                }`}
                title={theme === "dark" ? "Theme: Cool Dark (click for Light)" : "Theme: Light (click for Cool Dark)"}
                aria-label="Toggle Theme"
              >
                {theme === "dark" ? (
                  <>
                    <Moon className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline">Cool Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                )}
              </button>

              {/* Sonification Sound Toggle */}
              <div
                className={`flex items-center gap-2 border-l pl-3 ${
                  theme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <button
                  id="toggle-master-audio-btn"
                  onClick={toggleAudio}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
                    sonificationEnabled
                      ? theme === "dark"
                        ? "bg-purple-950/60 text-purple-300 border border-purple-800/80 hover:bg-purple-900/60"
                        : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                      : theme === "dark"
                      ? "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title={sonificationEnabled ? "Mute Physical Sonification" : "Enable Multi-Sensory Sonification"}
                  aria-label="Toggle Sonification"
                >
                  {sonificationEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      <span className="hidden md:inline">Sonification On</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-slate-400" />
                      <span className="hidden md:inline">Muted</span>
                    </>
                  )}
                </button>

                {sonificationEnabled && (
                  <input
                    id="master-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                    className="w-16 h-1.5 accent-purple-500 hidden lg:inline-block"
                    title={`Master Volume: Math.round(masterVolume * 100)%`}
                  />
                )}

                <button
                  id="help-sensory-guide-btn"
                  onClick={() => setShowSensoryGuide(!showSensoryGuide)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="What is Sonification & Multi-Sensory Physics?"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Firebase Authentication & User Profile Menu */}
              <div
                className={`border-l pl-3 ${
                  theme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <UserMenu />
              </div>
            </div>
          </div>
        </div>

        {/* 8-Dimensional Multi-Sensory Physics Sonification Guide Modal */}
        <SonificationGuideModal
          isOpen={showSensoryGuide}
          onClose={() => setShowSensoryGuide(false)}
          theme={theme}
        />

        {/* Main Tab Navigation Bar */}
        <div
          className={`border-t transition-colors ${
            theme === "dark" ? "border-slate-800/80 bg-slate-950/60 backdrop-blur-sm" : "border-slate-100 bg-slate-50/70"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 py-1.5 overflow-x-auto">
              <button
                id="nav-simulations-tab"
                onClick={() => setActiveTab("simulations")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "simulations"
                    ? theme === "dark"
                      ? "bg-slate-800/90 text-blue-300 shadow-xs border border-slate-700/80"
                      : "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : theme === "dark"
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                Interactive Simulation Labs
              </button>

              <button
                id="nav-solver-tab"
                onClick={() => setActiveTab("solver")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "solver"
                    ? theme === "dark"
                      ? "bg-slate-800/90 text-emerald-300 shadow-xs border border-slate-700/80"
                      : "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : theme === "dark"
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                Step-by-Step Problem Solver & Tutor
              </button>

              <button
                id="nav-concepts-tab"
                onClick={() => setActiveTab("concepts")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "concepts"
                    ? theme === "dark"
                      ? "bg-slate-800/90 text-purple-300 shadow-xs border border-slate-700/80"
                      : "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : theme === "dark"
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                Concept Explorer & Chat Tutor
              </button>

              <button
                id="nav-quiz-tab"
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "quiz"
                    ? theme === "dark"
                      ? "bg-slate-800/90 text-amber-300 shadow-xs border border-slate-700/80"
                      : "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : theme === "dark"
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Multi-Sensory Physics Quiz (MCQ)
              </button>

              <button
                id="nav-notebook-tab"
                onClick={() => setActiveTab("notebook")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "notebook"
                    ? theme === "dark"
                      ? "bg-slate-800/90 text-blue-300 shadow-xs border border-slate-700/80"
                      : "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : theme === "dark"
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookMarked className="w-3.5 h-3.5 text-blue-500" />
                Physics Notebook
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "simulations" && (
          <div className="space-y-6">
            {/* Simulation Selection Carousel / Pills */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                theme === "dark"
                  ? "bg-slate-900/80 border-slate-800/80 shadow-md backdrop-blur-sm"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Select Simulation Laboratory:
                </span>
                <button
                  id="save-sim-to-notebook-btn"
                  onClick={() => setIsSaveSimModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>Save Lab Setup to Notebook</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {simulationList.map((sim) => {
                  const Icon = sim.icon;
                  const isSelected = selectedSim === sim.id;
                  return (
                    <button
                      key={sim.id}
                      id={`sim-tab-${sim.id}`}
                      onClick={() => setSelectedSim(sim.id)}
                      className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? theme === "dark"
                            ? "bg-blue-950/70 border-blue-500 text-blue-200 font-bold shadow-xs scale-102 ring-1 ring-blue-500/40"
                            : "bg-blue-50/80 border-blue-500 text-blue-900 font-bold shadow-xs scale-102"
                          : theme === "dark"
                          ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 mb-1.5 ${
                          isSelected
                            ? theme === "dark"
                              ? "text-blue-400"
                              : "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <span className="text-[11px] leading-tight line-clamp-1">{sim.name}</span>
                      <span className="text-[9px] text-slate-500 font-normal mt-0.5">{sim.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Simulation View */}
            <div>
              {selectedSim === "projectile" && (
                <ProjectileSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "harmonic_oscillator" && (
                <HarmonicOscillatorSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "double_slit" && (
                <DoubleSlitOpticsSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "lorentz_force" && (
                <LorentzForceSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "em_field" && (
                <ElectricFieldSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "quantum_well" && (
                <QuantumWellSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "orbital_gravity" && (
                <OrbitalGravitySim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "kinetic_gas" && (
                <KineticGasSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "semiconductor" && (
                <SemiconductorBandSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "nuclear" && (
                <NuclearDecaySim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
              {selectedSim === "photoelectric" && (
                <PhotoelectricSim level={educationLevel} sonificationEnabled={sonificationEnabled} />
              )}
            </div>
          </div>
        )}

        {activeTab === "solver" && (
          <ProblemSolver
            level={educationLevel}
            onSelectSim={(simId) => {
              setSelectedSim(simId);
              setActiveTab("simulations");
            }}
          />
        )}

        {activeTab === "concepts" && (
          <ConceptExplorer
            level={educationLevel}
            onSelectSim={(simId) => {
              setSelectedSim(simId);
              setActiveTab("simulations");
            }}
          />
        )}

        {activeTab === "quiz" && (
          <PhysicsQuiz
            level={educationLevel}
            onSelectSim={(simId) => {
              setSelectedSim(simId);
              setActiveTab("simulations");
            }}
          />
        )}

        {activeTab === "notebook" && (
          <NotebookView
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenSimulation={(simId) => {
              setSelectedSim(simId);
              setActiveTab("simulations");
            }}
          />
        )}

        <SaveExperimentModal
          isOpen={isSaveSimModalOpen}
          onClose={() => setIsSaveSimModalOpen(false)}
          currentSimId={selectedSim}
          simName={simulationList.find((s) => s.id === selectedSim)?.name || "Physics Simulation"}
        />
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-4 mt-auto transition-colors ${
          theme === "dark"
            ? "border-slate-800/80 bg-slate-950/80 text-slate-400 backdrop-blur-sm"
            : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
              PHY64ALL
            </span>
            <span>•</span>
            <span>Multi-Sensory Physics Laboratory & AI Step-by-Step Problem Solver</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>School to Master's Curriculum</span>
            <span>•</span>
            <span>KaTeX Mathematics Rendering</span>
            <span>•</span>
            <span>Web Audio Sonification Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
