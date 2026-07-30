const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");

// Create PDF document
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true, // required to add "Page X of Y" footers dynamically
});

const outputPath = path.join(__dirname, "../../TrustInterview_ZTA_Architecture_Report.pdf");
doc.pipe(fs.createWriteStream(outputPath));

// Define Color Scheme (Zero Trust Theme)
const COLORS = {
  primary:   "#0F172A", // Dark Slate Blue
  secondary: "#1E293B", // Slate Grey
  accent:    "#6366F1", // Indigo
  success:   "#10B981", // Emerald
  error:     "#EF4444", // Crimson Red
  muted:     "#64748B", // Cool Muted Grey
  bgLight:   "#F8FAFC", // Off-white
  border:    "#E2E8F0", // Light border
};

// Formatting Helper Functions
function addHeader(text, size = 18, color = COLORS.primary) {
  doc.fillColor(color).font("Helvetica-Bold").fontSize(size).text(text);
  doc.moveDown(0.4);
}

function addSubheader(text, size = 12, color = COLORS.accent) {
  doc.fillColor(color).font("Helvetica-Bold").fontSize(size).text(text);
  doc.moveDown(0.3);
}

// Fixed character typo in variable 'Wicox' -> removed or set false
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

// ══════════════════════════════════════════════════════════════════════════
// PAGE 1: TITLE PAGE
// ══════════════════════════════════════════════════════════════════════════

// Decorative top bar
doc.rect(0, 0, 595, 20).fill(COLORS.primary);
doc.rect(0, 20, 595, 10).fill(COLORS.accent);

doc.moveDown(8);

// Subtitle / Label
doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(12).text("SECURITY & COMPLIANCE ARCHITECTURE REPORT", { align: "center" });
doc.moveDown(1);

// Title
doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(32).text("TrustInterview AI", { align: "center", characterSpacing: 1 });
doc.moveDown(0.5);

// Subtitle
doc.fillColor(COLORS.secondary).font("Helvetica-Oblique").fontSize(15).text("Zero Trust Architecture, Bias Mitigation, & Factuality Filters", { align: "center" });
doc.moveDown(8);

// Horizontal Line
doc.strokeColor(COLORS.border).lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
doc.moveDown(2);

// Metadata Block
doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("VERSION:", { align: "center", continued: true })
   .font("Helvetica").text("  2.0.0 (Zero Trust Enforced)", { align: "center" });
doc.moveDown(0.4);
doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("PUBLISHED:", { align: "center", continued: true })
   .font("Helvetica").text("  July 30, 2026", { align: "center" });
doc.moveDown(0.4);
doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("AUTHOR:", { align: "center", continued: true })
   .font("Helvetica").text("  Antigravity AI Engineering Division", { align: "center" });

// ══════════════════════════════════════════════════════════════════════════
// PAGE 2: INTRODUCTION & ZERO TRUST OVERVIEW
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();

// Section Header
addHeader("1. Executive Summary & Intro");
addParagraph(
  "TrustInterview AI is an enterprise-grade, privacy-first talent assessment platform designed to evaluate candidate qualifications fairly and securely. Conventional online interview tools suffer from severe vulnerabilities, including automated bot screening bypasses, prompt injection attacks, resume fraud, and human evaluation bias."
);
addParagraph(
  "To mitigate these vulnerabilities, the system implements a Zero Trust Architecture (ZTA) spanning 13 security and validation layers. The core directive of this architecture is 'Never Trust, Always Verify' — applying continuous authentication, live device forensics, data sanitisation, AI bias filtering, and factuality grounding to every API request and response."
);

addSubheader("The Core Pillars of the Platform:");
addBullet("Continuous Verification", "Every action is cryptographically signed, bound to a specific session token, and continuously checked for posture changes.");
addBullet("Compliance & Fairness", "Decouples PII (Personally Identifiable Information) from evaluations and audits both questions and scores to prevent systemic demographic bias.");
addBullet("AI Fact Grounding", "Monitors LLM input and output for integrity, ensuring questions match verified resume content and identifying candidate factual discrepancies (hallucination).");

