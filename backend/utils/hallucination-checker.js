/**
 * ZTA Layer 13 — Hallucination & Fact Verification Module
 * Evaluates candidate responses and AI-generated outputs for fake tech jargon,
 * impossible metrics, version anomalies, and contradictions against resumes.
 */

// Known fake / non-existent technical jargon and version anomalies
const IMPOSSIBLE_TECH_PATTERNS = [
  { pattern: /\bpython\s*4(\.\d+)?\b/i, reason: "Python 4.0 does not exist (Python 3.x is current major)." },
  { pattern: /\breact\s*(v)?(1[9-9]\.[5-9]|\d{2,})\b/i, reason: "Non-existent React version reference." },
  { pattern: /\bhtml\s*6\b/i, reason: "HTML6 is not a standard specification (HTML5/HTML Living Standard is used)." },
  { pattern: /\bcss\s*4\b/i, reason: "CSS4 does not exist as a monolithic version (CSS uses individual module levels)." },
  { pattern: /\bnode(\.js)?\s*v?(5[0-9]|[6-9]\d)\b/i, reason: "Node.js version number is far out of realistic range." },
  { pattern: /\bmongodb\s+sql\s+(join|query|select)\b/i, reason: "MongoDB is a NoSQL document database, not a SQL relational engine with SQL JOIN syntax." },
  { pattern: /\brelational\s+nosql\b/i, reason: "Contradictory terminology: Relational and NoSQL are mutually exclusive paradigms." },
  { pattern: /\bexpress(\.js)?\s*v?(1[5-9]|\d{2,})\b/i, reason: "Express.js version out of realistic range." },
  { pattern: /\bkubernetes\s*v?(10|\d{2,})\b/i, reason: "Kubernetes version reference out of realistic range." },
];

// Impossible percentage / metric claims
const IMPOSSIBLE_METRIC_PATTERNS = [
  { pattern: /reduced?\s+(latency|cost|bugs|downtime|errors)\s+by\s+(1[0-9]{2}|[2-9]\d{2}|\d{4,})\s*%/i, reason: "Cannot reduce metric by more than 100%." },
  { pattern: /increased?\s+(accuracy|uptime|reliability)\s+to\s+(10[1-9]|1[1-9]\d|[2-9]\d{2})\s*%/i, reason: "Percentage accuracy/uptime cannot exceed 100%." },
  { pattern: /(100|\d{3,})\s+years\s+of\s+experience/i, reason: "Unrealistic work experience duration claimed." },
  { pattern: /(trillion|quadrillion)\s+requests\s+per\s+second\s+on\s+a\s+(single|raspberry|laptop|server)/i, reason: "Physically impossible throughput claim for given hardware." }
];

// Common tech stack keywords for entity extraction
const COMMON_TECH_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang", "rust", "php", "ruby", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "nuxt", "svelte", "express", "node", "nodejs", "django", "flask", "fastapi", "spring",
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "sqlite", "oracle",
  "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform", "jenkins", "github actions", "ci/cd",
  "rest", "graphql", "grpc", "kafka", "rabbitmq", "web sockets", "microservices", "serverless",
  "html", "css", "tailwind", "bootstrap", "sass", "webpack", "vite", "git", "linux", "agile", "scrum"
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts tech stack keywords from a block of text.
 */
function extractTechTerms(text) {
  if (!text || typeof text !== "string") return [];
  const lower = text.toLowerCase();
  return COMMON_TECH_KEYWORDS.filter(term => {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return regex.test(lower);
  });
}

/**
 * Checks a candidate's answer for hallucinated technology claims, impossible metrics,
 * and cross-verifies against the candidate's resume (if provided).
 */
