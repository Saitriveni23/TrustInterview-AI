// ============================================================
// backend/routes/resume.js
// ============================================================
// This file handles:
//   1. Receiving the PDF resume from the frontend
//   2. Saving it temporarily to the uploads/ folder
//   3. Reading the text out of the PDF
//   4. Sending the extracted text back to the frontend
// ============================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 8 — File Upload Validation
// multer checks the file before saving it.
// Only PDF files are allowed, max size 5MB.
// ─────────────────────────────────────────────

// Create uploads folder if it does not exist yet
const uploadFolder = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Configure where and how files are saved
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    // Save file with a timestamp so names never clash
    // Example: resume-1712345678901.pdf
    const uniqueName = `resume-${Date.now()}.pdf`;
    cb(null, uniqueName);
  },
});

// Only allow PDF files — reject anything else
function fileFilter(req, file, cb) {
  if (file.mimetype === "application/pdf") {
    cb(null, true); // accept the file
  } else {
    cb(new Error("Only PDF files are allowed"), false); // reject
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// ─────────────────────────────────────────────
// POST /api/resume/upload
// ─────────────────────────────────────────────
// The frontend sends the PDF file here.
// We read it, extract text, send text back.
// ─────────────────────────────────────────────
router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    // If no file was sent, return an error
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PDF file." });
    }

    console.log(`[Resume] File received: ${req.file.filename} - resume.js:73`);

    // Read the saved PDF file from disk
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Extract all text from the PDF
    const pdfData = await pdfParse(fileBuffer);
    const resumeText = pdfData.text;

    // Basic check — if PDF has no text (scanned image PDF)
    if (!resumeText || resumeText.trim().length < 50) {
      // Clean up the saved file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error:
          "Could not read text from this PDF. Make sure it is not a scanned image. Try a different PDF.",
      });
    }

    console.log(
      `[Resume] Text extracted — ${resumeText.length} characters found`
    );

    // ─────────────────────────────────────────
    // ZERO TRUST LAYER 9 — Delete file after use
    // We do not store resumes permanently.
    // Delete the file from disk right after
    // extracting the text from it.
    // ─────────────────────────────────────────
    fs.unlinkSync(filePath);
    console.log(`[Resume] File deleted from disk after extraction - resume.js:104`);

    // Send the extracted resume text back to frontend
    res.json({
      success: true,
      message: "Resume uploaded and read successfully",
      resumeText: resumeText.trim(),
      characterCount: resumeText.trim().length,
    });
  } catch (err) {
    console.error(`[Resume Error] ${err.message} - resume.js:114`);

    // Clean up file if something went wrong
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Failed to read the PDF. Please try again.",
    });
  }
});

module.exports = router;