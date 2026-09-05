import React, { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Volume2,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  History,
  Trash2,
  Cloud,
} from "lucide-react";
import { EducationLevel, SolvedProblem, SimulationId, EDUCATION_LEVELS } from "../../types";
import { PRESET_PROBLEMS } from "../../data/problemsData";
import { KatexMath } from "../../utils/katexHelper";
import { sonifier } from "../../utils/sonification";
import { useAuth } from "../../context/AuthContext";
import {
  saveUserSolvedProblem,
  getUserSolvedProblems,
  deleteUserSolvedProblem,
  SolvedProblemData,
} from "../../lib/firestoreService";

interface Props {
  level: EducationLevel;
  onSelectSim: (simId: SimulationId) => void;
}

export const ProblemSolver: React.FC<Props> = ({ level, onSelectSim }) => {
  const { user } = useAuth();
  const [problemText, setProblemText] = useState<string>(
    PRESET_PROBLEMS.find((p) => p.level === level)?.problemText ||
      "A cannon fires a projectile with an initial velocity of 45 m/s at an angle of 35 degrees. Calculate its flight time and range."
  );
  const [selectedTopic, setSelectedTopic] = useState<string>("Mechanics");
  const [targetLevel, setTargetLevel] = useState<EducationLevel>(level);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [solvedData, setSolvedData] = useState<SolvedProblem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Firestore notebook state
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showNotebook, setShowNotebook] = useState<boolean>(false);
  const [savedRecords, setSavedRecords] = useState<SolvedProblemData[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  // Filter preset problems by current level
  const filteredPresets = PRESET_PROBLEMS.filter((p) => p.level === targetLevel);

  // Load saved problems when notebook is toggled or user changes
  useEffect(() => {
    if (user && showNotebook) {
      loadSavedProblems();
    }
  }, [user, showNotebook]);

  const loadSavedProblems = async () => {
    if (!user) return;
    setLoadingRecords(true);
    try {
      const records = await getUserSolvedProblems(user.uid);
      setSavedRecords(records);
    } catch (err) {
      console.warn("Failed to load saved records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSaveToNotebook = async () => {
    if (!user || !solvedData) return;
    setIsSaving(true);
    try {
      const id = "sol_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const finalStr = solvedData.finalAnswer
        ? `${solvedData.finalAnswer.latexFormatted || solvedData.finalAnswer.value} ${solvedData.finalAnswer.unit || ""}`.trim()
        : undefined;

      await saveUserSolvedProblem(user.uid, {
        id,
        problem: problemText,
        topic: solvedData.topic || selectedTopic,
        level: targetLevel,
        summary: solvedData.summary,
        finalAnswer: finalStr,
        steps: solvedData.steps,
      });
      setIsSaved(true);
      if (showNotebook) {
        loadSavedProblems();
      }
    } catch (err: any) {
      console.error("Failed to save to Firestore notebook:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteUserSolvedProblem(user.uid, id);
      setSavedRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  const handleSolve = async () => {
    if (!problemText.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setIsSaved(false);

    try {
      const response = await fetch("/api/solve-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemText,
          level: targetLevel,
          topic: selectedTopic,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to solve physics problem.");
      }

      const data: SolvedProblem = await response.json();
      setSolvedData(data);

      // Play pleasant completion chime
      sonifier.playResonanceHarmonic(523.25);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while solving the problem.");
    } finally {
      setIsLoading(false);
    }
  };

  const speakSolution = () => {
    if (!solvedData) return;
    const text = `Physics Solution summary: ${solvedData.summary}. The final calculated result is ${solvedData.finalAnswer.value} ${solvedData.finalAnswer.unit}. Conceptual intuition: ${solvedData.conceptualIntuition}. Sensory sonification tip: ${solvedData.sensoryInterpretation.sonificationTip}`;
    sonifier.speakNarration(text);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Numerical Physics Problem Solver & Multi-Sensory Step-by-Step Tutor
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Provides step-by-step mathematical derivations, SI unit tracking, and sensory guidance for school to Master's level.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label htmlFor="solver-level-select" className="text-xs text-slate-500 block mb-1">Target Level:</label>
              <select
                id="solver-level-select"
                value={targetLevel}
                onChange={(e) => {
                  const newLvl = e.target.value as EducationLevel;
                  setTargetLevel(newLvl);
                  const firstPreset = PRESET_PROBLEMS.find((p) => p.level === newLvl);
                  if (firstPreset) setProblemText(firstPreset.problemText);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.label} ({lvl.tagline})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="solver-topic-select" className="text-xs text-slate-500 block mb-1">Topic:</label>
              <select
                id="solver-topic-select"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
              >
                <option value="Mechanics">Classical Mechanics & Kinematics</option>
                <option value="Harmonics">Oscillations & Harmonics</option>
                <option value="Wave Optics">Optics & Wave Interference</option>
                <option value="Electromagnetism">Electromagnetism & Fields</option>
                <option value="Quantum Mechanics">Quantum Mechanics</option>
                <option value="Astrophysics">Astrophysics & Gravitation</option>
                <option value="Thermodynamics">Thermodynamics & Statistical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preset problem quick chips & Notebook Toggle */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600">
            Select a classic problem preset or write your own below:
          </span>

          <button
            type="button"
            onClick={() => setShowNotebook(!showNotebook)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              showNotebook
                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>My Cloud Notebook ({savedRecords.length})</span>
          </button>
        </div>

        {/* Notebook Drawer/List if open */}
        {showNotebook && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-800">Your Private Firestore Notebook</h4>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Isolated by Security Rules
                </span>
              </div>
              <button
                onClick={loadSavedProblems}
                disabled={loadingRecords}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                {loadingRecords ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {!user ? (
              <p className="text-xs text-slate-500 py-2">
                Please sign in with Google, Email, or Guest mode to view and save your private problems.
              </p>
            ) : savedRecords.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No solved problems saved in your Firestore notebook yet. Solve a problem and click "Save to Notebook".
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                {savedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setProblemText(rec.problem);
                      if (rec.topic) setSelectedTopic(rec.topic);
                      if (rec.level) setTargetLevel(rec.level as EducationLevel);
                    }}
                    className="p-2.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition-all cursor-pointer group flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">
                          {rec.topic || "Physics"}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium line-clamp-2">
                        {rec.problem}
                      </p>
                      {rec.finalAnswer && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-1 truncate">
                          Result: {rec.finalAnswer}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecord(rec.id, e)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0"
                      title="Delete from Firestore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => {
                  setProblemText(preset.problemText);
                  setSelectedTopic(preset.topic);
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-left"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea Input */}
        <div className="relative">
          <textarea
            id="physics-problem-textarea"
            rows={3}
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder="Type or paste any physics problem here... (e.g. A 2kg block slides down a 30° incline with friction coeff 0.2...)"
            className="w-full text-sm p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 resize-none text-slate-800"
          />

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Uses server-side Gemini AI with rigorous mathematical derivations and unit analysis.
            </span>
            <button
              id="solve-problem-submit-btn"
              onClick={handleSolve}
              disabled={isLoading || !problemText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 active:scale-98"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isLoading ? "Solving & Deriving..." : "Solve Step-by-Step"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Solved Results Presentation */}
      {solvedData && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Solution Overview Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  {solvedData.topic} • {solvedData.difficulty.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Solution Breakdown
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Save to Firestore Notebook Button */}
                <button
                  id="save-to-notebook-btn"
                  onClick={handleSaveToNotebook}
                  disabled={isSaving || isSaved || !user}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    isSaved
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                  } disabled:opacity-75`}
                  title={!user ? "Sign in to save derivations to your private Firestore notebook" : isSaved ? "Saved to your private Firestore notebook" : "Save derivation to Firestore notebook"}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Saved in Cloud</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isSaving ? "Saving..." : "Save to Notebook"}</span>
                    </>
                  )}
                </button>

                <button
                  id="speak-solution-btn"
                  onClick={speakSolution}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs hover:bg-slate-100 transition-colors"
                  title="Listen to full solution narration"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  Read Aloud
                </button>
                {solvedData.interactiveSimSuggestion && (
                  <button
                    id="open-sim-from-solver-btn"
                    onClick={() => onSelectSim(solvedData.interactiveSimSuggestion!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open Simulator
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              {solvedData.summary}
            </p>

            {/* Knowns & Unknowns Grid */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-2">Given Known Quantities:</span>
                <div className="space-y-1.5">
                  {solvedData.knowns.map((k, idx) => (
                    <div key={idx} className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-600">{k.description} ({k.symbol}):</span>
                      <span className="font-semibold text-slate-800">{k.value} {k.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/60">
                <span className="font-bold text-blue-900 block mb-2">Target Unknowns to Find:</span>
                <div className="space-y-1.5">
                  {solvedData.unknowns.map((u, idx) => (
                    <div key={idx} className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-blue-700">{u.description} ({u.symbol}):</span>
                      <span className="font-bold text-blue-800">in [{u.targetUnit}]</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Governing Formulas */}
            <div className="mt-4 p-3 bg-amber-50/40 border border-amber-200/70 rounded-lg text-xs">
              <span className="font-bold text-amber-900 block mb-2">Governing Physical Laws & Formulas:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {solvedData.formulas.map((f, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border border-amber-200/50">
                    <span className="font-semibold text-slate-800 block text-[11px] mb-1">{f.name}</span>
                    <KatexMath math={f.latex} inline={false} className="text-slate-900 py-0.5" />
                    <span className="text-[10px] text-slate-500 block mt-1">{f.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step-by-Step Derivations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Step-by-Step Mathematical Derivation
            </h4>

            <div className="space-y-4">
              {solvedData.steps.map((step) => (
                <div key={step.stepNumber} className="border-l-2 border-blue-600 pl-4 py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                      {step.stepNumber}
                    </span>
                    <h5 className="font-bold text-slate-800 text-xs">{step.title}</h5>
                  </div>
                  <p className="text-slate-600 mt-1.5 leading-relaxed">{step.explanation}</p>

                  {step.latexMath && (
                    <div className="my-2 p-2 bg-slate-50 rounded border border-slate-200/60 max-w-xl">
                      <KatexMath math={step.latexMath} inline={false} />
                    </div>
                  )}

                  {step.numericalValue && (
                    <div className="font-mono text-emerald-700 font-semibold text-[11px] mt-1">
                      Evaluated: {step.numericalValue}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Final Answer Box */}
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                  Final Evaluated Result
                </span>
                <div className="text-lg font-bold text-emerald-950 font-mono mt-0.5">
                  <KatexMath math={solvedData.finalAnswer.latexFormatted || `${solvedData.finalAnswer.value} \\text{ ${solvedData.finalAnswer.unit}}`} inline />
                </div>
              </div>

              <div className="px-3 py-1.5 bg-white/80 rounded-lg border border-emerald-200 font-mono text-xs text-emerald-800">
                Precision: {solvedData.finalAnswer.value} {solvedData.finalAnswer.unit}
              </div>
            </div>
          </div>

          {/* Multi-Sensory & Conceptual Intuition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Physical Intuition & Everyday Analogy
              </span>
              <p className="text-slate-600 leading-relaxed">
                {solvedData.conceptualIntuition}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Volume2 className="w-4 h-4 text-purple-600" />
                Sensory Sonification & Visualization Guide
              </span>
              <div className="space-y-2 text-slate-600">
                <div>
                  <span className="font-semibold text-slate-700 block text-[11px]">Visualization:</span>
                  <p>{solvedData.sensoryInterpretation.visualizationTip}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block text-[11px]">Sonification:</span>
                  <p>{solvedData.sensoryInterpretation.sonificationTip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
