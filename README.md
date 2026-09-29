<div align="center">
  <h1>🛡️ TrustInterview AI</h1>
  <p><strong>AI-powered campus recruitment portal with Proctor Anti-Cheat Shield and a 13-Layer Zero Trust Architecture (ZTA) backend.</strong></p>
</div>

<br />

TrustInterview AI is an enterprise-grade placement assessment platform tailored for RVCE Bengaluru Placements. It validates candidate claims, coordinates recruitment campaigns, routes AI interviewer personalities, and actively monitors compliance using a web-based proctoring shield.

## Production stack

The production path uses Firebase Google authentication, PostgreSQL, Redis/BullMQ, two stateless Express API instances, a background question worker, and Nginx least-connections load balancing. Candidate authorization is enforced by the API and accepts only verified accounts whose domain is exactly `rvce.edu.in`; recruiter access requires a Firebase custom claim.

1. Create a Firebase web application, enable the Google provider, add the deployment hostname to Authorized Domains, and create a service account for the backend.
2. Copy `.env.production.example` to `.env` and replace every placeholder. Generate `RESUME_ENCRYPTION_KEY` with a cryptographically secure 32-byte value encoded as Base64.
3. Start the stack with `docker compose up --build -d`. The one-shot `migrate` and `seed` services initialize PostgreSQL before the APIs start.
4. Create the recruiter as a Firebase user, then provision the role and company claim:

   ```bash
   docker compose run --rm api1 npm run provision:recruiter -- recruiter@example.com "Example Company"
   ```

   The recruiter must sign out and back in after provisioning so Firebase refreshes the ID token.

Operational endpoints:

- `GET /api/health/live` reports process liveness and the serving instance.
- `GET /api/health/ready` checks PostgreSQL and Redis connectivity.
- `GET /api/recruiter/jobs/failed` exposes failed background jobs to an authenticated recruiter.

The uploaded PDF is processed from memory and discarded. Extracted text is encrypted with AES-256-GCM in Redis for no more than 24 hours and deleted immediately when the mock interview completes. PostgreSQL stores the ATS report, generated questions, and interview result, never the raw resume text.

### Backup and rollout expectations

- Back up the PostgreSQL volume with regular logical and provider-level snapshots; test restores before production launch.
- Redis contains queues and short-lived resume material. AOF is enabled for queue recovery, but Redis is not the source of record for reports.
- Terminate TLS at the deployment edge, expose only the Nginx service, rotate service-account/database/encryption secrets, and retain the old encryption key until all 24-hour resume entries have expired.
- Run `npm test` in `backend`, `npm run build` in `frontend`, and `docker compose config` before each rollout. Deploy API replicas and the worker together when queue payloads or database migrations change.
- With the stack running, execute `k6 run -e BASE_URL=https://your-host loadtest/k6.js`. Treat the included thresholds as an initial regression baseline and replace them with measured service-level objectives before launch.

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
DATABASE_URL=postgres://trustinterview:password@localhost:5432/trustinterview
REDIS_URL=redis://:password@localhost:6379
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
RESUME_ENCRYPTION_KEY=base64_encoded_32_byte_key
GEMINI_API_KEY=your_gemini_api_key
```

Run migrations and start the API plus background worker:
```bash
npm run migrate
npm run seed
npm start
npm run worker
```

### 3. Frontend Setup
Initialize frontend UI server:
```bash
cd ../frontend
npm install
npm start
```

The frontend requires `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, and `REACT_APP_FIREBASE_APP_ID`. These identify the Firebase web application; privileged service-account credentials must never be placed in the frontend.

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
