export type EducationLevel =
  | "explorer"
  | "middle_school"
  | "high_school"
  | "college"
  | "masters";

export interface EducationLevelInfo {
  id: EducationLevel;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
}

export const EDUCATION_LEVELS: EducationLevelInfo[] = [
  {
    id: "explorer",
    label: "Explorer",
    shortLabel: "Explorer",
    tagline: "Intuitive & Visual",
    description: "Intuitive conceptual physics, visual models, everyday analogies & no math intimidation.",
  },
  {
    id: "middle_school",
    label: "Middle School",
    shortLabel: "Middle",
    tagline: "Grades 6–8",
    description: "Foundational concepts, speed, gravity, atoms, basic units & curiosity-driven discovery.",
  },
  {
    id: "high_school",
    label: "High School",
    shortLabel: "High School",
    tagline: "Grades 9–12 & AP",
    description: "Quantitative formulas, vectors, kinematics, Newton's laws, wave optics & circuits.",
  },
  {
    id: "college",
    label: "College",
    shortLabel: "College",
    tagline: "Undergraduate",
    description: "Calculus-based physics, differential equations, resonance, modern physics & thermodynamics.",
  },
  {
    id: "masters",
    label: "Master's",
    shortLabel: "Master's",
    tagline: "Graduate & Research",
    description: "Lagrangian & Hamiltonian dynamics, Hilbert space, quantum tunneling, tensors & field theory.",
  },
];

export type SimulationId =
  | "projectile"
  | "harmonic_oscillator"
  | "double_slit"
  | "lorentz_force"
  | "quantum_well"
  | "orbital_gravity"
  | "kinetic_gas"
  | "semiconductor"
  | "nuclear"
  | "photoelectric"
  | "pendulum"
  | "optics"
  | "em_field"
  | "quantum"
  | "orbit";

export type MasterDomain =
  | "Classical Mechanics"
  | "Quantum Mechanics"
  | "Statistical Mechanics"
  | "Mathematical Physics"
  | "Electromagnetism"
  | "Electronics"
  | "Atomic and Molecular Physics"
  | "Solid State Physics"
  | "Nuclear and Particle Physics"
  | "Experimental methods";

export interface ChatConceptResponse {
  detectedDomain?: string;
  isDomainChanged?: boolean;
  domainChangeNote?: string;
  answerText: string;
  keyEquations?: Array<{ latex: string; meaning: string }>;
  everydayAnalogy?: string;
  misconceptions?: string[];
  sonificationGuide?: string;
  visualizationGuide?: string;
  thoughtExperiment?: string;
  suggestedFollowups?: string[];
  associatedSim?: SimulationId;
}

export interface ConceptChatMessage {
  id: string;
  role: "user" | "assistant";
  timestamp: string;
  text: string;
  domain?: string;
  level?: EducationLevel;
  isCrossDomain?: boolean;
  domainNote?: string;
  structuredData?: {
    keyEquations?: Array<{ latex: string; meaning: string }>;
    everydayAnalogy?: string;
    misconceptions?: string[];
    sonificationGuide?: string;
    visualizationGuide?: string;
    suggestedFollowups?: string[];
    associatedSim?: SimulationId;
  };
  isStreaming?: boolean;
}

export interface QuizOption {
  id: "A" | "B" | "C" | "D";
  text: string;
  latexMath?: string;
}

export interface QuizQuestion {
  id: string;
  level: EducationLevel;
  domain: string;
  topic: string;
  question: string;
  options: QuizOption[];
  correctOptionId: "A" | "B" | "C" | "D";
  hint: string;
  additionalHint?: string;
  explanation: string;
  governingEquation?: string;
  sonificationCue: {
    soundType:
      | "resonance"
      | "harmonic"
      | "geiger"
      | "photoelectric"
      | "diode"
      | "fringe"
      | "tunneling"
      | "collapse"
      | "quantum_jump"
      | "gas_collision"
      | "doppler";
    description: string;
  };
  associatedSim?: SimulationId;
}

export type ActiveTab = "simulations" | "solver" | "concepts" | "quiz" | "notebook";

export interface SavedChatData {
  id: string;
  userId: string;
  title: string;
  domain?: string;
  level?: string;
  messages: ConceptChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface KnownVariable {
  symbol: string;
  value: string;
  unit: string;
  description: string;
}

export interface UnknownVariable {
  symbol: string;
  targetUnit: string;
  description: string;
}

export interface FormulaItem {
  latex: string;
  name: string;
  explanation: string;
}

export interface SolutionStep {
  stepNumber: number;
  title: string;
  explanation: string;
  latexMath?: string;
  numericalValue?: string;
}

export interface SolvedProblem {
  summary: string;
  topic: string;
  difficulty: EducationLevel;
  knowns: KnownVariable[];
  unknowns: UnknownVariable[];
  formulas: FormulaItem[];
  steps: SolutionStep[];
  finalAnswer: {
    value: string;
    unit: string;
    latexFormatted: string;
  };
  conceptualIntuition: string;
  sensoryInterpretation: {
    visualizationTip: string;
    sonificationTip: string;
  };
  interactiveSimSuggestion?: SimulationId;
}

export interface ConceptItem {
  id: string;
  title: string;
  domain: string;
  level: EducationLevel;
  headline: string;
  coreIdea: string;
  keyEquations: Array<{ latex: string; meaning: string }>;
  everydayAnalogy: string;
  misconceptions: string[];
  sonificationGuide: string;
  visualizationGuide: string;
  associatedSim: SimulationId;
}

export type PhysicsConcept = ConceptItem;

export interface SonificationSettings {
  enabled: boolean;
  masterVolume: number; // 0 to 1
  soundMode: "continuous" | "rhythmic" | "event_only";
  scaleType: "continuous" | "pentatonic" | "harmonic";
  speechNarrator: boolean;
}
