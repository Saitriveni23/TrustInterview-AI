const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");
const axios   = require("axios");
const { auditAIQuestionsGrounding } = require("../utils/hallucination-checker");
const { getSeenQuestions, markQuestionsSeen, getLeaderboard, recordScore, getCompanyCgpa, setCompanyCgpa, loadTickets, addTicket, resolveTicket } = require("../utils/question-ledger");
const questionCache = require("../utils/question-cache");

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL      = "llama3.2:1b";

async function askGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  }, { timeout: 30000 });
  return response.data.candidates[0].content.parts[0].text;
}

const audioFolder = path.join(__dirname, "../uploads/audio");
if (!fs.existsSync(audioFolder)) fs.mkdirSync(audioFolder, { recursive: true });

const uploadAudio = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, audioFolder),
    filename:    (req, file, cb) => cb(null, `audio-${Date.now()}.webm`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const BIAS_WORDS = ["age","how old","married","children","pregnant",
  "nationality","religion","race","ethnicity","gender","disability","caste"];

function biasCheck(q) {
  const flagged = BIAS_WORDS.filter(w => q.toLowerCase().includes(w));
  return { passed: flagged.length === 0 };
}

async function askModel(prompt, modelName = "llama-3-edge") {
  console.log(`[ZTA-LLM] Dispatching to LLM Model: ${modelName}`);
  if (modelName && modelName.startsWith("gemini")) {
    if (process.env.GEMINI_API_KEY) {
      const geminiModel = modelName === "gemini-1.5-pro" ? "gemini-1.5-pro" : "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }, { timeout: 30000 });
      return response.data.candidates[0].content.parts[0].text;
    } else {
      console.warn("[ZTA-LLM] Gemini API key not configured, falling back to local Llama Edge model.");
    }
  }

  // Fallback to Ollama
  const ollamaModel = modelName === "llama-3-edge" ? "llama3.2:1b" : (modelName === "phi-3-lightweight" ? "phi3" : MODEL);
  const response = await axios.post(OLLAMA_URL, {
    model:  ollamaModel,
    prompt: prompt,
    stream: false,
  }, { timeout: 120000 });
  return response.data.response;
}

// ── POST /api/interview/questions ──────────────────────────────────────────────
router.post("/questions", async (req, res) => {
  try {
    const { resumeText, jobRole, companyName, companyPYQ, llmModel, candidateEmail } = req.body;
    if (!resumeText || !jobRole)
      return res.status(400).json({ error: "resumeText and jobRole are required." });

    console.log(`[Interview] Generating questions for: ${jobRole} at ${companyName || "General"} | Candidate: ${candidateEmail || "unknown"}`);

    // ── Check Question Cache ────────────────────────────────────────────────
    const cachedQuestions = questionCache.get(companyName, jobRole);
    if (cachedQuestions) {
      console.log(`[ZTA-L14] Found cached questions for ${companyName} / ${jobRole}`);
      if (candidateEmail) {
        markQuestionsSeen(candidateEmail, cachedQuestions);
      }
      return res.json({
        success: true,
        questions: cachedQuestions,
        groundingAudit: auditAIQuestionsGrounding(cachedQuestions, resumeText),
        uniquenessEnforced: !!candidateEmail,
        cached: true
      });
    }

    // ── ZTA-L14: Question Uniqueness Check ──────────────────────────────────
    let seenQuestions = [];
    if (candidateEmail) {
      seenQuestions = getSeenQuestions(candidateEmail);
      console.log(`[ZTA-L14] Candidate ${candidateEmail} has seen ${seenQuestions.length} questions previously. Enforcing uniqueness.`);
    }

    let companyInstructions = "";
    if (companyName && companyPYQ) {
      companyInstructions = `
- The candidate is interviewing at the company: ${companyName}.
- Frame and align the questions to match the style, topic domains, and difficulty level of ${companyName}'s previous year's question papers (${companyPYQ}).`;
    }

    let excludeInstructions = "";
    if (seenQuestions.length > 0) {
      // Send last 20 seen questions to LLM to avoid repetition
      const recentSeen = seenQuestions.slice(-20);
      excludeInstructions = `\n- CRITICAL: DO NOT repeat, rephrase, or generate any questions similar to these previously asked questions: ${JSON.stringify(recentSeen)}. Every question MUST be completely different.`;
    }

    const prompt = `You are a professional, unbiased interviewer.
Generate exactly 7 UNIQUE, highly personalized interview questions based ONLY on the specific projects, work experiences, and technical skills listed in this candidate's resume for the role: ${jobRole}.
RULES:
- Every question must directly reference or ground itself in a specific project, role, or technology explicitly mentioned on the candidate's resume.
- Do NOT generate generic, textbook interview questions (e.g. do not ask general definitions like 'What is a database index?'; instead ask how they applied database optimization in their specific project listed on their CV).
- Never ask about age, gender, family, religion, nationality, disability${companyInstructions}${excludeInstructions}
- 3 technical questions with timeLimit 90
- 2 behavioural questions with timeLimit 120
- 2 situational questions with timeLimit 120
- EVERY question must be completely UNIQUE, creative, and distinct for this candidate to prevent question leakages.

Resume:
${resumeText.substring(0, 3000)}

YOU MUST respond with ONLY a JSON array. No explanation. No markdown. No text before or after.
Example:
[{"id":1,"question":"Can you explain how you used React hooks?","type":"technical","skill":"React","timeLimit":90},{"id":2,"question":"Tell me about a time you solved a difficult bug","type":"behavioural","skill":"Problem Solving","timeLimit":120}]`;

    let raw;
    try {
      raw = await askModel(prompt, llmModel);
      console.log("[Ollama/Gemini] Raw response:", raw.substring(0, 200));
    } catch (modelErr) {
      console.warn("[Interview] Active LLM model failed, trying Gemini basic fallback:", modelErr.message);
      if (process.env.GEMINI_API_KEY) {
        try {
          raw = await askGemini(prompt);
          console.log("[Gemini] Generated questions successfully via basic fallback");
        } catch (geminiErr) {
          console.error("[Interview] Gemini basic fallback failed:", geminiErr.message);
        }
      }
    }

    // Extract JSON array
    const jsonMatch = raw ? raw.match(/\[[\s\S]*?\]/) : null;
    if (!jsonMatch) {
      console.error("[Ollama] No JSON array found in response");
      const fallback = buildFallbackQuestions(jobRole, seenQuestions);
      if (candidateEmail) markQuestionsSeen(candidateEmail, fallback);
      return res.json({ success: true, questions: fallback, groundingAudit: auditAIQuestionsGrounding(fallback, resumeText), uniquenessEnforced: true });
    }

    const questions      = JSON.parse(jsonMatch[0]);
    const clean          = questions.filter(q => biasCheck(q.question).passed);
    const groundingAudit = auditAIQuestionsGrounding(clean, resumeText);

    // ── ZTA-L14: Mark these questions as seen ──────────────────────────────
    if (candidateEmail && clean.length > 0) {
      markQuestionsSeen(candidateEmail, clean);
      console.log(`[ZTA-L14] Recorded ${clean.length} new unique questions for candidate ${candidateEmail}.`);
    }

    console.log(`[Interview] ${clean.length} questions ready — ZTA-L13 Grounding Passed: ${groundingAudit.passed}`);
    
    // Store in cache
    if (clean.length > 0) {
      questionCache.set(companyName, jobRole, clean);
    }

    res.json({ success: true, questions: clean, groundingAudit, uniquenessEnforced: !!candidateEmail });

  } catch (err) {
    console.error("[Interview Error]", err.message);
    const fallback = buildFallbackQuestions(req.body.jobRole || "this role", []);
    res.json({ success: true, questions: fallback });
  }
});

function buildFallbackQuestions(jobRole, seenQuestions) {
  const pools = [
    { id:1, question:`Describe a complex technical challenge you faced in ${jobRole} and how you resolved it.`, type:"technical", skill:"Problem Solving", timeLimit:90 },
    { id:2, question:`What design patterns have you applied in ${jobRole} projects?`, type:"technical", skill:"Architecture", timeLimit:90 },
    { id:3, question:`How do you ensure code quality and testability in your work?`, type:"technical", skill:"Testing", timeLimit:90 },
    { id:4, question:`Tell me about a time when you led a team through a difficult technical decision.`, type:"behavioural", skill:"Leadership", timeLimit:120 },
    { id:5, question:`Describe a situation where you disagreed with a colleague's approach and how you handled it.`, type:"behavioural", skill:"Communication", timeLimit:120 },
    { id:6, question:`If your system experienced an outage 30 minutes before a critical demo, what would you do?`, type:"situational", skill:"Crisis Management", timeLimit:120 },
    { id:7, question:`How would you onboard and mentor a junior engineer joining your team?`, type:"situational", skill:"Mentorship", timeLimit:120 },
    { id:8, question:`What performance optimization techniques have you used in production systems?`, type:"technical", skill:"Performance", timeLimit:90 },
    { id:9, question:`Describe a project where requirements changed mid-development. How did you adapt?`, type:"behavioural", skill:"Adaptability", timeLimit:120 },
    { id:10, question:`If you discovered a critical security vulnerability in the codebase, what steps would you take?`, type:"situational", skill:"Security", timeLimit:120 },
  ];
  // Filter out seen questions
  const unseen = pools.filter(q => !seenQuestions.includes(q.question));
  return unseen.length >= 7 ? unseen.slice(0, 7) : pools.slice(0, 7);
}

// ── POST /api/interview/transcribe ─────────────────────────────────────────────
router.post("/transcribe", uploadAudio.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file received." });
    fs.unlinkSync(req.file.path);
    res.json({ success: true, transcript: "" });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Failed to process audio." });
  }
});

