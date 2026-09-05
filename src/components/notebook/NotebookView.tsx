import React, { useState, useEffect } from "react";
import {
  BookMarked,
  MessageSquare,
  Activity,
  Award,
  Calculator,
  Trash2,
  ExternalLink,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Atom,
  RefreshCw,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  UserCheck,
  ShieldCheck,
  Flame,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getUserExperiments,
  deleteUserExperiment,
  getUserSolvedProblems,
  deleteUserSolvedProblem,
  getUserQuizAttempts,
  deleteUserQuizAttempt,
  getUserChats,
  deleteUserChat,
  SavedExperimentData,
  SolvedProblemData,
  QuizAttemptData,
} from "../../lib/firestoreService";
import { SavedChatData, SimulationId, ActiveTab } from "../../types";
import { KatexMath } from "../../utils/katexHelper";

interface Props {
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenSimulation: (simId: SimulationId) => void;
}

type NotebookTab = "all" | "chats" | "simulations" | "quizzes" | "problems";

export const NotebookView: React.FC<Props> = ({ onNavigateTab, onOpenSimulation }) => {
  const { user, profile } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<NotebookTab>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Stored Data Collections
  const [chats, setChats] = useState<SavedChatData[]>([]);
  const [experiments, setExperiments] = useState<SavedExperimentData[]>([]);
  const [quizzes, setQuizzes] = useState<QuizAttemptData[]>([]);
  const [problems, setProblems] = useState<SolvedProblemData[]>([]);

  // Expanded items state
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [expandedProblemId, setExpandedProblemId] = useState<string | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAllNotebookData = async (targetUid?: string) => {
    const uid = targetUid || user?.uid;
    if (!uid) {
      setChats([]);
      setExperiments([]);
      setQuizzes([]);
      setProblems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [fetchedChats, fetchedExperiments, fetchedQuizzes, fetchedProblems] =
        await Promise.all([
          getUserChats(uid),
          getUserExperiments(uid),
          getUserQuizAttempts(uid),
          getUserSolvedProblems(uid),
        ]);

      // Ensure state is only applied if the user hasn't changed or logged out mid-request
      if (user?.uid === uid) {
        setChats(fetchedChats);
        setExperiments(fetchedExperiments);
        setQuizzes(fetchedQuizzes);
        setProblems(fetchedProblems);
      }
    } catch (err) {
      console.warn("Failed to load notebook data:", err);
    } finally {
      if (user?.uid === uid) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Immediately clear out data from any prior user/guest session
    setChats([]);
    setExperiments([]);
    setQuizzes([]);
    setProblems([]);
    setExpandedChatId(null);
    setExpandedProblemId(null);

    if (user?.uid) {
      loadAllNotebookData(user.uid);
    } else {
      setLoading(false);
    }
  }, [user?.uid]);

  // Deletion Handlers
  const handleDeleteChat = async (id: string) => {
    if (!user) return;
    try {
      await deleteUserChat(user.uid, id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      showToast("Chat conversation removed from notebook");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    if (!user) return;
    try {
      await deleteUserExperiment(user.uid, id);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      showToast("Simulation experiment removed from notebook");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!user) return;
    try {
      await deleteUserQuizAttempt(user.uid, id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      showToast("Quiz attempt record removed from notebook");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!user) return;
    try {
      await deleteUserSolvedProblem(user.uid, id);
      setProblems((prev) => prev.filter((p) => p.id !== id));
      showToast("Solved problem removed from notebook");
    } catch (err) {
      console.error(err);
    }
  };

  // Export entire Notebook as JSON file
  const handleExportNotebook = () => {
    const notebookPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        uid: user?.uid,
        displayName: user?.displayName,
        email: user?.email,
      },
      chats,
      experiments,
      quizzes,
      problems,
    };

    const blob = new Blob([JSON.stringify(notebookPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PHY64ALL_Notebook_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Notebook exported successfully");
  };

  // Filtering
  const q = searchQuery.toLowerCase().trim();

  const filteredChats = chats.filter(
    (c) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.domain?.toLowerCase().includes(q) ||
      c.messages.some((m) => m.text.toLowerCase().includes(q))
  );

  const filteredExperiments = experiments.filter(
    (e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.simType.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q)
  );

  const filteredQuizzes = quizzes.filter(
    (qz) =>
      !q ||
      qz.topic?.toLowerCase().includes(q) ||
      qz.domain?.toLowerCase().includes(q) ||
      qz.level?.toLowerCase().includes(q)
  );

  const filteredProblems = problems.filter(
    (p) =>
      !q ||
      p.problem.toLowerCase().includes(q) ||
      p.topic?.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q)
  );

  const totalItemsCount =
    chats.length + experiments.length + quizzes.length + problems.length;

  const totalQuizScore = quizzes.reduce((acc, curr) => acc + curr.score, 0);
  const totalQuizQuestions = quizzes.reduce((acc, curr) => acc + curr.totalQuestions, 0);
  const avgQuizAccuracy =
    totalQuizQuestions > 0 ? Math.round((totalQuizScore / totalQuizQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Account Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Physics Laboratory Notebook
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                  {totalItemsCount} Records Logged
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved AI concept chats, simulation configurations, quiz attempts, and step-by-step problem derivations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cloud Sync Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-slate-700 block">
                  {user?.email ? user.email : user?.displayName || "Signed In"}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Cloud Synchronized with Firestore
                </span>
              </div>
            </div>

            <button
              id="refresh-notebook-btn"
              onClick={loadAllNotebookData}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh notebook from cloud"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <button
              id="export-notebook-btn"
              onClick={handleExportNotebook}
              disabled={totalItemsCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export Notebook (JSON)
            </button>
          </div>
        </div>

        {/* Quick Statistics Strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 leading-none block">
                {chats.length}
              </span>
              <span className="text-[11px] text-slate-500">Saved Chats</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 leading-none block">
                {experiments.length}
              </span>
              <span className="text-[11px] text-slate-500">Sim Experiments</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 leading-none block">
                {quizzes.length}
              </span>
              <span className="text-[11px] text-slate-500">
                Quizzes ({avgQuizAccuracy}% acc)
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 leading-none block">
                {problems.length}
              </span>
              <span className="text-[11px] text-slate-500">Solved Problems</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            id="notebook-filter-all"
            onClick={() => setActiveSubTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "all"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Items ({totalItemsCount})
          </button>
          <button
            id="notebook-filter-chats"
            onClick={() => setActiveSubTab("chats")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "chats"
                ? "bg-white text-purple-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI Chats ({chats.length})
          </button>
          <button
            id="notebook-filter-simulations"
            onClick={() => setActiveSubTab("simulations")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "simulations"
                ? "bg-white text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Simulations ({experiments.length})
          </button>
          <button
            id="notebook-filter-quizzes"
            onClick={() => setActiveSubTab("quizzes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "quizzes"
                ? "bg-white text-amber-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Quiz Scores ({quizzes.length})
          </button>
          <button
            id="notebook-filter-problems"
            onClick={() => setActiveSubTab("problems")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "problems"
                ? "bg-white text-emerald-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Solved Problems ({problems.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notebook by topic, formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Loading your laboratory notebook from Firestore...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && totalItemsCount === 0 && (
        <div className="py-14 text-center bg-white rounded-xl border border-dashed border-slate-300 p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Your Physics Notebook is Ready</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Start exploring the laboratory! You can save your AI tutor chat threads, simulation experiment setups, quiz score history, and step-by-step problem derivations here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => onNavigateTab("concepts")}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
            >
              Ask AI Physics Tutor
            </button>
            <button
              onClick={() => onNavigateTab("simulations")}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Run Simulation Lab
            </button>
            <button
              onClick={() => onNavigateTab("solver")}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              Solve a Problem
            </button>
            <button
              onClick={() => onNavigateTab("quiz")}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
            >
              Take a Quiz
            </button>
          </div>
        </div>
      )}

      {/* 1. Saved AI Chats Section */}
      {!loading && (activeSubTab === "all" || activeSubTab === "chats") && filteredChats.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              Saved AI Tutor Conversations ({filteredChats.length})
            </h3>
            <button
              onClick={() => onNavigateTab("concepts")}
              className="text-xs text-purple-600 font-semibold hover:underline flex items-center gap-1"
            >
              Open Concept Explorer
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredChats.map((chat) => {
              const isExpanded = expandedChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-purple-200 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                        {chat.domain || "Physics Concept"}
                      </span>
                      {chat.level && (
                        <span className="text-[10px] text-slate-500 capitalize">
                          • {chat.level.replace("_", " ")}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(chat.createdAt).toLocaleDateString()} {new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedChatId(isExpanded ? null : chat.id)}
                        className="px-2 py-1 rounded-md text-slate-600 text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Dialog</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>View {chat.messages.length} Messages</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteChat(chat.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Delete chat from notebook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    {chat.title}
                  </h4>

                  {/* Expanded transcript */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 max-h-96 overflow-y-auto pr-1">
                      {chat.messages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            m.role === "assistant"
                              ? "bg-purple-50/60 border border-purple-100 text-slate-800"
                              : "bg-slate-100 text-slate-900 font-medium"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-bold">
                            <span>{m.role === "assistant" ? "PHY64ALL AI Tutor" : "User Inquiry"}</span>
                            <span>{m.timestamp}</span>
                          </div>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          {m.structuredData?.keyEquations && m.structuredData.keyEquations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-purple-200/50 space-y-1">
                              <span className="font-bold text-[10px] text-purple-900 block">Key Formulas:</span>
                              {m.structuredData.keyEquations.map((eq, eqIdx) => (
                                <div key={eqIdx} className="bg-white/80 p-1.5 rounded border border-purple-200/60">
                                  <KatexMath math={eq.latex} inline={false} className="py-0.5 text-slate-900" />
                                  <span className="text-[10px] text-slate-600 block">{eq.meaning}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Saved Simulation Experiments Section */}
      {!loading && (activeSubTab === "all" || activeSubTab === "simulations") && filteredExperiments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Saved Simulation Experiments ({filteredExperiments.length})
            </h3>
            <button
              onClick={() => onNavigateTab("simulations")}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              Open Simulation Lab
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredExperiments.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                      {exp.simType.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteExperiment(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Delete experiment from notebook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    {exp.title}
                  </h4>

                  {exp.notes && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{exp.notes}"
                    </p>
                  )}

                  {/* Parameter badges */}
                  {exp.parameters && Object.keys(exp.parameters).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(exp.parameters).slice(0, 5).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Ready to simulate</span>
                  <button
                    onClick={() => onOpenSimulation(exp.simType as SimulationId)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch in Lab
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Quiz Scores Section */}
      {!loading && (activeSubTab === "all" || activeSubTab === "quizzes") && filteredQuizzes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              Quiz Score History ({filteredQuizzes.length})
            </h3>
            <button
              onClick={() => onNavigateTab("quiz")}
              className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1"
            >
              Take Another Quiz
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuizzes.map((qz) => {
              const pct =
                qz.totalQuestions > 0 ? Math.round((qz.score / qz.totalQuestions) * 100) : 0;
              return (
                <div
                  key={qz.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-amber-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                        {qz.domain || qz.topic || "Physics Quiz"}
                      </span>
                      <button
                        onClick={() => handleDeleteQuiz(qz.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Delete quiz record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-black text-slate-900 leading-none">
                          {qz.score} / {qz.totalQuestions}
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Questions Answered Correctly
                        </span>
                      </div>

                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs ${
                          pct >= 80
                            ? "bg-emerald-100 text-emerald-800"
                            : pct >= 50
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {pct}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="capitalize">{qz.level?.replace("_", " ") || "Physics"}</span>
                    <span>{new Date(qz.completedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Solved Problems Section */}
      {!loading && (activeSubTab === "all" || activeSubTab === "problems") && filteredProblems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              Solved Physics Problems ({filteredProblems.length})
            </h3>
            <button
              onClick={() => onNavigateTab("solver")}
              className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
            >
              Open Problem Solver
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredProblems.map((prob) => {
              const isExpanded = expandedProblemId === prob.id;
              return (
                <div
                  key={prob.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-200 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        {prob.topic || "Problem"}
                      </span>
                      {prob.level && (
                        <span className="text-[10px] text-slate-500 capitalize">
                          • {prob.level.replace("_", " ")}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(prob.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedProblemId(isExpanded ? null : prob.id)}
                        className="px-2 py-1 rounded-md text-slate-600 text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Derivation</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>View Full Derivation</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteProblem(prob.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Delete solved problem from notebook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    "{prob.problem}"
                  </h4>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {prob.summary}
                  </p>

                  {/* Final Answer Badge */}
                  {prob.finalAnswer && (
                    <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900">
                        Evaluated Result:
                      </span>
                      <div className="font-mono font-bold text-xs text-emerald-950">
                        <KatexMath math={prob.finalAnswer} inline />
                      </div>
                    </div>
                  )}

                  {/* Expanded derivation steps if stored */}
                  {isExpanded && prob.steps && prob.steps.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                      <span className="text-xs font-bold text-slate-800 block">
                        Step-by-Step Derivation:
                      </span>
                      {prob.steps.map((step) => (
                        <div key={step.stepNumber} className="border-l-2 border-emerald-500 pl-3 py-1 text-xs">
                          <span className="font-bold text-slate-800">
                            Step {step.stepNumber}: {step.title}
                          </span>
                          <p className="text-slate-600 mt-0.5">{step.explanation}</p>
                          {step.latexMath && (
                            <div className="my-1.5 p-2 bg-slate-50 rounded border border-slate-200">
                              <KatexMath math={step.latexMath} inline={false} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