function checkCandidateAnswerHallucination(answer, question = "", resumeText = "", hallucinationTypes = { cv: true, context: true, facts: true }) {
  const text = (answer || "").trim();
  const flagged = [];
  const verified = [];

  if (!text) {
    return {
      filterName: "ZTA-L13 Anti-Hallucination & Factuality Filter",
      hallucinationRiskScore: 0,
      riskLevel: "LOW",
      truthfulnessGrade: "Verified Factual",
      passed: true,
      flaggedHallucinations: [],
      verifiedClaims: [],
      resumeMatchRate: 100,
      details: "No response text provided."
    };
  }

  // 1. Check for impossible technical patterns (Fake versions, contradictory jargon)
  if (hallucinationTypes.facts !== false) {
    for (const item of IMPOSSIBLE_TECH_PATTERNS) {
      if (item.pattern.test(text)) {
        const match = text.match(item.pattern);
        flagged.push({
          type: "Impossible Jargon / Version Anomaly",
          term: match ? match[0] : "Anomalous term",
          reason: item.reason,
          severity: "HIGH"
        });
      }
    }
  }

  // 2. Check for impossible metric claims
  if (hallucinationTypes.context !== false) {
    for (const item of IMPOSSIBLE_METRIC_PATTERNS) {
      if (item.pattern.test(text)) {
        const match = text.match(item.pattern);
        flagged.push({
          type: "Impossible Metric Claim",
          term: match ? match[0] : "Anomalous metric",
          reason: item.reason,
          severity: "HIGH"
        });
      }
    }
  }

  // 3. Entity extraction & Resume Grounding Check
  const answerTechTerms = extractTechTerms(text);
  const resumeTechTerms = extractTechTerms(resumeText);
  let unverifiedResumeClaims = 0;

  if (hallucinationTypes.cv !== false) {
    if (answerTechTerms.length > 0) {
      answerTechTerms.forEach(term => {
        const existsInResume = resumeTechTerms.includes(term) || !resumeText;
        if (existsInResume) {
          verified.push({ term, source: resumeText ? "Grounded in Resume" : "Standard Domain Tech" });
        } else {
          unverifiedResumeClaims++;
          flagged.push({
            type: "Unverified Resume Claim",
            term: term,
            reason: `Claimed experience with "${term}" which was not found in the uploaded resume.`,
            severity: "MEDIUM"
          });
        }
      });
    }
  }

  // 4. Calculate Risk Score (0 = Fully Grounded, 100 = High Risk)
  const highSeverityCount = flagged.filter(f => f.severity === "HIGH").length;
  const medSeverityCount = flagged.filter(f => f.severity === "MEDIUM").length;

  let riskScore = (highSeverityCount * 45) + (medSeverityCount * 20);
  riskScore = Math.min(100, Math.max(0, riskScore));

  const riskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW";
  const truthfulnessGrade = riskScore === 0 ? "Verified Factual" :
    riskScore < 30 ? "Mostly Grounded" :
    riskScore < 65 ? "Unverified Claims Detected" : "High Hallucination Risk";

  const resumeMatchRate = answerTechTerms.length > 0
    ? Math.round((verified.length / answerTechTerms.length) * 100)
    : 100;

  return {
    filterName: "ZTA-L13 Anti-Hallucination & Factuality Filter",
    hallucinationRiskScore: riskScore,
    riskLevel,
    truthfulnessGrade,
    passed: riskScore < 50,
    flaggedHallucinations: flagged,
    verifiedClaims: verified,
    resumeMatchRate,
    answerTechTerms,
    details: flagged.length === 0
      ? "All technical claims and metrics verified against ground truth."
      : `Flagged ${flagged.length} potential hallucination(s) or unverified claim(s).`
  };
}

/**
 * Audits AI-generated question array against resume facts to ensure zero AI hallucination.
 */
function auditAIQuestionsGrounding(questions, resumeText) {
  if (!Array.isArray(questions)) return { passed: true, auditLog: [] };

  const resumeTechs = extractTechTerms(resumeText);
  const auditLog = questions.map(q => {
    const qTechs = extractTechTerms(q.question);
    const ungroundedTechs = qTechs.filter(t => !resumeTechs.includes(t));
    return {
      id: q.id,
      question: q.question,
      grounded: ungroundedTechs.length === 0 || resumeTechs.length === 0,
      ungroundedTechs
    };
  });

  const allGrounded = auditLog.every(a => a.grounded);
  return {
    passed: allGrounded,
    auditLog
  };
}

module.exports = {
  checkCandidateAnswerHallucination,
  auditAIQuestionsGrounding,
  extractTechTerms
};
