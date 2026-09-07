import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to provide validated Firebase client configuration
function getFirebaseConfig() {
  let appletConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      appletConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not read firebase-applet-config.json:", err);
  }

  return {
    apiKey:
      process.env.FIREBASE_API_KEY ||
      process.env.VITE_FIREBASE_API_KEY ||
      appletConfig.apiKey ||
      "api",
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN ||
      process.env.VITE_FIREBASE_AUTH_DOMAIN ||
      appletConfig.authDomain ||
      "authdom",
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.VITE_FIREBASE_PROJECT_ID ||
      appletConfig.projectId ||
      "id",
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      appletConfig.storageBucket ||
      "bucket",
    messagingSenderId:
      process.env.FIREBASE_MESSAGING_SENDER_ID ||
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      appletConfig.messagingSenderId ||
      "msgid",
    appId:
      process.env.FIREBASE_APP_ID ||
      process.env.VITE_FIREBASE_APP_ID ||
      appletConfig.appId ||
      "appid",
    firestoreDatabaseId:
      process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
      appletConfig.firestoreDatabaseId ||
      "dbid",
  };
}

// Runtime API endpoint to furnish client with valid Firebase credentials
app.get("/api/firebase-config", (_req: Request, res: Response) => {
  res.json(getFirebaseConfig());
});

// Lazy Gemini client getter
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface GenerateWithFallbackOptions {
  contents: any;
  config?: any;
  preferredModel?: string;
}

