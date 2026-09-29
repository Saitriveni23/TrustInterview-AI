const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

const execFileAsync = promisify(execFile);

function assertPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    const error = new Error("The uploaded file is not a valid PDF.");
    error.status = 415;
    error.code = "INVALID_PDF";
    throw error;
  }
}

async function extractResumeText(buffer) {
  assertPdf(buffer);
  try {
    const parsed = await pdfParse(buffer);
    if (parsed.text?.trim().length >= 50) return parsed.text.trim();
  } catch (_) {}

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "trustinterview-"));
  const pdfPath = path.join(workDir, `${crypto.randomUUID()}.pdf`);
  const outputPrefix = path.join(workDir, "page");
  try {
    await fs.writeFile(pdfPath, buffer, { mode: 0o600 });
    await execFileAsync("pdftoppm", ["-f", "1", "-l", "2", "-r", "200", "-png", pdfPath, outputPrefix], { timeout: 30_000 });
    const images = (await fs.readdir(workDir)).filter((name) => name.endsWith(".png")).sort().slice(0, 2);
    let text = "";
    for (const image of images) {
      const result = await Tesseract.recognize(path.join(workDir, image), "eng");
      text += `\n${result.data.text || ""}`;
    }
    if (text.trim().length < 20) throw new Error("No readable resume text was found.");
    return text.trim();
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

module.exports = { assertPdf, extractResumeText };
