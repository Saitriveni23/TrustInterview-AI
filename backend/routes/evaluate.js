const express = require("express");
const router  = express.Router();
const axios   = require("axios");

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2:1b";

const BIAS_WORDS = ["age","gender","race","nationality","religion",
  "disability","accent","family","married","children"];

function checkBias(text) {
  const lower   = text.toLowerCase();
  const flagged = BIAS_WORDS.filter(w => lower.includes(w));
  return { clean: flagged.length === 0 };
}

async function askOllama(prompt) {
  const response = await axios.post(OLLAMA_URL, {
    model:  MODEL,
    prompt: prompt,
    stream: false,
  }, { timeout: 60000 });
  return response.data.response;
}

router.post("/answer", async (req, res) => {
  try {
    const { question, answer, questionType, skill, jobRole } = req.body;
    if (!question || !answer || !jobRole)
      return res.status(400).json({ error: "question, answer and jobRole are required." });

    const prompt = `You are a fair interview evaluator.
Job Role: ${jobRole}
Skill: ${skill || "General"}
Question: "${question}"
Candidate Answer: "${answer}"

Score 0 to 10 based ONLY on technical merit and communication.
Never comment on personal characteristics.
Give 2 specific strengths and 2 specific improvements.

Respond ONLY with valid JSON. No markdown. No explanation:
{"score":7,"grade":"Good","summary":"one sentence","strengths":["point 1","point 2"],"improvements":["point 1","point 2"],"idealAnswer":"brief ideal answer"}`;

    const raw        = await askOllama(prompt);
    const jsonMatch  = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse evaluation");

    const evaluation = JSON.parse(jsonMatch[0]);
    const score      = Math.min(10, Math.max(0, Number(evaluation.score) || 0));
    const grade      = score>=9?"Exceptional":score>=7?"Good":score>=5?"Average":score>=3?"Weak":"Poor";
    const allText    = [evaluation.summary, evaluation.idealAnswer, ...(evaluation.strengths||[]), ...(evaluation.improvements||[])].join(" ");
    const bias       = checkBias(allText);

    res.json({
      success: true, score, grade,
      summary:      evaluation.summary      || "",
      strengths:    evaluation.strengths    || [],
      improvements: evaluation.improvements || [],
      idealAnswer:  evaluation.idealAnswer  || "",
      biasCheck:    { passed: bias.clean },
    });

  } catch (err) {
    console.error("[Evaluate Error]", err.message);
    res.status(500).json({ error: "Failed to evaluate. Make sure Ollama is running: ollama serve" });
  }
});

router.post("/final-report", async (req, res) => {
  try {
    const { jobRole, results } = req.body;
    if (!jobRole || !Array.isArray(results))
      return res.status(400).json({ error: "jobRole and results required." });

    const avg          = results.reduce((s, r) => s + (r.score || 0), 0) / results.length;
    const overallScore = Math.round(avg * 10) / 10;
    const overallGrade = overallScore>=9?"Exceptional":overallScore>=7?"Good":overallScore>=5?"Average":overallScore>=3?"Weak":"Poor";
    const summary      = results.map((r,i) => `Q${i+1} ${r.skill||"General"}: ${r.score}/10`).join(", ");

    const prompt = `You are a professional hiring manager.
Candidate completed interview for: ${jobRole}
Scores: ${summary}
Overall: ${overallScore}/10 (${overallGrade})

Write a fair final report. Never mention personal characteristics.
Respond ONLY with valid JSON. No markdown:
{"overallSummary":"2-3 sentences","strongSkills":["skill1","skill2"],"weakSkills":["skill1"],"recommendation":"Hire","recommendationReason":"one sentence","nextSteps":"one sentence"}`;

    const raw     = await askOllama(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse report");

    const report = JSON.parse(jsonMatch[0]);
    res.json({ success: true, overallScore, overallGrade, ...report });

  } catch (err) {
    console.error("[Final Report Error]", err.message);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

module.exports = router;
