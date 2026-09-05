import { EducationLevel, SimulationId } from "../types";

export interface PresetProblem {
  id: string;
  title: string;
  level: EducationLevel;
  topic: string;
  problemText: string;
  associatedSim: SimulationId;
}

export const PRESET_PROBLEMS: PresetProblem[] = [
  // Explorer Level (Playful, Sensory, Everyday Intuition)
  {
    id: "p_explorer_slide",
    title: "Explorer: Playground Slide & Gravity",
    level: "explorer",
    topic: "Mechanics",
    problemText: "You slide down a smooth playground slide that is 6 meters long in 3 seconds. How fast were you sliding on average, and why do you go faster if you sit upright with less friction?",
    associatedSim: "projectile",
  },
  {
    id: "p_explorer_swing",
    title: "Explorer: The Rhythm of the Swing",
    level: "explorer",
    topic: "Harmonics & Motion",
    problemText: "Two playground swings have different rope lengths: Swing A is short (1 meter) and Swing B is long (3 meters). Which swing makes you complete a back-and-forth cycle faster, and why does pushing harder not change the rhythm?",
    associatedSim: "harmonic_oscillator",
  },
  {
    id: "p_explorer_shadow",
    title: "Explorer: Sunlight & Light Waves",
    level: "explorer",
    topic: "Wave Optics",
    problemText: "When sunlight passes through the tiny gaps between tree leaves, why do you see little round circles of light on the ground instead of square patches?",
    associatedSim: "double_slit",
  },

  // Middle School Level (Grades 6-8: Core quantitative relationships)
  {
    id: "p_ms_speed",
    title: "Middle School: Bicycle Speed & Conversion",
    level: "middle_school",
    topic: "Mechanics",
    problemText: "A student rides a bicycle a distance of 1800 meters to school in 6 minutes. What was the student's average speed in meters per second (m/s) and in kilometers per hour (km/h)?",
    associatedSim: "projectile",
  },
  {
    id: "p_ms_pendulum",
    title: "Middle School: Pendulum Period & Gravity",
    level: "middle_school",
    topic: "Harmonics & Motion",
    problemText: "A pendulum clock has a bob hanging from a 2.5-meter cord. Using the period equation T = 2π√(L/g), calculate how many seconds each full back-and-forth swing takes on Earth (g = 9.8 m/s²).",
    associatedSim: "harmonic_oscillator",
  },
  {
    id: "p_ms_freefall",
    title: "Middle School: Dropping a Ball from a Tower",
    level: "middle_school",
    topic: "Mechanics",
    problemText: "A stone is dropped from rest from the top of a 20-meter observation tower. How long does it take to hit the ground, and what is its impact speed? (Use g = 9.8 m/s² and neglect air drag).",
    associatedSim: "projectile",
  },

  // High School Level (Grades 9-12 / AP Physics: Algebra, vectors & introductory laws)
  {
    id: "p_hs_cannon",
    title: "High School: Projectile at 35° with Range",
    level: "high_school",
    topic: "Mechanics",
    problemText: "A cannon fires a projectile with an initial velocity of 50 m/s at an angle of 35° above the horizontal from ground level. Calculate: (a) Time of flight, (b) Maximum peak altitude, (c) Total horizontal range. (Assume g = 9.81 m/s²).",
    associatedSim: "projectile",
  },
  {
    id: "p_hs_optics",
    title: "High School: Double-Slit Fringe Separation",
    level: "high_school",
    topic: "Wave Optics",
    problemText: "Monochromatic laser light with wavelength λ = 632.8 nm illuminates two parallel slits separated by d = 0.12 mm. The interference pattern is viewed on a screen D = 1.8 meters away. Find the physical distance Δy between adjacent bright fringes on the screen.",
    associatedSim: "double_slit",
  },
  {
    id: "p_hs_cyclotron",
    title: "High School: Electron in Uniform Magnetic Field",
    level: "high_school",
    topic: "Electromagnetism",
    problemText: "An electron (m = 9.11 × 10⁻³¹ kg, q = -1.60 × 10⁻¹⁹ C) enters a uniform magnetic field B = 0.05 T with a velocity of 4.0 × 10⁶ m/s perpendicular to the field lines. Calculate the orbital radius r and the cyclotron frequency in MHz.",
    associatedSim: "lorentz_force",
  },
  {
    id: "p_hs_photoelectric",
    title: "High School: Photoelectric Stopping Potential",
    level: "high_school",
    topic: "Quantum Mechanics",
    problemText: "Ultraviolet light with wavelength λ = 250 nm strikes a cesium metal surface with work function Φ = 2.14 eV. Calculate the maximum kinetic energy of the emitted photoelectrons in eV and the stopping potential V_stop needed to extinguish the current.",
    associatedSim: "photoelectric",
  },

  // College / Undergraduate Level (Calculus, differential equations & physical rigor)
  {
    id: "p_college_damped",
    title: "College: Underdamped Oscillator & Quality Factor",
    level: "college",
    topic: "Harmonics & Motion",
    problemText: "A damped harmonic oscillator has mass m = 0.5 kg, spring constant k = 128 N/m, and linear damping coefficient b = 0.4 kg/s. Determine the natural frequency ω₀, the damped frequency ω_d, the logarithmic decrement, and the resonance quality factor Q.",
    associatedSim: "harmonic_oscillator",
  },
  {
    id: "p_college_lorentz_drift",
    title: "College: Crossed E×B Guiding Center Drift",
    level: "college",
    topic: "Electromagnetism",
    problemText: "A singly ionized helium ion (He⁺) moves in crossed fields with electric field E = 1.2 × 10⁴ V/m along the +y axis and magnetic field B = 0.4 T along the +z axis. Calculate the guiding center drift velocity vector v_d and sketch the cycloidal orbit.",
    associatedSim: "lorentz_force",
  },
  {
    id: "p_college_semiconductor",
    title: "College: Built-in Potential of P-N Silicon Diode",
    level: "college",
    topic: "Solid State & Semiconductors",
    problemText: "A silicon p-n step junction at T = 300 K (n_i = 1.5 × 10¹⁰ cm⁻³) is doped with acceptor concentration N_A = 1.0 × 10¹⁷ cm⁻³ and donor concentration N_D = 5.0 × 10¹⁵ cm⁻³. Calculate the built-in potential barrier V_bi and the equilibrium depletion layer width W.",
    associatedSim: "semiconductor",
  },

  // Master's Level (Advanced Hamiltonians, Green's functions, Quantum & Statistical Field Theory)
  {
    id: "p_masters_tunneling",
    title: "Master's: Quantum Tunneling Probability & WKB",
    level: "masters",
    topic: "Quantum Mechanics",
    problemText: "An electron with total kinetic energy E = 3.0 eV is incident upon a rectangular potential barrier of height V₀ = 6.0 eV and spatial thickness a = 0.25 nm. Calculate the wavevector decay constant κ inside the barrier and determine the quantum transmission coefficient T.",
    associatedSim: "quantum_well",
  },
  {
    id: "p_masters_orbit",
    title: "Master's: Elliptical Orbit & Runge-Lenz Conservation",
    level: "masters",
    topic: "Astrophysics & Gravitation",
    problemText: "A spacecraft in an elliptical orbit around Earth (M = 5.972 × 10²⁴ kg) has a perigee altitude of 400 km and an apogee altitude of 36,000 km. Given Earth radius R = 6,371 km, calculate the orbital eccentricity e, semi-major axis a, perihelion speed, and prove conservation of the Laplace-Runge-Lenz vector A = p × L - m k r̂.",
    associatedSim: "orbital_gravity",
  },
  {
    id: "p_masters_kinetic",
    title: "Master's: Maxwell-Boltzmann Partition Function & Equipartition",
    level: "masters",
    topic: "Thermodynamics & Statistical Mechanics",
    problemText: "For one mole of Nitrogen gas (N₂, molar mass M = 28.02 g/mol) at standard temperature T = 298.15 K, evaluate the canonical partition function Z, calculate the root-mean-square speed v_rms, the most probable speed v_mp, and evaluate the vibrational vs rotational heat capacity contributions using equipartition.",
    associatedSim: "kinetic_gas",
  },
];
