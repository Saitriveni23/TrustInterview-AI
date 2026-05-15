const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const uploadFolder = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, `resume-${Date.now()}.pdf`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Only PDFs allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a PDF file." });
    const fileBuffer = fs.readFileSync(req.file.path);
    const parser = new PDFParse({ verbosity: 0 });
    const pdfData = await parser.parse(fileBuffer);
    fs.unlinkSync(req.file.path);
    const text = pdfData.text || "";
    if (!text || text.trim().length < 50)
      return res.status(400).json({ error: "Could not read text from this PDF." });
    res.json({ success: true, resumeText: text.trim() });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("[Resume Error]", err.message);
    res.status(500).json({ error: "Failed to read the PDF. Please try again." });
  }
});

module.exports = router;
