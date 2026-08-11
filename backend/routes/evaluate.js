const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");
const axios   = require("axios");
const { checkCandidateAnswerHallucination } = require("../utils/hallucination-checker");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function askGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  }, { timeout: 30000 });
  return response.data.candidates[0].content.parts[0].text;
}

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
  { name: "Institutional Prestige",    words: ["tier 1 college", "ivy league", "elite college", "pedigree", "reputed institute"] },
  { name: "Socioeconomic & Location",  words: ["zipcode", "neighborhood", "salary history", "previous pay", "income background"] },
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

    const { question, answer, skill, jobRole, candidateName, resumeText } = req.body;
    const biasChecker = buildBiasChecker(candidateName);

    const prompt = `You are a fair, unbiased interview evaluator.
Job Role: ${jobRole.trim()}
Skill being tested: ${(skill || "General").substring(0, 100)}
Question: "${question.trim()}"
Candidate Answer: "${answer.trim()}"

Candidate Resume Reference:
"${(resumeText || "No resume text provided").substring(0, 3000)}"

SCORING & EVALUATION GUIDELINES:
- Score 0 to 10 based ONLY on technical merit, communication quality, and consistency with their resume.
- Cross-reference the candidate's answer with the provided Resume Reference.
- Verify that the skills, technologies, or achievements claimed in their answer match or align with their documented background in the resume. If there are contradictions or ungrounded claims, reflect this in the score and explain it under improvements.
- IMPORTANT: Never address the candidate by name. Never comment on personal characteristics.
- Give 2 specific strengths and 2 specific improvements.

Respond ONLY with valid JSON. No markdown:
{"score":7,"grade":"Good","summary":"one sentence summary","strengths":["strength 1","strength 2"],"improvements":["improvement 1","improvement 2"],"idealAnswer":"brief ideal answer"}`;

    let raw;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }],
        temperature: 0.4, max_tokens: 600,
      });
      raw = response.choices[0].message.content.trim();
    } catch (openAiError) {
      console.warn("[Evaluate] OpenAI failed, trying Gemini fallback:", openAiError.message);
      if (process.env.GEMINI_API_KEY) {
        raw = await askGemini(prompt);
      } else {
        throw openAiError;
      }
    }

    const cleaned    = raw.replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(cleaned);
    const score      = Math.min(10, Math.max(0, Number(evaluation.score) || 0));
    const grade      = score>=9?"Exceptional":score>=7?"Good":score>=5?"Average":score>=3?"Weak":"Poor";

    const allText = [
      question,
      answer,
      evaluation.summary,
      evaluation.idealAnswer,
      ...(evaluation.strengths || []),
      ...(evaluation.improvements || []),
    ].join(" ");

    const biasResult = biasChecker.check(allText);

    if (!biasResult.passed) {
      console.warn(`[ZTA-L12] [${biasResult.filterName}] Bias detected: ${biasResult.triggered.map(t => t.category).join(", ")}`);
    } else {
      console.log(`[ZTA-L12] [${biasResult.filterName}] All ${biasResult.totalCategories} categories passed — Score: ${biasResult.complianceScore}%`);
    }

    // ZTA Layer 13: Hallucination & Fact Verification
    const hallucinationResult = checkCandidateAnswerHallucination(answer, question, resumeText, req.body.hallucinationTypes);
    console.log(`[ZTA-L13] [${hallucinationResult.filterName}] Risk Score: ${hallucinationResult.hallucinationRiskScore}% (${hallucinationResult.truthfulnessGrade})`);

    res.json({
      success: true, score, grade,
      summary:            evaluation.summary      || "",
      strengths:          evaluation.strengths    || [],
      improvements:       evaluation.improvements || [],
      idealAnswer:        evaluation.idealAnswer  || "",
      biasCheck:          biasResult,
      hallucinationCheck: hallucinationResult,
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

    let raw;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }],
        temperature: 0.4, max_tokens: 500,
      });
      raw = response.choices[0].message.content.trim();
    } catch (openAiError) {
      console.warn("[Final Report] OpenAI failed, trying Gemini fallback:", openAiError.message);
      if (process.env.GEMINI_API_KEY) {
        raw = await askGemini(prompt);
      } else {
        throw openAiError;
      }
    }

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const report  = JSON.parse(cleaned);

    const allHallucinationResults = results.map(r => r.hallucinationCheck).filter(Boolean);
    const avgHallucinationRisk    = allHallucinationResults.length > 0
      ? Math.round(allHallucinationResults.reduce((s, h) => s + (h.hallucinationRiskScore || 0), 0) / allHallucinationResults.length)
      : 0;
    const totalHallucinationsFlagged = allHallucinationResults.reduce((s, h) => s + ((h.flaggedHallucinations || []).length), 0);
    const overallTruthfulnessGrade   = avgHallucinationRisk < 20 ? "Verified Factual" : avgHallucinationRisk < 50 ? "Mostly Grounded" : "High Hallucination Risk";

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
      hallucinationSummary: {
        filterName:                "ZTA-L13 Anti-Hallucination & Factuality Filter",
        avgHallucinationRisk,
        totalFlags:                totalHallucinationsFlagged,
        truthfulnessGrade:         overallTruthfulnessGrade,
        status:                    totalHallucinationsFlagged === 0 ? "VERIFIED FACTUAL" : "UNVERIFIED CLAIMS DETECTED",
        questionBreakdown:         results.map((r, i) => ({
          questionIndex: i + 1,
          skill: r.skill || "General",
          hallucinationRiskScore: r.hallucinationCheck?.hallucinationRiskScore || 0,
          truthfulnessGrade: r.hallucinationCheck?.truthfulnessGrade || "Verified Factual",
          flaggedCount: (r.hallucinationCheck?.flaggedHallucinations || []).length,
          flagged: r.hallucinationCheck?.flaggedHallucinations || []
        }))
      }
    });

  } catch (err) {
    console.error("[Final Report Error]", err.message);
    res.status(500).json({ error: "Failed to generate final report." });
  }
});

module.exports = router;
