const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const pdfParse = require("pdf-parse");
const fs       = require("fs");
const path     = require("path");

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
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a PDF file." });
    const buffer  = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    fs.unlinkSync(req.file.path);
    if (!pdfData.text || pdfData.text.trim().length < 50)
      return res.status(400).json({ error: "Could not read text from this PDF." });
    console.log(`[Resume] Extracted ${pdfData.text.trim().length} characters`);
    res.json({ success: true, resumeText: pdfData.text.trim() });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("[Resume Error]", err.message);
    res.status(500).json({ error: "Failed to read PDF. Please try again." });
  }
});

module.exports = router;
