const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const lower   = q.toLowerCase();
  const flagged = BIAS_WORDS.filter(w => lower.includes(w));
  return { passed: flagged.length === 0 };
}

router.post("/questions", async (req, res) => {
  try {
    const { resumeText, jobRole } = req.body;
    if (!resumeText || !jobRole)
      return res.status(400).json({ error: "resumeText and jobRole are required." });

    console.log(`[Interview] Generating questions for: ${jobRole}`);

    const prompt = `You are a professional unbiased technical interviewer.
Generate exactly 7 interview questions based ONLY on this resume for the role: ${jobRole}
RULES:
- Only use skills and experience mentioned in the resume
- Never ask about age, gender, family, religion, nationality, disability
- 3 technical questions (timeLimit:90)
- 2 behavioural questions starting with Tell me about a time (timeLimit:120)
- 2 situational questions starting with What would you do if (timeLimit:120)
- Be specific — mention actual skills from the resume

Resume:
${resumeText.substring(0, 6000)}

Respond with ONLY a valid JSON array. No markdown. No extra text. Example:
[{"id":1,"question":"Can you explain how you used React hooks in your projects?","type":"technical","skill":"React","timeLimit":90}]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const raw       = response.choices[0].message.content.trim().replace(/```json|```/g, "");
    const questions = JSON.parse(raw);
    const clean     = questions.filter(q => biasCheck(q.question).passed);

    console.log(`[Interview] ${clean.length} questions passed bias check`);
    res.json({ success: true, questions: clean });

  } catch (err) {
    console.error("[Interview Error]", err.message);
    res.status(500).json({ error: "Failed to generate questions. Check your OpenAI API key in .env" });
  }
});

router.post("/transcribe", uploadAudio.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file received." });
    const transcription = await openai.audio.transcriptions.create({
      file:  fs.createReadStream(req.file.path),
      model: "whisper-1",
    });
    fs.unlinkSync(req.file.path);
    res.json({ success: true, transcript: transcription.text.trim() });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("[Transcribe Error]", err.message);
    res.status(500).json({ error: "Failed to transcribe audio." });
  }
});

module.exports = router;
