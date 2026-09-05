import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Sparkles,
  Volume2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flame,
  Award,
  BookOpen,
  Zap,
  RotateCcw,
  Compass,
  Lightbulb,
  Cloud,
  History,
  ShieldCheck,
} from "lucide-react";
import { EducationLevel, QuizQuestion, SimulationId, EDUCATION_LEVELS } from "../../types";
import { CURATED_QUIZ_QUESTIONS } from "../../data/quizData";
import { MASTER_DOMAINS } from "../../data/conceptsData";
import { KatexMath, MathText } from "../../utils/katexHelper";
import { sonifier } from "../../utils/sonification";
import { SonificationGuideModal } from "../sonification/SonificationGuideModal";
import { useAuth } from "../../context/AuthContext";
import { saveUserQuizAttempt, getUserQuizAttempts, QuizAttemptData } from "../../lib/firestoreService";

interface Props {
  level: EducationLevel;
  onSelectSim: (simId: SimulationId) => void;
}

export const PhysicsQuiz: React.FC<Props> = ({ level: initialLevel, onSelectSim }) => {
  const { user } = useAuth();

  const [currentLevel, setCurrentLevel] = useState<EducationLevel>(initialLevel || "high_school");
  const [selectedDomain, setSelectedDomain] = useState<string>("All Domains");
  
  // Active Question
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  // Hints
  const [revealedHintLevel, setRevealedHintLevel] = useState<number>(0); // 0 = none, 1 = concept, 2 = formula

  // Multi-Sensory Audio
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [showSonificationGuide, setShowSonificationGuide] = useState<boolean>(false);

  // Generation & Loading
  const [isGeneratingNew, setIsGeneratingNew] = useState<boolean>(false);
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);

  // Statistics
  const [score, setScore] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Firestore Quiz History state
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [pastAttempts, setPastAttempts] = useState<QuizAttemptData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const attempts = await getUserQuizAttempts(user.uid);
      setPastAttempts(attempts);
    } catch (err) {
      console.warn("Failed to load quiz history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user && showHistory) {
      loadHistory();
    }
  }, [user, showHistory]);

  // Sync initial level if parent prop changes
  useEffect(() => {
    if (initialLevel && initialLevel !== currentLevel) {
      setCurrentLevel(initialLevel);
    }
  }, [initialLevel]);

  // Load first question when level or domain changes
  useEffect(() => {
    loadNextQuestion(false);
  }, [currentLevel, selectedDomain]);

  const loadNextQuestion = async (forceGenerateFresh: boolean = false) => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setIsCorrect(false);
    setRevealedHintLevel(0);
    setIsPlayingAudio(false);

    // If not forced or if offline, search curated list first
    const availableCurated = CURATED_QUIZ_QUESTIONS.filter((q) => {
      const matchLevel = q.level === currentLevel;
      const matchDomain = selectedDomain === "All Domains" || q.domain.toLowerCase().includes(selectedDomain.toLowerCase());
      const notRecentlySeen = !seenQuestionIds.includes(q.id);
      return matchLevel && matchDomain && notRecentlySeen;
    });

    if (!forceGenerateFresh && availableCurated.length > 0) {
      const chosen = availableCurated[Math.floor(Math.random() * availableCurated.length)];
      setCurrentQuestion(chosen);
      setSeenQuestionIds((prev) => [...prev.slice(-15), chosen.id]);
      return;
    }

    // Otherwise generate dynamically from Gemini API
    setIsGeneratingNew(true);
    try {
      const res = await fetch("/api/generate-quiz-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: currentLevel,
          domain: selectedDomain,
          previousTopics: seenQuestionIds,
        }),
      });

      if (!res.ok) throw new Error("Could not fetch generated question");

      const questionData: QuizQuestion = await res.json();
      setCurrentQuestion(questionData);
      setSeenQuestionIds((prev) => [...prev.slice(-15), questionData.id || `q_${Date.now()}`]);
    } catch (err) {
      console.error("Failed to generate question, using curated fallback:", err);
      // Fallback to any curated question for this level
      const fallbacks = CURATED_QUIZ_QUESTIONS.filter((q) => q.level === currentLevel);
      const chosen = fallbacks[Math.floor(Math.random() * fallbacks.length)] || CURATED_QUIZ_QUESTIONS[0];
      setCurrentQuestion(chosen);
    } finally {
      setIsGeneratingNew(false);
    }
  };

  const handleSelectOption = (optionId: "A" | "B" | "C" | "D") => {
    if (isAnswerSubmitted || !currentQuestion) return;

    sonifier.ensureInitialized();
    setSelectedOption(optionId);
    setIsAnswerSubmitted(true);

    const correct = optionId === currentQuestion.correctOptionId;
    setIsCorrect(correct);
    setTotalAnswered((prev) => prev + 1);

    if (correct) {
      setScore((prev) => prev + 1);
      setStreak((prev) => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
      // Play celebratory multi-sensory chime
      sonifier.playResonanceHarmonic(523.25);
      setTimeout(() => sonifier.playResonanceHarmonic(659.25), 180);
      setTimeout(() => sonifier.playResonanceHarmonic(783.99), 360);
    } else {
      setStreak(0);
      // Play soft low discord click
      sonifier.playGeigerClick(-0.4);
      setTimeout(() => sonifier.playGeigerClick(-0.2), 120);
    }

    // Persist attempt record to user's Firestore document
    if (user) {
      const newScore = correct ? score + 1 : score;
      const newTotal = totalAnswered + 1;
      const attemptId = "quiz_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      saveUserQuizAttempt(user.uid, {
        id: attemptId,
        level: currentLevel,
        topic: currentQuestion.topic || selectedDomain,
        score: newScore,
        totalQuestions: newTotal,
        accuracy: Math.round((newScore / newTotal) * 100),
      }).catch((e) => console.warn("Firestore quiz sync:", e));
    }
  };

  const handleRevealHint = () => {
    sonifier.ensureInitialized();
    if (revealedHintLevel === 0) {
      setRevealedHintLevel(1);
      sonifier.playResonanceHarmonic(440);
    } else if (revealedHintLevel === 1 && currentQuestion?.additionalHint) {
      setRevealedHintLevel(2);
      sonifier.playResonanceHarmonic(587.33);
    }
  };

  const handlePlaySoundCue = () => {
    if (!currentQuestion) return;

    if (isPlayingAudio) {
      sonifier.stopContinuousTone();
      setIsPlayingAudio(false);
      return;
    }

    sonifier.ensureInitialized();
    setIsPlayingAudio(true);
    const cue = currentQuestion.sonificationCue;

    if (cue.soundType === "geiger") {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => sonifier.playGeigerClick(Math.random() * 0.8 - 0.4), i * 130);
      }
      setTimeout(() => setIsPlayingAudio(false), 1400);
    } else if (cue.soundType === "photoelectric") {
      sonifier.playPhotoelectricEmission(1.8);
      setTimeout(() => sonifier.playPhotoelectricEmission(2.6), 180);
      setTimeout(() => setIsPlayingAudio(false), 900);
    } else if (cue.soundType === "diode") {
      sonifier.playDiodeHum(0.65, false);
      setTimeout(() => {
        sonifier.stopContinuousTone();
        setIsPlayingAudio(false);
      }, 1600);
    } else if (cue.soundType === "fringe") {
      sonifier.playFringeTone(0.85, 0);
      setTimeout(() => {
        sonifier.stopContinuousTone();
        setIsPlayingAudio(false);
      }, 1600);
    } else if (cue.soundType === "tunneling") {
      sonifier.playWavepacketTunneling("transmitted");
      setTimeout(() => setIsPlayingAudio(false), 1200);
    } else if (cue.soundType === "collapse") {
      sonifier.playWavefunctionCollapse(3);
      setTimeout(() => setIsPlayingAudio(false), 1200);
    } else if (cue.soundType === "quantum_jump") {
      sonifier.playQuantumTransition(3, 1);
      setTimeout(() => setIsPlayingAudio(false), 1000);
    } else if (cue.soundType === "gas_collision") {
      for (let i = 0; i < 7; i++) {
        setTimeout(() => sonifier.playWallCollision(Math.random() * 0.8 + 0.2, (Math.random() - 0.5) * 1.5), i * 140);
      }
      setTimeout(() => setIsPlayingAudio(false), 1200);
    } else if (cue.soundType === "doppler") {
      sonifier.playDopplerShift(25, 440);
      setTimeout(() => setIsPlayingAudio(false), 1200);
    } else {
      sonifier.playResonanceHarmonic(440);
      setTimeout(() => sonifier.playResonanceHarmonic(554.37), 180);
      setTimeout(() => sonifier.playResonanceHarmonic(659.25), 360);
      setTimeout(() => setIsPlayingAudio(false), 1400);
    }
  };

  const handleResetStats = () => {
    setScore(0);
    setTotalAnswered(0);
    setStreak(0);
  };

  const accuracy = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Multi-Sensory Quiz Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold uppercase tracking-wider">
                Multi-Sensory MCQ Arena
              </span>
              <span className="text-xs text-slate-500 font-medium">PHY64ALL Adaptive Quiz</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Interactive Physics Quiz & Conceptual Challenge
            </h2>
          </div>

          {/* Level Switcher & Reset */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
              {EDUCATION_LEVELS.map((lvlConfig) => (
                <button
                  key={lvlConfig.id}
                  id={`quiz-level-${lvlConfig.id}`}
                  onClick={() => setCurrentLevel(lvlConfig.id)}
                  className={`px-3 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                    currentLevel === lvlConfig.id
                      ? "bg-white text-blue-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title={lvlConfig.description}
                >
                  {lvlConfig.label}
                </button>
              ))}
            </div>

            <button
              id="quiz-reset-stats-btn"
              onClick={handleResetStats}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
              title="Reset Quiz Statistics"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Domain Filter Pills & Scoreboard */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Domain Picker */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-2xl scrollbar-thin">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1 mr-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Domain:
            </span>
            {["All Domains", ...MASTER_DOMAINS].map((dom) => {
              const isSelected = selectedDomain === dom;
              return (
                <button
                  key={dom}
                  id={`quiz-domain-${dom.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => setSelectedDomain(dom)}
                  className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {dom}
                </button>
              );
            })}
          </div>

          {/* Live Scoreboard & History Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                showHistory
                  ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title="View private quiz attempts saved in Firestore"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <div className="flex items-center gap-4 text-xs font-medium bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200 shrink-0">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Award className="w-4 h-4 text-amber-500" />
                <span>
                  Score: <strong className="text-slate-900">{score}/{totalAnswered}</strong> ({accuracy}%)
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-700">
                <Flame className={`w-4 h-4 ${streak > 0 ? "text-orange-500 animate-pulse" : "text-slate-400"}`} />
                <span>
                  Streak: <strong className={streak > 0 ? "text-orange-600" : "text-slate-600"}>{streak}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* History Records Panel */}
        {showHistory && (
          <div className="mt-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">Your Private Quiz Progress</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                  Cloud Synced
                </span>
              </div>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="text-[11px] text-purple-600 hover:underline cursor-pointer"
              >
                {loadingHistory ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {!user ? (
              <p className="text-xs text-slate-500 py-1.5">
                Sign in to automatically track and sync your quiz performance across sessions.
              </p>
            ) : pastAttempts.length === 0 ? (
              <p className="text-xs text-slate-500 py-1.5">
                No quiz history yet. Answer questions to record your progress in Firestore!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {pastAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 capitalize truncate">
                        {att.topic}
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                        {att.accuracy}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>
                        Score: {att.score}/{att.totalQuestions}
                      </span>
                      <span>{new Date(att.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Quiz Question Card */}
      {isGeneratingNew ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3 min-h-[360px]">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <h3 className="text-base font-bold text-slate-800">Generating Physics Question...</h3>
          <p className="text-xs text-slate-500 max-w-md">
            AI is creating a rigorous conceptual problem for {currentLevel === "masters" ? "Master's level" : currentLevel === "high_school" ? "High School level" : "School level"} in {selectedDomain}...
          </p>
        </div>
      ) : currentQuestion ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Question Metadata & Sound Cue Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                {currentQuestion.domain}
              </span>
              <span className="text-xs font-medium text-slate-500">
                • {currentQuestion.topic}
              </span>
            </div>

            {/* Sonification Controls */}
            <div className="flex items-center gap-2">
              <button
                id="quiz-view-matrix-btn"
                onClick={() => setShowSonificationGuide(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 transition-all"
                title="Explore the 8-dimensional physics sonification matrix"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">8-D Matrix</span>
              </button>

              {/* Listen to Multi-Sensory Audio Clue Button */}
              <button
                id="quiz-listen-sound-cue-btn"
                onClick={handlePlaySoundCue}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                  isPlayingAudio
                    ? "bg-purple-700 text-white animate-pulse"
                    : "bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300"
                }`}
                title="Hear the acoustic sonification associated with this physical concept"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingAudio ? "Playing Soundscape..." : "Listen to Concept Soundscape"}</span>
              </button>
            </div>
          </div>

          {/* Sound cue note if played */}
          {currentQuestion.sonificationCue && (
            <div className="p-2.5 bg-purple-50 border border-purple-200/80 rounded-lg text-xs text-purple-950 flex items-start gap-2">
              <Volume2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Acoustic Sonification Clue:</strong> {currentQuestion.sonificationCue.description}
              </div>
            </div>
          )}

          {/* Question Statement */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Multiple Choice Question:
            </span>
            <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
              <MathText text={currentQuestion.question} />
            </div>
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((opt) => {
              const isThisSelected = selectedOption === opt.id;
              const isThisCorrect = opt.id === currentQuestion.correctOptionId;

              let styleClasses = "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-800";

              if (isAnswerSubmitted) {
                if (isThisCorrect) {
                  styleClasses = "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-200";
                } else if (isThisSelected && !isThisCorrect) {
                  styleClasses = "bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-200";
                } else {
                  styleClasses = "bg-slate-50/60 border-slate-200 text-slate-400 opacity-60";
                }
              }

              return (
                <button
                  key={opt.id}
                  id={`quiz-option-${opt.id}`}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={isAnswerSubmitted}
                  className={`flex items-start text-left p-3.5 rounded-xl border transition-all ${styleClasses}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mr-3 mt-0.5 ${
                      isAnswerSubmitted && isThisCorrect
                        ? "bg-emerald-600 text-white"
                        : isAnswerSubmitted && isThisSelected && !isThisCorrect
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {opt.id}
                  </span>

                  <div className="flex-1 text-sm pt-0.5">
                    <MathText text={opt.text} />
                    {opt.latexMath && (
                      <div className="mt-1">
                        <KatexMath math={opt.latexMath} inline />
                      </div>
                    )}
                  </div>

                  {isAnswerSubmitted && isThisCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                  )}
                  {isAnswerSubmitted && isThisSelected && !isThisCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Hint Area */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <button
                id="quiz-hint-btn"
                onClick={handleRevealHint}
                disabled={isAnswerSubmitted || revealedHintLevel >= (currentQuestion.additionalHint ? 2 : 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>
                  {revealedHintLevel === 0
                    ? "Need a Hint?"
                    : revealedHintLevel === 1 && currentQuestion.additionalHint
                    ? "Show Formula Hint"
                    : "Hint Revealed"}
                </span>
              </button>

              {/* Next / Generate Button */}
              <button
                id="quiz-next-question-btn"
                onClick={() => loadNextQuestion(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-xs"
              >
                <span>{isAnswerSubmitted ? "Next Question" : "Generate Newer Question"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Hint 1 Reveal Card */}
            {revealedHintLevel >= 1 && (
              <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  Conceptual Clue:
                </span>
                <div className="leading-relaxed">
                  <MathText text={currentQuestion.hint} />
                </div>
              </div>
            )}

            {/* Hint 2 Reveal Card */}
            {revealedHintLevel >= 2 && currentQuestion.additionalHint && (
              <div className="mt-2 p-3 bg-amber-100/70 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Zap className="w-3.5 h-3.5 text-amber-700" />
                  Mathematical Formula Clue:
                </span>
                <div className="leading-relaxed">
                  <MathText text={currentQuestion.additionalHint} />
                </div>
              </div>
            )}
          </div>

          {/* Post-Answer Feedback & Explanation Section */}
          {isAnswerSubmitted && (
            <div className={`p-4 rounded-xl border space-y-3 ${isCorrect ? "bg-emerald-50/80 border-emerald-300" : "bg-slate-50 border-slate-300"}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-900">Brilliant! That is correct.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span className="text-rose-900">
                      Not quite. The correct answer is Option {currentQuestion.correctOptionId}.
                    </span>
                  </>
                )}
              </div>

              {/* Detailed Physical Derivation & Explanation */}
              <div className="text-xs text-slate-800 leading-relaxed space-y-2">
                <span className="font-bold block text-slate-900">Physics Explanation & Mathematical Insight:</span>
                <MathText text={currentQuestion.explanation} />
              </div>

              {/* Governing Equation */}
              {currentQuestion.governingEquation && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Governing Law:
                  </span>
                  <KatexMath math={currentQuestion.governingEquation} inline={false} />
                </div>
              )}

              {/* Link to Interactive Simulator if available */}
              {currentQuestion.associatedSim && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <span className="text-slate-600">Explore this physical phenomenon in the lab:</span>
                  <button
                    id="quiz-open-sim-btn"
                    onClick={() => onSelectSim(currentQuestion.associatedSim!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Laboratory Simulation</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          Click below to load a question.
          <button
            onClick={() => loadNextQuestion(true)}
            className="mt-3 block mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-xs"
          >
            Start Quiz
          </button>
        </div>
      )}
      {/* 8-Dimensional Sonification Guide Modal */}
      <SonificationGuideModal
        isOpen={showSonificationGuide}
        onClose={() => setShowSonificationGuide(false)}
        theme="light"
      />
    </div>
  );
};