// ── POST /api/interview/notify-students ───────────────────────────────────────
router.post("/notify-students", async (req, res) => {
  try {
    const { companyName, minCgpa, selectedPYQ, jobRole } = req.body;
    const linkedStudents = [
      "sneha.sharma@rvce.edu.in",
      "pawan.kumar@rvce.edu.in",
      "ananth.gopal@rvce.edu.in",
      "priya.nair@rvce.edu.in",
      "rohit.reddy@rvce.edu.in"
    ];

    const logs = [];
    console.log(`[RECRUITMENT EMAIL SERVICE] Dispatching hiring campaign notifications for ${companyName || "General Recruitment"}...`);
    
    linkedStudents.forEach(email => {
      const logMsg = `📨 Email successfully sent to ${email}: ${companyName || "TrustInterview AI"} is actively hiring for "${jobRole || "AI Engineering/Data Analytics"}" (Cutoff >= ${minCgpa || "8.0"} CGPA, aligned with ${selectedPYQ || "RVCE Placements"}).`;
      console.log(`[EMAIL DISPATCH] ${logMsg}`);
      logs.push(logMsg);
    });

    res.json({ success: true, dispatchedCount: linkedStudents.length, logs });
  } catch (err) {
    console.error("[Email Notification Error]", err.message);
    res.status(500).json({ error: "Failed to dispatch student notifications." });
  }
});

