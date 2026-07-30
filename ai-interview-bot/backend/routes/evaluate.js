// ============================================================
// backend/routes/evaluate.js
// ============================================================
// This file handles:
//   1. Receiving a question + candidate's answer
//   2. Sending both to OpenAI to score the answer
//   3. Running a bias check on the AI's evaluation
//   4. Sending back score, feedback, and bias result
//   5. Generating a final overall report after all questions
// ============================================================

const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 10 — Input Validation
// ─────────────────────────────────────────────
function validateAnswerInput(question, answer, jobRole) {
  const errors = [];
  if (!question || typeof question !== "string")
    errors.push("Question is missing.");
  if (!answer || typeof answer !== "string")
    errors.push("Answer is missing.");
  if (answer && answer.trim().length < 5)
    errors.push("Answer is too short to evaluate.");
  if (answer && answer.length > 5000)
    errors.push("Answer is too long. Max 5000 characters.");
  if (!jobRole || typeof jobRole !== "string")
    errors.push("Job role is missing.");
  return errors;
}

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 11 — Bias Check on Evaluation
// The AI's evaluation itself is checked for bias.
// If the AI feedback mentions gender, race, age
// etc. we flag it and strip those parts out.
// ─────────────────────────────────────────────
const BIAS_WORDS = [
  "age", "old", "young", "gender", "male", "female",
  "race", "ethnicity", "nationality", "religion",
  "disability", "accent", "background", "family",
  "married", "children", "pregnant",
];

function checkEvaluationBias(text) {
  const lower = text.toLowerCase();
  const flagged = BIAS_WORDS.filter((w) => lower.includes(w));
  return { clean: flagged.length === 0, flaggedWords: flagged };
}

// ─────────────────────────────────────────────
// POST /api/evaluate/answer
// Frontend sends:
//   { question, answer, questionType, skill, jobRole }
// Backend returns:
//   { score, grade, feedback, strengths,
//     improvements, biasCheck }
// ─────────────────────────────────────────────
router.post("/answer", async (req, res) => {
  try {
    const { question, answer, questionType, skill, jobRole } = req.body;

    // Step 1 — Validate inputs
    const errors = validateAnswerInput(question, answer, jobRole);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(" ") });
    }

    console.log(`[Evaluate] Scoring answer for: ${skill || "General"} - evaluate.js:73`);

    // Step 2 — Build evaluation prompt
    const prompt = `
You are a fair, professional interview evaluator.

Evaluate the candidate's answer to this interview question.

Job Role: ${jobRole}
Question Type: ${questionType || "general"}
Skill being tested: ${skill || "General"}

Question:
"${question}"

Candidate's Answer:
"${answer.trim()}"

SCORING RULES:
- Score from 0 to 10.
- 9-10: Exceptional — detailed, accurate, excellent examples.
- 7-8:  Good — covers the main points, mostly correct.
- 5-6:  Average — partially answers, lacks depth or examples.
- 3-4:  Weak — vague or missing key points.
- 0-2:  Poor — off topic, very incorrect, or blank.

EVALUATION RULES:
- Base your evaluation ONLY on technical merit and communication.
- Never comment on the candidate's gender, age, race, nationality,
  accent, family situation, or any personal characteristics.
- Be constructive and specific. Reference what they said.
- Give 2 specific strengths and 2 specific areas to improve.
- Keep feedback professional and encouraging.

Respond ONLY with valid JSON. No markdown, no extra text.
Use exactly this format:
{
  "score": 7,
  "grade": "Good",
  "summary": "One sentence overall summary of the answer.",
  "strengths": [
    "First specific strength from their answer.",
    "Second specific strength from their answer."
  ],
  "improvements": [
    "First specific area they could improve.",
    "Second specific area they could improve."
  ],
  "idealAnswer": "A brief example of what a strong answer would include."
}`;

    // Step 3 — Call OpenAI
    const response = await openai.chat.completions.create({
      model:    "gpt-3.5-turbo",
      messages: [
        {
          role:    "system",
          content: "You are a fair interview evaluator. Respond with valid JSON only. No markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4, // Lower = more consistent scoring
      max_tokens:  800,
    });

    const rawText = response.choices[0].message.content.trim();

    // Step 4 — Parse the JSON response
    let evaluation;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      evaluation = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Evaluate] Failed to parse OpenAI response: - evaluate.js:146", rawText);
      return res.status(500).json({
        error: "AI returned an unexpected format. Please try again.",
      });
    }

    // Step 5 — Bias check on the evaluation text
    // Combine all text fields and check them together
    const allEvalText = [
      evaluation.summary       || "",
      evaluation.idealAnswer   || "",
      ...(evaluation.strengths    || []),
      ...(evaluation.improvements || []),
    ].join(" ");

    const biasResult = checkEvaluationBias(allEvalText);

    if (!biasResult.clean) {
      console.warn(
        `[Bias] Evaluation flagged for: ${biasResult.flaggedWords.join(", ")}`
      );
    }

    // Step 6 — Map numeric score to grade label
    const score = Math.min(10, Math.max(0, Number(evaluation.score) || 0));
    let grade = "Poor";
    if (score >= 9)      grade = "Exceptional";
    else if (score >= 7) grade = "Good";
    else if (score >= 5) grade = "Average";
    else if (score >= 3) grade = "Weak";

    // Step 7 — Send result back to frontend
    res.json({
      success:      true,
      score:        score,
      grade:        grade,
      summary:      evaluation.summary      || "",
      strengths:    evaluation.strengths    || [],
      improvements: evaluation.improvements || [],
      idealAnswer:  evaluation.idealAnswer  || "",
      biasCheck: {
        passed:       biasResult.clean,
        flaggedWords: biasResult.flaggedWords,
      },
    });

  } catch (err) {
    console.error(`[Evaluate Error] ${err.message} - evaluate.js:193`);
    if (err.message && err.message.includes("API key")) {
      return res.status(500).json({
        error: "OpenAI API key is invalid. Check your .env file.",
      });
    }
    res.status(500).json({
      error: "Failed to evaluate answer. Please try again.",
    });
  }
});

