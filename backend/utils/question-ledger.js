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
function getLeaderboard() {
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

  const merged = candidates.map(user => {
    const key = user.email.toLowerCase().trim();
    const scoreData = ledger[key] || {};
    return {
      email:         user.email,
      name:          scoreData.name || user.name || user.email.split("@")[0],
      totalSessions: scoreData.totalSessions || 0,
      bestScore:     scoreData.bestScore || 0,
      avgScore:      scoreData.avgScore  || 0,
      lastSession:   scoreData.lastSession || user.registeredAt || "",
    };
  });

  // Keep backward compatibility: add any ledger keys not present in registered-users
  const candidateEmails = new Set(candidates.map(c => c.email.toLowerCase().trim()));
  for (const [email, data] of Object.entries(ledger)) {
    if (data.totalSessions > 0 && !candidateEmails.has(email)) {
      merged.push({
        email,
        name:          data.name || email.split("@")[0],
        totalSessions: data.totalSessions || 0,
        bestScore:     data.bestScore || 0,
        avgScore:      data.avgScore || 0,
        lastSession:   data.lastSession || "",
      });
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
function recordScore(email, name, score) {
  const ledger = loadLedger();
  const key    = email.toLowerCase().trim();
  if (!ledger[key]) {
    ledger[key] = { questions: [], hashes: [], totalSessions: 0 };
  }
  ledger[key].name = name || email.split("@")[0];
  
  // Increment sessions count
  ledger[key].totalSessions = (ledger[key].totalSessions || 0) + 1;
  const sessions = ledger[key].totalSessions;
  
  const prev = ledger[key].avgScore || 0;
  ledger[key].avgScore  = parseFloat(((prev * (sessions - 1) + score) / sessions).toFixed(2));
  ledger[key].bestScore = Math.max(ledger[key].bestScore || 0, score);
  ledger[key].lastSession = new Date().toISOString();
  saveLedger(ledger);
}

module.exports = { getSeenQuestions, markQuestionsSeen, getLeaderboard, recordScore };
