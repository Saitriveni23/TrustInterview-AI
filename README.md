<div align="center">
  <h1>🛡️ TrustInterview AI</h1>
  <p><strong>AI-powered campus recruitment portal with Proctor Anti-Cheat Shield and a 13-Layer Zero Trust Architecture (ZTA) backend.</strong></p>
</div>

<br />

TrustInterview AI is an enterprise-grade placement assessment platform tailored for RVCE Bengaluru Placements. It validates candidate claims, coordinates recruitment campaigns, routes AI interviewer personalities, and actively monitors compliance using a web-based proctoring shield.

---

## 🔒 Access Portals & Roles

TrustInterview AI is separated into two dedicated URL portals:

### 🎓 Candidate Portal
*   **Sign-In URL**: [http://localhost:3000/login](http://localhost:3000/login) (redirects to [http://localhost:3000/](http://localhost:3000/))
*   **Key Features**:
    *   Mock Interview Sandbox (practice sessions).
    *   Official Placements Drive (single graded attempt).
    *   Curated Placement Prep Courses & Calendar drives.
    *   Candidate account history card.
    *   *Note: Academic CGPA criteria and ZTA compliance blocks are completely hidden from candidate dashboards to ensure a focused assessment experience.*

### 💼 Recruiter & Employer Portal
*   **Sign-In URL**: [http://localhost:3000/recruiter](http://localhost:3000/recruiter) (redirects to [http://localhost:3000/recruiter/dashboard](http://localhost:3000/recruiter/dashboard))
*   **Key Features**:
    *   **Candidate Evaluation Roster**: Displays candidate performance, average grading metrics, ZTA compliance status, and active SOAR proctor warnings.
    *   **Proctor Security Control Panel**: Customize screenshare enforcement, AI tools tab-switch detection, and unblock candidate IPs directly.
    *   **Model Routing settings**: Select AI agent personalities (Conversational Skyy, Deep-diver Zeus, Empathetic Matt).
    *   **ATS weight thresholds**: Adjust weight distribution for Technical Skills, Experience, and Academics.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/Saitriveni23/TrustInterview-AI.git
cd TrustInterview-AI
```

### 2. Backend Setup
Initialize backend server configurations:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5001
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
ZTA_ENABLED=true
```

Start the Node.js API:
```bash
npm start
```

### 3. Frontend Setup
Initialize frontend UI server:
```bash
cd ../frontend
npm install
npm start
```

The app will compile and automatically open [http://localhost:3000](http://localhost:3000) (Candidate Login) and [http://localhost:3000/recruiter](http://localhost:3000/recruiter) (Recruiter Login).

---

## 🛡️ Proctoring & Security Shield

The platform features an active proctor guard to prevent external assistance during assessments:
1.  **Screenshare Enforcer**: Candidates must share their screen via the browser API before starting the placement interview. If screensharing stops, the call is instantly aborted.
2.  **Focus Monitor**: Minimized windows, tab-swapping, or changing application focus will flag a violation and instantly lock the candidate's workspace.
3.  **Clipboard Lock**: Disables copy-paste actions on interview questions to block external AI lookup.
4.  **IP SOAR Override**: If a violation triggers, the candidate's IP is blocked, displaying an "Assessment Terminated" lock screen. Recruiters can reset this block from the roster table or settings tab.

---

## 🧑‍💻 Authors & Contributors

- **Sai Triveni B** - [github.com/saitriveni23-cpu](https://github.com/saitriveni23-cpu)
- **Sai Pranavi A P** - [github.com/saipranavi247-prog](https://github.com/saipranavi247-prog)
- **Sanjana H V** - [github.com/sanjanahv](https://github.com/sanjanahv)
- **Sneha V** - [github.com/Snehav-unique](https://github.com/Snehav-unique)
