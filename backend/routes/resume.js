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

module.exports = router;
