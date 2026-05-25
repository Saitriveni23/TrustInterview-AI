// ============================================================
// routes/evaluate.js — ZTA L5 + L8 + L12
// ============================================================

const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BIAS_WORDS = [
  "age", "gender", "race", "nationality", "religion",
  "disability", "accent", "family", "married", "children",
  "pregnant", "sexuality", "political",
];

function checkBias(text) {
  const lower   = text.toLowerCase();
  const flagged = BIAS_WORDS.filter(w => lower.includes(w));
  return { clean: flagged.length === 0, flagged };
}

function validateAnswerRequest(body) {
  const { question, answer, jobRole } = body;
  if (!question || typeof question !== "string" || question.trim().length < 5) return "question must be a non-empty string.";
  if (!answer   || typeof answer   !== "string" || answer.trim().length   < 2) return "answer must be a non-empty string.";
  if (!jobRole  || typeof jobRole  !== "string" || jobRole.trim().length  < 2) return "jobRole must be a non-empty string.";
  if (question.length > 1000) return "question must be under 1000 characters.";
  if (answer.length   > 5000) return "answer must be under 5000 characters.";
  if (jobRole.length  > 100)  return "jobRole must be under 100 characters.";
  return null;
}

function validateFinalReportRequest(body) {
  const { jobRole, results } = body;
  if (!jobRole || typeof jobRole !== "string") return "jobRole is required.";
  if (!Array.isArray(results) || results.length === 0) return "results must be a non-empty array.";
  if (results.length > 20) return "results array must not exceed 20 items.";
  return null;
}

router.post("/answer", async (req, res) => {
  try {
    const validationError = validateAnswerRequest(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { question, answer, skill, jobRole } = req.body;

    const prompt = `You are a fair, unbiased interview evaluator.
Job Role: ${jobRole.trim()}
Skill being tested: ${(skill || "General").substring(0, 100)}
Question: "${question.trim()}"
Candidate Answer: "${answer.trim()}"

Score 0 to 10 based ONLY on technical merit and communication quality.
Never comment on personal characteristics, appearance, or demographics.
Give 2 specific strengths and 2 specific improvements.

Respond ONLY with valid JSON. No markdown:
{"score":7,"grade":"Good","summary":"one sentence summary","strengths":["strength 1","strength 2"],"improvements":["improvement 1","improvement 2"],"idealAnswer":"brief ideal answer"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }],
      temperature: 0.4, max_tokens: 600,
    });

    const raw        = response.choices[0].message.content.trim().replace(/```json|```/g, "");
    const evaluation = JSON.parse(raw);
    const score      = Math.min(10, Math.max(0, Number(evaluation.score) || 0));
    const grade      = score>=9?"Exceptional":score>=7?"Good":score>=5?"Average":score>=3?"Weak":"Poor";

    const allText = [evaluation.summary, evaluation.idealAnswer, ...(evaluation.strengths||[]), ...(evaluation.improvements||[])].join(" ");
    const bias    = checkBias(allText);
    if (!bias.clean) console.warn(`[ZTA-L12] Bias in evaluation output: ${bias.flagged.join(", ")}`);

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
    res.status(500).json({ error: "Failed to evaluate answer." });
  }
});

router.post("/final-report", async (req, res) => {
  try {
    const validationError = validateFinalReportRequest(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { jobRole, results } = req.body;
    const avg          = results.reduce((s, r) => s + (Number(r.score) || 0), 0) / results.length;
    const overallScore = Math.round(avg * 10) / 10;
    const overallGrade = overallScore>=9?"Exceptional":overallScore>=7?"Good":overallScore>=5?"Average":overallScore>=3?"Weak":"Poor";
    const summary      = results.map((r, i) => `Q${i+1} ${(r.skill||"General").substring(0,50)}: ${r.score}/10`).join(", ");

    const prompt = `You are a professional, unbiased hiring manager.
Candidate completed interview for: ${jobRole.trim()}
Scores: ${summary}
Overall: ${overallScore}/10 (${overallGrade})

Write a fair final evaluation report. Never mention personal characteristics.
Respond ONLY with valid JSON. No markdown:
{"overallSummary":"2-3 sentence summary","strongSkills":["skill1","skill2"],"weakSkills":["skill1"],"recommendation":"Hire","recommendationReason":"one sentence reason","nextSteps":"one sentence advice"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }],
      temperature: 0.4, max_tokens: 500,
    });

    const raw    = response.choices[0].message.content.trim().replace(/```json|```/g, "");
    const report = JSON.parse(raw);

    res.json({ success: true, overallScore, overallGrade, ...report });

  } catch (err) {
    console.error("[Final Report Error]", err.message);
    res.status(500).json({ error: "Failed to generate final report." });
  }
});

module.exports = router;