// ─────────────────────────────────────────────
// POST /api/evaluate/final-report
// Called after ALL questions are answered.
// Frontend sends:
//   { jobRole, results: [ { question, score,
//     grade, skill, type }, ... ] }
// Backend returns:
//   { overallScore, overallGrade, summary,
//     strongSkills, weakSkills, recommendation }
// ─────────────────────────────────────────────
router.post("/final-report", async (req, res) => {
  try {
    const { jobRole, results } = req.body;

    if (!jobRole || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        error: "jobRole and results array are required.",
      });
    }

    console.log(`[Final Report] Generating for ${results.length} answers - evaluate.js:225`);

    // Calculate overall score as average of all question scores
    const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
    const overallScore = Math.round((totalScore / results.length) * 10) / 10;

    let overallGrade = "Poor";
    if (overallScore >= 9)      overallGrade = "Exceptional";
    else if (overallScore >= 7) overallGrade = "Good";
    else if (overallScore >= 5) overallGrade = "Average";
    else if (overallScore >= 3) overallGrade = "Weak";

    // Build a summary of all results to send to AI
    const resultsSummary = results
      .map(
        (r, i) =>
          `Q${i + 1} [${r.type || "general"}] Skill: ${r.skill || "General"} — Score: ${r.score}/10 (${r.grade})`
      )
      .join("\n");

    // Build the final report prompt
    const prompt = `
You are a professional hiring manager.

A candidate just completed an interview for the role of: ${jobRole}

Here are their scores per question:
${resultsSummary}

Overall average score: ${overallScore}/10 (${overallGrade})

Write a final interview report. Be fair, specific, and constructive.
Never mention gender, age, race, nationality, or personal characteristics.

Respond ONLY with valid JSON. No markdown. Use exactly this format:
{
  "overallSummary": "2-3 sentence summary of how the candidate performed overall.",
  "strongSkills": ["Skill 1", "Skill 2"],
  "weakSkills": ["Skill 1", "Skill 2"],
  "recommendation": "Hire" or "Consider" or "Reject",
  "recommendationReason": "One sentence reason for the recommendation.",
  "nextSteps": "One sentence advice for the candidate on what to do next."
}`;

    const response = await openai.chat.completions.create({
      model:    "gpt-3.5-turbo",
      messages: [
        {
          role:    "system",
          content: "You are a fair hiring manager. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens:  600,
    });

    const rawText = response.choices[0].message.content.trim();

    let report;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      report = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Final Report] Parse error: - evaluate.js:289", rawText);
      return res.status(500).json({
        error: "AI returned unexpected format. Please try again.",
      });
    }

    // Bias check the final report too
    const reportText = [
      report.overallSummary       || "",
      report.recommendationReason || "",
      report.nextSteps            || "",
    ].join(" ");

    const biasResult = checkEvaluationBias(reportText);
    if (!biasResult.clean) {
      console.warn(
        `[Bias] Final report flagged for: ${biasResult.flaggedWords.join(", ")}`
      );
    }

    res.json({
      success:              true,
      overallScore:         overallScore,
      overallGrade:         overallGrade,
      overallSummary:       report.overallSummary       || "",
      strongSkills:         report.strongSkills         || [],
      weakSkills:           report.weakSkills           || [],
      recommendation:       report.recommendation       || "Consider",
      recommendationReason: report.recommendationReason || "",
      nextSteps:            report.nextSteps            || "",
      biasCheck: {
        passed:       biasResult.clean,
        flaggedWords: biasResult.flaggedWords,
      },
    });

  } catch (err) {
    console.error(`[Final Report Error] ${err.message} - evaluate.js:326`);
    res.status(500).json({
      error: "Failed to generate final report. Please try again.",
    });
  }
});

module.exports = router;
