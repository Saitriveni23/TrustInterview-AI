const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");

// Create PDF document
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true,
});

const outputPath = path.join(__dirname, "../../Hallucination_and_Bias_Detailed_Report.pdf");
doc.pipe(fs.createWriteStream(outputPath));

// Colors
const COLORS = {
  primary:   "#0F172A", // Dark Slate Blue
  secondary: "#1E293B", // Slate Grey
  accent:    "#6366F1", // Indigo
  success:   "#10B981", // Emerald
  error:     "#EF4444", // Crimson Red
  muted:     "#64748B", // Cool Muted Grey
  bgLight:   "#F8FAFC", // Off-white
  border:    "#E2E8F0", // Light border
  codeBg:    "#F1F5F9", // Soft Grey for Code
};

// Helpers
function addHeader(text, size = 18, color = COLORS.primary) {
  doc.fillColor(color).font("Helvetica-Bold").fontSize(size).text(text);
  doc.moveDown(0.4);
}

function addSubheader(text, size = 12, color = COLORS.accent) {
  doc.fillColor(color).font("Helvetica-Bold").fontSize(size).text(text);
  doc.moveDown(0.3);
}

function addBullet(title, desc, color = COLORS.secondary) {
  doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(10).text("•  " + title + ": ", { continued: true })
     .fillColor(color).font("Helvetica").text(desc);
  doc.moveDown(0.5);
}

function addParagraph(text, color = COLORS.secondary) {
  doc.fillColor(color).font("Helvetica").fontSize(10).lineGap(4).text(text, { align: "justify" });
  doc.moveDown(0.8);
}

function addDivider() {
  doc.moveDown(0.5);
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
}

