<div align="center">
  <h1>🛡️ TrustInterview AI</h1>
  <p><strong>AI-powered interview bot with a 13-Layer Zero Trust Architecture (ZTA) backend.</strong></p>
</div>

<br />

TrustInterview AI reads your resume and asks personalized, bias-free questions. Built with state-of-the-art security, it enforces 13 layers of Zero Trust Architecture including real-time threat intelligence, hallucination filtering, and anti-bias checks.

## ✨ Key Features

- 📄 **Resume Upload (PDF)**: Automatically parses your experience to generate tailored questions.
- 🤖 **Dynamic AI Generation**: Creates exactly 7 personalized questions (technical, behavioural, situational).
- 🎙️ **Voice Answers**: Speak your answers directly into the microphone.
- ⚖️ **Anti-Bias Filtering (ZTA-L12)**: Automatically detects and redacts biases regarding age, gender, race, disability, etc.
- 🔍 **Hallucination & Fact Checker (ZTA-L13)**: Verifies candidate claims against the uploaded resume to prevent hallucination.
- 📊 **Live ZTA Dashboard**: Real-time visualization of the 13 Zero Trust security layers (Network, CORS, Payload, Threat Intel, etc.).
- 📈 **Live Evaluation & Scoring**: Immediate feedback and 0-10 scoring based ONLY on technical merit.
- 🎯 **Comprehensive Final Report**: Auto-generated hire/no-hire recommendation with compliance and truthfulness grades.

## 🛠️ Tech Stack

- **Frontend**: React 19, React Router, Axios
- **Backend**: Node.js, Express, Helmet, Express-Rate-Limit, Multer
- **AI Models**: Ollama (Llama 3.2), OpenAI (GPT-3.5-Turbo), Google Gemini (1.5 Flash) fallbacks
- **Architecture**: 13-Layer Zero Trust Architecture (ZTA)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Local Ollama running (optional, falls back to Gemini/OpenAI if configured)

### 1. Clone the repository
```bash
git clone https://github.com/Saitriveni23/INTERVIEW-BOT.git
cd INTERVIEW-BOT
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory (use `.env.example` as a reference):
```env
PORT=5001
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
ZTA_ENABLED=true
```
Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`.

## 🛡️ Zero Trust Architecture Layers

This system implements a strict default-deny policy across 13 layers:
1. **Identity & Session**: JWT-based ephemeral tokens.
2. **Device Fingerprinting**: Anomalous device blocking.
3. **Network & CORS**: Strict origin enforcement.
4. **Workload & Payload**: Memory exhaustion prevention.
5. **Data Protection**: Secure data handling.
6. **Audit Logging**: Comprehensive request auditing.
7. **SOAR Auto-Block**: Automated threat response.
8. **Governance & XSS**: Payload sanitization.
9. **Policy Decision**: PDP/PEP enforcement.
10. **Edge & HSTS**: Enforced secure transport.
11. **Threat Intelligence**: IP reputation & signature scanning.
12. **Bias Filter**: Employment law discrimination detection.
13. **Hallucination Checker**: Factuality verification against resume.

## 🧑‍💻 Authors & Contributors

- **Sai Triveni B** - [github.com/saitriveni23-cpu](https://github.com/saitriveni23-cpu)
- **Sai Pranavi A P** - [github.com/saipranavi247-prog](https://github.com/saipranavi247-prog)
- **Sanjana H V** - [github.com/sanjanahv](https://github.com/sanjanahv)
- **Sneha V** - [github.com/Snehav-unique](https://github.com/Snehav-unique)
---
*Refer to the included `TrustInterview_ZTA_Architecture_Report.pdf` for an in-depth security analysis.*
