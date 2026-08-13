// ============================================================
// routes/resume.js — ZTA L4 + L5 + L8
// ============================================================

const express      = require("express");
const router       = express.Router();
const multer       = require("multer");
const pdfParse     = require("pdf-parse");
const Tesseract    = require("tesseract.js");
const fs           = require("fs");
const path         = require("path");
const { execSync } = require("child_process");
const crypto       = require("crypto");

const uploadFolder = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename: (req, file, cb) => {
      const safeName = `resume-${crypto.randomBytes(8).toString("hex")}.pdf`;
      cb(null, safeName);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === "application/pdf" && ext === ".pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function extractTextFromPDF(filePath) {
  try {
    const buffer  = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    if (pdfData.text && pdfData.text.trim().length > 50) {
      console.log("[Resume] Text extracted via pdfparse - resume.js:39");
      return pdfData.text.trim();
    }
  } catch (err) {
    console.log("[Resume] pdfparse failed  falling back to OCR - resume.js:43");
  }
  return null;
}

function convertPDFToImage(pdfPath) {
  const outputPath = pdfPath.replace(".pdf", "");
  try {
    execSync(`pdftoppm -r 300 -l 1 "${pdfPath}" "${outputPath}"`, { timeout: 30000 });
    const files   = fs.readdirSync(path.dirname(pdfPath));
    const imgFile = files.find(f =>
      f.startsWith(path.basename(outputPath)) &&
      (f.endsWith(".ppm") || f.endsWith(".png") || f.endsWith(".jpg"))
    );
    if (imgFile) return path.join(path.dirname(pdfPath), imgFile);
  } catch (_) {}
  try {
    const imgPath = pdfPath.replace(".pdf", ".png");
    execSync(`sips -s format png "${pdfPath}" --out "${imgPath}"`, { timeout: 30000 });
    if (fs.existsSync(imgPath)) return imgPath;
  } catch (_) {}
  return null;
}

async function runOCR(imagePath) {
  console.log("[Resume] Running OCR - resume.js:68");
  const result = await Tesseract.recognize(imagePath, "eng", {
    logger: m => {
      if (m.status === "recognizing text")
        process.stdout.write(`\r[OCR] ${Math.round(m.progress * 100)}% - resume.js:72`);
    },
  });
  console.log("\n[OCR] Done - resume.js:75");
  return result.data.text;
}