addDivider();

addHeader("2. Zero Trust Architecture (ZTA) Layer Matrix");
addParagraph(
  "The system's backend enforces a strict sequence of 13 security layers. If any check fails, the session is terminated and marked as blocked."
);

addBullet("L1: Identity & Session Signatures", "Enforces cryptographic session signatures. Every non-public API call must provide a valid session token generated by the server.");
addBullet("L2: Device Fingerprinting", "Analyzes client header telemetry to build a unique hardware/software signature, immediately blocking headless browsers (Selenium, Puppeteer, Playwright).");
addBullet("L3: Network & CORS Segregation", "Locks cross-origin access strictly to designated application domains (e.g. localhost:3000), rejecting remote script injection.");

// ══════════════════════════════════════════════════════════════════════════
// PAGE 3: THE 13 ZTA LAYERS (CONTINUED)
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();

addHeader("2. The 13 ZTA Layers (Continued)");

addBullet("L4: Workload Security", "Imposes strict payloads caps (10MB for JSON and PDFs) to prevent denial-of-service memory exhaustion.");
addBullet("L5: Data Protection", "Ensures zero-retention storage. Uploaded PDF resumes are extracted, parsed in memory, and permanently deleted from disk within 100 milliseconds.");
addBullet("L6: Structured Audit Logging", "Logs all API actions into SIEM-compatible JSON lines. Captures IP, headers, device fingerprints, and response times without logging candidate PII.");
addBullet("L7: SOAR Automation", "Security Orchestration, Automation, and Response. Automatically maps, logs, and blocks IPs that exceed suspicious request rates or trigger too many errors.");
addBullet("L8: Governance & GDPR Sanitisers", "Deep-scans POST request payloads to sanitize SQL injection fragments, XSS tags, and protect against accidental credential leakage (e.g. OpenAI keys).");
addBullet("L9: Policy Decision Point (PDP)", "Acts as the central access gatekeeper, matching every incoming request against a defined policy schema (method validation, max session age).");
addBullet("L10: Edge Security & Cryptography", "Forces secure transport headers (HSTS), frame-injection blocks, and securely-scoped cookies to secure browser endpoints.");
addBullet("L11: Threat Intelligence blocklist", "Maintains an active signature table blocking known malicious IP subnets and exploit script signatures.");
addBullet("L12: Human Factors & Bias Shield", "Filters evaluation outputs through a demographic and personal name protection scanner before it is logged or presented to recruiters.");
addBullet("L13: Fact Grounding & Hallucination Audit", "Cross-references candidate answers and AI question sets against the source resume to ensure grounding truthfulness.");

addDivider();

addHeader("3. L12: AI Bias & Fairness Shield");
addParagraph(
  "One of the primary goals of TrustInterview AI is to eliminate human and machine-generated demographic bias. During evaluation, OpenAI or Gemini models score candidates, but these models can sometimes generate feedback containing implicit biases (e.g. accent criticism, references to age, or gender assumptions)."
);
addParagraph(
  "The Bias Shield (Layer 12) runs a strict post-evaluation check. It scans the feedback text for 12 categories of prohibited terms: Age, Gender, Race/Ethnicity, Religion, Nationality, Disability, Accent, Background, Family, Married, Children, and Pregnancy Status."
);

// ══════════════════════════════════════════════════════════════════════════
// PAGE 4: BIAS FILTER & ANTI-HALLUCINATION
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();

addHeader("3. L12: AI Bias & Fairness Shield (Continued)");
addParagraph(
  "Additionally, the system extracts the candidate's first and last names (e.g. 'triveni reddy') and dynamically registers them as an extra bias filter category. The evaluator is forbidden from addressing the candidate by name or referring to personal traits, forcing evaluations to focus strictly on technical merit and communication quality."
);
addParagraph(
  "If any category is triggered, the compliance audit score drops, a warning is logged in the audit database, and the flagged evaluation is withheld or scrubbed. A 100% compliant score indicates complete neutrality."
);

