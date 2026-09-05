import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Download,
  Trash2,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  Compass,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  BookMarked,
} from "lucide-react";
import {
  ConceptChatMessage,
  MasterDomain,
  EducationLevel,
  SimulationId,
  ChatConceptResponse,
  EDUCATION_LEVELS,
} from "../../types";
import { MASTER_DOMAINS, DOMAIN_SAMPLE_QUESTIONS, CONCEPTS_DATABASE } from "../../data/conceptsData";
import { KatexMath, MathText } from "../../utils/katexHelper";
import { exportChatToPdf } from "../../utils/pdfExport";
import { useAuth } from "../../context/AuthContext";
import { saveUserChat } from "../../lib/firestoreService";

interface Props {
  level: EducationLevel;
  onSelectSim?: (simId: SimulationId) => void;
}

export const ConceptExplorer: React.FC<Props> = ({ level: initialLevel, onSelectSim }) => {
  const [selectedDomain, setSelectedDomain] = useState<MasterDomain>("Classical Mechanics");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(initialLevel || "masters");
  const [inputQuery, setInputQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ConceptChatMessage[]>([]);

  const { user } = useAuth();
  const [isSavingChat, setIsSavingChat] = useState<boolean>(false);
  const [savedChatSuccess, setSavedChatSuccess] = useState<boolean>(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);

  const handleSaveChatToNotebook = async () => {
    if (!user || messages.length === 0) return;
    setIsSavingChat(true);
    try {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? `${selectedDomain}: ${firstUserMsg.text.slice(0, 50)}${firstUserMsg.text.length > 50 ? "..." : ""}`
        : `${selectedDomain} Concept Discussion`;

      const chatId = "chat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      await saveUserChat(user.uid, {
        id: chatId,
        title,
        domain: selectedDomain,
        level: educationLevel,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          timestamp: m.timestamp,
          text: m.text,
          domain: m.domain,
          level: m.level,
          structuredData: m.structuredData,
        })),
      });

      setSavedChatSuccess(true);
      setTimeout(() => setSavedChatSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save chat to notebook:", err);
    } finally {
      setIsSavingChat(false);
    }
  };

  // Sync educationLevel if initialLevel prop changes
  useEffect(() => {
    if (initialLevel) {
      setEducationLevel(initialLevel);
    }
  }, [initialLevel]);

  // Initialize with welcoming message tailored to current domain and level
  useEffect(() => {
    if (messages.length === 0) {
      const isExplorer = educationLevel === "explorer";
      const isMiddle = educationLevel === "middle_school";
      const isHigh = educationLevel === "high_school";
      const isCollege = educationLevel === "college";

      const welcomeMsg: ConceptChatMessage = {
        id: "msg_welcome",
        role: "assistant",
        text: `Welcome to **PHY64ALL Concept Explorer**! I am your AI Physics Tutor covering everything from sensory intuition to advanced Master's degree physics.\n\nYou are currently exploring **${selectedDomain}** at the **${
          EDUCATION_LEVELS.find((l) => l.id === educationLevel)?.label || "Master's"
        }** level. Feel free to ask any question from this domain, or ask a random query from any other branch of physics—I will detect the domain and guide your inquiry with rigorous mathematical formulas, physical analogies, and step-by-step physical derivations tailored specifically to your chosen level.`,
        domain: selectedDomain,
        level: educationLevel,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        structuredData: {
          keyEquations: isExplorer
            ? [
                { latex: "E_{\\text{total}} = \\text{Constant}", meaning: "Conservation of Energy: Nature keeps total balance" },
                { latex: "f = \\frac{1}{T}", meaning: "Frequency: How quickly a cycle repeats" },
              ]
            : isMiddle
            ? [
                { latex: "F = m \\cdot a", meaning: "Newton's Second Law: Force equals mass times acceleration" },
                { latex: "T = 2\\pi \\sqrt{\\frac{L}{g}}", meaning: "Pendulum period depends on length and gravity" },
              ]
            : isHigh
            ? [
                { latex: "E_k + U = \\frac{1}{2}mv^2 + \\frac{1}{2}kx^2 = \\text{const}", meaning: "Conservation of Mechanical Energy in Harmonic Systems" },
                { latex: "F_{\\text{net}} = -kx = m \\frac{d^2 x}{dt^2}", meaning: "Hooke's Law differential relation" },
              ]
            : isCollege
            ? [
                { latex: "m\\ddot{x} + b\\dot{x} + kx = F_0 \\cos(\\omega t)", meaning: "Driven Damped Harmonic Oscillator Equation" },
                { latex: "Q = \\frac{\\omega_0}{2\\gamma} = \\frac{\\sqrt{mk}}{b}", meaning: "Quality Factor and Resonance Sharpness" },
              ]
            : [
                { latex: "\\mathcal{S} = \\int_{t_1}^{t_2} \\mathcal{L}(q, \\dot{q}, t)\\,dt", meaning: "Hamilton's Principle of Stationary Action" },
                { latex: "\\frac{d}{dt}\\left(\\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}_i}\\right) - \\frac{\\partial \\mathcal{L}}{\\partial q_i} = 0", meaning: "Euler-Lagrange Equations of Motion" },
              ],
          everydayAnalogy: isExplorer
            ? "Like a child swinging back and forth on a playground, energy flows naturally from high to low, trading height for speed with every swoop."
            : "Like light selecting the fastest optical path through lenses (Fermat's Principle), physical dynamics naturally traverses paths that render action stationary.",
          misconceptions: [
            "Action must strictly be a global minimum (it is stationary, $\\delta S = 0$).",
          ],
          suggestedFollowups: DOMAIN_SAMPLE_QUESTIONS[selectedDomain] || [],
        },
      };
      setMessages([welcomeMsg]);
    }
  }, [selectedDomain, educationLevel]);

  // Scroll management: keep new AI responses focused at the top of their card so the user
  // immediately reads the opening paragraphs and formulas, instead of scrolling past to the blank bottom.
  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;

    const frameId = requestAnimationFrame(() => {
      if (isLoading) {
        // While waiting for answer, smoothly scroll so typing indicator is visible
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
        return;
      }

      if (messages.length === 0) return;

      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && latestMessageRef.current) {
        // When AI responds, scroll to the TOP of the new AI message (with a small top buffer)
        // so the user immediately sees the title, overview, and equations without showing blank space
        const targetTop = Math.max(0, latestMessageRef.current.offsetTop - 12);
        container.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });
      } else {
        // When user asks a question, scroll to reveal the user's message
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessage: ConceptChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/concept-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          domain: selectedDomain,
          level: educationLevel,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact concept chat server");
      }

      const data: ChatConceptResponse = await response.json();

      const assistantMessage: ConceptChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "assistant",
        text: data.answerText,
        domain: data.detectedDomain || selectedDomain,
        level: educationLevel,
        isCrossDomain: Boolean(data.isDomainChanged),
        domainNote: data.domainChangeNote,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        structuredData: {
          keyEquations: data.keyEquations,
          everydayAnalogy: data.everydayAnalogy,
          misconceptions: data.misconceptions,
          sonificationGuide: data.sonificationGuide,
          visualizationGuide: data.visualizationGuide,
          suggestedFollowups: data.suggestedFollowups,
          associatedSim: data.associatedSim as SimulationId,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If domain was changed, optionally notify user or offer to switch domain tab
      if (data.detectedDomain && data.isDomainChanged && MASTER_DOMAINS.includes(data.detectedDomain as MasterDomain)) {
        // We keep user's explicit domain tab or let them switch if they like
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ConceptChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        text: `I analyzed your query: "${query}" across fundamental conservation principles. However, an error occurred in retrieving the live response. Please check your network or try another query!`,
        domain: selectedDomain,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainChange = (domain: MasterDomain) => {
    setSelectedDomain(domain);
    // Add a system announcement message or switch focus
    const domainIntroMsg: ConceptChatMessage = {
      id: `msg_domain_switch_${Date.now()}`,
      role: "assistant",
      text: `Switched domain focus to **${domain}**! What topic or problem in ${domain} would you like to explore? Check the recommended inquiries below or type your own question.`,
      domain: domain,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      structuredData: {
        suggestedFollowups: DOMAIN_SAMPLE_QUESTIONS[domain] || [],
      },
    };
    setMessages((prev) => [...prev, domainIntroMsg]);
  };

  const handleExportPdf = () => {
    if (messages.length === 0) return;
    exportChatToPdf(messages, selectedDomain, educationLevel);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
                Interactive Physics Tutor
              </span>
              <span className="text-xs text-slate-500 font-medium">PHY64ALL Chat Explorer</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Concept Explorer & Theory Chat
            </h2>
          </div>

          {/* Action Toolbar: Export PDF, Level Selector, Clear Chat */}
          <div className="flex items-center gap-2">
            {/* Level Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
              {EDUCATION_LEVELS.map((lvlConfig) => (
                <button
                  key={lvlConfig.id}
                  id={`chat-lvl-${lvlConfig.id}`}
                  onClick={() => setEducationLevel(lvlConfig.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                    educationLevel === lvlConfig.id
                      ? "bg-white text-blue-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title={lvlConfig.description}
                >
                  {lvlConfig.label}
                </button>
              ))}
            </div>

            {/* Save to Notebook Button */}
            <button
              id="save-chat-notebook-btn"
              onClick={handleSaveChatToNotebook}
              disabled={messages.length === 0 || isSavingChat}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                savedChatSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
              title="Save complete discussion to your Physics Notebook"
            >
              {savedChatSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved in Notebook!</span>
                </>
              ) : (
                <>
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>{isSavingChat ? "Saving..." : "Save to Notebook"}</span>
                </>
              )}
            </button>

            {/* Export PDF Button */}
            <button
              id="export-chat-pdf-btn"
              onClick={handleExportPdf}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              title="Export complete conversation transcript as PDF with equations"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            {/* Clear History Button */}
            <button
              id="clear-chat-history-btn"
              onClick={handleClearChat}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
              title="Clear chat transcript"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Master's Physics Domains Selector Carousel */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Choose Master's Physics Domain (or ask any cross-domain query):
            </span>
            <span className="text-[11px] text-slate-400">10 Domains Covered</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {MASTER_DOMAINS.map((domain) => {
              const isSelected = selectedDomain === domain;
              return (
                <button
                  key={domain}
                  id={`domain-pill-${domain.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => handleDomainChange(domain)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                  }`}
                >
                  <span>{domain}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div
          ref={messagesContainerRef}
          className="relative flex-1 min-h-0 overflow-y-auto p-4 space-y-4 overscroll-contain"
        >
          {messages.map((msg, idx) => {
            const isAi = msg.role === "assistant";
            const isLatest = idx === messages.length - 1;

            return (
              <div
                key={msg.id}
                ref={isLatest ? latestMessageRef : null}
                className={`flex gap-3 ${isAi ? "items-start" : "items-start justify-end"}`}
              >
                {/* AI Avatar */}
                {isAi && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-3xl rounded-2xl p-4 space-y-3 ${
                    isAi
                      ? "bg-slate-50 border border-slate-200/80 text-slate-900"
                      : "bg-blue-600 text-white shadow-xs ml-8"
                  }`}
                >
                  {/* Assistant Header: Domain Tag, Level Badge & Cross-Domain Alert */}
                  {isAi && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-blue-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          {msg.domain || selectedDomain}
                        </span>
                        {msg.level && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold border border-blue-200">
                            {EDUCATION_LEVELS.find((l) => l.id === msg.level)?.label || msg.level}
                          </span>
                        )}
                        {msg.isCrossDomain && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Cross-Domain Query
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Cross-Domain Note Banner */}
                  {isAi && msg.isCrossDomain && msg.domainNote && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{msg.domainNote}</span>
                    </div>
                  )}

                  {/* Main Message Text with LaTeX support */}
                  <div className={`text-sm leading-relaxed ${isAi ? "text-slate-800" : "text-white"}`}>
                    <MathText text={msg.text} />
                  </div>

                  {/* Structured Data: Equations, Analogies, Misconceptions */}
                  {isAi && msg.structuredData && (
                    <div className="space-y-3 pt-2">
                      {/* Key Mathematical Formulas */}
                      {msg.structuredData.keyEquations && msg.structuredData.keyEquations.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-blue-600" />
                            Governing Mathematical Equations:
                          </span>
                          <div className="space-y-2">
                            {msg.structuredData.keyEquations.map((eq, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-md bg-slate-50 border border-slate-100 flex flex-col gap-1"
                              >
                                <div className="overflow-x-auto text-center py-0.5">
                                  <KatexMath math={eq.latex} inline={false} />
                                </div>
                                <span className="text-[11px] text-slate-600 text-center font-medium">
                                  {eq.meaning}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Everyday Analogy */}
                      {msg.structuredData.everydayAnalogy && (
                        <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-3 text-xs text-teal-900 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-teal-800">
                            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                            Physical Intuition & Everyday Analogy:
                          </span>
                          <p className="text-teal-950 leading-relaxed">
                            {msg.structuredData.everydayAnalogy}
                          </p>
                        </div>
                      )}

                      {/* Common Misconceptions */}
                      {msg.structuredData.misconceptions && msg.structuredData.misconceptions.length > 0 && (
                        <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 text-xs text-rose-900 space-y-1.5">
                          <span className="font-bold flex items-center gap-1.5 text-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Common Misconceptions Clarified:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-rose-950">
                            {msg.structuredData.misconceptions.map((misc, mIdx) => (
                              <li key={mIdx}>{misc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggested Follow-up Questions */}
                      {msg.structuredData.suggestedFollowups && msg.structuredData.suggestedFollowups.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-slate-500 block">
                            Recommended follow-up inquiries:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.structuredData.suggestedFollowups.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                id={`followup-${qIdx}`}
                                onClick={() => handleSendMessage(q)}
                                className="text-left text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* User timestamp */}
                  {!isAi && (
                    <div className="text-[10px] text-blue-200 text-right">{msg.timestamp}</div>
                  )}
                </div>

                {/* User Avatar */}
                {!isAi && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading typing bubble */}
          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 font-medium">Computing physical dynamics and formatting equations...</span>
              </div>
            </div>
          )}
        </div>

        {/* Domain Suggestions Bar */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
            Try in {selectedDomain}:
          </span>
          {(DOMAIN_SAMPLE_QUESTIONS[selectedDomain] || []).slice(0, 3).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="concept-chat-input"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask a question in ${selectedDomain} or any other physics field...`}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              id="concept-chat-send-btn"
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Ask Tutor</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>Formulas rendered in real-time with KaTeX ($math$).</span>
            <span>Export conversation anytime with the 'Export PDF' button.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
