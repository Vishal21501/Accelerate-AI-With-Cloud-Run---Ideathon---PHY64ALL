import { ConceptItem, MasterDomain } from "../types";

export const MASTER_DOMAINS: MasterDomain[] = [
  "Classical Mechanics",
  "Quantum Mechanics",
  "Statistical Mechanics",
  "Mathematical Physics",
  "Electromagnetism",
  "Electronics",
  "Atomic and Molecular Physics",
  "Solid State Physics",
  "Nuclear and Particle Physics",
  "Experimental methods",
];

export const DOMAIN_SAMPLE_QUESTIONS: Record<MasterDomain, string[]> = {
  "Classical Mechanics": [
    "How does the Principle of Least Action lead to Euler-Lagrange equations?",
    "Explain canonical transformations and conservation of Poisson brackets.",
    "What is the Hamilton-Jacobi equation and action-angle variables?",
  ],
  "Quantum Mechanics": [
    "How does Time-Independent Perturbation Theory handle degenerate states?",
    "Explain the Stern-Gerlach experiment and SU(2) spinor algebra.",
    "Derive the WKB approximation for quantum barrier tunneling.",
  ],
  "Statistical Mechanics": [
    "Derive the Bose-Einstein condensation critical temperature $T_c$.",
    "Explain the Grand Canonical Ensemble and chemical potential $\\mu$.",
    "How does the 1D and 2D Ising model describe magnetic phase transitions?",
  ],
  "Mathematical Physics": [
    "How do Green's functions solve inhomogeneous Helmholtz and Poisson equations?",
    "Evaluate physical contour integrals using Cauchy's Residue Theorem.",
    "Explain Lie groups $SO(3)$ and $SU(2)$ representations in physics.",
  ],
  "Electromagnetism": [
    "Formulate Maxwell's equations in covariant four-tensor notation $F^{\\mu\\nu}$.",
    "Derive TE and TM cutoff frequencies in rectangular electromagnetic waveguides.",
    "Explain the Liénard-Wiechert potentials and relativistic Larmor radiation.",
  ],
  "Electronics": [
    "How does negative feedback stabilize gain and bandwidth in Op-Amp circuits?",
    "Explain the band diagram and depletion layer width in a P-N junction diode.",
    "Analyze the Nyquist stability criterion and Bode plots for feedback amplifiers.",
  ],
  "Atomic and Molecular Physics": [
    "How does spin-orbit interaction cause the fine structure splitting of Hydrogen?",
    "Explain the Normal vs Anomalous Zeeman effect under external magnetic fields.",
    "Derive the vibrational-rotational spectra and Raman scattering selection rules.",
  ],
  "Solid State Physics": [
    "How does the Kronig-Penney model generate discrete energy band gaps?",
    "Explain phonon dispersion relations in acoustic and optical branches.",
    "What is the microscopic mechanism of Cooper pairing in BCS superconductivity?",
  ],
  "Nuclear and Particle Physics": [
    "Explain each term in the Bethe-Weizsäcker Semi-Empirical Mass Formula.",
    "How does Fermi's Golden Rule govern beta decay neutrino emission?",
    "What are color charges and quark flavors in the Standard Model?",
  ],
  "Experimental methods": [
    "How does a Lock-in Amplifier extract microvolt signals buried in noise?",
    "Derive the multivariate Gaussian error propagation formula.",
    "Explain Bragg's law $2d\\sin\\theta = n\\lambda$ in X-ray powder diffraction.",
  ],
};

