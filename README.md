# PHY64ALL — Multi-Sensory Physics Laboratory & AI Learning Suite

[![Google Cloud Run](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Google%20AI-Gemini%20Flash-8E75FF?logo=google&logoColor=white)](https://ai.google.dev/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**PHY64ALL** is an interactive, multi-sensory physics experimentation and education platform designed to make advanced physical phenomena intuitive and accessible to everyone. By pairing high-precision mathematical simulations with real-time audio sonification and Gemini-powered pedagogical intelligence, PHY64ALL bridges classical, thermodynamic, relativistic, and quantum mechanics.

---

## 🌟 The Evolution: From Simple Chat to Full-Scale Laboratory

The platform originated as an experimental concept: a minimalist chat tutor accompanied by two basic canvas animations. However, practical testing with learners and educators highlighted critical barriers in conventional digital science tools:
1. **Mathematical Abstraction**: Equations often obscure the underlying dynamical behavior of physical systems.
2. **Sensory Exclusivity**: Purely visual plots fail visually impaired students and overlook auditory learning modalities that excel at perceiving frequencies, resonance, and turbulence.
3. **Context-Free Problem Solving**: Traditional chatbots output raw answers without interactive parameter verification or mathematical rigor.

Guided by these insights, the project expanded from a basic tutor into an integrated digital physics ecosystem:
- **11 Interactive Virtual Laboratories** spanning classical mechanics to quantum wavepacket tunneling.
- **Synthesized Real-Time Audio Sonification** translating velocities, phase angles, and energy states into dynamic auditory feedback.
- **Pedagogical AI Solver & Socratic Tutor** with full KaTeX rendering, step-by-step problem deconstruction, and adaptive quizzes calibrated across 4 distinct educational tiers.
- **Enterprise-Grade Privacy & Multi-User Isolation** ensuring every researcher and student maintains their own protected notebook.

---

## ✨ Key Features

### 1. Eleven High-Fidelity Physics Laboratories
* **Harmonic Oscillations & Resonance**: Underdamped, overdamped, and driven oscillations with real-time phase portraits and resonance curves.
* **Projectile Dynamics**: Variable gravity, air resistance drag coefficients, and launch trajectories.
* **Double Pendulum (Deterministic Chaos)**: Runge-Kutta ODE numerical integration showcasing sensitive dependence on initial conditions and Poincaré recurrence.
* **Thermodynamics & Kinetic Gas Theory**: Real-time molecular velocity distributions compared against theoretical Maxwell-Boltzmann curves.
* **Wave Optics & Diffraction**: Interactive Young's double-slit interference, wave intensity profiles, and laser wavelength tuning.
* **Electromagnetic Induction (Faraday & Lenz)**: Dynamic magnetic flux calculation, induced EMF meters, and direction indicators.
* **Keplerian & Multi-Body Gravitation**: Planetary orbital eccentricities, escape velocity sweeps, and gravitational well visualization.
* **Special Relativity**: Lorentz contraction, time dilation observers, and Minkowski spacetime light cones.
* **Quantum Wavepacket Tunneling**: Real-time 1D Schrödinger equation solver demonstrating barrier transmission, reflection, and evanescent wave decay.
* **Photoelectric Effect**: Metal work functions, photon stopping voltages, and Planck's constant calculations.
* **Blackbody Radiation**: Planck distribution spectrums, peak emission tracking via Wien's displacement law, and Stefan-Boltzmann total radiance.

### 2. Multi-Sensory Audio Sonification
* **Web Audio API Synthesis**: Physical metrics (velocity, kinetic energy, frequency, flux) map continuously to synthesized audio frequencies, detuned oscillators, and stereo panning.
* **Accessible Observation**: Enables auditory observation of harmonic resonance peaks, chaotic pendulum flips, and quantum barrier tunneling.

### 3. Gemini-Powered AI Learning Tools
* **Step-by-Step Physics Problem Solver**: Natural language physics query solver with structured derivation steps, formulas rendered via KaTeX, and conceptual insights.
* **Concept Explorer & Socratic Chat Tutor**: Context-aware AI tutor answering queries with physical analogies and intuitive breakdowns.
* **Adaptive Quiz Arena**: Dynamically generated evaluations across **Explorer**, **High School**, **College**, and **Master's** levels.
* **Laboratory Notebook**: Automatic logging of experiment parameters, notes, and one-click PDF generation via `jspdf`.

---

## 🔒 Security Architecture & Preventing Cross-User Data Leakage

Data privacy and multi-user isolation are fundamental to PHY64ALL. To ensure that student notebooks, experiment logs, and session details are never visible to other users, the platform applies a defense-in-depth security model:

```
                          ┌───────────────────────────┐
                          │   Firebase Authentication │
                          │ (Google OAuth, Email, UID)│
                          └─────────────┬─────────────┘
                                        │ Authenticated User UID
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Cloud Firestore Storage     │           │    Browser Client Sandboxing    │
│                                 │           │                                 │
│  /users/{userId}/notebooks/*    │           │  phy64all_store_{userId}         │
│  /users/{userId}/experiments/*  │           │  phy64all_active_guest_{guestId} │
│                                 │           │                                 │
│  Security Rules Enforcement:    │           │  Strict LocalStorage Isolation: │
│  request.auth.uid == userId     │           │  - Zero shared legacy keys      │
│  (Cross-user read/write blocked)│           │  - Automated session scrubbing  │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

### 1. Hierarchical User-Scoped Collections
All user data in Cloud Firestore is strictly namespaced under top-level user documents:
```text
/users/{userId}/notebooks/{notebookId}
/users/{userId}/experiments/{experimentId}
```
No global or shared collections exist for experiment data. Even if a user attempts to query data from another user's path, the database engine enforces isolation at the query level.

### 2. Strict Firestore Security Rules
Firestore security rules evaluate every read, write, update, and delete request:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /notebooks/{notebookId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /experiments/{experimentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
Unauthenticated requests or requests where `request.auth.uid != userId` are rejected at the database level.

### 3. Client-Side Storage Isolation & Guest Sandboxing
* **Namespaced Local Keys**: Client persistence uses unique storage keys partitioned by user ID (`physica_store_${userId}`).
* **Isolated Guest Sessions**: When users select **Guest Mode**, an ephemeral, distinct session ID is created. Guest data remains exclusively within the isolated local sandbox and is never intermingled with Google account data.
* **Session Cleansing**: When logging out or transitioning between Guest and Authenticated sessions, the application systematically scrubs temporary caches, active simulation handles, and legacy keys.

---

## 🔑 Secret Management with Google Cloud Secret Manager

In production environments, hardcoding sensitive credentials (such as API keys and signing tokens) into source repositories or container images introduces severe security risks. PHY64ALL utilizes **Google Cloud Secret Manager** to securely store and inject secrets at runtime.

### Storing Secrets in Secret Manager

```bash
# 1. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 2. Create a secret for the Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
    --data-file=- \
    --replication-policy="automatic"

# 3. Grant the Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Deploying to Cloud Run with Injected Secrets

When deploying to Cloud Run, secrets are bound directly as environment variables using `--set-secrets`:

```bash
gcloud run deploy phy64all \
  --source=. \
  --region=asia-southeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --set-labels=dev-tutorial=cloud-run-ai-challenge \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

Benefits of this approach:
* **Zero Source Exposure**: API keys are never stored in `git`, `Dockerfile`, or client-side bundles.
* **Seamless Key Rotation**: Updating a secret version in Secret Manager immediately propagates on container restart without rebuilding code.
* **Server-Side API Proxying**: The Express backend (`server.ts`) accesses `process.env.GEMINI_API_KEY` internally and proxies AI requests, keeping the key completely invisible to client browser DevTools.

---

## 🚀 Deployment Instructions

### Prerequisites
1. [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and initialized.
2. An active Google Cloud Project with billing enabled.
3. Node.js 20+ installed locally for testing.

---

### Step 1: Configure Your Google Cloud Project
Ensure your active `gcloud` configuration points to your valid Google Cloud **Project ID**:

```bash
# Check your available projects and their exact Project IDs
gcloud projects list

# Set your active project ID
gcloud config set project <YOUR_PROJECT_ID>
```

---

### Step 2: Enable Required Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  identitytoolkit.googleapis.com \
  firestore.googleapis.com
```

---

### Step 3: Configure Firebase Authentication & Domain Authorization

1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project.
2. Navigate to **Build > Authentication > Sign-in method**:
   * Enable **Google**.
   * (Optional) Enable **Anonymous** for instant guest sign-in.
3. In **Authentication > Settings > Authorized domains**:
   * Add your Cloud Run domain (`<service-name>-<hash>-<region>.a.run.app`) once deployed.

---

### Step 4: Deploy the Application to Cloud Run

Deploy directly from source using the production multi-stage Docker build:

```bash
gcloud run deploy phy64all \
  --source=. \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --set-labels=dev-tutorial=cloud-run-ai-challenge \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

*Note: If Secret Manager is not yet set up, you can temporarily pass the key via `--set-env-vars="GEMINI_API_KEY=your_key"`, or omit the flag to deploy the simulation laboratory first.*

Once deployment completes, Cloud Run outputs the public URL:
```text
Service [phy64all] revision [phy64all-00001-abc] has been deployed and is serving 100 percent of traffic.
Service URL: https://phy64all-xxxxx-xx.a.run.app
```

---

## 💻 Local Development

```bash
# 1. Clone the repository and install dependencies
git clone <your-repo-url>
cd phy64all
npm install

# 2. Configure environment variables (.env)
cp .env.example .env
# Add your GEMINI_API_KEY and Firebase configuration to .env

# 3. Start the unified development server (Express + Vite on Port 3000)
npm run dev
```

Visit `http://localhost:3000` to interact with the laboratory.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | High-performance reactive state management |
| **Build & Dev Tooling** | Vite + esbuild + tsx | Instant hot compilation & ESM bundling |
| **Styling** | Tailwind CSS v4 | Responsive scientific dashboard architecture |
| **Mathematics & Typesetting** | KaTeX | High-speed, accessible LaTeX mathematical typesetting |
| **Audio Sonification** | Web Audio API | Frequency and waveform synthesis for data sonification |
| **AI Pedagogical Engine** | Google GenAI SDK (`@google/genai`) | Gemini models powering solver, tutor, and quizzes |
| **Backend & Middleware** | Node.js + Express | Server-side Gemini proxying & runtime config injection |
| **Authentication & Database**| Firebase Auth + Cloud Firestore | Isolated multi-user authentication & user-scoped cloud persistence |
| **Container & Cloud Platform**| Docker (Multi-stage) + Cloud Run | Scalable, containerized serverless hosting |
| **Security & Secrets** | GCP Secret Manager | Protected server-side credential management |

---

