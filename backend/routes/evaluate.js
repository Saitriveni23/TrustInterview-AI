const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BIAS_WORDS = ["age","gender","race","nationality","religion",
  "disability","accent","family","married","children"];

function checkBias(text) {
  const lower   = text.toLowerCase();
  const flagged = BIAS_WORDS.filter(w => lower.includes(w));
  return { clean: flagged.length === 0 };
}

router.post("/answer", async (req, res) => {
  try {
    const { question, answer, questionType, skill, jobRole } = req.body;
    if (!question || !answer || !jobRole)
      return res.status(400).json({ error: "question, answer and jobRole are required." });

    const prompt = `You are a fair interview evaluator.
Job Role: ${jobRole}
Skill being tested: ${skill || "General"}
Question: "${question}"
Candidate Answer: "${answer}"

Score 0 to 10 based ONLY on technical merit and communication.
Never comment on personal characteristics.
Give 2 specific strengths and 2 specific improvements.

Respond ONLY with valid JSON. No markdown:
{"score":7,"grade":"Good","summary":"one sentence summary","strengths":["strength 1","strength 2"],"improvements":["improvement 1","improvement 2"],"idealAnswer":"brief ideal answer"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 600,
    });

    const raw        = response.choices[0].message.content.trim().replace(/```json|```/g, "");
    const evaluation = JSON.parse(raw);
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
    res.status(500).json({ error: "Failed to evaluate answer." });
  }
});

router.post("/final-report", async (req, res) => {
  try {
    const { jobRole, results } = req.body;
    if (!jobRole || !Array.isArray(results))
      return res.status(400).json({ error: "jobRole and results are required." });

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
{"overallSummary":"2-3 sentence summary","strongSkills":["skill1","skill2"],"weakSkills":["skill1"],"recommendation":"Hire","recommendationReason":"one sentence reason","nextSteps":"one sentence advice"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 500,
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
