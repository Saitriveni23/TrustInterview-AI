const express    = require("express");
const router     = express.Router();
const OpenAI     = require("openai");
const axios      = require("axios");
const { checkCandidateAnswerHallucination } = require("../utils/hallucination-checker");
const { withRetry } = require("../utils/retry");

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

async function askOllama(prompt, modelName = "llama-3-edge") {
  const ollamaModel = modelName === "llama-3-edge" ? "llama3.2:1b" : "phi3";
  console.log(`[ZTA-LLM] Evaluating answer on Ollama Model: ${ollamaModel}`);
  const response = await axios.post(OLLAMA_URL, {
    model:  ollamaModel,
    prompt: prompt,
    stream: false,
  }, { timeout: 30000 });
  return response.data.response;
}

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

function analyzeSpeech(text) {
  const fillers = ["uhm", "uh", "um", "like", "basically", "actually", "you know", "so", "right"];
  const counts = {};
  let totalFillers = 0;
  
  const words = (text || "").toLowerCase().split(/[\s,?.!]+/);
  const wordCount = words.filter(w => w.length > 0).length;
  
  for (const filler of fillers) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      counts[filler] = matches.length;
      totalFillers += matches.length;
    }
  }

  const density = wordCount > 0 ? (totalFillers / wordCount) * 100 : 0;
  const clarityScore = Math.max(1.0, Math.min(10.0, 10.0 - (totalFillers * 0.8)));

  return {
    fillerWords: counts,
    fillerCount: totalFillers,
    clarityScore: parseFloat(clarityScore.toFixed(1)),
    density: parseFloat(density.toFixed(1)),
    wordCount
  };
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

    // ── Cloud LLM call with exponential backoff retry ──────────────
    async function callCloudLLM(promptText) {
      // 1. Try OpenAI with retries
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY") {
        try {
          return await withRetry(async () => {
            const response = await openai.chat.completions.create({
              model: "gpt-3.5-turbo", messages: [{ role: "user", content: promptText }],
              temperature: 0.4, max_tokens: 600,
            });
            return response.choices[0].message.content.trim();
          }, 3, 300);
        } catch (openAiErr) {
          console.warn("[Evaluate] OpenAI failed after 3 retries, trying Gemini:", openAiErr.message);
        }
      }
      // 2. Gemini fallback with retries
      if (process.env.GEMINI_API_KEY) {
        return await withRetry(() => askGemini(promptText), 3, 400);
      }
      throw new Error("No cloud LLM available");
    }

    // ── Primary LLM selection ───────────────────────────────────────
    let raw;
    const modelToUse = req.body.llmModel || "llama-3-edge";
    if (modelToUse === "llama-3-edge" || modelToUse === "phi-3-lightweight") {
      try {
        raw = await withRetry(() => askOllama(prompt, modelToUse), 2, 200);
      } catch (ollamaErr) {
        console.warn("[Evaluate] Local Ollama failed after retries, falling back to cloud:", ollamaErr.message);
      }
    }

    if (!raw) {
      raw = await callCloudLLM(prompt);
    }

    // ── Multi-sample scoring: ask twice, average scores ─────────────
    let evaluation;
    try {
      const cleaned1 = raw.replace(/```json|```/g, "").trim();
      evaluation     = JSON.parse(cleaned1);

      // Second sample for score consistency (use same cloud model)
      const shouldMultiSample = req.body.multiSample !== false; // opt-out via flag
      if (shouldMultiSample) {
        try {
          const raw2      = await callCloudLLM(prompt);
          const cleaned2  = raw2.replace(/```json|```/g, "").trim();
          const eval2     = JSON.parse(cleaned2);
          const score1    = Number(evaluation.score) || 0;
          const score2    = Number(eval2.score) || 0;
          const avgScore  = Math.round(((score1 + score2) / 2) * 10) / 10;
          console.log(`[Evaluate] Multi-sample scores: ${score1} + ${score2} → avg ${avgScore}`);
          evaluation.score = avgScore;
          // Merge strengths/improvements from both samples (deduplicate)
          const merge = (a, b) => [...new Set([...(a||[]), ...(b||[])])].slice(0, 4);
          evaluation.strengths    = merge(evaluation.strengths,    eval2.strengths);
          evaluation.improvements = merge(evaluation.improvements, eval2.improvements);
        } catch (multiErr) {
          console.warn("[Evaluate] Multi-sample 2nd call failed — using single sample:", multiErr.message);
        }
      }
    } catch (parseErr) {
      throw new Error("LLM returned invalid JSON: " + parseErr.message);
    }

    const score = Math.min(10, Math.max(0, Number(evaluation.score) || 0));
    const grade = score>=9?"Exceptional":score>=7?"Good":score>=5?"Average":score>=3?"Weak":"Poor";

    // ── Judge0 Code Execution (for code-type answers) ──────────────
    let codeExecutionResult = null;
    const isCodeAnswer = req.body.answerType === "code" && process.env.JUDGE0_API_KEY;
    if (isCodeAnswer) {
      try {
        const judge0Res = await withRetry(async () => {
          const sub = await axios.post(
            `https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true`,
            { source_code: answer, language_id: req.body.codeLanguageId || 63, stdin: "" },
            { headers: { "X-RapidAPI-Key": process.env.JUDGE0_API_KEY, "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com", "Content-Type": "application/json" }, timeout: 10000 }
          );
          return sub.data;
        }, 2, 500);
        codeExecutionResult = {
          status:   judge0Res.status?.description || "Unknown",
          stdout:   judge0Res.stdout?.substring(0, 500) || "",
          stderr:   judge0Res.stderr?.substring(0, 300) || "",
          time:     judge0Res.time,
          memory:   judge0Res.memory,
          passed:   judge0Res.status?.id === 3, // 3 = Accepted
        };
        console.log(`[ZTA-Eval] Code execution: ${codeExecutionResult.status}`);
      } catch (judgeErr) {
        console.warn("[Evaluate] Judge0 code execution failed:", judgeErr.message);
      }
    }

    const allText = [
      question, answer, evaluation.summary, evaluation.idealAnswer,
      ...(evaluation.strengths || []), ...(evaluation.improvements || []),
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

    const speechResult = analyzeSpeech(answer);

    res.json({
      success: true, score, grade,
      summary:            evaluation.summary      || "",
      strengths:          evaluation.strengths    || [],
      improvements:       evaluation.improvements || [],
      idealAnswer:        evaluation.idealAnswer  || "",
      biasCheck:          biasResult,
      hallucinationCheck: hallucinationResult,
      codeExecution:      codeExecutionResult,
      multiSampled:       req.body.multiSample !== false,
      speechAnalysis:     speechResult,
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
    const modelToUse = req.body.llmModel || "llama-3-edge";
    if (modelToUse === "llama-3-edge" || modelToUse === "phi-3-lightweight") {
      try {
        raw = await askOllama(prompt, modelToUse);
      } catch (ollamaErr) {
        console.warn("[Final Report] Local Ollama failed, falling back to cloud models:", ollamaErr.message);
      }
    }

    if (!raw) {
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
