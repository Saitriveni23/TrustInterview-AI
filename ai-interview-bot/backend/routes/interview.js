// ============================================================
// backend/routes/interview.js
// ============================================================
// This file handles:
//   1. Receiving resume text + job role from frontend
//   2. Sending it to OpenAI to generate questions
//   3. Running bias check on every single question
//   4. Sending only the clean questions back
//   5. Transcribing audio answers using Whisper
// ============================================================

const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");

// Connect to OpenAI using your key from .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────
// Multer setup for audio file uploads
// Used when the candidate submits a voice answer
// ─────────────────────────────────────────────
const audioFolder = path.join(__dirname, "../uploads/audio");
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder, { recursive: true });
}

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioFolder),
  filename:    (req, file, cb) => cb(null, `audio-${Date.now()}.webm`),
});

const audioFilter = (req, file, cb) => {
  // Accept common audio mime types from browser MediaRecorder
  const allowed = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "video/webm"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only audio files are allowed"), false);
  }
};

const uploadAudio = multer({
  storage:    audioStorage,
  fileFilter: audioFilter,
  limits:     { fileSize: 25 * 1024 * 1024 }, // 25MB max (Whisper limit)
});

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 10 — Input Validation
// Reject bad or missing data before processing
// ─────────────────────────────────────────────
function validateQuestionInput(resumeText, jobRole) {
  const errors = [];
  if (!resumeText || typeof resumeText !== "string")
    errors.push("Resume text is missing.");
  if (resumeText && resumeText.trim().length < 50)
    errors.push("Resume text is too short.");
  if (resumeText && resumeText.length > 15000)
    errors.push("Resume text is too long. Max 15000 characters.");
  if (!jobRole || typeof jobRole !== "string")
    errors.push("Job role is missing.");
  if (jobRole && jobRole.trim().length < 2)
    errors.push("Job role is too short.");
  return errors;
}

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 11 — Bias & Fairness Filter
// Scans every AI-generated question for words
// that could indicate discrimination based on
// gender, age, race, religion, family status.
// Any question that fails is silently removed.
// ─────────────────────────────────────────────
const BIAS_WORDS = [
  "age", "how old", "year of birth", "date of birth", "born",
  "married", "single", "spouse", "husband", "wife", "partner",
  "children", "kids", "pregnant", "maternity", "family plans",
  "nationality", "citizen", "visa", "passport", "country of origin",
  "religion", "faith", "church", "mosque", "temple", "belief",
  "race", "ethnicity", "caste", "color", "colour",
  "gender", "sex ", " he ", " she ",
  "disability", "disabled", "illness", "health condition", "medical",
];

function biasCheck(question) {
  const lower = question.toLowerCase();
  const flagged = BIAS_WORDS.filter((word) => lower.includes(word));
  return { passed: flagged.length === 0, flaggedWords: flagged };
}