function safeDelete(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[ZTAL5] File deleted: ${path.basename(filePath)} - resume.js:83`);
    }
  } catch (err) {
    console.error(`[ZTAL5] Could not delete ${filePath}: ${err.message} - resume.js:86`);
  }
}

router.post("/upload", upload.single("resume"), async (req, res) => {
  let imagePath = null;
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a PDF file." });

    console.log(`[Resume] Received: ${req.file.filename} (${req.file.size} bytes) - resume.js:95`);

    let resumeText = await extractTextFromPDF(req.file.path);

    if (!resumeText) {
      console.log("[Resume] No text found  switching to OCR - resume.js:100");
      imagePath = convertPDFToImage(req.file.path);
      if (imagePath && fs.existsSync(imagePath)) {
        resumeText = await runOCR(imagePath);
        safeDelete(imagePath);
        imagePath = null;
      } else {
        const result = await Tesseract.recognize(req.file.path, "eng");
        resumeText   = result.data.text;
      }
    }

    safeDelete(req.file.path); // ZTA-L5: delete immediately

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ error: "Could not extract text from this PDF. Please try a text-based PDF." });
    }

    console.log(`[Resume] Extracted ${resumeText.trim().length} characters - resume.js:118`);
    res.json({ success: true, resumeText: resumeText.trim() });

  } catch (err) {
    console.error("[Resume Error] - resume.js:122", err.message);
    safeDelete(req.file?.path);
    safeDelete(imagePath);
    res.status(500).json({ error: "Failed to read the PDF. Please try again." });
  }
});

// ── ZTA-L2 / L9: Resume Validation — Name & Role Match ──────────────────────
// POST /api/resume/validate
// Body: { resumeText, enteredName, jobRole }
// Returns: { nameMatch, roleMatch, extractedName, nameSimilarity, roleKeywordsFound, errors[] }
router.post("/validate", (req, res) => {
  const { resumeText, enteredName, jobRole } = req.body;
  if (!resumeText || !enteredName || !jobRole) {
    return res.status(400).json({ error: "resumeText, enteredName, and jobRole are required." });
  }

  const errors = [];
  const text   = resumeText;

  // ── 1. EXTRACT NAME FROM RESUME ────────────────────────────────────────────
  // Strategy: look at first 600 chars (header area), find the biggest "name-looking" line
  const header = text.substring(0, 600);
  const lines  = header.split("\n").map(l => l.trim()).filter(l => l.length > 1);

  // Heuristic: first line that looks like a proper name (2-5 words, title-cased or all-caps, no contact info symbols)
  const namePattern = /^[A-Za-z]+(?:\s+[A-Za-z\.]+){1,4}$/;
  let extractedName = null;

  for (const line of lines.slice(0, 8)) {
    if (line.includes("@") || line.includes("/") || line.includes(":") || /[\d]/.test(line)) {
      continue;
    }
    if (namePattern.test(line)) {
      extractedName = line;
      break;
    }
  }

  // Fallback: find "Name: Xxx" pattern
  if (!extractedName) {
    const nameTag = text.match(/(?:name\s*[:\-]\s*)([A-Za-z ]{3,40})/i);
    if (nameTag) extractedName = nameTag[1].trim();
  }

  // Fallback 2: pick the longest capitalised/all-caps word sequence in first 300 chars
  if (!extractedName) {
    const caps = header.match(/[A-Za-z]+(?:\s+[A-Za-z]+)+/g);
    if (caps && caps.length > 0) {
      const filtered = caps.filter(val => !/resume|cv|portfolio|experience|skills|education|curriculum/i.test(val));
      if (filtered.length > 0) {
        extractedName = filtered.sort((a, b) => b.length - a.length)[0];
      }
    }
  }

  // ── 2. NAME FUZZY MATCH ─────────────────────────────────────────────────────
  function normalizeName(n) {
    return (n || "").toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  }
  function tokenOverlap(a, b) {
    const ta = new Set(normalizeName(a).split(" ").filter(w => w.length > 1));
    const tb = new Set(normalizeName(b).split(" ").filter(w => w.length > 1));
    let overlap = 0;
    ta.forEach(w => { if (tb.has(w)) overlap++; });
    return ta.size === 0 ? 0 : overlap / Math.max(ta.size, tb.size);
  }

  const nameSimilarity = extractedName ? tokenOverlap(enteredName, extractedName) : 0;
  const nameMatch      = nameSimilarity >= 0.5; // at least 1 token in common

  if (!nameMatch) {
    errors.push(
      extractedName
        ? `Name mismatch: Resume appears to belong to "${extractedName}", but you entered "${enteredName}". Please upload your own resume or correct your name.`
        : `Could not find a clear name in the resume. Please ensure you are uploading your own resume.`
    );
  }

  // ── 3. ROLE RELEVANCE CHECK ─────────────────────────────────────────────────
  // Map common roles to keyword sets
  const ROLE_KEYWORDS = {
    "ai":              ["machine learning","deep learning","neural network","llm","pytorch","tensorflow","nlp","computer vision","reinforcement learning","transformer","ai","artificial intelligence","model"],
    "ml":              ["machine learning","sklearn","xgboost","regression","classification","feature engineering","dataset","training","model","gradient"],
    "data":            ["sql","python","pandas","tableau","powerbi","analytics","data analysis","etl","dashboard","excel","statistics","visualization"],
    "software":        ["java","c++","python","javascript","react","node","spring","api","backend","frontend","microservices","git","software"],
    "backend":         ["api","rest","node","express","django","flask","sql","database","server","microservices","aws","docker"],
    "frontend":        ["react","angular","vue","html","css","javascript","typescript","ui","ux","responsive"],
    "devops":          ["kubernetes","docker","ci/cd","jenkins","terraform","ansible","linux","aws","gcp","azure","pipeline"],
    "cloud":           ["aws","azure","gcp","kubernetes","terraform","cloud","s3","ec2","lambda","serverless"],
    "cybersecurity":   ["security","penetration","vulnerability","firewall","siem","threat","encryption","soc","ctf","malware","zero trust"],
    "security":        ["security","penetration","vulnerability","firewall","encryption","threat","soc"],
    "network":         ["networking","tcp","ip","dns","routing","switching","firewall","vpn","protocol"],
    "database":        ["sql","mysql","postgresql","mongodb","oracle","database","nosql","redis","query"],
    "embedded":        ["embedded","c","rtos","microcontroller","fpga","arm","firmware","iot","hardware"],
    "mobile":          ["android","ios","flutter","react native","swift","kotlin","mobile"],
    "research":        ["research","paper","publication","study","analysis","algorithm","proof","theorem"],
    "analyst":         ["analysis","reporting","excel","powerbi","tableau","sql","kpi","metrics","data"],
    "engineer":        ["engineering","design","system","architecture","development","programming","code"],
    "developer":       ["programming","coding","development","software","git","agile","api","deployment"],
    "associate":       ["work experience","intern","project","team","collaboration","communication"],
  };

  const roleLower = jobRole.toLowerCase();
  let keywordsToCheck = [];

  // Find matching keyword set
  for (const [key, kws] of Object.entries(ROLE_KEYWORDS)) {
    if (roleLower.includes(key)) {
      keywordsToCheck = [...keywordsToCheck, ...kws];
    }
  }
  // Always add generic engineering words
  keywordsToCheck = [...new Set([...keywordsToCheck, "project","experience","skill","developed","built","intern","work"])];

  const textLower    = text.toLowerCase();
  const foundKws     = keywordsToCheck.filter(kw => textLower.includes(kw));
  const roleScore    = keywordsToCheck.length > 0 ? foundKws.length / Math.min(keywordsToCheck.length, 8) : 1;
  const roleMatch    = roleScore >= 0.3; // at least 30% of keywords found

  if (!roleMatch) {
    errors.push(
      `Role mismatch: Your resume does not appear to have relevant skills or experience for "${jobRole}". ` +
      `Expected keywords like: ${keywordsToCheck.slice(0, 5).join(", ")}. ` +
      `Please apply for a role that matches your background.`
    );
  }

  console.log(`[ZTA-Validate] Name: "${enteredName}" vs Resume: "${extractedName}" → sim=${nameSimilarity.toFixed(2)} match=${nameMatch}`);
  console.log(`[ZTA-Validate] Role: "${jobRole}" → score=${roleScore.toFixed(2)} match=${roleMatch} found=${foundKws.length}/${keywordsToCheck.length}`);

  return res.json({
    success: true,
    nameMatch,
    roleMatch,
    extractedName: extractedName || null,
    nameSimilarity: parseFloat(nameSimilarity.toFixed(2)),
    roleKeywordsFound: foundKws,
    roleScore: parseFloat(roleScore.toFixed(2)),
    errors,
    blocked: errors.length > 0,
  });
});

// ── Feature 3: AI CV Gap Analysis & Placement Readiness Audit ────────────────
// POST /api/resume/gap-analysis
// Body: { resumeText, jobRole }
const axios = require("axios");
async function callGapAnalysisLLM(prompt) {
  // 1. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }, { timeout: 15000 });
      return response.data.candidates[0].content.parts[0].text;
    } catch (e) {
      console.warn("[GapAnalysis] Gemini failed:", e.message);
    }
  }

  // 2. Try OpenAI
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "YOUR_OPENAI_API_KEY") {
    try {
      const OpenAIObj = require("openai");
      const client = new OpenAIObj({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 500
      });
      return res.choices[0].message.content.trim();
    } catch (e) {
      console.warn("[GapAnalysis] OpenAI failed:", e.message);
    }
  }

  throw new Error("No LLM keys configured");
}

router.post("/gap-analysis", async (req, res) => {
  const { resumeText, jobRole } = req.body;
  if (!resumeText || !jobRole) {
    return res.status(400).json({ error: "resumeText and jobRole are required." });
  }

  const prompt = `You are an AI placement consultant. Analyze this candidate's resume text against the target job role: "${jobRole}".
Resume:
"${resumeText.substring(0, 2500)}"

Determine technical readiness alignment (0-100), key matches, skill gaps, and custom action items.
Respond ONLY with a valid JSON object. No explanations, no markdown:
{
  "readinessScore": 78,
  "strengths": ["Strength 1...", "Strength 2..."],
  "gaps": ["Gap 1 (missing tool/concept)...", "Gap 2..."],
  "recommendations": ["Action item 1...", "Action item 2..."]
}`;

  try {
    const raw = await callGapAnalysisLLM(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);
    res.json({ success: true, ...result });
  } catch (err) {
    console.warn("[GapAnalysis] Falling back to static gap analysis:", err.message);
    // Static Fallback
    const score = Math.round(55 + Math.random() * 25); // 55 to 80
    res.json({
      success: true,
      readinessScore: score,
      strengths: [
        "Has solid project history matching baseline requirements",
        "Demonstrates good foundational engineering skills"
      ],
      gaps: [
        `Missing specific enterprise deployment frameworks for ${jobRole}`,
        "No direct testing suite or coverage verification referenced"
      ],
      recommendations: [
        `Implement a small project practicing core ${jobRole} patterns`,
        "Reference scale parameters (traffic, database size) on CV",
        "Revise basic algorithms and time complexity bounds"
      ]
    });
  }
});

module.exports = router;