export const CONCEPTS_DATABASE: ConceptItem[] = [
  // ==========================================
  // MASTER'S LEVEL: 1. CLASSICAL MECHANICS
  // ==========================================
  {
    id: "cm_lagrangian",
    title: "Lagrangian Mechanics & Euler-Lagrange Formulation",
    domain: "Classical Mechanics",
    level: "masters",
    headline: "Stationary Action Principle across generalized configuration manifolds",
    coreIdea:
      "Hamilton's Principle states that the physical trajectory traversed by a dynamical system extremizes the action integral $S = \\int_{t_1}^{t_2} \\mathcal{L}(q_i, \\dot{q}_i, t)\\,dt$. For holonomic constraints, the equations of motion are invariant under arbitrary coordinate transformations, yielding the Euler-Lagrange equations. Cyclic coordinates automatically expose conserved canonical momenta via Noether's theorem.",
    keyEquations: [
      { latex: "\\mathcal{L} = T - V", meaning: "Lagrangian defined as kinetic minus potential energy" },
      { latex: "\\frac{d}{dt}\\left( \\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}_i} \\right) - \\frac{\\partial \\mathcal{L}}{\\partial q_i} = 0", meaning: "Euler-Lagrange equations of motion for generalized coordinate $q_i$" },
      { latex: "p_i = \\frac{\\partial \\mathcal{L}}{\\partial \\dot{q}_i}", meaning: "Canonical generalized momentum conjugate to $q_i$" },
    ],
    everydayAnalogy:
      "Like light finding the path of least time through different media (Fermat's principle), a mechanical system selects the trajectory through configuration space where the overall action remains stationary.",
    misconceptions: [
      "The action must always be a minimum: Mathematically, the action is stationary (first variation $\\delta S = 0$); along long trajectories past kinetic focal points it can be a saddle point.",
    ],
    sonificationGuide:
      "As generalized velocity $\\dot{q}$ oscillates, sonify the kinetic energy $T$ with rising pitch and potential $V$ with an opposing bass note, blending into harmonic resonance along stationary paths.",
    visualizationGuide:
      "Phase space orbits $(q, p)$ and configuration space geodesics showing stationary action trajectories compared with perturbed virtual paths.",
    associatedSim: "harmonic_oscillator",
  },
  {
    id: "cm_hamiltonian",
    title: "Hamiltonian Dynamics & Poisson Brackets",
    domain: "Classical Mechanics",
    level: "masters",
    headline: "Symplectic geometry, phase space flows, and canonical invariants",
    coreIdea:
      "Applying a Legendre transformation to the Lagrangian yields the Hamiltonian $\\mathcal{H}(q_i, p_i, t) = \\sum p_i \\dot{q}_i - \\mathcal{L}$. The second-order Euler-Lagrange ODEs transform into a system of $2N$ first-order symmetric canonical equations. The Poisson bracket structure $[u, v]_{q,p}$ defines the Lie algebra of classical observables and bridges directly to quantum commutators via Dirac quantization.",
    keyEquations: [
      { latex: "\\dot{q}_i = \\frac{\\partial \\mathcal{H}}{\\partial p_i}, \\quad \\dot{p}_i = -\\frac{\\partial \\mathcal{H}}{\\partial q_i}", meaning: "Hamilton's canonical equations of motion" },
      { latex: "[f, g]_{q,p} = \\sum_{i=1}^n \\left( \\frac{\\partial f}{\\partial q_i}\\frac{\\partial g}{\\partial p_i} - \\frac{\\partial f}{\\partial p_i}\\frac{\\partial g}{\\partial q_i} \\right)", meaning: "Canonical Poisson bracket" },
      { latex: "\\frac{df}{dt} = \\frac{\\partial f}{\\partial t} + [f, \\mathcal{H}]", meaning: "Time evolution of an arbitrary classical observable" },
    ],
    everydayAnalogy:
      "Like an incompressible fluid flowing through phase space (Liouville's theorem): the volume of states never compresses or expands, it merely shears and deforms smoothly.",
    misconceptions: [
      "The Hamiltonian is always equal to total energy: $\\mathcal{H} = T + V$ only holds when coordinate transformations are scleronomic (time-independent) and potential is velocity-independent.",
    ],
    sonificationGuide:
      "Closed phase space loops sonify as continuous harmonic loops whose area corresponds to action variable $J = \\oint p\\,dq$.",
    visualizationGuide:
      "2D and 3D phase space plots showing fixed points, limit cycles, and energy contour surfaces.",
    associatedSim: "harmonic_oscillator",
  },

  // ==========================================
  // MASTER'S LEVEL: 2. QUANTUM MECHANICS
  // ==========================================
  {
    id: "qm_perturbation",
    title: "Time-Independent Perturbation Theory",
    domain: "Quantum Mechanics",
    level: "masters",
    headline: "Rayleigh-Schrödinger expansion and lifting of degenerate eigenspaces",
    coreIdea:
      "When the Hamiltonian $\\hat{H} = \\hat{H}_0 + \\lambda \\hat{H}'$ cannot be solved analytically, perturbation theory expresses the perturbed eigenvalues and eigenstates as asymptotic series in powers of $\\lambda$. For degenerate eigenspaces, diagonalizing the perturbation matrix within the degenerate subspace lifts the degeneracy and prevents singular zero-energy denominators.",
    keyEquations: [
      { latex: "E_n^{(1)} = \\langle \\psi_n^{(0)} | \\hat{H}' | \\psi_n^{(0)} \\rangle", meaning: "First-order energy correction" },
      { latex: "|\\psi_n^{(1)}\\rangle = \\sum_{k \\ne n} \\frac{\\langle \\psi_k^{(0)} | \\hat{H}' | \\psi_n^{(0)} \\rangle}{E_n^{(0)} - E_k^{(0)}} |\\psi_k^{(0)}\\rangle", meaning: "First-order state vector correction" },
      { latex: "E_n^{(2)} = \\sum_{k \\ne n} \\frac{|\\langle \\psi_k^{(0)} | \\hat{H}' | \\psi_n^{(0)} \\rangle|^2}{E_n^{(0)} - E_k^{(0)}}", meaning: "Second-order energy correction" },
    ],
    everydayAnalogy:
      "Like tuning a grand piano: first setting the fundamental harmonics on a perfect reference frame, then adding tiny adjustments for slight mechanical imperfections in the wood and wire tension.",
    misconceptions: [
      "Perturbation series always converge: In many physical Hamiltonians (such as the quartic anharmonic oscillator), the perturbation series is divergent but asymptotic.",
    ],
    sonificationGuide:
      "Play the unperturbed harmonic frequency $E_n^{(0)}$, then layer in the subtle microtonal pitch shift $E_n^{(1)}$ as perturbation strength increases.",
    visualizationGuide:
      "Level repulsion diagrams showing how eigenvalue crossings are avoided when a perturbation mixes states.",
    associatedSim: "quantum_well",
  },
  {
    id: "qm_spin_algebra",
    title: "Angular Momentum & Spin-1/2 Algebra",
    domain: "Quantum Mechanics",
    level: "masters",
    headline: "SU(2) double-covering, Pauli matrices, and Clebsch-Gordan coupling",
    coreIdea:
      "Angular momentum operators satisfy the commutation algebra $[J_i, J_j] = i\\hbar \\epsilon_{ijk} J_k$. For intrinsic spin $s = 1/2$, observables are represented by the Pauli matrices $\\vec{\\sigma}$. Spatial rotations correspond to $SU(2)$ unitary transformations where a $2\\pi$ spatial rotation negates the state vector ($|\\psi\\rangle \\to -|\\psi\\rangle$), requiring a $4\\pi$ rotation to return to the identity.",
    keyEquations: [
      { latex: "[J_i, J_j] = i\\hbar \\sum_k \\epsilon_{ijk} J_k", meaning: "Fundamental Lie algebra of angular momentum" },
      { latex: "\\sigma_x = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}, \\; \\sigma_y = \\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}, \\; \\sigma_z = \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}", meaning: "Pauli spin matrices" },
      { latex: "|j_1 - j_2| \\le j \\le j_1 + j_2", meaning: "Clebsch-Gordan angular momentum addition theorem" },
    ],
    everydayAnalogy:
      "The Dirac belt trick or plate trick: holding a coffee cup flat and rotating your arm a full 360 degrees leaves your wrist twisted; you must turn another full 360 degrees (total 720) for the arm to untwist!",
    misconceptions: [
      "Spin represents a physical sphere spinning in space: If an electron were a spinning classical sphere of radius $r_e$, its surface would have to rotate faster than the speed of light to yield $\\hbar/2$.",
    ],
    sonificationGuide:
      "Sonify spin-up ($+1/2$) as a pure sine tone at 520 Hz and spin-down ($-1/2$) at 390 Hz (a perfect fourth interval).",
    visualizationGuide:
      "Bloch sphere visualizer with state vectors rotating under external magnetic field Larmor precession.",
    associatedSim: "quantum_well",
  },

  // ==========================================
  // MASTER'S LEVEL: 3. STATISTICAL MECHANICS
  // ==========================================
  {
    id: "sm_ensembles",
    title: "Ensemble Theory & Partition Functions",
    domain: "Statistical Mechanics",
    level: "masters",
    headline: "Connecting microscopic quantum microstates to macroscopic thermodynamics",
    coreIdea:
      "Statistical mechanics bridges the micro and macro worlds via the canonical partition function $Z = \\sum_i e^{-\\beta E_i}$ where $\\beta = 1/(k_B T)$. All macroscopic state variables—Helmholtz free energy $F = -k_B T \\ln Z$, internal energy $U = -\\frac{\\partial \\ln Z}{\\partial \\beta}$, entropy $S = -\\frac{\\partial F}{\\partial T}$, and pressure $P = -\\frac{\\partial F}{\\partial V}$—follow from logarithmic derivatives of $Z$.",
    keyEquations: [
      { latex: "Z = \\sum_i e^{-\\beta E_i}, \\quad \\beta = \\frac{1}{k_B T}", meaning: "Canonical partition function sum over microstates" },
      { latex: "F = -k_B T \\ln Z", meaning: "Helmholtz free energy connecting microstates to thermodynamics" },
      { latex: "S = -k_B \\sum_i P_i \\ln P_i", meaning: "Gibbs-Shannon statistical entropy" },
    ],
    everydayAnalogy:
      "Like calculating the average wealth of a bustling metropolis: rather than tracking every individual coin transaction, you map the statistical distribution curve to predict commerce flow accurately.",
    misconceptions: [
      "Entropy is simply disorder or messy rooms: Entropy is mathematically the measure of multiplicity $\\Omega$—the number of accessible microstates compatible with a macroscopic state.",
    ],
    sonificationGuide:
      "A collective drone whose harmonic richness and bandwidth expand as temperature rises and higher microstates become thermally populated.",
    visualizationGuide:
      "Boltzmann probability distribution curve shifting across discrete energy rungs as temperature changes.",
    associatedSim: "kinetic_gas",
  },
  {
    id: "sm_quantum_stats",
    title: "Quantum Statistics: Bose-Einstein & Fermi-Dirac",
    domain: "Statistical Mechanics",
    level: "masters",
    headline: "Indistinguishability, Pauli exclusion, and macroscopic quantum phase transitions",
    coreIdea:
      "Quantum particles are fundamentally indistinguishable. Integer-spin Bosons obey Bose-Einstein statistics where unlimited particles can occupy the same quantum ground state, leading below $T_c$ to Bose-Einstein Condensation. Half-integer Fermions obey Fermi-Dirac statistics and the Pauli exclusion principle, filling states up to the Fermi energy $E_F$ even at absolute zero.",
    keyEquations: [
      { latex: "\\langle n_i \\rangle_{BE} = \\frac{1}{e^{(\\epsilon_i - \\mu)/k_B T} - 1}", meaning: "Bose-Einstein distribution for bosons" },
      { latex: "\\langle n_i \\rangle_{FD} = \\frac{1}{e^{(\\epsilon_i - \\mu)/k_B T} + 1}", meaning: "Fermi-Dirac distribution for fermions" },
      { latex: "T_c = \\frac{2\\pi \\hbar^2}{m k_B} \\left( \\frac{n}{\\zeta(3/2)} \\right)^{2/3}", meaning: "Bose-Einstein condensation critical temperature" },
    ],
    everydayAnalogy:
      "Fermions are like introverted passengers who each insist on occupying their own row of seats on an airplane; Bosons are like cheerful concert fans who gladly crowd together on the same square meter of stage.",
    misconceptions: [
      "Bose-Einstein condensation requires inter-particle attraction: BEC is a purely statistical quantum phenomenon that occurs even in an ideal, non-interacting Bose gas.",
    ],
    sonificationGuide:
      "In the Bose regime, multiple tones collapse into a single unified pure resonance at $T \\to 0$. In the Fermi regime, a rich acoustic chord remains resonant up to the Fermi frequency.",
    visualizationGuide:
      "Occupation number step function for fermions and peak divergence at zero chemical potential for bosons.",
    associatedSim: "kinetic_gas",
  },

  // ==========================================
  // MASTER'S LEVEL: 4. MATHEMATICAL PHYSICS
  // ==========================================
  {
    id: "mp_greens_functions",
    title: "Green's Functions & Differential Operators",
    domain: "Mathematical Physics",
    level: "masters",
    headline: "Impulse response methods for inhomogeneous boundary value problems",
    coreIdea:
      "A Green's function $G(\\vec{r}, \\vec{r}')$ is the fundamental impulse response of a linear differential operator $\\hat{\\mathcal{L}}$ satisfying $\\hat{\\mathcal{L}} G(\\vec{r}, \\vec{r}') = \\delta(\\vec{r} - \\vec{r}')$. Using the superposition principle, the complete solution to any inhomogeneous equation $\\hat{\\mathcal{L}} \\psi(\\vec{r}) = f(\\vec{r})$ under Dirichlet or Neumann boundary conditions is obtained via integral convolution.",
    keyEquations: [
      { latex: "\\hat{\\mathcal{L}}_x G(x, x') = \\delta(x - x')", meaning: "Definition of Green's function for operator $\\hat{\\mathcal{L}}$" },
      { latex: "\\psi(x) = \\int G(x, x') f(x')\\,dx' + \\text{Boundary terms}", meaning: "Inhomogeneous solution via convolution" },
      { latex: "G(\\vec{r}, \\vec{r}') = -\\frac{1}{4\\pi |\\vec{r} - \\vec{r}'|}", meaning: "Free-space Green's function for the 3D Laplacian $\\nabla^2$" },
    ],
    everydayAnalogy:
      "Dropping a single pebble into a calm pond creates a circular ripple (the Green's function). If rain falls all over the pond (source distribution $f$), the water's total shape is simply the sum of all individual ripple ripples.",
    misconceptions: [
      "The Green's function is independent of boundaries: The operator gives the singular kernel, but the boundary conditions dictate the required image charges or eigenfunction expansions.",
    ],
    sonificationGuide:
      "An audio impulse tick (delta spike) followed by the reverberant acoustic impulse response decay of the system geometry.",
    visualizationGuide:
      "3D potential spike diffusing outward from source point $\\vec{r}'$ respecting conductor boundary walls.",
    associatedSim: "lorentz_force",
  },
  {
    id: "mp_residue_calculus",
    title: "Complex Analysis & Cauchy's Residue Theorem",
    domain: "Mathematical Physics",
    level: "masters",
    headline: "Evaluating challenging real physical integrals via contour integration in the complex plane",
    coreIdea:
      "For a holomorphic function $f(z)$ with isolated singularities inside a closed path $C$, Cauchy's Residue Theorem states that $\\oint_C f(z)\\,dz = 2\\pi i \\sum \\text{Res}(f, z_k)$. In physics, closed contours in the complex frequency or momentum plane allow exact evaluation of Kramers-Kronig dispersion relations, propagator poles, and Fourier-Laplace inversions.",
    keyEquations: [
      { latex: "\\oint_C f(z)\\,dz = 2\\pi i \\sum_{k=1}^n \\text{Res}(f, z_k)", meaning: "Cauchy's Residue Theorem" },
      { latex: "\\text{Res}(f, z_0) = \\frac{1}{(m-1)!} \\lim_{z \\to z_0} \\frac{d^{m-1}}{dz^{m-1}} \\left[ (z - z_0)^m f(z) \\right]", meaning: "Residue calculation formula for a pole of order $m$" },
      { latex: "\\chi'(\\omega) = \\frac{2}{\\pi} \\mathcal{P} \\int_0^\\infty \\frac{s \\chi''(s)}{s^2 - \\omega^2}\\,ds", meaning: "Kramers-Kronig causality relation" },
    ],
    everydayAnalogy:
      "Like walking a closed trail around a mountain range: your net altitude gain around a closed loop is zero unless you circumnavigate a magical vortex chimney that adds a discrete quantity $2\\pi i$ of circulation!",
    misconceptions: [
      "Branch cuts are physical barriers: Branch cuts are arbitrary mathematical choices to render a multi-valued function single-valued; moving the cut does not change physical observables.",
    ],
    sonificationGuide:
      "A pitch gliding continuously as $z$ traces the contour, emitting a bell chime as it encircles each isolated pole residue.",
    visualizationGuide:
      "Complex plane domain coloring showing poles, zeros, contour arcs, and Jordan lemma semicircle closures.",
    associatedSim: "double_slit",
  },

  // ==========================================
  // MASTER'S LEVEL: 5. ELECTROMAGNETISM
  // ==========================================
  {
    id: "em_covariant",
    title: "Covariant Electrodynamics & Field Tensor",
    domain: "Electromagnetism",
    level: "masters",
    headline: "Unification of Electric and Magnetic fields under Minkowski spacetime geometry",
    coreIdea:
      "In relativistic electrodynamics, electric and magnetic fields merge into the antisymmetric second-rank Faraday tensor $F^{\\mu\\nu} = \\partial^\\mu A^\\nu - \\partial^\\nu A^\\mu$. Maxwell's four vector equations collapse into two compact four-vector tensor equations: $\\partial_\\mu F^{\\mu\\nu} = \\mu_0 J^\\nu$ and $\\partial_\\lambda F_{\\mu\\nu} + \\partial_\\mu F_{\\nu\\lambda} + \\partial_\\nu F_{\\lambda\\mu} = 0$.",
    keyEquations: [
      { latex: "F^{\\mu\\nu} = \\begin{pmatrix} 0 & -E_x/c & -E_y/c & -E_z/c \\\\ E_x/c & 0 & -B_z & B_y \\\\ E_y/c & B_z & 0 & -B_x \\\\ E_z/c & -B_y & B_x & 0 \\end{pmatrix}", meaning: "Antisymmetric electromagnetic field tensor" },
      { latex: "\\partial_\\mu F^{\\mu\\nu} = \\mu_0 J^\\nu", meaning: "Inhomogeneous Maxwell equations (Gauss & Ampère-Maxwell)" },
      { latex: "\\partial_\\mu \\tilde{F}^{\\mu\\nu} = 0", meaning: "Homogeneous Maxwell equations (Gauss for magnetism & Faraday)" },
    ],
    everydayAnalogy:
      "What looks like a pure electric field to an observer at rest appears as a mixture of electric and magnetic fields to an observer moving through it—just as the length and height of a statue shift depending on your vantage angle.",
    misconceptions: [
      "Electric and magnetic fields are independent entities: They are simply different frame-dependent projections of the unified four-tensor $F^{\\mu\\nu}$.",
    ],
    sonificationGuide:
      "Stereo audio spatialization where the left channel represents electric field component $E_x$ and the right represents magnetic Lorentz deflection $B_z$.",
    visualizationGuide:
      "Lorentz boosts demonstrating electric field lines transforming into magnetic field loops when moving relativistic velocity $\\beta = v/c$.",
    associatedSim: "lorentz_force",
  },
  {
    id: "em_waveguides",
    title: "Electromagnetic Waveguides & Boundary Modes",
    domain: "Electromagnetism",
    level: "masters",
    headline: "Cutoff frequencies, TE/TM modes, and dispersion in metallic cavities",
    coreIdea:
      "Within hollow metallic conductors, electromagnetic waves cannot propagate as TEM modes. Boundary conditions ($E_{\\parallel} = 0, B_{\\perp} = 0$) quantize the transverse wavevectors into Transverse Electric (TE) and Transverse Magnetic (TM) modes. Each mode has a characteristic cutoff frequency $\\omega_{mn}$; frequencies below cutoff decay exponentially as evanescent waves.",
    keyEquations: [
      { latex: "\\omega_{mn} = c \\pi \\sqrt{\\left(\\frac{m}{a}\\right)^2 + \\left(\\frac{n}{b}\\right)^2}", meaning: "Cutoff frequency for rectangular waveguide of dimensions $a \\times b$" },
      { latex: "v_p = \\frac{c}{\\sqrt{1 - (\\omega_{cutoff}/\\omega)^2}} > c", meaning: "Phase velocity in waveguide (exceeds speed of light without violating relativity)" },
      { latex: "v_g = c \\sqrt{1 - (\\omega_{cutoff}/\\omega)^2} < c, \\quad v_p \\cdot v_g = c^2", meaning: "Group velocity transporting information and energy" },
    ],
    everydayAnalogy:
      "Like walking a wide zig-zag path down a straight hallway: your personal zig-zag pace along the walls can make the phase fronts look blisteringly fast, but your forward progress down the hallway is strictly slower than your walking speed.",
    misconceptions: [
      "Phase velocity exceeding $c$ violates special relativity: The phase velocity merely tracks empty wavefront intersections; actual energy and signal information propagate at group velocity $v_g < c$.",
    ],
    sonificationGuide:
      "Pitch sweeps demonstrating high resonance above cutoff frequency, transitioning abruptly to an acoustic low-pass muffled filter below cutoff.",
    visualizationGuide:
      "Standing wave vector patterns of $TE_{10}$ mode showing electric field amplitude across the waveguide cross section.",
    associatedSim: "double_slit",
  },

  // ==========================================
  // MASTER'S LEVEL: 6. ELECTRONICS
  // ==========================================
  {
    id: "elec_opamp",
    title: "Operational Amplifiers & Feedback Stability",
    domain: "Electronics",
    level: "masters",
    headline: "Negative feedback topologies, virtual ground, and gain-bandwidth product",
    coreIdea:
      "An ideal op-amp possesses infinite input impedance, zero output impedance, and infinite open-loop gain $A_{OL} \\to \\infty$. Employing negative feedback enforces the 'virtual ground' condition ($V_+ \\approx V_-$), stabilizing the closed-loop transfer function $A_{CL} = -R_f / R_{in}$ independent of manufacturing variations. High-frequency phase shifts introduce stability constraints characterized by Bode margin criteria.",
    keyEquations: [
      { latex: "A_{CL} = \\frac{A_{OL}}{1 + A_{OL} \\beta} \\approx \\frac{1}{\\beta}", meaning: "Black's feedback formula for open-loop gain $A_{OL}$ and feedback fraction $\\beta$" },
      { latex: "V_{out} = -\\frac{R_f}{R_{in}} V_{in}", meaning: "Inverting amplifier closed-loop gain" },
      { latex: "\\text{GBWP} = A_{CL} \\times f_{3\\text{dB}} = \\text{Constant}", meaning: "Gain-Bandwidth Product conservation" },
    ],
    everydayAnalogy:
      "A car's cruise control: it constantly measures the difference between target speed and actual speed, immediately adjusting throttle to cancel any error with massive responsive feedback.",
    misconceptions: [
      "Virtual ground implies current flows directly into the op-amp input: Virtual ground means $V_- = 0$, but the input terminal draws virtually zero current ($I_{in} \\approx 0$) due to huge $R_{in}$.",
    ],
    sonificationGuide:
      "An amplified audio signal demonstrating how increasing feedback factor $\\beta$ reduces harmonic distortion and flatlines noise.",
    visualizationGuide:
      "Bode plots showing gain roll-off at 20 dB/decade and phase margin at the unity gain crossover frequency.",
    associatedSim: "semiconductor",
  },
  {
    id: "elec_semiconductor_junction",
    title: "Semiconductor Physics & P-N Junction Dynamics",
    domain: "Electronics",
    level: "masters",
    headline: "Drift-diffusion transport, Fermi level pinning, and Shockley diode characteristics",
    coreIdea:
      "Doping pure semiconductors creates excess mobile electrons (n-type) or holes (p-type). Metallurgical contact initiates carrier diffusion across the boundary, leaving uncompensated ionized donors and acceptors that establish a space charge depletion layer. The resulting built-in potential $V_{bi}$ produces an opposing drift field. Applied bias modulates this barrier, causing exponential Shockley current.",
    keyEquations: [
      { latex: "I = I_s \\left( e^{\\frac{q V}{k_B T}} - 1 \\right)", meaning: "Shockley ideal diode equation" },
      { latex: "W = \\sqrt{\\frac{2\\varepsilon_s}{q} \\left( \\frac{N_A + N_D}{N_A N_D} \\right) (V_{bi} - V)}", meaning: "Depletion layer width under applied voltage $V$" },
      { latex: "V_{bi} = \\frac{k_B T}{q} \\ln\\left( \\frac{N_A N_D}{n_i^2} \\right)", meaning: "Built-in potential barrier at thermal equilibrium" },
    ],
    everydayAnalogy:
      "A turnstile gate with a one-way spring: in forward bias you push against the spring effortlessly; in reverse bias you push into the locked teeth and only a few stray dust specks leak past.",
    misconceptions: [
      "The depletion region contains mobile carriers: The depletion region is depleted of mobile charges, leaving behind fixed unshielded dopant ions that create the electric field.",
    ],
    sonificationGuide:
      "Forward bias exponential current translates to rising acoustic tone and loudness; reverse breakdown triggers an avalanche static hiss.",
    visualizationGuide:
      "Live band bending diagram showing $E_c$, $E_v$, Fermi level split $E_{Fn} - E_{Fp} = qV$, and depletion boundary changes.",
    associatedSim: "semiconductor",
  },

  // ==========================================
  // MASTER'S LEVEL: 7. ATOMIC AND MOLECULAR PHYSICS
  // ==========================================
  {
    id: "am_fine_structure",
    title: "Atomic Fine Structure & Spin-Orbit Coupling",
    domain: "Atomic and Molecular Physics",
    level: "masters",
    headline: "Relativistic kinetic corrections, Darwin term, and Thomas precession",
    coreIdea:
      "In atomic systems, the electron moves through the nuclear Coulomb field $\\vec{E}$, experiencing in its rest frame an effective magnetic field $\\vec{B} = -\\frac{1}{c} \\vec{v} \\times \\vec{E}$. The interaction between the electron's spin magnetic moment and this orbital field creates spin-orbit coupling $\\hat{H}_{SO} \\propto \\vec{L} \\cdot \\vec{S}$. Combined with relativistic mass correction and the Darwin s-wave term, this lifts the degeneracy of states with identical $n$.",
    keyEquations: [
      { latex: "\\hat{H}_{SO} = \\frac{1}{2 m_e^2 c^2} \\frac{1}{r} \\frac{dV}{dr} (\\vec{L} \\cdot \\vec{S})", meaning: "Spin-orbit Hamiltonian with Thomas factor 1/2" },
      { latex: "\\vec{L} \\cdot \\vec{S} = \\frac{\\hbar^2}{2} [j(j+1) - l(l+1) - s(s+1)]", meaning: "Eigenvalues of the spin-orbit scalar product" },
      { latex: "E_{n,j} = E_n \\left[ 1 + \\frac{\\alpha^2}{n} \\left( \\frac{1}{j + 1/2} - \\frac{3}{4n} \\right) \\right]", meaning: "Full relativistic fine structure energy of Hydrogen" },
    ],
    everydayAnalogy:
      "A motorcyclist racing around a circular track: to a spectator in the center, only the forward motion is obvious; but to the rider, wind rushes past their face, exerting a direct torque on their helmet.",
    misconceptions: [
      "Thomas precession is an electromagnetic force: Thomas precession is a purely relativistic kinematic effect arising from successive non-collinear Lorentz boosts.",
    ],
    sonificationGuide:
      "A primary emission tone splitting into a crisp double-tone chord (like the famous sodium D-line doublet at 589.0 nm and 589.6 nm).",
    visualizationGuide:
      "Energy level diagram showing $2p$ splitting into $2p_{3/2}$ and $2p_{1/2}$ states.",
    associatedSim: "photoelectric",
  },
  {
    id: "am_zeeman_raman",
    title: "Zeeman Effect & Raman Spectroscopy",
    domain: "Atomic and Molecular Physics",
    level: "masters",
    headline: "Magnetic sublevel splitting and inelastic inelastic molecular photon scattering",
    coreIdea:
      "An external magnetic field $\\vec{B}$ interacts with total magnetic dipole moment $\\vec{\\mu} = -\\mu_B (g_L \\vec{L} + g_S \\vec{S}) / \\hbar$, splitting spectral lines into $2J+1$ Zeeman components with Landé g-factor $g_J$. In molecular systems, inelastic light scattering exchanges energy with vibrational-rotational modes, producing frequency-shifted Stokes (energy loss to molecule) and Anti-Stokes (energy gain from molecule) lines.",
    keyEquations: [
      { latex: "\\Delta E_Z = g_J \\mu_B B M_J, \\quad g_J = 1 + \\frac{J(J+1) + S(S+1) - L(L+1)}{2J(J+1)}", meaning: "Zeeman energy shift with Landé g-factor" },
      { latex: "h\\nu_{\\text{Stokes}} = h\\nu_0 - \\Delta E_{\\text{vib}}, \\quad h\\nu_{\\text{Anti-Stokes}} = h\\nu_0 + \\Delta E_{\\text{vib}}", meaning: "Raman Stokes and Anti-Stokes photon frequency shifts" },
      { latex: "\\frac{I_{\\text{Anti-Stokes}}}{I_{\\text{Stokes}}} = \\left( \\frac{\\nu_0 + \\nu_m}{\\nu_0 - \\nu_m} \\right)^4 e^{-\\frac{h\\nu_m}{k_B T}}", meaning: "Raman temperature-dependent intensity ratio" },
    ],
    everydayAnalogy:
      "Raman scattering is like throwing a bouncy rubber ball against an oscillating washing machine: depending on whether the machine wall was moving toward or away from the ball at impact, the ball bounces back faster or slower!",
    misconceptions: [
      "Raman scattering is identical to fluorescence: Fluorescence involves real absorption to an electronic state followed by spontaneous emission; Raman is an instantaneous scattering via a virtual state.",
    ],
    sonificationGuide:
      "Sonify the Rayleigh peak at 440 Hz, flanked by a lower pitch Stokes line (380 Hz) and a faint higher pitch Anti-Stokes harmonic (500 Hz).",
    visualizationGuide:
      "Spectrogram display illustrating Rayleigh elastic peak alongside symmetric Stokes and Anti-Stokes Raman satellite lines.",
    associatedSim: "photoelectric",
  },

  // ==========================================
  // MASTER'S LEVEL: 8. SOLID STATE PHYSICS
  // ==========================================
  {
    id: "ssp_band_theory",
    title: "Bloch Theorem & Band Gap Theory",
    domain: "Solid State Physics",
    level: "masters",
    headline: "Periodic lattice potentials, reciprocal space, and Kronig-Penney dispersion",
    coreIdea:
      "In a crystalline solid, electrons experience a periodic lattice potential $V(\\vec{r} + \\vec{R}) = V(\\vec{r})$. Bloch's theorem proves that stationary wavefunctions take the form $\\psi_{\\vec{k}}(\\vec{r}) = e^{i\\vec{k}\\cdot\\vec{r}} u_{\\vec{k}}(\\vec{r})$. Bragg reflection of electron waves at the boundaries of the first Brillouin Zone ($k = \\pm \\pi/a$) produces standing waves that open forbidden energy band gaps.",
    keyEquations: [
      { latex: "\\psi_{\\vec{k}}(\\vec{r} + \\vec{R}) = e^{i\\vec{k}\\cdot\\vec{R}} \\psi_{\\vec{k}}(\\vec{r})", meaning: "Bloch's theorem for crystal eigenstates" },
      { latex: "E_g = 2|V_G|", meaning: "Band gap magnitude at the Brillouin zone boundary generated by Fourier component $V_G$" },
      { latex: "m^* = \\hbar^2 \\left( \\frac{d^2 E}{dk^2} \\right)^{-1}", meaning: "Effective mass tensor of carriers in a periodic band" },
    ],
    everydayAnalogy:
      "Traffic on a road with regularly spaced speed bumps: at certain speeds the car bounces in sync with the bumps and cannot travel smoothly, forming forbidden speed intervals.",
    misconceptions: [
      "Effective mass $m^*$ is the physical mass of the electron: Effective mass is a dynamical parameter encapsulating the quantum momentum transfer between the electron and the periodic crystal lattice.",
    ],
    sonificationGuide:
      "As wavevector $k$ moves from zone center to edge, listen to the acoustic pitch rise along the dispersion curve until it splits into two distinct tones separated by bandgap $E_g$.",
    visualizationGuide:
      "Energy dispersion diagram $E(k)$ across the 1st Brillouin zone illustrating conduction band, valence band, and forbidden band gap.",
    associatedSim: "semiconductor",
  },
  {
    id: "ssp_superconductivity",
    title: "Phonons & BCS Theory of Superconductivity",
    domain: "Solid State Physics",
    level: "masters",
    headline: "Electron-phonon mediated Cooper pairing, Meissner effect, and energy gap $\\Delta(0)$",
    coreIdea:
      "In normal metals, electron repulsion is shielded by mobile ions. Below critical temperature $T_c$, an electron polarizes the positive lattice ions, creating a localized positive charge trace that attracts a second electron with opposite momentum and spin ($-\\vec{k}\\downarrow, \\vec{k}\\uparrow$). This phonon-mediated attraction binds electrons into Bosonic Cooper pairs whose collective macroscopic wavefunction resists all scattering, yielding exactly zero electrical resistivity.",
    keyEquations: [
      { latex: "\\Delta(0) = 1.764 k_B T_c", meaning: "BCS zero-temperature superconducting energy gap relation" },
      { latex: "\\vec{B}(x) = \\vec{B}_0 e^{-x / \\lambda_L}", meaning: "Meissner effect magnetic field expulsion with London penetration depth $\\lambda_L$" },
      { latex: "\\Phi_0 = \\frac{h}{2e} \\approx 2.0678 \\times 10^{-15}\\text{ Wb}", meaning: "Magnetic flux quantum demonstrating charge $2e$ Cooper pairs" },
    ],
    everydayAnalogy:
      "Two heavy bowling balls rolling on a soft mattress: each ball indents the mattress, naturally rolling toward each other's indentation despite not possessing any direct magnetic attraction.",
    misconceptions: [
      "Superconductivity is simply zero resistance: A perfect classical conductor would trap existing magnetic flux; a superconductor actively expels all internal magnetic fields (Meissner effect).",
    ],
    sonificationGuide:
      "Thermal resistive hiss at $T > T_c$ collapses instantly into pristine silent superconductivity below $T_c$, interrupted only by quantized flux jump clicks.",
    visualizationGuide:
      "Lattice distortion showing positive ion polarization mediating attraction between two anti-parallel spin electrons.",
    associatedSim: "semiconductor",
  },

  // ==========================================
  // MASTER'S LEVEL: 9. NUCLEAR AND PARTICLE PHYSICS
  // ==========================================
  {
    id: "np_semi_empirical",
    title: "Nuclear Models & Liquid Drop Binding Formula",
    domain: "Nuclear and Particle Physics",
    level: "masters",
    headline: "Bethe-Weizsäcker formula, nuclear saturation, and the valley of beta stability",
    coreIdea:
      "Atomic nuclei exhibit roughly constant density and binding energy per nucleon ($B/A \\approx 8\\text{ MeV}$), inspiring the Liquid Drop Model. The Bethe-Weizsäcker formula calculates nuclear binding energy via five competing terms: bulk volume energy, surface surface tension loss, Coulomb proton repulsion, quantum Pauli asymmetry energy, and spin-pairing corrections.",
    keyEquations: [
      { latex: "B(A,Z) = a_v A - a_s A^{2/3} - a_c \\frac{Z(Z-1)}{A^{1/3}} - a_a \\frac{(A-2Z)^2}{A} \\pm \\delta(A,Z)", meaning: "Bethe-Weizsäcker Semi-Empirical Mass Formula (SEMF)" },
      { latex: "R = R_0 A^{1/3}, \\quad R_0 \\approx 1.2\\text{ fm}", meaning: "Nuclear radius scaling demonstrating constant interior density" },
      { latex: "Z_{\\text{stable}} \\approx \\frac{A}{2 + 0.015 A^{2/3}}", meaning: "Valley of beta stability minimizing atomic mass" },
    ],
    everydayAnalogy:
      "A charged liquid water droplet: surface molecules have fewer neighbors than interior ones, creating surface tension, while internal positive charges push the droplet outward toward fission.",
    misconceptions: [
      "The strong nuclear force has infinite range: The fundamental gluon color force is confined, and the residual nuclear force mediated by pions decays exponentially as $\\frac{e^{-m_\\pi r}}{r}$ beyond ~2 femtometers.",
    ],
    sonificationGuide:
      "Listen to pitch increase with binding energy per nucleon, peaking dramatically at Iron-56 ($^{56}\\text{Fe}$) before declining toward Uranium.",
    visualizationGuide:
      "Binding energy per nucleon curve $B/A$ vs mass number $A$, highlighting fusion region ($^1\\text{H} \\to ^4\\text{He}$) and fission region ($^{235}\\text{U}$).",
    associatedSim: "nuclear",
  },
  {
    id: "np_standard_model",
    title: "The Standard Model: Quarks, Leptons & Gauge Bosons",
    domain: "Nuclear and Particle Physics",
    level: "masters",
    headline: "$SU(3)_C \\times SU(2)_L \\times U(1)_Y$ gauge symmetries and electroweak spontaneous symmetry breaking",
    coreIdea:
      "All known fundamental matter consists of three generations of spin-1/2 quarks and leptons interacting via spin-1 gauge bosons (gluons for strong color force, $W^\\pm/Z^0$ for weak isospin, photons for electromagnetism). The Brout-Englert-Higgs scalar field acquires a non-zero vacuum expectation value $v \\approx 246\\text{ GeV}$, spontaneously breaking electroweak symmetry and giving mass to fermions and vector bosons.",
    keyEquations: [
      { latex: "\\mathcal{L}_{SM} = -\\frac{1}{4}F_{\\mu\\nu}^a F^{a\\mu\\nu} + i\\bar{\\psi}\\gamma^\\mu D_\\mu \\psi + |D_\\mu \\phi|^2 - V(\\phi) - y_{ij}\\bar{\\psi}_i \\phi \\psi_j", meaning: "Standard Model Lagrangian" },
      { latex: "M_W = \\frac{1}{2} g v, \\quad M_Z = \\frac{1}{2} v \\sqrt{g^2 + g'^2}", meaning: "Vector boson mass generation via Higgs vacuum expectation value $v$" },
      { latex: "Q = I_3 + \\frac{Y}{2}", meaning: "Gell-Mann-Nishijima formula relating electric charge to isospin and hypercharge" },
    ],
    everydayAnalogy:
      "The Higgs field is like molasses permeating the entire universe: massless particles like photons glide through without interacting, while heavy particles like top quarks get bogged down, appearing massive.",
    misconceptions: [
      "The Higgs mechanism creates all the mass in the human body: Over 98% of your body's mass comes from the strong force quantum chromodynamics (QCD) binding energy of quarks inside protons and neutrons, not the Higgs coupling!",
    ],
    sonificationGuide:
      "Sonify three generation fundamental frequencies: electron (light chime), muon (middle bell), and tau (deep gong).",
    visualizationGuide:
      "Standard Model 4x4 matrix chart showing quarks (up, down, charm, strange, top, bottom), leptons, gauge bosons, and the scalar Higgs.",
    associatedSim: "nuclear",
  },

  // ==========================================
  // MASTER'S LEVEL: 10. EXPERIMENTAL METHODS
  // ==========================================
  {
    id: "exp_lockin_amplifier",
    title: "Lock-in Amplification & Phase-Sensitive Detection",
    domain: "Experimental methods",
    level: "masters",
    headline: "Extracting microvolt physical signals submerged inside high-amplitude broadband noise",
    coreIdea:
      "In experimental physics, delicate signals are often buried beneath thermal noise, 1/f flicker noise, and 50/60 Hz power mains hum. A lock-in amplifier modulates the experiment at reference frequency $f_{ref}$, then multiplies the raw signal by a synchronized pure reference tone $\\cos(\\omega_{ref} t + \\theta)$ and passes it through an ultra-narrow low-pass filter. Only the phase-locked DC component survives, achieving effective bandwidths of $\\Delta f < 0.001\\text{ Hz}$.",
    keyEquations: [
      { latex: "V_{psd}(t) = \\left[ V_{sig}\\cos(\\omega_s t + \\theta_s) + V_{noise}(t) \\right] \\times 2\\cos(\\omega_r t + \\theta_r)", meaning: "Phase-sensitive multiplier output before low-pass filtering" },
      { latex: "V_{out} = V_{sig} \\cos(\\theta_s - \\theta_r)", meaning: "Filtered DC output for synchronized frequency $\\omega_s = \\omega_r$" },
      { latex: "V_n = \\sqrt{4 k_B T R \\Delta f}", meaning: "Johnson-Nyquist thermal noise limit minimized by narrowing filter bandwidth $\\Delta f$" },
    ],
    everydayAnalogy:
      "Trying to hear a whisper across a crowded noisy sports stadium: if the person whispers with a tiny strobe flashlight flashing at exactly 3.2 Hz, you can use a sensor tuned strictly to 3.2 Hz to ignore the roaring crowd completely.",
    misconceptions: [
      "A lock-in amplifier removes noise by just amplifying: It doesn't merely amplify; it performs a synchronous phase correlation that mathematically integrates uncorrelated noise to zero over time.",
    ],
    sonificationGuide:
      "Hear a loud burst of white noise where a hidden tone is completely inaudible. As the lock-in filter closes down, the noise fades away to reveal a crystalline pure sinusoidal tone.",
    visualizationGuide:
      "Dual-phase mixer diagram showing in-phase ($X = R\\cos\\theta$) and quadrature ($Y = R\\sin\\theta$) channels recovering signal amplitude $R = \\sqrt{X^2 + Y^2}$.",
    associatedSim: "semiconductor",
  },
  {
    id: "exp_error_xrd",
    title: "Error Analysis & X-Ray Powder Diffraction",
    domain: "Experimental methods",
    level: "masters",
    headline: "Gaussian error propagation, reciprocal lattice vectors, and Scherrer crystallite sizing",
    coreIdea:
      "Accurate experimental conclusions require rigorous uncertainty quantification. For arbitrary multivariable functions $f(x_1, x_2, \\dots)$, variances propagate according to the Gaussian covariance matrix. In structural characterization, X-ray diffraction (Bragg's Law $2d_{hkl}\\sin\\theta = n\\lambda$) determines atomic lattice constants, while diffraction peak broadening yields average crystallite grain size via the Scherrer formula.",
    keyEquations: [
      { latex: "\\sigma_f^2 = \\sum_{i=1}^n \\left( \\frac{\\partial f}{\\partial x_i} \\right)^2 \\sigma_{x_i}^2 + 2 \\sum_{i < j} \\frac{\\partial f}{\\partial x_i}\\frac{\\partial f}{\\partial x_j} \\sigma_{x_i x_j}", meaning: "General multivariate error propagation formula with covariances" },
      { latex: "2 d_{hkl} \\sin\\theta = n \\lambda, \\quad d_{hkl} = \\frac{a}{\\sqrt{h^2 + k^2 + l^2}}", meaning: "Bragg's Law for cubic crystal Miller indices $(hkl)$" },
      { latex: "\\tau = \\frac{K \\lambda}{\\beta \\cos\\theta}", meaning: "Scherrer formula calculating crystallite size $\\tau$ from peak FWHM $\\beta$" },
    ],
    everydayAnalogy:
      "Like measuring the thickness of a single page in an encyclopedia: measuring one page directly with a ruler has massive error; measuring 1,000 pages at once and dividing by 1,000 shrinks your experimental uncertainty a thousand-fold!",
    misconceptions: [
      "Standard error is the same as standard deviation: Standard deviation measures the spread of the underlying population; standard error $\\sigma / \\sqrt{N}$ measures the precision of your sample mean.",
    ],
    sonificationGuide:
      "A diffuse chord that tightens into an acute, precise resonant tone as experimental sample size $N$ increases ($1/\\sqrt{N}$ law).",
    visualizationGuide:
      "XRD diffractogram with $2\\theta$ Bragg peak angles, Miller indices tags, and Gaussian peak fits.",
    associatedSim: "double_slit",
  },
];

export const PHYSICS_CONCEPTS = CONCEPTS_DATABASE;