// ─────────────────────────────────────────────
// POST /api/interview/questions
// Frontend sends: { resumeText, jobRole }
// Backend returns: { questions: [...] }
// ─────────────────────────────────────────────
router.post("/questions", async (req, res) => {
  try {
    const { resumeText, jobRole } = req.body;

    // Step 1 — Validate input
    const errors = validateQuestionInput(resumeText, jobRole);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(" ") });
    }

    console.log(`[Interview] Generating questions for: ${jobRole} - interview.js:110`);

    // Step 2 — Build the AI prompt
    // We trim the resume to 8000 chars to stay within token limits
    const prompt = `
You are a professional, unbiased technical interviewer.

Generate exactly 7 interview questions based ONLY on the resume below.

STRICT RULES:
- Only ask about skills, projects, and experience that appear in the resume.
- Never ask about: age, gender, family, children, religion, nationality, disability, health.
- Question types to include:
    - 3 technical questions  (timeLimit: 90 seconds)
    - 2 behavioural questions starting with "Tell me about a time..." (timeLimit: 120 seconds)
    - 2 situational questions starting with "What would you do if..." (timeLimit: 120 seconds)
- Keep each question under 2 sentences.
- Be specific — mention actual skills from the resume.

Job Role: ${jobRole.trim()}

Resume:
${resumeText.trim().substring(0, 8000)}

Respond with ONLY a valid JSON array. No explanation, no markdown, no extra text.
Use exactly this format:
[
  {
    "id": 1,
    "question": "Your question here",
    "type": "technical",
    "skill": "Skill name from resume",
    "timeLimit": 90
  }
]`;

    // Step 3 — Call OpenAI
    const response = await openai.chat.completions.create({
      model:       "gpt-3.5-turbo",
      messages: [
        {
          role:    "system",
          content: "You are a fair professional interviewer. Respond with valid JSON only. No markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens:  1500,
    });

    const rawText = response.choices[0].message.content.trim();

    // Step 4 — Parse the JSON
    let questions;
    try {
      // Sometimes GPT wraps in ```json ... ``` — strip that
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      questions = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Interview] Failed to parse OpenAI response: - interview.js:169", rawText);
      return res.status(500).json({
        error: "AI returned an unexpected format. Please try again.",
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({
        error: "AI returned wrong format. Please try again.",
      });
    }

    // Step 5 — Run bias check on every question
    const cleanQuestions = [];
    let removedCount = 0;

    for (const q of questions) {
      if (!q.question || typeof q.question !== "string") continue;

      const check = biasCheck(q.question);
      if (check.passed) {
        cleanQuestions.push({
          id:        q.id || cleanQuestions.length + 1,
          question:  q.question.trim(),
          type:      q.type      || "technical",
          skill:     q.skill     || "General",
          timeLimit: q.timeLimit || 90,
          biasCheck: "passed",
        });
      } else {
        removedCount++;
        console.warn(
          `[Bias Filter] Removed: "${q.question}" | Flagged: ${check.flaggedWords.join(", ")}`
        );
      }
    }

    console.log(
      `[Interview] ${cleanQuestions.length} questions passed. ${removedCount} removed by bias filter.`
    );

    if (cleanQuestions.length < 3) {
      return res.status(500).json({
        error: "Could not generate enough fair questions. Please try again.",
      });
    }

    // Step 6 — Send back to frontend
    res.json({
      success:        true,
      jobRole:        jobRole.trim(),
      totalQuestions: cleanQuestions.length,
      removedForBias: removedCount,
      questions:      cleanQuestions,
    });

  } catch (err) {
    console.error(`[Interview Error] ${err.message} - interview.js:226`);
    if (err.message && err.message.includes("API key")) {
      return res.status(500).json({
        error: "OpenAI API key is invalid. Check your .env file.",
      });
    }
    res.status(500).json({
      error: "Failed to generate questions. Please try again.",
    });
  }
});

// ─────────────────────────────────────────────
// POST /api/interview/transcribe
// Frontend sends: audio file (webm/ogg)
// Backend returns: { transcript: "..." }
// This converts the candidate's spoken answer
// into text using OpenAI Whisper
// ─────────────────────────────────────────────
router.post("/transcribe", uploadAudio.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file received." });
    }

    console.log(`[Transcribe] File received: ${req.file.filename} - interview.js:251`);

    // Send audio file to Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file:  fs.createReadStream(req.file.path),
      model: "whisper-1",
    });

    // Delete the audio file immediately after transcribing
    // (Zero Trust Layer 9 — do not store user data)
    fs.unlinkSync(req.file.path);
    console.log(`[Transcribe] Audio file deleted after transcription - interview.js:262`);

    const transcript = transcription.text.trim();
    console.log(`[Transcribe] Result: "${transcript.substring(0, 80)}..." - interview.js:265`);

    res.json({
      success:    true,
      transcript: transcript,
    });

  } catch (err) {
    console.error(`[Transcribe Error] ${err.message} - interview.js:273`);

    // Clean up file if something went wrong
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Failed to transcribe audio. Please try again.",
    });
  }
});

module.exports = router;