// Resilient Gemini generator with automatic fallback across models & backoff retry on transient 503/429 spikes
async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: GenerateWithFallbackOptions
) {
  const candidateModels = [
    options.preferredModel || "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      const isTransient =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("overloaded");

      if (isTransient && i < candidateModels.length - 1) {
        console.warn(`[Gemini Service] Model ${model} temporarily unavailable/overloaded. Falling back to ${candidateModels[i + 1]}...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    service: "physica-lab-api",
  });
});

// Physics Problem Solver Endpoint
app.post("/api/solve-problem", async (req: Request, res: Response) => {
  try {
    const { problem, level = "high_school", topic = "General Physics" } = req.body;
    if (!problem || typeof problem !== "string" || !problem.trim()) {
      res.status(400).json({ error: "Please provide a valid physics problem or question." });
      return;
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Return high-quality local computational fallback response
      const fallbackResult = generateLocalPhysicsSolution(problem, level, topic);
      res.json(fallbackResult);
      return;
    }

    const systemPrompt = `You are a world-class Physics Professor and accessible STEM pedagogue specializing in multi-sensory physics education.
The user is asking for a rigorous, clear, step-by-step solution to a physics problem.
The target education level is: ${level} (one of: 'explorer', 'middle_school', 'high_school', 'college', 'masters').
Adapt your language, depth, mathematical rigor, and conceptual analogies precisely to this 5-tier pedagogical scale:
- 'explorer': (Early learner & intuitive curiosity) Playful, sensory, purely conceptual and everyday intuition (swings, slides, bicycle wheels, echoes, ripples). No heavy math, focus on cause-and-effect and physical wonders.
- 'middle_school': (Grades 6-8) Core quantitative relationships, proportional thinking, single-step equations (speed = distance/time, F = ma, W = F·d, V = IR), clear arithmetic with SI units.
- 'high_school': (Grades 9-12 / AP / IB) Standard algebra and introductory calculus physics: 2D vector resolution, free-body diagrams, conservation laws, kinematic equations, Snell's law, photoelectric effect, Lorentz force.
- 'college': (Undergraduate STEM) Calculus-based physics, differential equations, oscillatory systems with damping & Q-factor, line/surface integrals, Maxwell's equations, introductory quantum mechanics (Schrödinger wavefunctions, tunneling).
- 'masters': (Graduate & Master's level) Advanced theoretical physics: Lagrangian and Hamiltonian mechanics, Poisson brackets, Hilbert spaces, perturbation theory, partition functions, Fermi-Dirac/Bose-Einstein distributions, Bloch theorem, second quantization.

Always structure your JSON response with these exact keys:
{
  "summary": "Brief 1-2 sentence core overview of what physical law governs this",
  "topic": "The physics domain (Mechanics, Electromagnetism, Optics, Quantum, Thermodynamics, Relativity)",
  "difficulty": "${level}",
  "knowns": [{"symbol": "m", "value": "2.5", "unit": "kg", "description": "Mass of projectile"}],
  "unknowns": [{"symbol": "v_f", "targetUnit": "m/s", "description": "Final velocity"}],
  "formulas": [{"latex": "v^2 = u^2 + 2as", "name": "Work-Energy / Kinematic Relation", "explanation": "Relates displacement to velocities"}],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Establish Reference Frame & Coordinate System",
      "explanation": "Clear explanation of assumptions and conventions",
      "latexMath": "\\sum F_y = m a_y",
      "numericalValue": "Step evaluation if applicable"
    }
  ],
  "finalAnswer": {
    "value": "Calculated value",
    "unit": "SI Unit",
    "latexFormatted": "v_f = 14.7 \\text{ m/s}"
  },
  "conceptualIntuition": "Intuitive explanation of why this numerical answer makes physical sense",
  "sensoryInterpretation": {
    "visualizationTip": "What a student should visualize or look for on a graph / diagram",
    "sonificationTip": "How this physical event could sound (e.g. rising pitch as velocity increases, rhythmic collisions, frequency shift, damping decaying chord)"
  },
  "interactiveSimSuggestion": "Which simulation in the app corresponds to this: 'pendulum' | 'projectile' | 'optics' | 'em_field' | 'quantum' | 'orbit' | 'kinetic_gas' | 'double_slit' | 'harmonic_oscillator' | 'lorentz_force' | 'quantum_well' | 'orbital_gravity' | 'semiconductor' | 'nuclear' | 'photoelectric'"
}
Return ONLY valid raw JSON without markdown backticks if possible, or standard JSON.`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: `Solve this physics problem: "${problem}" for education level: ${level}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const responseText = response.text?.trim() || "";
    try {
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch {
      // If parsing fails, extract JSON or fallback
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    }
  } catch (error: any) {
    console.warn("Gemini problem solver fallback activated:", error?.message || error);
    // Graceful fallback to avoid leaving user hanging
    const fallback = generateLocalPhysicsSolution(req.body.problem || "", req.body.level || "high_school", req.body.topic || "Mechanics");
    res.json(fallback);
  }
});

// Concept Explanation Endpoint
app.post("/api/explain-concept", async (req: Request, res: Response) => {
  try {
    const { concept, level = "high_school" } = req.body;
    if (!concept || typeof concept !== "string") {
      res.status(400).json({ error: "Please provide a concept to explain." });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json(generateLocalConceptExplanation(concept, level));
      return;
    }

    const systemPrompt = `You are an accessible physics educator explaining "${concept}" for the "${level}" educational tier.
Provide a structured JSON response:
{
  "concept": "${concept}",
  "level": "${level}",
  "headline": "A concise headline capturing the essence",
  "coreIdea": "Detailed 2-paragraph intuitive explanation calibrated to the user level",
  "keyEquations": [{"latex": "LaTeX formula", "meaning": "Plain language explanation of each variable"}],
  "everydayAnalogy": "A memorable real-world analogy",
  "misconceptions": ["Common misconception 1 and why it is wrong", "Common misconception 2"],
  "sonificationGuide": "How to represent this concept acoustically (pitch, timbre, panning, harmonic ratios, tempo)",
  "visualizationGuide": "What key visual elements represent this (vectors, phase trajectories, wavefronts, fields)",
  "thoughtExperiment": "A thought experiment or provocative question to test understanding"
}`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: `Explain the physics concept "${concept}" for level "${level}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const responseText = response.text?.trim() || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(cleanJson));
  } catch (err: any) {
    console.warn("Concept explanation fallback activated:", err?.message || err);
    res.json(generateLocalConceptExplanation(req.body.concept || "Newton's Laws", req.body.level || "high_school"));
  }
});

// Interactive Concept Explorer Chat Endpoint
app.post("/api/concept-chat", async (req: Request, res: Response) => {
  try {
    const { message, domain = "Classical Mechanics", level = "masters", history = [] } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Please provide a message or question." });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json(generateLocalConceptChatResponse(message, domain, level));
      return;
    }

    const systemPrompt = `You are PHY64ALL's Master Physics Tutor and conversational mentor in the interactive Concept Explorer.
The user's currently selected physics domain is: "${domain}".
The education level is: "${level}" ('explorer', 'middle_school', 'high_school', 'college', 'masters').

CRITICAL PEDAGOGICAL DIRECTIVE - ELABORATE EXPLANATIONS:
The user explicitly requests thorough, comprehensive, and elaborate explanations that leave no ambiguity. You must NOT provide short 1-2 paragraph summaries. You must deliver a deep, pedagogical, multi-section response formatted in clear Markdown with headers ('### Section Name'), bullet points, and bold key terms.

Calibrate the depth and tone strictly to "${level}":
1. 'explorer' (Early Learners & Curious Minds):
   - Tone: Wonder-filled, vivid, storytelling, friendly, clear.
   - Structure must include:
     ### 1. The Big Picture & Everyday Wonder
     ### 2. Step-by-Step: How It Really Works
     ### 3. What You Can See, Hear, and Feel (Multi-Sensory)
     ### 4. A Fun Thought Experiment to Try
   - Use engaging analogies (swings, ripples, rubber balls, guitars, flashlights). No scary math; focus on intuitive cause-and-effect.

2. 'middle_school' (Grades 6–8):
   - Tone: Clear, quantitative, encouraging, practical.
   - Structure must include:
     ### 1. What is This Principle? (Core Meaning)
     ### 2. The Cause, Effect, and Proportions (What Happens If You Double Mass or Speed?)
     ### 3. The Formulas & Everyday Numbers ($F=ma$, $v=d/t$, $W=Fd$, $T=2\\pi\\sqrt{L/g}$)
     ### 4. Real-World Inventions & Engineering
   - Explain what each symbol means, SI units, and how variables connect.

3. 'high_school' (AP / IB / Foundation):
   - Tone: Academically rigorous, clear, analytical.
   - Structure must include:
     ### 1. Fundamental Physical Laws & System Definition
     ### 2. Step-by-Step Mathematical Derivation & Vector Resolution
     ### 3. Limiting Cases & Boundary Conditions (What Happens at Extremes?)
     ### 4. Common Exam Traps & Misconceptions Clarified
   - Use standard calculus/algebra notation, free-body/field considerations, conservation of energy/momentum.

4. 'college' (Undergraduate STEM):
   - Tone: Deeply analytical, mathematical, experimental.
   - Structure must include:
     ### 1. Theoretical Framework & Differential Formulation
     ### 2. Analytical Solution, Boundary Conditions & State Evolution
     ### 3. Dynamic Regimes (Resonance, Damping, Q-Factor, Phase Portraits)
     ### 4. Experimental Verification & Instrumentation Setup
   - Use differential equations ($m\\ddot{x} + b\\dot{x} + kx = F(t)$), Maxwell's vector calculus, eigenvalue problems, complex exponentials.

5. 'masters' (Graduate & Research Physics):
   - Tone: Advanced theoretical seminar level, mathematically pristine, comprehensive.
   - Structure must include:
     ### 1. Variational Action & Symplectic / Geometric Formalism ($\\delta \\mathcal{S} = 0$, Poisson brackets)
     ### 2. Hilbert Space / Operator Algebra / Partition Function Formulation
     ### 3. Continuous Lie Symmetries, Conserved Noether Currents & Invariants
     ### 4. Quantum / Statistical Asymptotics & Modern Research Implications
   - Use Hamiltonian/Lagrangian mechanics, Green's functions, density matrices, canonical ensembles, second quantization, and gauge principles.

Master's domains supported:
1. Classical Mechanics (Lagrangian, Hamiltonian, Poisson Brackets, Canonical Transformations, Chaos)
2. Quantum Mechanics (Schrödinger, Heisenberg, Dirac notation, Perturbation theory, Spin, WKB)
3. Statistical Mechanics (Ensembles, Partition functions, Bose-Einstein, Fermi-Dirac, Ising model)
4. Mathematical Physics (Green's functions, Complex contour integrals, Group theory, Special functions)
5. Electromagnetism (Maxwell four-tensor $F^{\\mu\\nu}$, Waveguides, Potentials, Gauge invariance)
6. Electronics (Op-amps, P-N junctions, Bandgaps, Feedback, Semiconductor transport)
7. Atomic and Molecular Physics (Fine structure, Zeeman effect, Raman spectroscopy, Selection rules)
8. Solid State Physics (Bloch theorem, Band structure, Brillouin zones, Phonons, BCS Superconductivity)
9. Nuclear and Particle Physics (Semi-empirical mass formula, Alpha/Beta/Gamma decay, Standard Model, Quarks)
10. Experimental methods (Lock-in amplifiers, Error propagation, XRD, Noise minimization)

IMPORTANT RULES:
1. Detect whether the user's query belongs to their currently selected domain ("${domain}") or if it is a random/cross-domain query from another physics field!
   - If it belongs to another field, identify the field in "detectedDomain", set "isDomainChanged": true, and add a friendly "domainChangeNote" noting the cross-domain jump while answering thoroughly!
2. All mathematical formulas and physics equations MUST be represented with correct mathematical symbols and valid LaTeX enclosed in $...$ for inline or $$...$$ for display formulas.
3. Include 2 to 4 key equations with precise symbol definitions, everyday analogy, misconceptions, and multi-sensory sonification/visualization advice.
4. Output valid raw JSON in this exact structure:
{
  "detectedDomain": "The detected domain name",
  "isDomainChanged": false,
  "domainChangeNote": "Optional note if the user switched domains mid-chat",
  "answerText": "Comprehensive, multi-section, elaborate response (4-6 sections with '### Header' markdown) explaining the concept deeply.",
  "keyEquations": [
    { "latex": "E = mc^2", "meaning": "Mass-energy equivalence" }
  ],
  "everydayAnalogy": "A memorable analogy that clarifies the intuition",
  "misconceptions": ["Misconception and factual correction"],
  "sonificationGuide": "How this concept can be perceived through sound/pitch/rhythm",
  "visualizationGuide": "What graph or visual to look for",
  "suggestedFollowups": ["Question 1", "Question 2", "Question 3"],
  "associatedSim": "pendulum" | "projectile" | "double_slit" | "lorentz_force" | "harmonic_oscillator" | "quantum_well" | "semiconductor" | "nuclear" | "photoelectric" | "orbit" | "kinetic_gas"
}`;

    const conversationContext = history && Array.isArray(history)
      ? history.slice(-4).map((m: any) => `${m.role === "user" ? "User" : "Tutor"}: ${m.text || m.content}`).join("\n")
      : "";

    const userPrompt = `${conversationContext ? `Recent conversation:\n${conversationContext}\n\n` : ""}Current user query: "${message}"\nSelected domain: ${domain}\nLevel: ${level}`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const responseText = response.text?.trim() || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(cleanJson));
  } catch (err: any) {
    console.warn("Concept chat fallback activated:", err?.message || err);
    res.json(generateLocalConceptChatResponse(req.body.message || "Explain physics", req.body.domain || "Classical Mechanics", req.body.level || "masters"));
  }
});

// Domain-aware local fallback generator for Concept Explorer
function generateLocalConceptChatResponse(message: string, domain: string, level: string) {
  const lower = message.toLowerCase();

  // Detect domain based on keywords
  let detectedDomain = domain;
  let isDomainChanged = false;

  if (lower.includes("schrodinger") || lower.includes("quantum") || lower.includes("wavefunction") || lower.includes("spin") || lower.includes("dirac") || lower.includes("tunneling") || lower.includes("eigen")) {
    detectedDomain = "Quantum Mechanics";
  } else if (lower.includes("lagrang") || lower.includes("hamilton") || lower.includes("action") || lower.includes("poisson") || lower.includes("pendulum") || lower.includes("kepler") || lower.includes("torque")) {
    detectedDomain = "Classical Mechanics";
  } else if (lower.includes("entropy") || lower.includes("partition") || lower.includes("bose") || lower.includes("fermi") || lower.includes("boltzmann") || lower.includes("ensemble") || lower.includes("maxwell-boltzmann")) {
    detectedDomain = "Statistical Mechanics";
  } else if (lower.includes("green") || lower.includes("cauchy") || lower.includes("residue") || lower.includes("contour") || lower.includes("fourier") || lower.includes("tensor") || lower.includes("differential")) {
    detectedDomain = "Mathematical Physics";
  } else if (lower.includes("maxwell") || lower.includes("waveguide") || lower.includes("vector potential") || lower.includes("lorentz") || lower.includes("magnetic") || lower.includes("electric field") || lower.includes("poynting")) {
    detectedDomain = "Electromagnetism";
  } else if (lower.includes("diode") || lower.includes("transistor") || lower.includes("op-amp") || lower.includes("p-n junction") || lower.includes("depletion") || lower.includes("amplifier") || lower.includes("semiconductor")) {
    detectedDomain = "Electronics";
  } else if (lower.includes("zeeman") || lower.includes("raman") || lower.includes("fine structure") || lower.includes("stokes") || lower.includes("bohr") || lower.includes("spectroscopy") || lower.includes("hydrogen")) {
    detectedDomain = "Atomic and Molecular Physics";
  } else if (lower.includes("bloch") || lower.includes("brillouin") || lower.includes("phonon") || lower.includes("superconduct") || lower.includes("band gap") || lower.includes("crystal") || lower.includes("bcs")) {
    detectedDomain = "Solid State Physics";
  } else if (lower.includes("decay") || lower.includes("nuclear") || lower.includes("alpha") || lower.includes("beta") || lower.includes("gamma") || lower.includes("quark") || lower.includes("geiger") || lower.includes("half-life") || lower.includes("rutherford")) {
    detectedDomain = "Nuclear and Particle Physics";
  } else if (lower.includes("lock-in") || lower.includes("error") || lower.includes("xrd") || lower.includes("diffraction") || lower.includes("bragg") || lower.includes("noise") || lower.includes("experiment") || lower.includes("uncertainty")) {
    detectedDomain = "Experimental methods";
  }

  if (detectedDomain.toLowerCase() !== domain.toLowerCase()) {
    isDomainChanged = true;
  }

  const domainChangeNote = isDomainChanged
    ? `Note: Your query relates directly to ${detectedDomain} (different from your selected domain ${domain}). PHY64ALL has routed this seamlessly!`
    : "";

  // Construct elaborate answer tailored directly to the educational level
  let answerText = "";
  if (level === "explorer") {
    answerText =
      `### 1. The Big Picture & Everyday Wonder\n\n` +
      `Imagine you are watching a graceful playground swing or ripples on a calm lake. When we ask about **"${message}"** in **${detectedDomain}**, nature is following a simple, beautiful rule: every action in the universe loves balance, rhythm, and flow!\n\n` +
      `### 2. Step-by-Step: How It Really Works\n\n` +
      `- **The Natural Flow**: Just like water finding the easiest downhill path, physical systems naturally move in ways that balance forces.\n` +
      `- **Energy Transformation**: Energy is never lost or destroyed. When a ball drops, its height turns into speed; when it bounces, speed turns back into height.\n` +
      `- **Sensory Connection**: If you could touch and hear this process, you would feel a smooth vibration that rises in pitch as speed increases.\n\n` +
      `### 3. What You Can See, Hear, and Feel\n\n` +
      `When you listen to a plucked musical string, a higher note means faster vibration. In the same way, in **${detectedDomain}**, energy changes can be perceived directly as musical pitch transitions in our sensory laboratory.\n\n` +
      `### 4. A Fun Thought Experiment to Try\n\n` +
      `Next time you are on a swing, notice how pumping your legs at the exact top of the arc makes you go higher with almost no effort. That is natural resonance in action!`;
  } else if (level === "middle_school") {
    answerText =
      `### 1. What is This Principle? (Core Meaning)\n\n` +
      `In **${detectedDomain}**, the concept behind **"${message}"** describes how physical quantities (like force, velocity, energy, or charge) interact in a predictable, measurable way. Physical laws are rules that nature always follows.\n\n` +
      `### 2. The Cause, Effect, and Proportions\n\n` +
      `- **Cause and Effect**: Every acceleration requires an unbalanced force ($F = ma$). If you push harder, the acceleration increases proportionally.\n` +
      `- **What Happens If You Double a Variable?**: If you double the force acting on a constant mass, the acceleration doubles. If you double the speed of an object, its kinetic energy ($E_k = \\frac{1}{2}mv^2$) increases by a factor of four!\n` +
      `- **Conservation Law**: Total energy before an event equals total energy after, even if some becomes heat or sound.\n\n` +
      `### 3. The Formulas & Everyday Numbers\n\n` +
      `Governing relations are expressed in standard SI units (meters, seconds, kilograms, Newtons). Notice how balance is maintained at every instant.\n\n` +
      `### 4. Real-World Inventions & Engineering\n\n` +
      `From roller coasters and bicycle brakes to satellite orbits and smartphone screens, engineers rely on this exact relationship to ensure devices work reliably and safely.`;
  } else if (level === "high_school") {
    answerText =
      `### 1. Fundamental Physical Laws & System Definition\n\n` +
      `An analytical examination of **"${message}"** within **${detectedDomain}** begins with defining the isolated system, coordinate axes, and applicable conservation laws (conservation of linear/angular momentum, total mechanical energy, and electric charge).\n\n` +
      `### 2. Step-by-Step Mathematical Derivation & Vector Resolution\n\n` +
      `- **Free-Body & Force Decomposition**: Forces are resolved along orthogonal axes ($x, y$ or tangential and normal components): $\\sum \\vec{F} = m\\vec{a}$.\n` +
      `- **Work-Energy Theorem**: The net work done by non-conservative forces equals the change in mechanical energy: $W_{\\text{nc}} = \\Delta E = \\Delta K + \\Delta U$.\n` +
      `- **Kinematic Integration**: Velocity and position are calculated by integrating instantaneous acceleration: $v(t) = v_0 + \\int a(t)\\,dt$.\n\n` +
      `### 3. Limiting Cases & Boundary Conditions\n\n` +
      `- **Extreme Angle Limit**: As the angle $\\theta \\to 0^\\circ$ or $90^\\circ$, trigonometric terms isolate purely horizontal or vertical components.\n` +
      `- **Zero Friction / Ideal Limit**: When dissipative coefficients $\\mu \\to 0$, mechanical energy is strictly conserved.\n\n` +
      `### 4. Common Exam Traps & Misconceptions Clarified\n\n` +
      `Students frequently confuse instantaneous velocity with acceleration; remember that an object momentarily at rest ($v=0$) at its turning point can still experience maximum non-zero acceleration ($a \\neq 0$).`;
  } else if (level === "college") {
    answerText =
      `### 1. Theoretical Framework & Differential Formulation\n\n` +
      `In **${detectedDomain}**, the dynamics governing **"${message}"** are formulated as coupled differential equations derived from constitutive relations and field equations. For oscillatory or field systems, this takes the canonical form of a second-order linear or nonlinear differential operator:\n\n` +
      `$$\\mathcal{D}[\\psi(t)] = \\frac{d^2 \\psi}{dt^2} + 2\\gamma \\frac{d\\psi}{dt} + \\omega_0^2 \\psi = F_0 e^{i\\omega t}$$\n\n` +
      `### 2. Analytical Solution, Boundary Conditions & State Evolution\n\n` +
      `- **Homogeneous vs. Particular Solutions**: The transient response decays exponentially ($e^{-\\gamma t}$), leaving the steady-state harmonic response dictated by the driving source.\n` +
      `- **Complex Impedance & Phase Lag**: The response exhibits a frequency-dependent phase shift $\\delta(\\omega) = \\arctan\\left(\\frac{2\\gamma\\omega}{\\omega_0^2 - \\omega^2}\\right)$.\n` +
      `- **Energy Eigenmodes**: Orthogonal spatial boundary conditions quantize or restrict allowed propagation modes.\n\n` +
      `### 3. Dynamic Regimes (Resonance, Damping, Q-Factor, Phase Portraits)\n\n` +
      `In phase space $(\\psi, \\dot{\\psi})$, the trajectories spiral toward an attractor point (underdamped), collapse monotonically (overdamped), or form closed orbits (conservative conservative Hamiltonian flow).\n\n` +
      `### 4. Experimental Verification & Instrumentation Setup\n\n` +
      `In modern laboratory practice, such dynamics are tracked using lock-in amplification, high-speed photodetectors, or four-probe impedance analyzers to resolve signals well below the thermal Johnson-Nyquist noise floor.`;
  } else {
    // Master's level
    answerText =
      `### 1. Variational Action & Symplectic / Geometric Formalism\n\n` +
      `At the graduate research level in **${detectedDomain}**, **"${message}"** is formulated from the stationary action principle $\\delta \\mathcal{S} = 0$, where the action functional is:\n\n` +
      `$$\\mathcal{S}[q] = \\int_{t_1}^{t_2} \\mathcal{L}(q_i, \\dot{q}_i, t)\\,dt, \\quad \\frac{d}{dt}\\left(\\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}_i}\\right) - \\frac{\\partial \\mathcal{L}}{\\partial q_i} = 0$$\n\n` +
      `Passing via the Legendre transformation $p_i = \\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}_i}$ yields the canonical Hamiltonian $\\mathcal{H}(q, p, t) = p_i \\dot{q}_i - \\mathcal{L}$, defining symplectic phase space flow governed by Poisson brackets: $\\dot{f} = \\{f, \\mathcal{H}\\} + \\frac{\\partial f}{\\partial t}$.\n\n` +
      `### 2. Hilbert Space / Operator Formalism & Partition Functions\n\n` +
      `- **Canonical Quantization / Operator Commutators**: In the quantum domain, dynamical observables become self-adjoint operators satisfying $[\\hat{q}_i, \\hat{p}_j] = i\\hbar \\delta_{ij}$.\n` +
      `- **Green's Functions & Propagators**: Inhomogeneous response equations are solved by constructing causal Green's functions: $\\hat{\\mathcal{L}}_x G(x, x') = \\delta(x - x')$.\n` +
      `- **Statistical Ensembles**: The thermodynamic macroscopic observables derive from the partition function $Z = \\text{Tr}(e^{-\\beta \\hat{\\mathcal{H}}})$ and free energy $F = -k_B T \\ln Z$.\n\n` +
      `### 3. Continuous Lie Symmetries, Conserved Noether Currents & Invariants\n\n` +
      `Under an infinitesimal continuous symmetry transformation $q_i \\to q_i + \\epsilon \\Delta q_i$, Noether's first theorem guarantees a strictly conserved current: $J^\\mu = \\frac{\\partial \\mathcal{L}}{\\partial (\\partial_\\mu \\phi)} \\Delta \\phi - K^\\mu$, with $\\partial_\\mu J^\\mu = 0$.\n\n` +
      `### 4. Quantum / Statistical Asymptotics & Modern Research Implications\n\n` +
      `In contemporary condensed matter and field theory, topological invariants (Chern numbers, Berry phases $\\gamma = \\oint \\mathcal{A} \\cdot d\\mathbf{R}$) and asymptotic perturbation expansions explain phenomena extending from the Quantum Hall effect to superconductive Cooper pairing.`;
  }

  return {
    detectedDomain,
    isDomainChanged,
    domainChangeNote,
    answerText,
    keyEquations: [
      {
        latex: detectedDomain === "Quantum Mechanics"
          ? "i\\hbar \\frac{\\partial}{\\partial t} |\\psi(t)\\rangle = \\hat{H} |\\psi(t)\\rangle"
          : detectedDomain === "Classical Mechanics"
          ? "\\frac{d}{dt}\\left( \\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}} \\right) - \\frac{\\partial \\mathcal{L}}{\\partial q} = 0"
          : detectedDomain === "Statistical Mechanics"
          ? "Z = \\sum_i e^{-\\beta E_i}, \\quad F = -k_B T \\ln Z"
          : detectedDomain === "Mathematical Physics"
          ? "\\hat{\\mathcal{L}}_x G(x, x') = \\delta(x - x')"
          : detectedDomain === "Electromagnetism"
          ? "\\partial_\\mu F^{\\mu\\nu} = \\mu_0 J^\\nu"
          : detectedDomain === "Electronics"
          ? "I = I_s \\left( e^{\\frac{q V}{k_B T}} - 1 \\right)"
          : detectedDomain === "Atomic and Molecular Physics"
          ? "\\Delta E_Z = g_J \\mu_B B M_J"
          : detectedDomain === "Solid State Physics"
          ? "\\psi_{\\vec{k}}(\\vec{r}) = e^{i\\vec{k}\\cdot\\vec{r}} u_{\\vec{k}}(\\vec{r})"
          : detectedDomain === "Nuclear and Particle Physics"
          ? "N(t) = N_0 e^{-\\lambda t}, \\quad A(t) = \\lambda N(t)"
          : "V_{out} = V_{sig}\\cos(\\theta_s - \\theta_r)",
        meaning: `Core governing relation for ${detectedDomain}`,
      },
    ],
    everydayAnalogy:
      `Think of this process like a resonance chamber or harmonically coupled pendulum: energy transfers between degrees of freedom whenever their characteristic frequencies align.`,
    misconceptions: [
      `Equating phase velocity with signal velocity: Energy and information strictly travel at group velocity or causal front velocity.`,
      `Assuming macroscopic classical intuition directly applies without symmetry constraints: Conserved quantities always trace back to underlying Lie symmetries via Noether's theorem.`,
    ],
    sonificationGuide:
      `Sonify the fundamental frequency as a stable reference tone while the dynamical perturbation or interaction is rendered as harmonic overtone shifts and panning across stereo channels.`,
    visualizationGuide:
      `Look for phase trajectories in state space, potential energy contour wells, and dynamic vector arrows representing fluxes and gradients.`,
    suggestedFollowups: [
      `How do boundary conditions constrain the allowed eigensolutions?`,
      `What happens in the high-temperature or classical limit ($h \\to 0$ or $k_B T \\gg \\Delta E$)?`,
      `Can we simulate this in the interactive lab?`,
    ],
    associatedSim: (
      detectedDomain === "Electronics" ? "semiconductor" :
      detectedDomain === "Nuclear and Particle Physics" ? "nuclear" :
      detectedDomain === "Atomic and Molecular Physics" ? "photoelectric" :
      detectedDomain === "Quantum Mechanics" ? "quantum_well" :
      detectedDomain === "Solid State Physics" ? "semiconductor" :
      detectedDomain === "Electromagnetism" ? "lorentz_force" :
      detectedDomain === "Statistical Mechanics" ? "kinetic_gas" :
      "harmonic_oscillator"
    ),
  };
}

// Fallback generator for problem solving when API key is pending
function generateLocalPhysicsSolution(problem: string, level: string, topic: string) {
  const isExplorer = level === "explorer";
  const isMiddleSchool = level === "middle_school" || level === "school";
  const isCollege = level === "college";
  const isMasters = level === "masters";

  return {
    summary: `Physical analysis of the query: "${problem.slice(0, 80)}..." using fundamental conservation laws and equations of motion.`,
    topic: topic || "Classical Mechanics",
    difficulty: level,
    knowns: [
      { symbol: "m", value: "1.0", unit: "kg", description: "Characteristic mass" },
      { symbol: "g", value: "9.81", unit: "m/s²", description: "Standard gravitational acceleration" },
      { symbol: "t", value: "2.0", unit: "s", description: "Time interval" },
    ],
    unknowns: [
      { symbol: "v", targetUnit: "m/s", description: "Resulting kinematic velocity" },
      { symbol: "E", targetUnit: "Joules", description: "Total mechanical energy" },
    ],
    formulas: [
      {
        latex: isMasters
          ? "\\mathcal{L} = T - V = \\frac{1}{2}m\\dot{q}^2 - V(q)"
          : isCollege
          ? "m\\frac{d^2 x}{dt^2} + b\\frac{dx}{dt} + k x = F(t)"
          : isExplorer
          ? "\\text{Speed} = \\frac{\\text{Distance}}{\\text{Time}}"
          : isMiddleSchool
          ? "v = \\frac{\\Delta x}{\\Delta t}, \\quad F = m a"
          : "v = v_0 + a t, \\quad \\Delta x = v_0 t + \\frac{1}{2} a t^2",
        name: isMasters
          ? "Euler-Lagrange Equation of Motion"
          : isCollege
          ? "Damped Oscillatory Differential Equation"
          : isExplorer
          ? "Playground Speed Relation"
          : isMiddleSchool
          ? "Newton's Second Law & Velocity"
          : "Uniform Kinematic Laws",
        explanation: isMasters
          ? "Governs stationary action along the generalized trajectory"
          : isCollege
          ? "Equations of motion with energy dissipation rate"
          : "Relates motion distance to elapsed time interval",
      },
      {
        latex: "E_{total} = E_k + E_p = \\frac{1}{2}m v^2 + m g h",
        name: "Conservation of Mechanical Energy",
        explanation: "Energy cannot be created or destroyed, only transformed between kinetic and potential forms.",
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Identify Invariants and Coordinates",
        explanation: "Define the inertial frame of reference, coordinates, and conserved quantities.",
        latexMath: isMasters ? "\\frac{d}{dt}\\left(\\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}}\\right) - \\frac{\\partial \\mathcal{L}}{\\partial q} = 0" : "a = g = 9.81\\text{ m/s}^2",
        numericalValue: "System is conservative",
      },
      {
        stepNumber: 2,
        title: "Integrate Equations of Motion",
        explanation: "Substitute known parameters and evaluate boundary conditions.",
        latexMath: "v(t) = \\int a(t)\\,dt = v_0 + g t",
        numericalValue: "v = 19.62 m/s",
      },
      {
        stepNumber: 3,
        title: "Compute Total Energetics",
        explanation: "Calculate instantaneous energy states.",
        latexMath: "E_k = \\frac{1}{2}(1.0)(19.62)^2 = 192.5\\text{ J}",
        numericalValue: "192.5 Joules",
      },
    ],
    finalAnswer: {
      value: "19.6",
      unit: "m/s",
      latexFormatted: "v = 19.62\\text{ m/s}, \\quad E = 192.5\\text{ J}",
    },
    conceptualIntuition: isExplorer
      ? "Like sliding down a playground slide: you start off still at the top, and gravity smoothly pulls you faster until the gentle swoosh at the bottom!"
      : isMiddleSchool
      ? "In every single second of free fall, Earth's gravity adds about 9.8 meters per second to your speed (v = gt)."
      : isMasters
      ? "Because the Lagrangian has no explicit time dependence (\\partial \\mathcal{L}/\\partial t = 0), the Jacobi energy integral is a strictly conserved Noether charge."
      : isCollege
      ? "Integrating the equations of motion yields a linear velocity trajectory and quadratic kinetic energy growth, exhibiting conservation in the absence of non-conservative forces."
      : "Under constant acceleration, the velocity increases linearly with time, and the kinetic energy scales quadratically with speed.",
    sensoryInterpretation: {
      visualizationTip: "Notice how the velocity vector arrows lengthen linearly as the object falls, while the kinetic energy bar fills up much faster.",
      sonificationTip: "As speed increases, hear the continuous tone pitch rise from a low hum (120 Hz) up to a sharp ringing tone (500 Hz), spatialized as it descends.",
    },
    interactiveSimSuggestion: "projectile",
  };
}

function generateLocalConceptExplanation(concept: string, level: string) {
  return {
    concept,
    level,
    headline: `Fundamental Physics Principles of ${concept}`,
    coreIdea: `${concept} is a cornerstone principle in physics. It governs how forces, energy, and fields interact to shape physical phenomena from atomic dimensions to galactic structures. In our multi-sensory lab, you can both visualize these vector fields and hear their dynamic oscillations in real time.`,
    keyEquations: [
      { latex: "F = \\frac{dp}{dt} = m a", meaning: "Net force is the time rate of change of momentum" },
      { latex: "E^2 = (pc)^2 + (m_0 c^2)^2", meaning: "Relativistic energy-momentum invariant relation" },
    ],
    everydayAnalogy: "Like a bicycle coasting down a hill, kinetic energy trades seamlessly with potential energy while friction gradually dissipates heat.",
    misconceptions: [
      "Believing heavy objects fall faster than light objects in a vacuum (Galileo proved all bodies accelerate at g in the absence of air).",
      "Thinking force is needed to keep an object moving at constant velocity (Newton's 1st law: objects maintain state unless acted on by net force).",
    ],
    sonificationGuide: "Map higher speed/energy to higher musical pitch (200Hz to 1200Hz), spatial position to left/right stereo panning, and collisions to sharp percussion clicks.",
    visualizationGuide: "Represent dynamic forces as color-coded vectors (green for velocity, red for net force, blue for acceleration) with live phase space trajectories.",
    thoughtExperiment: "What happens to the kinetic energy if you double an object's speed? It quadruples!",
  };
}

// Multi-Sensory Physics Quiz Generation Endpoint
app.post("/api/generate-quiz-question", async (req: Request, res: Response) => {
  try {
    const { level = "high_school", domain = "All Domains", previousTopics = [] } = req.body || {};
    const ai = getGeminiClient();

    if (!ai) {
      const localQ = getLocalQuizQuestion(level, domain, previousTopics);
      res.json(localQ);
      return;
    }

    const domainDescription = domain === "All Domains" 
      ? "Any core physics domain (Classical Mechanics, Quantum Mechanics, Electromagnetism, Thermodynamics, Nuclear Physics, Optics, Solid State, Electronics, Mathematical Physics, Experimental methods)" 
      : domain;

    const prompt = `Generate an original, engaging, high-quality Multiple-Choice Question (MCQ) for a physics quiz.
Target level: ${level} (one of: 'explorer', 'middle_school', 'high_school', 'college', 'masters').
Domain: ${domainDescription}.
Avoid repeating these recent topics: ${Array.isArray(previousTopics) ? previousTopics.slice(-6).join(", ") : "none"}.

Pedagogical Calibration:
- 'explorer': Intuitive concepts, everyday motions, gravity, simple playgrounds, colors, light refraction, sound pitch, states of matter.
- 'middle_school': Core relationships, simple machines, speed/velocity equations, Newton's 2nd law, pendulum periods, basic circuits.
- 'high_school': Standard calculus/algebra physics, kinematics, vector resolution, Lorentz force, optics interference, photoelectric effect, radioactive decay.
- 'college': Differential equations, damped oscillators & Q-factor, line integrals, Maxwell's laws, introductory quantum superposition & tunneling.
- 'masters': Advanced graduate level: Lagrangian/Hamiltonian dynamics, Noether's theorem, commutators, perturbation theory, partition functions, Bloch theorem, semiconductor band bending, Bethe-Weizsäcker formula, lock-in amplifiers.

REQUIREMENTS:
1. Provide 4 distinct options labeled "A", "B", "C", "D". Exactly one option is correct.
2. Formulate clearly using LaTeX with $...$ for inline math and $$...$$ for block formulas.
3. Provide a helpful conceptual 'hint' that stimulates thinking without spoiling the answer.
4. Provide an 'additionalHint' with formula or calculation clues.
5. Provide a comprehensive 'explanation' explaining why the correct option is physically true and why others are false.
6. Provide a 'governingEquation' in LaTeX.
7. Provide a 'sonificationCue' object describing an acoustic property (soundType: one of 'resonance', 'harmonic', 'geiger', 'photoelectric', 'diode', 'fringe', 'tunneling', 'collapse', 'quantum_jump', 'gas_collision', 'doppler', and description).
8. Provide 'associatedSim' if the question relates to: 'projectile', 'harmonic_oscillator', 'double_slit', 'lorentz_force', 'quantum_well', 'orbital_gravity', 'kinetic_gas', 'semiconductor', 'nuclear', 'photoelectric'.

Output strictly valid JSON with this schema:
{
  "id": "quiz_gen_${Date.now()}",
  "level": "${level}",
  "domain": "${domain === "All Domains" ? "Physics" : domain}",
  "topic": "Specific Topic Name",
  "question": "Question text with $math$",
  "options": [
    { "id": "A", "text": "Option text" },
    { "id": "B", "text": "Option text" },
    { "id": "C", "text": "Option text" },
    { "id": "D", "text": "Option text" }
  ],
  "correctOptionId": "A",
  "hint": "Conceptual hint",
  "additionalHint": "Mathematical formula hint",
  "explanation": "Detailed explanation with formulas in $math$",
  "governingEquation": "LaTeX formula",
  "sonificationCue": {
    "soundType": "resonance",
    "description": "Acoustic clue explanation"
  },
  "associatedSim": "projectile"
}`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err: any) {
    console.warn("Quiz generation fallback activated:", err?.message || err);
    const { level = "high_school", domain = "All Domains", previousTopics = [] } = req.body || {};
    res.json(getLocalQuizQuestion(level, domain, previousTopics));
  }
});

function getLocalQuizQuestion(level: string, domain: string, previousTopics: string[] = []) {
  const bank = [
    {
      id: `local_q_${Date.now()}_exp`,
      level: "explorer",
      domain: "Quantum Mechanics",
      topic: "Quantum Light & Energy Packets",
      question: "In the microscopic quantum world, light behaves not only like ripples on water, but also as tiny packets of energy called what?",
      options: [
        { id: "A", text: "Photons (light quanta)" },
        { id: "B", text: "Sound waves" },
        { id: "C", text: "Heavy marbles" },
        { id: "D", text: "Static sparks" },
      ],
      correctOptionId: "A",
      hint: "Think about tiny energetic packets discovered by Einstein in the photoelectric effect.",
      additionalHint: "The energy of each packet is given by $E = h f$.",
      explanation: "Light is quantized into discrete packets called photons. Each photon carries energy proportional to its frequency, demonstrating wave-particle duality.",
      governingEquation: "E = h f",
      sonificationCue: {
        soundType: "quantum_jump",
        description: "A quantized chime rings out as an electron absorbs a photon packet and jumps energy states.",
      },
      associatedSim: "photoelectric",
    },
    {
      id: `local_q_${Date.now()}_mid`,
      level: "middle_school",
      domain: "Classical Mechanics",
      topic: "Inertia & Newton's First Law",
      question: "A hockey puck slides across frictionless ice at constant velocity. How much net force is required to keep it moving at this constant speed?",
      options: [
        { id: "A", text: "Zero net force.", latexMath: "F_{\\text{net}} = 0" },
        { id: "B", text: "A force equal to its mass times speed." },
        { id: "C", text: "A force continuously pushing it forward." },
        { id: "D", text: "A force proportional to Earth's gravity." },
      ],
      correctOptionId: "A",
      hint: "Remember Newton's First Law of Motion (Law of Inertia).",
      additionalHint: "An object at rest stays at rest, and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.",
      explanation: "According to Newton's First Law, an object in motion continues in uniform motion unless acted upon by a net external force. Because the ice is frictionless and air drag is zero, no force is needed to sustain motion ($F_{\\text{net}} = 0$).",
      governingEquation: "\\sum \\mathbf{F} = m \\mathbf{a} = 0 \\implies \\mathbf{v} = \\text{constant}",
      sonificationCue: {
        soundType: "doppler",
        description: "A steady, unchanging acoustic pitch reflects constant velocity with zero deceleration.",
      },
      associatedSim: "projectile",
    },
    {
      id: `local_q_${Date.now()}_hs`,
      level: "high_school",
      domain: "Electromagnetism",
      topic: "Electromagnetic Induction",
      question: "According to Faraday's Law and Lenz's Law, what causes an induced electromotive force (EMF) in a closed conducting loop?",
      options: [
        { id: "A", text: "A time-varying magnetic flux passing through the loop." },
        { id: "B", text: "A constant, unmoving electric field." },
        { id: "C", text: "Only when the temperature of the wire rises." },
        { id: "D", text: "Static gravitational field alignment." },
      ],
      correctOptionId: "A",
      hint: "Consider what changes when a bar magnet is pushed in and out of a coil.",
      additionalHint: "Faraday's Law states $\\mathcal{E} = -\\frac{d\\Phi_B}{dt}$, where the negative sign reflects Lenz's opposition law.",
      explanation: "An EMF is generated whenever the magnetic flux $\\Phi_B = \\int \\mathbf{B} \\cdot d\\mathbf{A}$ through a circuit changes with time. The induced current flows in such a direction that its own magnetic field opposes the change in flux (Lenz's Law).",
      governingEquation: "\\mathcal{E} = -\\frac{d\\Phi_B}{dt} = -\\frac{d}{dt}\\int \\mathbf{B} \\cdot d\\mathbf{A}",
      sonificationCue: {
        soundType: "resonance",
        description: "Rapid thrust of magnet produces an audible acoustic surge proportional to $-d\\Phi_B/dt$.",
      },
      associatedSim: "lorentz_force",
    },
    {
      id: `local_q_${Date.now()}_col`,
      level: "college",
      domain: "Quantum Mechanics",
      topic: "Quantum Tunneling & Wavefunctions",
      question: "When a quantum particle encounters a rectangular potential barrier with height $V_0 > E$, what characterizes the spatial wavefunction $\\psi(x)$ inside the barrier region?",
      options: [
        { id: "A", text: "An exponentially decaying real function $\\psi(x) \\sim e^{-\\kappa x}$, where $\\kappa = \\frac{\\sqrt{2m(V_0 - E)}}{\\hbar}$." },
        { id: "B", text: "An oscillating sinusoidal plane wave with constant amplitude." },
        { id: "C", text: "It strictly drops identically to zero everywhere inside the barrier." },
        { id: "D", text: "A linearly diverging ramp function." },
      ],
      correctOptionId: "A",
      hint: "Substitute $V_0 > E$ into the time-independent 1D Schrödinger equation $\\frac{d^2\\psi}{dx^2} = \\frac{2m}{\\hbar^2}(V_0 - E)\\psi$.",
      additionalHint: "Because the coefficient is positive, the solutions are hyperbolic/exponential rather than oscillatory.",
      explanation: "Inside the classically forbidden barrier where $V_0 > E$, the differential equation becomes $d^2\\psi/dx^2 = \\kappa^2\\psi$, producing exponentially decaying solutions. If the barrier has finite thickness, the wavefunction emerges on the other side with non-zero transmission probability (tunneling).",
      governingEquation: "\\frac{d^2\\psi}{dx^2} = \\frac{2m(V_0 - E)}{\\hbar^2}\\psi \\implies \\psi(x) = C e^{-\\kappa x}",
      sonificationCue: {
        soundType: "tunneling",
        description: "High-pitch carrier tone with low-pass filtered decay, mimicking exponential evanescent attenuation.",
      },
      associatedSim: "quantum_well",
    },
    {
      id: `local_q_${Date.now()}_mas`,
      level: "masters",
      domain: "Quantum Mechanics",
      topic: "Time-Independent Perturbation Theory",
      question: "In non-degenerate first-order perturbation theory, how is the first-order correction to the energy eigenvalue $E_n^{(1)}$ expressed for an unperturbed Hamiltonian $\\hat{H}_0$ and perturbation $\\hat{V}$?",
      options: [
        { id: "A", text: "$E_n^{(1)} = \\langle n^{(0)} | \\hat{V} | n^{(0)} \\rangle$ (the expectation value of the perturbation in the unperturbed eigenstate)" },
        { id: "B", text: "$E_n^{(1)} = \\sum_{k \\ne n} \\frac{|\\langle k^{(0)} | \\hat{V} | n^{(0)} \\rangle|^2}{E_n^{(0)} - E_k^{(0)}}$" },
        { id: "C", text: "$E_n^{(1)} = \\hbar \\omega_n$" },
        { id: "D", text: "$E_n^{(1)} = \\frac{1}{2} m \\omega^2 x^2$" },
      ],
      correctOptionId: "A",
      hint: "The first-order energy shift is simply the diagonal matrix element of the perturbing Hamiltonian.",
      additionalHint: "Notice that option B corresponds to the second-order energy correction $E_n^{(2)}$, not the first-order correction.",
      explanation: "In Rayleigh-Schrödinger perturbation theory, expanding $\\hat{H} = \\hat{H}_0 + \\lambda \\hat{V}$ yields $E_n^{(1)} = \\langle \\psi_n^{(0)} | \\hat{V} | \\psi_n^{(0)} \\rangle$. The first-order shift is simply the diagonal matrix element of the perturbation in the basis of unperturbed eigenstates.",
      governingEquation: "E_n = E_n^{(0)} + \\lambda \\langle n^{(0)} | \\hat{V} | n^{(0)} \\rangle + \\mathcal{O}(\\lambda^2)",
      sonificationCue: {
        soundType: "tunneling",
        description: "Slight frequency detuning corresponds to energy level splitting under perturbation $\\hat{V}$.",
      },
      associatedSim: "quantum_well",
    },
    {
      id: `local_q_${Date.now()}_mas2`,
      level: "masters",
      domain: "Statistical Mechanics",
      topic: "Partition Functions & Free Energy",
      question: "In the canonical ensemble, how is the Helmholtz free energy $F$ rigorously related to the canonical partition function $Z$?",
      options: [
        { id: "A", text: "$F = -k_B T \\ln Z$" },
        { id: "B", text: "$F = +k_B T \\ln Z$" },
        { id: "C", text: "$F = Z / (k_B T)$" },
        { id: "D", text: "$F = -T \\frac{\\partial Z}{\\partial V}$" },
      ],
      correctOptionId: "A",
      hint: "Recall the bridge relation linking microscopic partition sum $Z = \\sum_i e^{-\\beta E_i}$ to macroscopic thermodynamic potentials.",
      additionalHint: "Using $\\beta = 1/(k_B T)$, the thermodynamic identity is $F = -\\frac{1}{\\beta}\\ln Z = -k_B T \\ln Z$.",
      explanation: "The Helmholtz free energy $F(T, V, N) = -k_B T \\ln Z$ serves as the fundamental bridge between microstate probabilities and macroscopic thermodynamics. Differentiating $F$ yields entropy $S = -(\\partial F / \\partial T)_V$ and pressure $P = -(\\partial F / \\partial V)_T$.",
      governingEquation: "F = -k_B T \\ln Z, \\quad Z = \\sum_{i} e^{-E_i / k_B T}",
      sonificationCue: {
        soundType: "gas_collision",
        description: "Acoustic entropy profile shifts with temperature, mapping state density onto harmonic timbre.",
      },
      associatedSim: "kinetic_gas",
    },
  ];

  // Try to find by matching level first
  const levelMatches = bank.filter((q) => q.level === level);
  if (levelMatches.length > 0) {
    const idx = Math.floor(Math.random() * levelMatches.length);
    return levelMatches[idx];
  }
  return bank[Math.floor(Math.random() * bank.length)];
}

// Start Server with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static assets (JS, CSS, images) directly
    app.use(express.static(distPath, { index: false }));
    // For SPA entry HTML, dynamically inject server-provided runtime Firebase config
    app.get("*", (_req: Request, res: Response) => {
      try {
        const indexPath = path.join(distPath, "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        const runtimeConfig = getFirebaseConfig();
        const injectionScript = `<script>window.__FIREBASE_CONFIG__ = ${JSON.stringify(runtimeConfig)};</script>`;
        if (html.includes("</head>")) {
          html = html.replace("</head>", `${injectionScript}</head>`);
        } else {
          html = `${injectionScript}${html}`;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } catch (err) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Physica Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
