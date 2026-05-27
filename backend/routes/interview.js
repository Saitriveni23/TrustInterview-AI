const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");
const axios   = require("axios");

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL      = "llama3.2:1b";

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

async function askOllama(prompt) {
  console.log("[Ollama] Sending request...");
  const response = await axios.post(OLLAMA_URL, {
    model:  MODEL,
    prompt: prompt,
    stream: false,
  }, { timeout: 120000 });
  console.log("[Ollama] Got response");
  return response.data.response;
}

router.post("/questions", async (req, res) => {
  try {
    const { resumeText, jobRole } = req.body;
    if (!resumeText || !jobRole)
      return res.status(400).json({ error: "resumeText and jobRole are required." });

    console.log(`[Interview] Generating questions for: ${jobRole}`);

    const prompt = `You are a professional unbiased interviewer.
Generate exactly 7 interview questions based ONLY on this resume for the role: ${jobRole}
RULES:
- Only use skills and experience mentioned in the resume
- Never ask about age, gender, family, religion, nationality, disability
- 3 technical questions with timeLimit 90
- 2 behavioural questions with timeLimit 120
- 2 situational questions with timeLimit 120

Resume:
${resumeText.substring(0, 3000)}

YOU MUST respond with ONLY a JSON array. No explanation. No markdown. No text before or after.
Example:
[{"id":1,"question":"Can you explain how you used React hooks?","type":"technical","skill":"React","timeLimit":90},{"id":2,"question":"Tell me about a time you solved a difficult bug","type":"behavioural","skill":"Problem Solving","timeLimit":120}]`;

    const raw = await askOllama(prompt);
    console.log("[Ollama] Raw response:", raw.substring(0, 200));

    // Extract JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.error("[Ollama] No JSON array found in response");
      // Return fallback questions based on job role
      const fallback = [
        {"id":1,"question":`Can you describe your experience with ${jobRole}?`,"type":"technical","skill":"General","timeLimit":90},
        {"id":2,"question":"Tell me about a challenging project you worked on and how you handled it.","type":"behavioural","skill":"Problem Solving","timeLimit":120},
        {"id":3,"question":"What technical skills do you consider your strongest?","type":"technical","skill":"Technical Skills","timeLimit":90},
        {"id":4,"question":"Tell me about a time you had to learn a new technology quickly.","type":"behavioural","skill":"Learning","timeLimit":120},
        {"id":5,"question":"What would you do if you disagreed with your team lead's technical decision?","type":"situational","skill":"Communication","timeLimit":120},
        {"id":6,"question":"How do you approach debugging a complex problem?","type":"technical","skill":"Debugging","timeLimit":90},
        {"id":7,"question":"What would you do if you were given an unclear requirement?","type":"situational","skill":"Communication","timeLimit":120},
      ];
      return res.json({ success: true, questions: fallback });
    }

    const questions = JSON.parse(jsonMatch[0]);
    const clean     = questions.filter(q => biasCheck(q.question).passed);
    console.log(`[Interview] ${clean.length} questions ready`);
    res.json({ success: true, questions: clean });

  } catch (err) {
    console.error("[Interview Error]", err.message);
    // Return fallback questions so app still works
    const fallback = [
      {"id":1,"question":`Describe your experience relevant to ${req.body.jobRole || "this role"}.`,"type":"technical","skill":"General","timeLimit":90},
      {"id":2,"question":"Tell me about a time you faced a difficult challenge at work.","type":"behavioural","skill":"Problem Solving","timeLimit":120},
      {"id":3,"question":"What are your strongest technical skills?","type":"technical","skill":"Technical Skills","timeLimit":90},
      {"id":4,"question":"Tell me about a successful project you completed.","type":"behavioural","skill":"Achievement","timeLimit":120},
      {"id":5,"question":"What would you do if you missed a deadline?","type":"situational","skill":"Time Management","timeLimit":120},
      {"id":6,"question":"How do you stay updated with new technologies?","type":"technical","skill":"Learning","timeLimit":90},
      {"id":7,"question":"What would you do if you had to work with difficult team members?","type":"situational","skill":"Teamwork","timeLimit":120},
    ];
    res.json({ success: true, questions: fallback });
  }
});

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

module.exports = router;
