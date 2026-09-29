const SCORING_VERSION = "ats-v1.0.0";

const SKILL_ALIASES = {
  javascript: ["javascript", "js", "node.js", "nodejs", "react"],
  typescript: ["typescript", "ts"],
  python: ["python", "python3"],
  java: ["java", "spring", "spring boot"],
  "machine learning": ["machine learning", "ml", "scikit-learn", "sklearn", "xgboost"],
  "data analysis": ["data analysis", "analytics", "pandas", "data visualization"],
  "data structures": ["data structures", "dsa"],
  algorithms: ["algorithms", "algorithmic"],
  "ci/cd": ["ci/cd", "continuous integration", "github actions", "jenkins"],
  cloud: ["cloud", "aws", "azure", "gcp", "google cloud"],
  security: ["cybersecurity", "security", "application security", "information security"],
  networking: ["networking", "tcp/ip", "dns", "routing"],
  "power bi": ["power bi", "powerbi"],
};

function clean(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#./\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function aliasesFor(skill) {
  const normalized = clean(skill);
  const direct = SKILL_ALIASES[normalized] || [];
  const reverse = Object.entries(SKILL_ALIASES).find(([, aliases]) => aliases.includes(normalized));
  return [...new Set([normalized, ...direct, ...(reverse ? [reverse[0], ...reverse[1]] : [])])].filter(Boolean);
}

function hasSkill(text, skill) {
  const normalizedText = ` ${clean(text)} `;
  return aliasesFor(skill).some((alias) => normalizedText.includes(` ${alias} `) || normalizedText.includes(`${alias}.`));
}

function evidenceFor(text, criterion) {
  const aliases = aliasesFor(criterion);
  const segments = String(text).split(/\n+|(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  const match = segments.find((segment) => aliases.some((alias) => clean(segment).includes(alias)));
  return match ? match.slice(0, 240) : null;
}

function normalizeWeights(weights = {}) {
  const result = {
    technical: Number(weights.technical ?? 50),
    experience: Number(weights.experience ?? 30),
    academic: Number(weights.academic ?? 20),
  };
  if (Object.values(result).some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("ATS weights must be numbers from 0 to 100");
  }
  if (Math.abs(result.technical + result.experience + result.academic - 100) > 0.001) {
    throw new Error("ATS weights must total 100");
  }
  return result;
}

function calculateAtsScore(resumeText, target) {
  if (!resumeText || String(resumeText).trim().length < 20) throw new Error("Resume text is too short to score");
  const required = Array.isArray(target.required_skills) ? target.required_skills : [];
  const preferred = Array.isArray(target.preferred_skills) ? target.preferred_skills : [];
  const weights = normalizeWeights(target.weights);
  const requiredMatches = required.filter((skill) => hasSkill(resumeText, skill));
  const preferredMatches = preferred.filter((skill) => hasSkill(resumeText, skill));
  const requiredCoverage = required.length ? requiredMatches.length / required.length : 1;
  const preferredCoverage = preferred.length ? preferredMatches.length / preferred.length : 1;
  const technicalScore = Math.round((requiredCoverage * 80 + preferredCoverage * 20) * 100) / 100;

  const years = [...String(resumeText).matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi)]
    .map((match) => Number(match[1])).filter((value) => value <= 50);
  const detectedYears = years.length ? Math.max(...years) : 0;
  const projectSignals = (String(resumeText).match(/\b(project|internship|experience|developed|built|implemented|deployed|led)\b/gi) || []).length;
  const minimumYears = Number(target.min_experience_years || 0);
  const yearsRatio = minimumYears > 0 ? Math.min(1, detectedYears / minimumYears) : 1;
  const projectRatio = Math.min(1, projectSignals / 5);
  const experienceScore = Math.round((yearsRatio * 60 + projectRatio * 40) * 100) / 100;

  const academic = target.academic_expectations || {};
  const cgpaMatches = [...String(resumeText).matchAll(/(?:cgpa|gpa|pointer)\s*[:=-]?\s*(\d+(?:\.\d+)?)/gi)];
  const cgpa = cgpaMatches.length ? Math.max(...cgpaMatches.map((match) => Number(match[1])).filter((value) => value <= 10)) : null;
  const minCgpa = Number(academic.minCgpa || 0);
  const educationKeywords = Array.isArray(academic.keywords) ? academic.keywords : [];
  const educationMatches = educationKeywords.filter((keyword) => hasSkill(resumeText, keyword));
  const cgpaScore = minCgpa > 0 ? (cgpa === null ? 0 : Math.min(100, (cgpa / minCgpa) * 100)) : 100;
  const educationScore = educationKeywords.length ? (educationMatches.length / educationKeywords.length) * 100 : 100;
  const academicScore = Math.round((cgpaScore * 0.7 + educationScore * 0.3) * 100) / 100;

  const breakdown = { technical: technicalScore, experience: experienceScore, academic: academicScore, weights };
  const overallScore = Math.round((
    technicalScore * weights.technical / 100 +
    experienceScore * weights.experience / 100 +
    academicScore * weights.academic / 100
  ) * 100) / 100;
  const matchedCriteria = [...requiredMatches, ...preferredMatches, ...educationMatches];
  const missingCriteria = [...required.filter((skill) => !requiredMatches.includes(skill)), ...preferred.filter((skill) => !preferredMatches.includes(skill))];
  const evidence = matchedCriteria.map((criterion) => ({ criterion, excerpt: evidenceFor(resumeText, criterion) })).filter((item) => item.excerpt);

  return {
    scoringVersion: SCORING_VERSION,
    overallScore,
    breakdown,
    matchedCriteria: [...new Set(matchedCriteria)],
    missingCriteria: [...new Set(missingCriteria)],
    evidence,
    facts: { detectedYears, projectSignals, cgpa },
  };
}

module.exports = { SCORING_VERSION, calculateAtsScore, normalizeWeights, hasSkill };
