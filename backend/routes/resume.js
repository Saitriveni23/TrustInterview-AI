const express    = require("express");
const router     = express.Router();
const multer     = require("multer");
const pdfParse   = require("pdf-parse");
const Tesseract  = require("tesseract.js");
const fs         = require("fs");
const path       = require("path");
const { execSync } = require("child_process");

const uploadFolder = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename:    (req, file, cb) => cb(null, `resume-${Date.now()}.pdf`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Try to extract text normally first
async function extractTextFromPDF(filePath) {
  try {
    const buffer  = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    if (pdfData.text && pdfData.text.trim().length > 50) {
      console.log("[Resume] Text extracted normally");
      return pdfData.text.trim();
    }
  } catch (err) {
    console.log("[Resume] Normal extraction failed, trying OCR...");
  }
  return null;
}

// Convert PDF to image using pdftoppm (built into Mac)
function convertPDFToImage(pdfPath) {
  const outputPath = pdfPath.replace(".pdf", "");
  try {
    // Try using pdftoppm (available on Mac via homebrew or built-in)
    execSync(`pdftoppm -r 300 -l 1 "${pdfPath}" "${outputPath}"`, { timeout: 30000 });
    // Find the generated image
    const files = fs.readdirSync(path.dirname(pdfPath));
    const imgFile = files.find(f => f.startsWith(path.basename(outputPath)) && (f.endsWith(".ppm") || f.endsWith(".png") || f.endsWith(".jpg")));
    if (imgFile) return path.join(path.dirname(pdfPath), imgFile);
  } catch (err) {
    console.log("[Resume] pdftoppm failed:", err.message);
  }

  // Try using sips (built into every Mac)
  try {
    const imgPath = pdfPath.replace(".pdf", ".png");
    execSync(`sips -s format png "${pdfPath}" --out "${imgPath}"`, { timeout: 30000 });
    if (fs.existsSync(imgPath)) return imgPath;
  } catch (err) {
    console.log("[Resume] sips failed:", err.message);
  }

  return null;
}

// Run OCR on image
async function runOCR(imagePath) {
  console.log("[Resume] Running OCR on:", imagePath);
  const result = await Tesseract.recognize(imagePath, "eng", {
    logger: m => {
      if (m.status === "recognizing text") {
        process.stdout.write(`\r[OCR] Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  console.log("\n[OCR] Complete");
  return result.data.text;
}

router.post("/upload", upload.single("resume"), async (req, res) => {
  let imagePath = null;
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a PDF file." });

    console.log(`[Resume] File received: ${req.file.filename}`);

    // Step 1 — Try normal text extraction
    let resumeText = await extractTextFromPDF(req.file.path);

    // Step 2 — If no text found, use OCR
    if (!resumeText) {
      console.log("[Resume] No text found — switching to OCR...");

      // Convert PDF page to image
      imagePath = convertPDFToImage(req.file.path);

      if (imagePath && fs.existsSync(imagePath)) {
        resumeText = await runOCR(imagePath);
        // Clean up image file
        fs.unlinkSync(imagePath);
        imagePath = null;
      } else {
        // Last resort — run OCR directly on PDF
        console.log("[Resume] Converting PDF directly with OCR...");
        const result = await Tesseract.recognize(req.file.path, "eng");
        resumeText = result.data.text;
      }
    }

    // Delete the uploaded PDF
    fs.unlinkSync(req.file.path);

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({
        error: "Could not extract text from this PDF. Please try a clearer scan or a text-based PDF.",
      });
    }

    console.log(`[Resume] Successfully extracted ${resumeText.trim().length} characters`);
    res.json({ success: true, resumeText: resumeText.trim() });

  } catch (err) {
    console.error("[Resume Error]", err.message);
    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    res.status(500).json({ error: "Failed to read the PDF. Please try again." });
  }
});

module.exports = router;
