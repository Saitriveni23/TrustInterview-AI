// ============================================================
// routes/interview.js — ZTA L5 + L8 + L12
// ============================================================

const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const audioFolder = path.join(__dirname, "../uploads/audio");
if (!fs.existsSync(audioFolder)) fs.mkdirSync(audioFolder, { recursive: true });

const uploadAudio = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, audioFolder),
    filename:    (req, file, cb) => cb(null, `audio-${crypto.randomBytes(8).toString("hex")}.webm`),
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid audio format"), false);
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

const BIAS_WORDS = [
  "age", "how old", "married", "children", "pregnant",
  "nationality", "religion", "race", "ethnicity",
  "gender", "disability", "caste", "sexual orientation",
  "family status", "political",
];

function biasCheck(text) {
  const lower   = text.toLowerCase();
  const flagged = BIAS_WORDS.filter(w => lower.includes(w));
  return { passed: flagged.length === 0, flagged };
}

function validateQuestionRequest(body) {
  const { resumeText, jobRole } = body;
  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20)
    return "resumeText must be a non-empty string (minimum 20 characters).";
  if (!jobRole || typeof jobRole !== "string" || jobRole.trim().length < 2)
    return "jobRole must be a non-empty string.";
  if (jobRole.trim().length > 100)
    return "jobRole must be under 100 characters.";
  return null;
}

router.post("/questions", async (req, res) => {
  try {
    const validationError = validateQuestionRequest(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const jobRole    = req.body.jobRole.trim();
    const resumeText = req.body.resumeText.trim();

    console.log(`[Interview] Generating questions — role: ${jobRole}`);

    const prompt = `You are a professional unbiased technical interviewer.
Generate exactly 7 interview questions based ONLY on this resume for the role: ${jobRole}
RULES:
- Only use skills and experience mentioned in the resume
- Never ask about age, gender, family, religion, nationality, disability
- 3 technical questions (timeLimit:90)
- 2 behavioural questions starting with "Tell me about a time" (timeLimit:120)
- 2 situational questions starting with "What would you do if" (timeLimit:120)
- Be specific — mention actual skills from the resume

Resume:
${resumeText.substring(0, 6000)}

Respond ONLY with a valid JSON array. No markdown. No extra text. Example:
[{"id":1,"question":"Can you explain how you used React hooks?","type":"technical","skill":"React","timeLimit":90}]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }],
      temperature: 0.7, max_tokens: 1500,
    });

    const raw       = response.choices[0].message.content.trim().replace(/```json|```/g, "");
    const questions = JSON.parse(raw);
    const clean     = questions.filter(q => biasCheck(q.question).passed);
    const removed   = questions.length - clean.length;

    if (removed > 0) console.warn(`[ZTA-L12] Bias filter removed ${removed} question(s)`);
    console.log(`[Interview] ${clean.length} questions passed bias check`);
    res.json({ success: true, questions: clean });

  } catch (err) {
    console.error("[Interview Error]", err.message);
    res.status(500).json({ error: "Failed to generate questions. Check your OpenAI API key." });
  }
});

router.post("/transcribe", uploadAudio.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file received." });

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path), model: "whisper-1",
    });

    try { fs.unlinkSync(req.file.path); console.log(`[ZTA-L5] Audio deleted: ${req.file.filename}`); } catch (_) {}

    res.json({ success: true, transcript: transcription.text.trim() });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path); } catch (_) {}
    console.error("[Transcribe Error]", err.message);
    res.status(500).json({ error: "Failed to transcribe audio." });
  }
});

module.exports = router;