addDivider();

addHeader("4. L13: Anti-Hallucination & Fact Grounding");
addParagraph(
  "Candidates often exaggerate credentials, while generative AI models can invent questions or expectations not justified by the candidate's actual background. Layer 13 addresses this by enforcing dual-directional grounding checks:"
);

addSubheader("A. AI Question Grounding Audit");
addParagraph(
  "When questions are generated, the system cross-references each question against the extracted text of the candidate's resume. It searches for occurrences of the skills, technologies, and companies mentioned in the question. If a question references a technology not present in the resume (e.g. asking about 'Kubernetes' when the resume only lists 'Docker'), it flags a grounding violation and rolls back to standard validation questions."
);

addSubheader("B. Candidate Answer Hallucination Checker");
addParagraph(
  "When a candidate provides an answer, the system audits the claims made. It extracts technical assertions, years of experience, and project references, and runs semantic mapping against the resume database. If the candidate claims experience with a framework or level of responsibility not supported by their CV, a hallucination risk score (0-100%) is calculated. If the risk exceeds 50% (Mostly Grounded), the system flags the claim as 'Unverified' on the final recruiter dashboard."
);

// ══════════════════════════════════════════════════════════════════════════
// PAGE 5: SOAR AUTO-BLOCKING & ACTIVE STATUS
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();

addHeader("5. Threat Detection & SOAR Auto-Blocking");
addParagraph(
  "TrustInterview AI is designed to defend itself autonomously. The SOAR (Layer 7) middleware monitors all requests in a rolling 10-minute window. If a client starts scanning the endpoints (triggering too many 404 or 401 errors) or sends malicious scripts (triggering 400 Governance blocks), the threat counter increments."
);

addSubheader("How ZTA is Made Inactive / Blocked:");
addBullet("Threshold Breaches", "If an IP triggers more than 40 bad requests (4xx) or 20 server errors (5xx) within 10 minutes, the SOAR engine automatically blocks the IP.");
addBullet("Session Termination", "The block list entry sets a 'blockedUntil' timestamp 30 minutes in the future, throwing a 429 rate limit exception for all subsequent connections.");
addBullet("Live Status Update", "When the status endpoint (/api/zta-status) is queried, it evaluates the requesting IP. If flagged, it sets 'fraudAlert: true' and 'ztaEnabled: false'.");
addBullet("UI Dashboard Lock", "The frontend status dashboard immediately turns crimson, displays '🛑 ZTA BLOCKED — FRAUD/TAMPERING DETECTED', and locks all layers as BLOCKED. The 'Start Interview' button becomes completely disabled, isolating the threat.");

addDivider();

addHeader("6. Summary of Engineering Enhancements");
addParagraph(
  "During the security and stability audit, the following vulnerabilities were identified and resolved:"
);
addBullet("CORS & Port Alignment", "Aligned the backend CORS origin policy to allow requests from http://localhost:3000 (React client), preventing preflight request drops.");
addBullet("Status Endpoint Policies", "Registered /api/zta-status in public routes and the PDP schema, enabling the frontend dashboard to display live ZTA integrity states securely on mount.");
addBullet("Governance Content-Type Bypass", "Bypassed content-type checks on empty POST requests (like /api/auth/session) so bootstrap handshakes complete successfully.");
addBullet("API Failover (Gemini 1.5)", "Created a transparent failover system using Google Gemini 1.5 Flash when OpenAI quota thresholds are reached, ensuring uninterrupted operations.");
addBullet("Live Mic Web Speech Integration", "Implemented Web Speech API integration in the frontend, enabling local speech recognition directly in the browser.");

// ══════════════════════════════════════════════════════════════════════════
// FOOTER & PAGE NUMBERS INGESTION
// ══════════════════════════════════════════════════════════════════════════

const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);

  // Footer text
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(
    `TrustInterview AI Architecture Report — Confidential`,
    50,
    795,
    { align: "left", width: 300 }
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

// Finalize and close the PDF
doc.end();

console.log("PDF Report successfully generated!");