function addCodeBlock(text) {
  const codeLines = text.split("\n");
  const padding = 10;
  const originalY = doc.y;
  
  // Calculate text height
  doc.font("Courier").fontSize(8.5).lineGap(2);
  const height = codeLines.length * 11.5 + padding * 2;
  
  // Draw background card
  doc.rect(50, originalY, 495, height).fill(COLORS.codeBg);
  
  // Reset fill and draw text
  doc.fillColor(COLORS.secondary);
  doc.y = originalY + padding;
  codeLines.forEach(line => {
    doc.x = 60;
    doc.text(line);
  });
  
  doc.y = originalY + height + 10;
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 1: TITLE PAGE
// ══════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, 595, 20).fill(COLORS.primary);
doc.rect(0, 20, 595, 10).fill(COLORS.accent);
doc.moveDown(8);

doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(12).text("AI TALENT EVALUATION METRICS REPORT", { align: "center" });
doc.moveDown(1);

doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(28).text("Anti-Hallucination & Bias", { align: "center", characterSpacing: 0.5 });
doc.text("Mitigation Architecture", { align: "center", characterSpacing: 0.5 });
doc.moveDown(0.6);

doc.fillColor(COLORS.secondary).font("Helvetica-Oblique").fontSize(14).text("Detailed Technical Specifications of Zero Trust Layers 12 & 13", { align: "center" });
doc.moveDown(8);

doc.strokeColor(COLORS.border).lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
doc.moveDown(2);

doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("DOCUMENT TYPE:", { align: "center", continued: true })
   .font("Helvetica").text("  Detailed Architecture & Audit Report", { align: "center" });
doc.moveDown(0.4);
doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("PUBLISHED:", { align: "center", continued: true })
   .font("Helvetica").text(`  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: "center" });
doc.moveDown(0.4);
doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("AUTHOR:", { align: "center", continued: true })
   .font("Helvetica").text("  Antigravity AI Core Engineering", { align: "center" });

// ══════════════════════════════════════════════════════════════════════════
// PAGE 2: LAYER 12 — BIAS MITIGATION & FAIRNESS SHIELD
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader("1. ZTA Layer 12: AI Bias & Fairness Shield");
addParagraph(
  "TrustInterview AI integrates a strict Bias & Fairness Shield to eliminate machine-learning bias and human evaluation variance. While Large Language Models (LLMs) can grade technical code accurately, their textual feedback often contains implicit demographic biases or PII correlation patterns that violate regional employment standards."
);
addParagraph(
  "Layer 12 introduces a runtime compliance scanner that inspects the generated interview question, the candidate's answer, and all AI-generated evaluation texts (summaries, strengths, improvements, and ideal answers) before they are stored in the database or exposed to recruiters."
);

addSubheader("The 12 Base Demographics Checked:");
addBullet("Age Protection", "Blocks words such as 'age', 'how old', 'young', 'old', 'years old'.");
addBullet("Gender Neutrality", "Monitors terms relating to gender, including 'male', 'female', 'woman', 'man', 'maternity'.");
addBullet("Race & Nationality", "Detects ethnicity terms ('race', 'color', 'colour') and origin patterns.");
addBullet("Disability & Health", "Flags medical and capacity identifiers ('disability', 'disabled', 'handicap', 'illness').");
addBullet("Religion & Caste", "Blocks belief and social stratification references ('religion', 'church', 'mosque', 'caste').");
addBullet("Social & Orientation", "Monitors marital status, parental status, and sexual orientation phrases.");

addDivider();

addSubheader("A. Dynamic Candidate Name Protection (PII Sanitisation)");
addParagraph(
  "To prevent the model from compiling score bias based on name origins (which correlates with gender or race), the system extracts the first and last name from the candidate's request. It dynamically registers these names as custom filters. If the LLM output addresses the candidate by name (e.g. 'Triveni' or 'Reddy') or refers to personal traits, the scanner triggers a violation."
);

addSubheader("B. Compliance Scoring Logic");
addParagraph(
  "The Compliance Score measures neutrality by tracking the ratio of clean categories to total monitored categories:"
);
addParagraph(
  "Compliance Score % = (Passed Categories / Total Categories) * 100"
);
addParagraph(
  "If the score falls below 100%, the evaluation is marked as containing flags and a warning is logged in the compliance ledger, forcing review."
);

// ══════════════════════════════════════════════════════════════════════════
// PAGE 3: LAYER 13 — FACT GROUNDING & ANTI-HALLUCINATION
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader("2. ZTA Layer 13: Fact Grounding & Anti-Hallucination");
addParagraph(
  "Generative models can generate non-existent features or assume background knowledge not matching a candidate's background. Layer 13 operates dual-directional grounding checks to secure both the input (questions generated) and output (candidate evaluations)."
);

addSubheader("A. Bidirectional Grounding Architecture");
addBullet("Question Grounding Audit", "Extracts technical keywords from generated questions and matches them against the parsed resume. If questions ask about technologies missing from the resume (e.g., asking about Kubernetes when only Docker is listed), it blocks the question and defaults to grounded alternatives.");
addBullet("Candidate Answer Auditing", "Analyzes the text of candidate responses for technical consistency, metrics reality, and resume-grounding. The engine grades responses based on truthfulness and flags potential fabrications.");

addDivider();

addSubheader("B. Impossible Jargon and Metric Filters");
addParagraph(
  "The system maintains static signature sets targeting common hallucinated features and exaggerated metrics:"
);
addBullet("Impossible Technical Versions", "Detects non-existent frameworks like 'Python 4.0', 'React v19.5+', 'HTML6', 'CSS4', and 'Node.js v50+', which indicate generated junk or candidate fabrications.");
addBullet("Contradictory Jargon", "Detects logically mutually exclusive patterns such as 'MongoDB SQL Join' or 'Relational NoSQL'.");
addBullet("Impossible Metrics", "Flags claims exceeding physical boundaries, including 'reducing latency/costs by >100%', 'increasing uptime/reliability >100%', or claims of processing 'quadrillions of requests per second on a single laptop'.");

addSubheader("C. Risk Score and Truthfulness Grading");
addParagraph(
  "The system computes a Risk Score based on identified violation severities:"
);
addBullet("HIGH Severity Flags (45 points)", "Triggered by impossible jargon, contradictions, and impossible metrics.");
addBullet("MEDIUM Severity Flags (20 points)", "Triggered by 'Unverified Resume Claims' (e.g., claiming React experience when React isn't in the CV).");
addParagraph(
  "Grading Scale: 0% Risk = Verified Factual | <30% = Mostly Grounded | <65% = Unverified Claims | >=65% = High Hallucination Risk. A score >= 50% automatically fails the audit check."
);

// ══════════════════════════════════════════════════════════════════════════
// PAGE 4: DATA SCHEMAS & API CONTRACTS
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader("3. Data Schemas & API Integration");
addParagraph(
  "The API response payloads communicate these metrics directly to the recruiter dashboard and compliance pipeline. Below is the structured JSON response contract emitted by the evaluation endpoint:"
);

addCodeBlock(JSON.stringify({
  "biasSummary": {
    "filterName": "Employment Law Discrimination Bias Filter",
    "candidateName": "Triveni Reddy",
    "overallCompliance": 100,
    "totalFlagsAcrossInterview": 0,
    "triggeredCategories": {},
    "status": "FULLY COMPLIANT",
    "categoriesMonitored": 13,
    "nameProtectionActive": true
  },
  "hallucinationSummary": {
    "filterName": "ZTA-L13 Anti-Hallucination & Factuality Filter",
    "avgHallucinationRisk": 20,
    "totalFlags": 1,
    "truthfulnessGrade": "Mostly Grounded",
    "status": "UNVERIFIED CLAIMS DETECTED",
    "questionBreakdown": [
      {
        "questionIndex": 1,
        "skill": "React",
        "hallucinationRiskScore": 20,
        "truthfulnessGrade": "Mostly Grounded",
        "flaggedCount": 1,
        "flagged": [
          {
            "type": "Unverified Resume Claim",
            "term": "redux",
            "reason": "Claimed experience with 'redux' which was not in the resume.",
            "severity": "MEDIUM"
          }
        ]
      }
    ]
  }
}, null, 2));

addDivider();
addSubheader("Summary of Enforcement & Audit Compliance");
addParagraph(
  "By pairing Layer 12 (Bias Mitigation) and Layer 13 (Hallucination Auditing), TrustInterview AI enforces objective screening. Candidates are judged strictly on verified resume capabilities, and AI feedback is sanitised of names and demographic markers. This enforces compliant hiring standards in real time."
);

// ══════════════════════════════════════════════════════════════════════════
// PAGE NUMBERS & FOOTER
// ══════════════════════════════════════════════════════════════════════════
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);

  // Footer text
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(
    `TrustInterview AI Hallucination & Bias Architecture Report — Confidential`,
    50,
    795,
    { align: "left", width: 320 }
  );
  doc.text(
    `Page ${i + 1} of ${range.count}`,
    445,
    795,
    { align: "right", width: 100 }
  );

  // Bottom line
  doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(50, 785).lineTo(545, 785).stroke();
}

doc.end();
console.log("Detailed Hallucination and Bias PDF Report successfully generated!");