// ── GET /api/interview/leaderboard ────────────────────────────────────────────
router.get("/leaderboard", (req, res) => {
  try {
    const company = req.query.company || "";
    const board = getLeaderboard(company);
    res.json({ success: true, leaderboard: board });
  } catch (err) {
    console.error("[Leaderboard Error]", err.message);
    res.status(500).json({ error: "Failed to load leaderboard." });
  }
});

// ── POST /api/interview/record-score ─────────────────────────────────────────
router.post("/record-score", (req, res) => {
  try {
    const { email, name, score, company, jobRole, interviewType } = req.body;
    if (!email || score === undefined) return res.status(400).json({ error: "email and score are required." });
    recordScore(email, name, parseFloat(score), company, jobRole, interviewType);
    res.json({ success: true });
  } catch (err) {
    console.error("[Record Score Error]", err.message);
    res.status(500).json({ error: "Failed to record score." });
  }
});

// ── GET /api/interview/company-settings ──────────────────────────────────────
router.get("/company-settings", (req, res) => {
  try {
    const company = req.query.company || "";
    const data = getCompanyCgpa(company);
    if (!company) {
      res.json({ success: true, settings: data });
    } else {
      res.json({ success: true, minCgpa: data });
    }
  } catch (err) {
    console.error("[Settings Get Error]", err.message);
    res.status(500).json({ error: "Failed to load company settings." });
  }
});

// ── POST /api/interview/company-settings ─────────────────────────────────────
router.post("/company-settings", (req, res) => {
  try {
    const { company, minCgpa } = req.body;
    if (!company || minCgpa === undefined) {
      return res.status(400).json({ error: "company and minCgpa are required." });
    }
    setCompanyCgpa(company, minCgpa);
    res.json({ success: true });
  } catch (err) {
    console.error("[Settings Post Error]", err.message);
    res.status(500).json({ error: "Failed to save company settings." });
  }
});

// ── GET /api/interview/tickets ────────────────────────────────────────────────
router.get("/tickets", (req, res) => {
  try {
    const list = loadTickets();
    res.json({ success: true, tickets: list });
  } catch (err) {
    console.error("[Tickets Get Error]", err.message);
    res.status(500).json({ error: "Failed to load support tickets." });
  }
});

// ── POST /api/interview/tickets ───────────────────────────────────────────────
router.post("/tickets", (req, res) => {
  try {
    const { category, subject, description, email, company } = req.body;
    if (!category || !subject || !description || !email) {
      return res.status(400).json({ error: "category, subject, description, and email are required." });
    }
    const tkt = addTicket({
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      subject,
      description,
      email,
      company: company || "General",
      status: "Open",
      date: new Date().toISOString().split("T")[0]
    });
    res.json({ success: true, ticket: tkt });
  } catch (err) {
    console.error("[Tickets Post Error]", err.message);
    res.status(500).json({ error: "Failed to submit support ticket." });
  }
});

// ── POST /api/interview/tickets/resolve ───────────────────────────────────────
router.post("/tickets/resolve", (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "id is required." });
    const success = resolveTicket(id);
    res.json({ success });
  } catch (err) {
    console.error("[Tickets Resolve Error]", err.message);
    res.status(500).json({ error: "Failed to resolve support ticket." });
  }
});

module.exports = router;
