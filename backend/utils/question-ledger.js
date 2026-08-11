const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const LEDGER_PATH = path.join(__dirname, "../question-ledger.json");

function loadLedger() {
  if (!fs.existsSync(LEDGER_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveLedger(ledger) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf-8");
}

function hashQuestion(questionText) {
  return crypto
    .createHash("sha256")
    .update(questionText.trim().toLowerCase())
    .digest("hex")
    .substring(0, 16);
}

/**
 * Returns the list of question texts a candidate has already seen.
 */
function getSeenQuestions(email) {
  const ledger = loadLedger();
  const key = email.toLowerCase().trim();
  return ledger[key]?.questions || [];
}

/**
 * Marks a batch of questions as seen by the candidate.
 */
function markQuestionsSeen(email, questions) {
  const ledger = loadLedger();
  const key    = email.toLowerCase().trim();

  if (!ledger[key]) {
    ledger[key] = { questions: [], hashes: [], totalSessions: 0 };
  }

  ledger[key].totalSessions = (ledger[key].totalSessions || 0) + 1;
  ledger[key].lastSession   = new Date().toISOString();

  questions.forEach(q => {
    const text = q.question;
    const hash = hashQuestion(text);
    if (!ledger[key].hashes.includes(hash)) {
      ledger[key].hashes.push(hash);
      ledger[key].questions.push(text);
    }
  });

  // Keep only last 100 to prevent unbounded growth
  if (ledger[key].hashes.length > 100) {
    const excess = ledger[key].hashes.length - 100;
    ledger[key].hashes    = ledger[key].hashes.slice(excess);
    ledger[key].questions = ledger[key].questions.slice(excess);
  }

  saveLedger(ledger);
}

/**
 * Returns leaderboard data sorted by best score.
 */
function getLeaderboard(filterCompany = "") {
  const ledger = loadLedger();
  const USERS_PATH = path.join(__dirname, "../registered-users.json");

  // Load registered users from backend database
  let registered = [];
  if (fs.existsSync(USERS_PATH)) {
    try {
      registered = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
    } catch (_) {}
  }

  // Filter out any admin/recruiter roles (we only want candidate rosters)
  const candidates = registered.filter(u => u.role !== "admin");

  const merged = [];

  for (const user of candidates) {
    const key = user.email.toLowerCase().trim();
    const data = ledger[key] || {};
    const sessions = data.sessions || [];
    
    // Filter sessions by company if a company filter is specified
    const filteredSessions = filterCompany && filterCompany.toLowerCase().trim() !== "general"
      ? sessions.filter(s => s.company && s.company.toLowerCase().trim() === filterCompany.toLowerCase().trim())
      : sessions;
      
    const totalSessions = filteredSessions.length;
    const bestScore = totalSessions > 0 ? Math.max(...filteredSessions.map(s => s.score)) : 0;
    const avgScore = totalSessions > 0 ? parseFloat((filteredSessions.reduce((sum, s) => sum + s.score, 0) / totalSessions).toFixed(2)) : 0;
    const lastSession = totalSessions > 0 ? filteredSessions[totalSessions - 1].date : (user.registeredAt || "");
    const lastCompany = totalSessions > 0 ? filteredSessions[totalSessions - 1].company : "";

    merged.push({
      email:         user.email,
      name:          data.name || user.name || user.email.split("@")[0],
      totalSessions,
      bestScore,
      avgScore,
      lastSession,
      interviewCompany: lastCompany, // Show which company they interviewed for
    });
  }

  // Backward compatibility: add any ledger keys not present in registered-users
  const candidateEmails = new Set(candidates.map(c => c.email.toLowerCase().trim()));
  for (const [email, data] of Object.entries(ledger)) {
    if (!candidateEmails.has(email)) {
      // If candidate has old aggregate scores (before we stored individual sessions), wrap them
      let sessions = data.sessions || [];
      if (sessions.length === 0 && data.totalSessions > 0) {
        sessions = [{
          company: "General",
          score: data.avgScore || data.bestScore || 0,
          jobRole: "AI Specialist",
          date: data.lastSession || new Date().toISOString()
        }];
      }

      const filteredSessions = filterCompany && filterCompany.toLowerCase().trim() !== "general"
        ? sessions.filter(s => s.company && s.company.toLowerCase().trim() === filterCompany.toLowerCase().trim())
        : sessions;

      const totalSessions = filteredSessions.length;
      if (totalSessions > 0 || !filterCompany || filterCompany.toLowerCase().trim() === "general") {
        const bestScore = totalSessions > 0 ? Math.max(...filteredSessions.map(s => s.score)) : (data.bestScore || 0);
        const avgScore = totalSessions > 0 ? parseFloat((filteredSessions.reduce((sum, s) => sum + s.score, 0) / totalSessions).toFixed(2)) : (data.avgScore || 0);
        const lastSession = totalSessions > 0 ? filteredSessions[totalSessions - 1].date : (data.lastSession || "");
        const lastCompany = totalSessions > 0 ? filteredSessions[totalSessions - 1].company : "General";

        merged.push({
          email,
          name:          data.name || email.split("@")[0],
          totalSessions,
          bestScore,
          avgScore,
          lastSession,
          interviewCompany: lastCompany,
        });
      }
    }
  }

  // Sort: active candidates at the top (bestScore desc), followed by inactive/pending candidates
  return merged.sort((a, b) => {
    if (a.totalSessions > 0 && b.totalSessions === 0) return -1;
    if (a.totalSessions === 0 && b.totalSessions > 0) return 1;
    return b.bestScore - a.bestScore;
  });
}

/**
 * Records a session score for leaderboard tracking.
 */
function recordScore(email, name, score, company = "General", jobRole = "AI Specialist") {
  const ledger = loadLedger();
  const key    = email.toLowerCase().trim();
  if (!ledger[key]) {
    ledger[key] = { questions: [], hashes: [], totalSessions: 0 };
  }
  ledger[key].name = name || email.split("@")[0];

  if (!ledger[key].sessions) {
    ledger[key].sessions = [];
  }

  // Push new company-specific session
  ledger[key].sessions.push({
    company: company.trim(),
    score: parseFloat(score),
    jobRole: jobRole.trim(),
    date: new Date().toISOString()
  });
  
  // Recalculate aggregates
  ledger[key].totalSessions = ledger[key].sessions.length;
  ledger[key].bestScore = Math.max(...ledger[key].sessions.map(s => s.score));
  ledger[key].avgScore  = parseFloat((ledger[key].sessions.reduce((sum, s) => sum + s.score, 0) / ledger[key].sessions.length).toFixed(2));
  ledger[key].lastSession = new Date().toISOString();
  
  saveLedger(ledger);
}

module.exports = { getSeenQuestions, markQuestionsSeen, getLeaderboard, recordScore };
