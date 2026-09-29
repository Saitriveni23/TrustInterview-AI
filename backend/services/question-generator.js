const axios = require("axios");

function fallbackQuestions(target, report) {
  const title = target.title || "the selected role";
  const matched = report.matchedCriteria.slice(0, 3);
  const missing = report.missingCriteria.slice(0, 2);
  const prompts = [
    ...matched.map((skill) => `Your resume mentions ${skill}. Describe a difficult implementation decision you made while using it.`),
    ...missing.map((skill) => `For a ${title} position, how would you approach a task that requires ${skill}?`),
    `Walk through the architecture of the project on your resume that is most relevant to ${title}.`,
    "Describe a technical failure you encountered, how you diagnosed it, and what you changed afterward.",
    `If a critical ${title} deliverable were at risk, how would you communicate and prioritize the recovery work?`,
    "Describe a disagreement about a technical approach and how the team reached a decision.",
  ];
  const types = ["technical", "technical", "technical", "behavioural", "situational", "behavioural", "situational"];
  return [...new Set(prompts)].slice(0, 7).map((question, index) => ({
    id: index + 1,
    question,
    type: types[index] || "situational",
    skill: matched[index] || title,
    timeLimit: index < 3 ? 90 : 120,
  }));
}

async function generateQuestions(resumeText, target, report) {
  const fallback = fallbackQuestions(target, report);
  if (!process.env.GEMINI_API_KEY) return { questions: fallback, generator: "deterministic-fallback", metadata: { reason: "AI_NOT_CONFIGURED" } };
  const prompt = `Generate exactly seven fair mock-interview questions grounded in the resume and the target role. Do not ask about protected personal characteristics. Return only a JSON array with id, question, type, skill, and timeLimit.\nTarget: ${JSON.stringify(target)}\nATS evidence: ${JSON.stringify(report.evidence)}\nResume: ${resumeText.slice(0, 5000)}`;
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } },
      { timeout: 30_000 }
    );
    const raw = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const questions = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!Array.isArray(questions) || questions.length !== 7 || questions.some((item) => !item.question)) throw new Error("Invalid AI response");
    return { questions, generator: "gemini", metadata: { model } };
  } catch (error) {
    return { questions: fallback, generator: "deterministic-fallback", metadata: { reason: "AI_GENERATION_FAILED" } };
  }
}

async function generateAdvice(resumeText, target, report) {
  if (!process.env.GEMINI_API_KEY) return { advice: [], unavailable: true };
  const prompt = `Give three concise, factual resume improvement actions for this mock ATS report. Do not change or invent a score. Return only a JSON array of strings.\nTarget: ${target.title}\nReport: ${JSON.stringify(report)}\nResume: ${resumeText.slice(0, 4000)}`;
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } },
      { timeout: 20_000 }
    );
    const advice = JSON.parse((response.data.candidates?.[0]?.content?.parts?.[0]?.text || "[]").replace(/```json|```/g, "").trim());
    return Array.isArray(advice) ? { advice: advice.slice(0, 5), unavailable: false } : { advice: [], unavailable: true };
  } catch (_) {
    return { advice: [], unavailable: true };
  }
}

module.exports = { generateQuestions, generateAdvice, fallbackQuestions };
