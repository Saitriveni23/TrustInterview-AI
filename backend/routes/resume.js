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

  // Heuristic: first line that looks like a proper name (2-4 words, title-cased, no digits/special chars)
  const namePattern = /^[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}$/;
  let extractedName = null;

  for (const line of lines.slice(0, 8)) {
    if (namePattern.test(line)) {
      extractedName = line;
      break;
    }
  }

  // Fallback: find "Name: Xxx" pattern
  if (!extractedName) {
    const nameTag = text.match(/(?:name\s*[:\-]\s*)([A-Z][a-zA-Z ]{3,40})/i);
    if (nameTag) extractedName = nameTag[1].trim();
  }

  // Fallback 2: pick the longest capitalised-word sequence in first 300 chars
  if (!extractedName) {
    const caps = header.match(/[A-Z][a-z]+(?: [A-Z][a-z]+)+/g);
    if (caps && caps.length > 0) {
      extractedName = caps.sort((a, b) => b.length - a.length)[0];
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

module.exports = router;

