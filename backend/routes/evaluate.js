const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BASE_BIAS_CATEGORIES = [
  { name: "Age Discrimination",        words: ["age", "how old", "young", "old", "years old"] },
  { name: "Gender Discrimination",     words: ["gender", "male", "female", "woman", "man", "pregnant", "maternity"] },
  { name: "Race & Ethnicity",          words: ["race", "ethnicity", "color", "colour"] },
  { name: "Religion",                  words: ["religion", "religious", "church", "mosque", "temple", "faith"] },
  { name: "Nationality & Origin",      words: ["nationality", "country of origin", "immigrant"] },
  { name: "Disability",                words: ["disability", "disabled", "handicap", "mental illness"] },
  { name: "Family & Marital Status",   words: ["married", "marriage", "children", "kids", "family", "spouse", "divorced"] },
  { name: "Caste Discrimination",      words: ["caste", "subcaste"] },
  { name: "Sexual Orientation",        words: ["sexual orientation", "sexuality", "gay", "lesbian"] },
  { name: "Political Views",           words: ["political", "politics", "party", "vote"] },
  { name: "Appearance & Accent",       words: ["accent", "appearance", "looks", "height", "weight"] },
  { name: "Pregnancy Status",          words: ["pregnant", "pregnancy", "maternity", "paternity"] },
];

function buildBiasChecker(candidateName) {
  const categories = [...BASE_BIAS_CATEGORIES];
  const nameParts = (candidateName || "")
    .split(/[\s,]+/)
    .map(n => n.trim().toLowerCase())
    .filter(n => n.length > 1);

  if (nameParts.length > 0) {
    const displayNames = nameParts.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(", ");
    categories.push({
      name:  `Personal Name Reference (${displayNames})`,
      words: nameParts,
    });
  }

  return {
    categories,
    nameParts,
    check: function(text) {
      const lower     = text.toLowerCase();
      const triggered = [];
      const passed    = [];
      for (const cat of this.categories) {
        const foundWords = cat.words.filter(w => lower.includes(w));
        if (foundWords.length > 0) triggered.push({ category: cat.name, words: foundWords });
        else passed.push(cat.name);
      }
      return {
        filterName:        "Employment Law Discrimination Bias Filter",
        filterVersion:     "v1.0",
        totalCategories:   this.categories.length,
        passedCategories:  passed.length,
        flaggedCategories: triggered.length,
        passed:            triggered.length === 0,
        triggered,
        passed_list:       passed,
        complianceScore:   Math.round((passed.length / this.categories.length) * 100),
        candidateName:     candidateName || null,
        nameParts:         this.nameParts,
      };
    }
  };
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

    const { question, answer, skill, jobRole, candidateName } = req.body;
    const biasChecker = buildBiasChecker(candidateName);

    const prompt = `You are a fair, unbiased interview evaluator.
Job Role: ${jobRole.trim()}
Skill being tested: ${(skill || "General").substring(0, 100)}
Question: "${question.trim()}"
Candidate Answer: "${answer.trim()}"

Score 0 to 10 based ONLY on technical merit and communication quality.
IMPORTANT: Never address the candidate by name. Never comment on personal characteristics.
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

    const allText = [
      evaluation.summary, evaluation.idealAnswer,
      ...(evaluation.strengths || []), ...(evaluation.improvements || []),
    ].join(" ");

    const biasResult = biasChecker.check(allText);

    if (!biasResult.passed) {
      console.warn(`[ZTA-L12] [${biasResult.filterName}] Bias detected: ${biasResult.triggered.map(t => t.category).join(", ")}`);
    } else {
      console.log(`[ZTA-L12] [${biasResult.filterName}] All ${biasResult.totalCategories} categories passed — Score: ${biasResult.complianceScore}%`);
    }

    res.json({
      success: true, score, grade,
      summary:      evaluation.summary      || "",
      strengths:    evaluation.strengths    || [],
      improvements: evaluation.improvements || [],
      idealAnswer:  evaluation.idealAnswer  || "",
      biasCheck:    biasResult,
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

    const { jobRole, results, candidateName } = req.body;
    const avg          = results.reduce((s, r) => s + (Number(r.score) || 0), 0) / results.length;
    const overallScore = Math.round(avg * 10) / 10;
    const overallGrade = overallScore>=9?"Exceptional":overallScore>=7?"Good":overallScore>=5?"Average":overallScore>=3?"Weak":"Poor";
    const summary      = results.map((r, i) => `Q${i+1} ${(r.skill||"General").substring(0,50)}: ${r.score}/10`).join(", ");

    const allBiasResults = results.map(r => r.biasCheck).filter(Boolean);
    const totalFlags     = allBiasResults.reduce((s, b) => s + (b.flaggedCategories || 0), 0);
    const avgCompliance  = allBiasResults.length > 0
      ? Math.round(allBiasResults.reduce((s, b) => s + (b.complianceScore || 100), 0) / allBiasResults.length)
      : 100;

    const allTriggered = {};
    for (const b of allBiasResults) {
      for (const t of (b.triggered || [])) {
        const cat = typeof t === "string" ? t : t.category;
        allTriggered[cat] = (allTriggered[cat] || 0) + 1;
      }
    }

    const prompt = `You are a professional, unbiased hiring manager.
Candidate completed interview for: ${jobRole.trim()}
Scores: ${summary}
Overall: ${overallScore}/10 (${overallGrade})

Write a fair final evaluation. IMPORTANT: Never mention the candidate by name.
Respond ONLY with valid JSON. No markdown:
{"overallSummary":"2-3 sentence summary","strongSkills":["skill1","skill2"],"weakSkills":["skill1"],"recommendation":"Hire","recommendationReason":"one sentence reason","nextSteps":"one sentence advice"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }],
      temperature: 0.4, max_tokens: 500,
    });

    const raw    = response.choices[0].message.content.trim().replace(/```json|```/g, "");
    const report = JSON.parse(raw);

    res.json({
      success: true, overallScore, overallGrade, ...report,
      biasSummary: {
        filterName:                "Employment Law Discrimination Bias Filter",
        candidateName:             candidateName || null,
        overallCompliance:         avgCompliance,
        totalFlagsAcrossInterview: totalFlags,
        triggeredCategories:       allTriggered,
        status:                    totalFlags === 0 ? "FULLY COMPLIANT" : "FLAGS DETECTED",
        categoriesMonitored:       12 + (candidateName ? 1 : 0),
        nameProtectionActive:      !!candidateName,
      },
    });

  } catch (err) {
    console.error("[Final Report Error]", err.message);
    res.status(500).json({ error: "Failed to generate final report." });
  }
});

module.exports = router;
