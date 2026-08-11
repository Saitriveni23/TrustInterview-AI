import ZTAStatusDashboard from "../components/ZTAStatusDashboard";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

function sanitize(val) {
  return val.replace(/[<>'"]/g, "").substring(0, 100);
}

function validateFile(file) {
  if (!file) return "Please select a file.";
  if (file.type !== "application/pdf") return "Only PDF files are accepted.";
  if (file.size > 10 * 1024 * 1024) return "File must be under 10MB.";
  return null;
}

const MOCK_PYQS_MAP = {
  "google": [
    "Design a distributed rate limiter that handles 10 million requests per second with less than 5ms latency.",
    "Given a binary tree, write a function to find the longest path containing nodes of the same color.",
    "Explain the differences between model parallelism and data parallelism during transformer training."
  ],
  "openai": [
    "Implement a custom multi-head self-attention layer from scratch in PyTorch.",
    "What are the computational bottlenecks of RLHF training and how does PPO alleviate them?",
    "Explain KV caching in autoregressive transformer inference and its memory scaling properties."
  ],
  "nvidia": [
    "Write a CUDA kernel to perform transpose of a 2D matrix in-place using shared memory.",
    "What is warp divergence and how do execution barrier synchronization primitives help?",
    "Optimize shared memory accesses for high throughput tensor operations."
  ],
  "anthropic": [
    "Explain the concept of Constitutional AI and how it differs from traditional reinforcement learning from human feedback.",
    "Write a prompt evaluation pipeline to detect refusal leaks in aligned LLMs.",
    "Design a system to detect prompt injection payloads in real-time."
  ],
  "microsoft": [
    "Write a function to detect a cycle in a directed graph.",
    "How does the Azure CosmosDB replication protocol handle eventual consistency under low network bandwidth?",
    "Explain index fragmentation in SQL Server and how you would troubleshoot it."
  ],
  "tcs": [
    "Reverse a singly linked list in-place.",
    "What is normalization in databases? Compare 2NF vs 3NF with examples.",
    "Explain the SDLC agile lifecycle models and sprint retrospective meetings."
  ],
  "palantir": [
    "Design a data pipeline orchestration system that handles backfill tasks with dynamic dependency resolution.",
    "How does Palantir Foundry manage fine-grained access control on parquet files?",
    "Explain DAG execution optimization in Apache Spark."
  ],
  "meta": [
    "Design a newsfeed ranking system that scales to 3 billion daily active users.",
    "Implement a trie data structure that supports insert, search, and startsWith.",
    "How would you optimize heap allocations in a high-throughput Go microservice?"
  ],
  "netflix": [
    "Design a content delivery system that minimizes latency for video streaming sessions globally.",
    "How does the Hystrix circuit breaker pattern prevent cascading failures in microservices?",
    "Implement a rate-limiting middleware in Spring Boot using Redis token bucket."
  ],
  "stripe": [
    "Design an API idempotent request key system that prevents double charges.",
    "Explain database transactions isolation levels and how you handle concurrent reads/writes on a ledger.",
    "Write a script to aggregate billing metrics from raw stripe webhook payload logs."
  ],
  "crowdstrike": [
    "How do you detect rootkits at the kernel layer? Compare hook-detection vs direct kernel object modification.",
    "Write a C script to intercept system calls via DLL injection.",
    "Explain memory address space layout randomization (ASLR) and how to bypass or enforce it."
  ],
  "cloudflare": [
    "How does a CDN mitigate a distributed denial-of-service (DDoS) syn flood attack?",
    "Write a WebAssembly script to inspect and mutate HTTP headers at the edge.",
    "Explain the TLS 1.3 handshake sequence compared to TLS 1.2."
  ],
  "aws": [
    "Design a highly available architecture on AWS that spans across multiple regions using Route53 latency routing.",
    "Explain the differences between VPC Peering and Transit Gateway under scale.",
    "Write a Terraform template to spin up a secure, multi-AZ ECS cluster."
  ],
  "databricks": [
    "Explain how Apache Spark's Catalyst optimizer plans queries.",
    "What is data skew in Spark? How do you detect it and what strategies can mitigate it?",
    "Explain the transaction model of Delta Lake tables."
  ]
};

const CORE_COMPANIES = [
  { name: "Google", role: "AI Research Associate", domain: "AI Engineering", cutoff: "8.5", pyq: "Google SWE 2025", skills: "Python, PyTorch, LLMs", description: "Design next-generation foundational models and optimize reinforcement learning loops.", spots: "12/50", fill: 24 },
  { name: "OpenAI", role: "Deep Learning Specialist", domain: "AI Engineering", cutoff: "9.0", pyq: "RVCE Campus Placements 2025", skills: "Transformers, RLHF, CUDA", description: "Train and align large multimodal models on massively parallel computing clusters.", spots: "5/20", fill: 25 },
  { name: "NVIDIA", role: "CUDA Developer", domain: "AI Engineering", cutoff: "8.7", pyq: "Nvidia Developer PYQ 2025", skills: "C++, CUDA, Deep Learning", description: "Optimize tensor core performance and build low-latency inference pipelines.", spots: "15/30", fill: 50 },
  { name: "Anthropic", role: "Model Safety Specialist", domain: "AI Engineering", cutoff: "8.9", pyq: "Anthropic Alignment PYQ", skills: "Python, PyTorch, Constitutional AI", description: "Develop evaluators and alignment protocols to verify model safety and helpfulness.", spots: "8/15", fill: 53 },
  
  { name: "Microsoft", role: "Data Science Analyst", domain: "Data Analytics", cutoff: "8.0", pyq: "Microsoft Developer 2024", skills: "SQL, PowerBI, Python", description: "Transform high-volume logs into actionable product telemetry insights.", spots: "22/100", fill: 22 },
  { name: "TCS", role: "Systems Engineer (Data)", domain: "Data Analytics", cutoff: "7.5", pyq: "TCS Digital & Ninja PYQs", skills: "Excel, SQL, Tableau", description: "Manage database migrations and build dashboards for global clients.", spots: "45/200", fill: 22 },
  { name: "Palantir", role: "Forward Deployed Analyst", domain: "Data Analytics", cutoff: "8.6", pyq: "Palantir Foundry Syllabus", skills: "Python, SQL, Spark", description: "Build data integrations on Palantir Foundry for enterprise and government workloads.", spots: "10/40", fill: 25 },
  
  { name: "Meta", role: "Production Engineer", domain: "Software Engineering", cutoff: "8.5", pyq: "Meta SWE PYQ 2024", skills: "C++, Systems, Go", description: "Scale globally distributed systems and debug real-time streaming infrastructure.", spots: "18/60", fill: 30 },
  { name: "Netflix", role: "Backend Engineer", domain: "Software Engineering", cutoff: "8.8", pyq: "Netflix Core SWE", skills: "Java, Spring, Microservices", description: "Architect low-latency streaming APIs and highly available datastores.", spots: "4/25", fill: 16 },
  { name: "Stripe", role: "API Platform Developer", domain: "Software Engineering", cutoff: "8.7", pyq: "Stripe API Design Syllabus", skills: "Ruby, Go, REST APIs", description: "Scale global billing pipelines and design clean, developer-friendly payment APIs.", spots: "6/30", fill: 20 },

  { name: "CrowdStrike", role: "SecOps Threat Hunter", domain: "Cybersecurity", cutoff: "8.3", pyq: "CrowdStrike Sec SWE", skills: "Go, Kernel Debugging, C", description: "Build endpoint telemetry sensors and analyze advanced persistent threats.", spots: "14/50", fill: 28 },
  { name: "Cloudflare", role: "Network Security Engineer", domain: "Cybersecurity", cutoff: "8.5", pyq: "Cloudflare Core Net", skills: "Rust, Wasm, DNS Security", description: "Architect edge firewall rules and optimize anti-DDoS scrubbing mitigation.", spots: "9/35", fill: 25 },

  { name: "AWS", role: "Cloud Solutions Architect", domain: "Cloud Computing", cutoff: "8.2", pyq: "AWS Solutions Solutions", skills: "AWS, Kubernetes, Terraform", description: "Design highly-available multitenant SaaS architectures and manage VPC networks.", spots: "30/120", fill: 25 },
  { name: "Databricks", role: "Spark Platform Engineer", domain: "Cloud Computing", cutoff: "8.6", pyq: "Databricks Core Cloud", skills: "Scala, Spark, AWS/Azure", description: "Optimize Delta Lake data lakes and scale distributed compute clusters.", spots: "11/40", fill: 27 },
];

const COMPANY_DATABASE = [];
for (let i = 0; i < 45; i++) {
  CORE_COMPANIES.forEach((c, idx) => {
    const suffix = i === 0 ? "" : ` #${i + 1}`;
    COMPANY_DATABASE.push({
      id: `${c.name.toLowerCase()}-${idx}-${i}`,
      name: `${c.name}${suffix}`,
      role: c.role,
      domain: c.domain,
      cutoff: c.cutoff,
      pyq: c.pyq,
      skills: c.skills,
      description: c.description,
      spots: c.spots,
      fill: c.fill
    });
  });
}

export default function Upload({ viewRole }) {
  const navigate  = useNavigate();
  const inputRef  = useRef();

  const [file,          setFile]          = useState(null);
  const [jobRole,       setJobRole]       = useState("");
  const [candidateName, setCandidateName] = useState(sessionStorage.getItem("candidateName") || "");
  const [error,         setError]         = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedCompanyData, setSelectedCompanyData] = useState(() => {
    const activeName = sessionStorage.getItem("companyName");
    if (activeName) {
      return COMPANY_DATABASE.find(c => c.name.toLowerCase() === activeName.toLowerCase()) || null;
    }
    return null;
  });
  const [isZtaDrawerOpen, setIsZtaDrawerOpen] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("pyqs");
  const [interviewType, setInterviewType] = useState(() => sessionStorage.getItem("interviewType") || "mock"); // "mock" or "actual"
  const [selectedInterviewMode, setSelectedInterviewMode] = useState(null); // null = Company Page, "mock" = Next Page Mock, "actual" = Next Page Actual
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentSidebarTab, setCurrentSidebarTab] = useState("dashboard");
  const [profileHistory, setProfileHistory] = useState([]);

  useEffect(() => {
    if (isProfileOpen || currentSidebarTab === "account") {
      const rawHistory = localStorage.getItem("candidateAssessmentHistory");
      if (rawHistory) {
        try {
          setProfileHistory(JSON.parse(rawHistory));
        } catch (e) {
          setProfileHistory([]);
        }
      }
    }
  }, [isProfileOpen, currentSidebarTab]);

  const [status,        setStatus]        = useState("idle");
  const [drag,          setDrag]          = useState(false);
  const [isBlocked,     setIsBlocked]     = useState(false);

  // Recruiter Session Settings
  const [recruiterCompany, setRecruiterCompany] = useState(sessionStorage.getItem("companyName") || "");
  const [minCgpa,          setMinCgpa]          = useState(sessionStorage.getItem("minCgpa") || "8.0");
  const [selectedPYQ,      setSelectedPYQ]      = useState(sessionStorage.getItem("selectedPYQ") || "Google SWE 2025");
  const [showSettings,     setShowSettings]     = useState(false);
  const [eligibilityCheck, setEligibilityCheck] = useState(null); // null, "checking", "passed", "failed"
  const [eligibilityLogs,  setEligibilityLogs]  = useState([]);

  // Multi-LLM, Hallucination Scanners & Email Alerts
  const [selectedLLM, setSelectedLLM] = useState(sessionStorage.getItem("selectedLLM") || "llama-3-edge");
  const [hallucinationTypes, setHallucinationTypes] = useState({
    cv: true,
    context: true,
    facts: true
  });
  const [notificationLogs, setNotificationLogs] = useState([]);

  const [selectedAgent, setSelectedAgent] = useState(() => sessionStorage.getItem("selectedAgent") || "skyy");
  const [paceTrackerEnabled, setPaceTrackerEnabled] = useState(() => sessionStorage.getItem("paceTrackerEnabled") !== "false");
  const [fillerScannerEnabled, setFillerScannerEnabled] = useState(() => sessionStorage.getItem("fillerScannerEnabled") !== "false");
  const [grammarScanEnabled, setGrammarScanEnabled] = useState(() => sessionStorage.getItem("grammarScanEnabled") !== "false");
  const [keywordMatchThreshold, setKeywordMatchThreshold] = useState(() => sessionStorage.getItem("keywordMatchThreshold") || "70");
  const [weightTechnical, setWeightTechnical] = useState(() => sessionStorage.getItem("weightTechnical") || "50");
  const [weightExperience, setWeightExperience] = useState(() => sessionStorage.getItem("weightExperience") || "30");
  const [weightAcademic, setWeightAcademic] = useState(() => sessionStorage.getItem("weightAcademic") || "20");
  const [proctorScreenShareEnforced, setProctorScreenShareEnforced] = useState(() => sessionStorage.getItem("proctorScreenShareEnforced") !== "false");
  const [proctorAiToolsDetection, setProctorAiToolsDetection] = useState(() => sessionStorage.getItem("proctorAiToolsDetection") !== "false");
  const [proctorAutoTerminate, setProctorAutoTerminate] = useState(() => sessionStorage.getItem("proctorAutoTerminate") !== "false");
  const [unblockMessage, setUnblockMessage] = useState("");

  useEffect(() => {
    sessionStorage.setItem("selectedAgent", selectedAgent);
    sessionStorage.setItem("paceTrackerEnabled", paceTrackerEnabled);
    sessionStorage.setItem("fillerScannerEnabled", fillerScannerEnabled);
    sessionStorage.setItem("grammarScanEnabled", grammarScanEnabled);
    sessionStorage.setItem("keywordMatchThreshold", keywordMatchThreshold);
    sessionStorage.setItem("weightTechnical", weightTechnical);
    sessionStorage.setItem("weightExperience", weightExperience);
    sessionStorage.setItem("weightAcademic", weightAcademic);
    sessionStorage.setItem("proctorScreenShareEnforced", proctorScreenShareEnforced);
    sessionStorage.setItem("proctorAiToolsDetection", proctorAiToolsDetection);
    sessionStorage.setItem("proctorAutoTerminate", proctorAutoTerminate);
  }, [
    selectedAgent, paceTrackerEnabled, fillerScannerEnabled, grammarScanEnabled,
    keywordMatchThreshold, weightTechnical, weightExperience, weightAcademic,
    proctorScreenShareEnforced, proctorAiToolsDetection, proctorAutoTerminate
  ]);

  async function handleResetIPBlock() {
    setUnblockMessage("Resetting...");
    try {
      const res = await fetch(`${API}/api/zta-status/reset`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setUnblockMessage("Candidate IP successfully unblocked!");
        setIsBlocked(false);
        setError("");
        setTimeout(() => setUnblockMessage(""), 4000);
      } else {
        setUnblockMessage("Failed: " + data.message);
      }
    } catch (e) {
      setUnblockMessage("Failed to reset IP block.");
    }
  }

  const role = viewRole || sessionStorage.getItem("ztaRole") || "candidate";
  const candScoreAvg = (cand) => cand.avgScore || cand.bestScore || 0;
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  async function fetchLeaderboard() {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${API}/api/interview/leaderboard`);
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.warn("Failed to fetch candidate roster:", e.message);
    } finally {
      setLoadingLeaderboard(false);
    }
  }

  useEffect(() => {
    if (role === "admin" && currentSidebarTab === "dashboard") {
      fetchLeaderboard();
    }
  }, [role, currentSidebarTab]);

  React.useEffect(() => {
    async function checkBlocked() {
      try {
        const res = await fetch(`${API}/api/zta-status`);
        const data = await res.json();
        if (data.fraudAlert) {
          setIsBlocked(true);
          setError("ZTA ALERT: This session has been blocked due to suspicious activity, headless testing, or policy violations.");
        } else {
          setIsBlocked(false);
        }
      } catch (e) {
        setIsBlocked(false);
      }
    }
    checkBlocked();
    const interval = setInterval(checkBlocked, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleRecruiterLogin(name, cgpa, pyq) {
    if (!name.trim()) return;
    sessionStorage.setItem("companyName", name.trim());
    sessionStorage.setItem("minCgpa", cgpa);
    sessionStorage.setItem("selectedPYQ", pyq);
    setRecruiterCompany(name.trim());
    setMinCgpa(cgpa);
    setSelectedPYQ(pyq);
    setShowSettings(false);
  }

  function handleRecruiterLogout() {
    sessionStorage.removeItem("companyName");
    sessionStorage.removeItem("minCgpa");
    sessionStorage.removeItem("selectedPYQ");
    setRecruiterCompany("");
    setMinCgpa("8.0");
    setSelectedPYQ("Google SWE 2025");
    setEligibilityCheck(null);
    setEligibilityLogs([]);
  }

  async function triggerNotificationAlert(companyName, minCgpaVal, pyq, role) {
    try {
      const res = await fetch(`${API}/api/interview/notify-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, minCgpa: minCgpaVal, selectedPYQ: pyq, jobRole: role }),
      });
      const data = await res.json();
      if (data.success) {
        setNotificationLogs(data.logs);
        // Auto clear logs after 8 seconds
        setTimeout(() => setNotificationLogs([]), 8000);
      }
    } catch (err) {
      console.error("Failed to trigger student emails:", err.message);
    }
  }

  function handleFile(f) {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError("");
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleSubmit() {
    if (validateFile(file)) { setError(validateFile(file)); return; }
    if (!jobRole.trim())     { setError("Please enter the job role."); return; }
    if (!candidateName.trim()) { setError("Please enter your name."); return; }

    setError("");

    try {
      setStatus("connecting");
      const sessionRes = await fetch(`${API}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const sessionData = await sessionRes.json();
      const token = sessionData.token;

      setStatus("uploading");
      const formData = new FormData();
      formData.append("resume", file);

      const uploadRes = await fetch(`${API}/api/resume/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      // ── ZTA-L2 / L9: Validate name & role before proceeding ──────────────
      setStatus("connecting");
      setEligibilityLogs(["[ZTA-L2] Verifying candidate identity against resume...", "[ZTA-L9] Checking role relevance..."]);
      setEligibilityCheck("checking");

      const validateRes = await fetch(`${API}/api/resume/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resumeText:   uploadData.resumeText,
          enteredName:  candidateName.trim(),
          jobRole:      jobRole.trim(),
        }),
      });
      const validateData = await validateRes.json();

      if (validateData.blocked) {
        const lines = [];
        if (!validateData.nameMatch) {
          lines.push(
            validateData.extractedName
              ? `⚠️ NAME MISMATCH — Resume belongs to: "${validateData.extractedName}"\n   You entered: "${candidateName.trim()}"\n   Please upload YOUR OWN resume, or fix your name.`
              : `⚠️ NAME NOT FOUND — Could not detect a name in your resume. Upload a proper text-based resume.`
          );
        }
        if (!validateData.roleMatch) {
          lines.push(
            `⚠️ ROLE MISMATCH — No evidence of "${jobRole.trim()}" skills in your resume.\n   Found keywords: ${validateData.roleKeywordsFound?.join(", ") || "none"}.\n   Please apply for a role that matches your background.`
          );
        }
        setEligibilityCheck("failed");
        setEligibilityLogs(prev => [...prev, ...lines.map(l => `[ZTA-BLOCK] ${l.split("\n")[0]}`)]);
        throw new Error(lines.join("\n\n"));
      }

      setEligibilityLogs(prev => [
        ...prev,
        `[ZTA-L2] ✓ Name verified: "${validateData.extractedName || candidateName}" (similarity: ${(validateData.nameSimilarity * 100).toFixed(0)}%)`,
        `[ZTA-L9] ✓ Role relevance confirmed: ${validateData.roleKeywordsFound?.length} keywords found`,
      ]);

      // Running Layer 9 Placement Eligibility PDP check
      setStatus("checking_eligibility");
      setEligibilityLogs(prev => [
        ...prev,
        "[L9 PDP] Initializing Zero Trust Eligibility Pipeline...",
        `[L9 PDP] Fetching candidate academic profile for: ${candidateName.trim()}`,
      ]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Parse CGPA from resumeText or fallback
      let cgpa = 8.8; // default fallback
      const cgpaRegex = /(?:cgpa|gpa|marks|pointer)[\s:]*([0-9.]+)/i;
      const match = uploadData.resumeText.match(cgpaRegex);
      if (match) {
        const parsed = parseFloat(match[1]);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
          cgpa = parsed;
        }
      } else {
        const generalMatch = uploadData.resumeText.match(/\b([6-9]\.[0-9]+)\b/);
        if (generalMatch) {
          cgpa = parseFloat(generalMatch[1]);
        }
      }

      const companyCutoff = selectedCompanyData ? parseFloat(selectedCompanyData.cutoff) : 8.0;
      setEligibilityLogs(prev => [
        ...prev,
        `[L9 PDP] Scanning resume text blocks for academic credentials...`,
        `[L9 PDP] Found candidate CGPA value: ${cgpa.toFixed(2)}`,
        `[L9 PDP] Placement criteria cutoff: >= ${companyCutoff.toFixed(2)}`,
      ]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (role === "candidate" || cgpa >= companyCutoff) {
        setEligibilityCheck("passed");
        setEligibilityLogs(prev => [
          ...prev,
          `[L9 PDP] MATCH SUCCESS: Candidate meets RVCE placement cell eligibility standards.`,
          `[L9 PDP] Forwarding secure profile token to LLM generation cluster...`
        ]);
      } else {
        setEligibilityCheck("failed");
        setEligibilityLogs(prev => [
          ...prev,
          `[L9 PDP] MATCH FAILED: Candidate CGPA (${cgpa.toFixed(2)}) is below company cutoff (${companyCutoff.toFixed(2)}).`,
          `[L9 PDP] Session Blocked. Evaluation aborted due to academic eligibility failure.`
        ]);
        throw new Error(`Academic Eligibility Failure: Your CGPA (${cgpa.toFixed(2)}) does not meet ${selectedCompanyData.name}'s cutoff of ${companyCutoff.toFixed(2)}.`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus("generating");
      const qRes = await fetch(`${API}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resumeText:    uploadData.resumeText,
          jobRole:       sanitize(jobRole),
          candidateName: sanitize(validateData.extractedName || candidateName),
          companyName:   selectedCompanyData ? selectedCompanyData.name : "",
          companyPYQ:    selectedCompanyData ? selectedCompanyData.pyq : "",
          llmModel:      selectedLLM,
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error || "Failed to generate questions");

      setStatus("done");

      const confirmedName = validateData.extractedName || candidateName.trim();

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("zta_token", token);
      sessionStorage.setItem("ztaToken", token);
      sessionStorage.setItem("ztaRole", "candidate");
      sessionStorage.setItem("ztaIssuedAt", Date.now().toString());
      sessionStorage.setItem("resumeText",    uploadData.resumeText);
      sessionStorage.setItem("jobRole",       jobRole.trim());
      sessionStorage.setItem("candidateName", confirmedName);
      sessionStorage.setItem("questions",     JSON.stringify(qData.questions));
      sessionStorage.setItem("biasReport",    JSON.stringify(qData.biasReport));
      sessionStorage.setItem("interviewType", selectedInterviewMode || interviewType || "mock");
      sessionStorage.setItem("selectedLLM",   selectedLLM);
      sessionStorage.setItem("hallucinationTypes", JSON.stringify(hallucinationTypes));

      navigate("/interview");

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  const busy = ["connecting", "uploading", "checking_eligibility", "generating"].includes(status);

  const domains = ["All", "AI Engineering", "Data Analytics", "Software Engineering", "Cybersecurity", "Cloud Computing"];

  const filteredCompanies = COMPANY_DATABASE.filter(c => {
    const matchesDomain = selectedDomain === "All" || c.domain === selectedDomain;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.skills.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#06060f", position: "relative" }}>
      {/* ── Left Sidebar (Option A/C hybrid) ── */}
      <aside style={{
        width: "240px",
        background: "rgba(10, 11, 20, 0.95)",
        borderRight: "1px solid rgba(139, 92, 246, 0.15)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        boxSizing: "border-box",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 150,
      }}>
        {/* Logo and Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", paddingLeft: "8px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
          }}>
            🤖
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 900, color: "#f0f0ff", fontFamily: "var(--font-headings)", letterSpacing: "-0.02em" }}>
              TrustInterview<span style={{ color: "#a78bfa" }}> AI</span>
            </div>
            <div style={{ fontSize: "9.5px", color: "#4a4a6a", fontWeight: 700, letterSpacing: "0.05em" }}>
              RVCE PLACEMENT
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          {[
            { label: "Dashboard", icon: "⊞", active: currentSidebarTab === "dashboard", onClick: () => { setCurrentSidebarTab("dashboard"); setSelectedCompanyData(null); setSelectedInterviewMode(null); } },
            { label: "Prep Material", icon: "📖", active: currentSidebarTab === "prep", showForCandidateOnly: true, onClick: () => { setCurrentSidebarTab("prep"); setSelectedCompanyData(null); } },
            { label: "Mock Interviews", icon: "🎙️", active: currentSidebarTab === "mock", showForCandidateOnly: true, onClick: () => { setCurrentSidebarTab("mock"); setSelectedCompanyData(null); } },
            { label: "Calendar", icon: "📅", active: currentSidebarTab === "calendar", showForCandidateOnly: true, onClick: () => { setCurrentSidebarTab("calendar"); setSelectedCompanyData(null); } },
            { label: "Account", icon: "👤", active: currentSidebarTab === "account", onClick: () => { setCurrentSidebarTab("account"); setSelectedCompanyData(null); } },
            { label: "Settings", icon: "⚙️", active: currentSidebarTab === "settings", showForAdminOnly: true, onClick: () => { setCurrentSidebarTab("settings"); setSelectedCompanyData(null); } },
            { label: "Help", icon: "❓", active: currentSidebarTab === "help", onClick: () => { setCurrentSidebarTab("help"); setSelectedCompanyData(null); } },
            { label: "Security Matrix", icon: "🛡️", showForAdminOnly: true, onClick: () => setIsZtaDrawerOpen(true) },
          ].filter(item => {
            if (item.showForCandidateOnly && role !== "candidate") return false;
            if (item.showForAdminOnly && role !== "admin") return false;
            return true;
          }).map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              disabled={item.disabled}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                width: "100%", padding: "10px 14px", borderRadius: "12px", border: "none",
                background: item.active ? "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))" : "transparent",
                color: item.active ? "#c4b5fd" : (item.disabled ? "#2d2d44" : "#6b6b90"),
                fontSize: "13.5px", fontWeight: 700, cursor: item.disabled ? "not-allowed" : "pointer",
                fontFamily: "var(--font-headings)", textAlign: "left",
                transition: "all 0.2s",
                borderLeft: item.active ? "3px solid #7c3aed" : "3px solid transparent",
                boxShadow: item.active ? "0 0 15px rgba(124, 58, 237, 0.15)" : "none",
              }}
              onMouseEnter={e => { if(!item.active && !item.disabled) { e.currentTarget.style.color="#f0f0ff"; e.currentTarget.style.background="rgba(255,255,255,0.03)"; } }}
              onMouseLeave={e => { if(!item.active && !item.disabled) { e.currentTarget.style.color="#6b6b90"; e.currentTarget.style.background="transparent"; } }}
            >
              <span style={{ fontSize: "16px", width: "20px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer / ZTA Indicator */}
        <div style={{
          background: "rgba(16, 185, 129, 0.04)",
          border: "1px solid rgba(16, 185, 129, 0.15)",
          borderRadius: "10px", padding: "10px", marginTop: "auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", animation: "ztaPulse 2s infinite" }} />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#10b981", letterSpacing: "0.05em" }}>ZTA SHIELD ACTIVE</span>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div style={{ flex: 1, marginLeft: "240px", minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top Navbar */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: "64px",
          background: "rgba(6, 6, 15, 0.8)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(139, 92, 246, 0.12)",
          gap: "16px",
        }}>
          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontSize: "14px", fontWeight: 800, color: "#f0f0ff",
              fontFamily: "var(--font-headings)", letterSpacing: "-0.01em"
            }}>
              TrustInterview <span style={{ color: "#a78bfa" }}>AI</span>
            </span>
            <span className="zta-badge" style={{ fontSize: "9px", padding: "2px 7px" }}>
              <span className="pulse-dot" /> L9 PDP
            </span>
          </div>

          {/* Search bar in the center */}
          <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
            <input
              type="text"
              placeholder="Search companies, drives, stack..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setVisibleCount(6); }}
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(139, 92, 246, 0.15)",
                borderRadius: "20px",
                padding: "8px 16px 8px 36px",
                color: "#f0f0ff",
                fontSize: "13px",
                outline: "none",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s",
              }}
              onFocus={e => { e.target.style.borderColor = "#7c3aed"; e.target.style.background = "rgba(139, 92, 246, 0.05)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(139, 92, 246, 0.15)"; e.target.style.background = "rgba(255, 255, 255, 0.03)"; }}
            />
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#4a4a6a", fontSize: "14px" }}>🔍</span>
          </div>

          {/* User & Logout info */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div 
              onClick={() => setIsProfileOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            >
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 800, color: "#fff",
              }}>
                {(candidateName || "C").charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#d4d4f0", fontFamily: "var(--font-headings)" }}>
                {(candidateName || "Candidate").split(" ")[0]}
              </span>
            </div>

            <button
              onClick={() => { sessionStorage.clear(); localStorage.removeItem("userGoogleAccount"); navigate(role === "admin" ? "/recruiter" : "/login"); }}
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
                color: "#f87171", fontSize: "12px", fontWeight: 700,
                fontFamily: "var(--font-headings)", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content page area */}
        <main style={{ flex: 1, padding: "32px 40px 48px", overflowY: "auto" }}>
          {/* Two-Column Premium Hero Section */}
          <div style={{
            display: "grid",
            gridTemplateColumns: (selectedCompanyData || currentSidebarTab !== "dashboard" || role === "admin") ? "1fr" : "1.8fr 1fr",
            gap: "24px",
            marginBottom: "32px",
            alignItems: "stretch"
          }}>
            {/* Left Column: Title & Stats */}
            <div style={{
              background: "rgba(10, 10, 22, 0.6)",
              border: "1px solid rgba(139, 92, 246, 0.12)",
              borderRadius: "20px",
              padding: "28px 32px",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              {/* Background glow */}
              <div style={{ position: "absolute", top: "-30%", right: "-5%", width: "250px", height: "250px", borderRadius: "50%", background: "rgba(124, 58, 237, 0.05)", filter: "blur(80px)", pointerEvents: "none" }} />
              
              <div>
                <span className="rvce-badge">
                  • ZERO TRUST ARCHITECTURE • RVCE BENGALURU PLACEMENTS CELL •
                </span>
                <h1 style={{ display: "flex", gap: "12px", alignItems: "baseline", margin: "10px 0 6px", position: "relative" }}>
                  <span className="gradient-title-main">
                    {currentSidebarTab === "dashboard" ? (role === "admin" ? "Recruiter command console" : (selectedCompanyData ? selectedCompanyData.name : "Placements 2025-26")) : (
                      currentSidebarTab === "prep" ? "Preparation Hub" :
                      currentSidebarTab === "mock" ? "Practice Mock Sandbox" :
                      currentSidebarTab === "calendar" ? "Placements Schedule" :
                      currentSidebarTab === "account" ? (role === "admin" ? "Recruiter Profile" : "Candidate Profile") :
                      currentSidebarTab === "settings" ? "Recruiter & Security Controls" :
                      currentSidebarTab === "help" ? "Help Center" : ""
                    )}
                  </span>
                  {selectedCompanyData && currentSidebarTab === "dashboard" && (
                    <span className="gradient-title-sub">
                      Assessment
                    </span>
                  )}
                </h1>
                <p className="premium-subtitle" style={{ marginBottom: (selectedCompanyData || currentSidebarTab !== "dashboard") ? "0" : "20px", color: "#6b6b90" }}>
                  {currentSidebarTab === "dashboard" ? (
                    role === "admin"
                      ? "Real-time coordinator commands for placement drives, student score aggregates, and proctor compliance matrices."
                      : (selectedCompanyData
                          ? `Conducting secure, AI-grounded assessments for candidate hiring under ${selectedCompanyData.name} placement criteria.`
                          : "Discover active hiring campaigns across RVCE engineering domains. Select a partner brand to initialize your interview session.")
                  ) : (
                    currentSidebarTab === "prep" ? "Access curated courses, coding sheets, system design materials, and behavioral guidelines." :
                    currentSidebarTab === "mock" ? "Launch generic mock runs using simulated assessment sandboxes to test skills." :
                    currentSidebarTab === "calendar" ? "Track upcoming recruitment drives, coordinator syncs, and test deadlines." :
                    currentSidebarTab === "account" ? "Review verified placement credentials, CGPA status, and drive results." :
                    currentSidebarTab === "settings" ? "Manage LLM model routing thresholds, minimum CGPA policies, and security variables." :
                    currentSidebarTab === "help" ? "Get help regarding resume parser rejections, CGPA validation blocks, or drive processes." : ""
                  )}
                </p>
              </div>

              {/* Stats row with Option A style (white cards with colored left borders) on Option C background */}
              {!selectedCompanyData && currentSidebarTab === "dashboard" && (
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
                  {(role === "admin" ? [
                    { label: "Enrolled Candidates", value: leaderboard.length, color: "#7c3aed", border: "#7c3aed" },
                    { label: "Sessions Graded",    value: leaderboard.reduce((acc, c) => acc + (c.totalSessions || 0), 0), color: "#06b6d4", border: "#06b6d4" },
                    { label: "Average Performance", value: leaderboard.length ? `${(leaderboard.reduce((acc, c) => acc + (candScoreAvg(c)), 0) / leaderboard.length).toFixed(1)}%` : "0%", color: "#10b981", border: "#10b981" },
                    { label: "Proctor Warnings",  value: isBlocked ? "1 (Active Block)" : "0 (Clear)", color: "#ef4444", border: "#ef4444" },
                  ] : [
                    { label: "Total Drives",    value: COMPANY_DATABASE.length,  color: "#7c3aed", border: "#7c3aed" },
                    { label: "Open Spots",      value: "400+",                    color: "#06b6d4", border: "#06b6d4" },
                    { label: "Students Placed",  value: "363",                     color: "#10b981", border: "#10b981" },
                    { label: "Partner Brands",  value: "14+",                     color: "#f59e0b", border: "#f59e0b" },
                  ]).map((s, i) => (
                    <div key={i} style={{
                      flex: 1,
                      minWidth: "110px",
                      padding: "14px 18px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderLeft: `4px solid ${s.border}`,
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                    }}>
                      <div style={{ fontSize: "11px", color: "#6b6b90", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{s.label}</div>
                      <div style={{ fontSize: "24px", fontWeight: 950, fontFamily: "var(--font-headings)", color: "#f0f0ff", lineHeight: 1.1 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: "Active Session" Card (Option C style) */}
            {!selectedCompanyData && currentSidebarTab === "dashboard" && role === "candidate" && (
              <div style={{
                background: "rgba(10, 10, 22, 0.6)",
                border: "1px solid rgba(139, 92, 246, 0.12)",
                borderRadius: "20px",
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b6b90", letterSpacing: "0.08em", textTransform: "uppercase" }}>Active Session</span>
                  <span className="zta-badge" style={{ fontSize: "9px" }}>
                    <span className="pulse-dot" /> LIVE
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Candidate Initials avatar */}
                  <div style={{
                    width: "52px", height: "52px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px", fontWeight: 900, color: "#fff",
                    boxShadow: "0 4px 14px rgba(124, 58, 237, 0.35)",
                    border: "2px solid rgba(139, 92, 246, 0.25)"
                  }}>
                    {(candidateName || "C").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0ff", margin: 0, fontFamily: "var(--font-headings)" }}>
                      {candidateName || "Candidate Profile"}
                    </h4>
                    <p style={{ fontSize: "12px", color: "#6b6b90", margin: "2px 0 0" }}>
                      RVCE Placement Candidate
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#4a4a6a", fontWeight: 700, letterSpacing: "0.05em" }}>ZTA ELIGIBILITY</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: eligibilityCheck === "passed" ? "#34d399" : (eligibilityCheck === "failed" ? "#f87171" : "#f59e0b"), marginTop: "2px" }}>
                      {eligibilityCheck === "passed" ? "✓ ELIGIBLE" : (eligibilityCheck === "failed" ? "✗ BLOCKED" : "PENDING UPLOAD")}
                    </div>
                  </div>

                  {/* Nice circular progress indicator/dot */}
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.05)",
                    borderTopColor: eligibilityCheck === "passed" ? "#10b981" : (eligibilityCheck === "failed" ? "#ef4444" : "#f59e0b"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 800,
                    color: eligibilityCheck === "passed" ? "#34d399" : (eligibilityCheck === "failed" ? "#f87171" : "#f59e0b"),
                    animation: eligibilityCheck === "checking" ? "spin 1s linear infinite" : "none"
                  }}>
                    {eligibilityCheck === "passed" ? "100%" : (eligibilityCheck === "failed" ? "0%" : "—")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Email Notifications Alert Console */}
          {notificationLogs.length > 0 && (
            <div className="glass-card fade-in-up" style={{
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "24px",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#67e8f9"
            }}>
              <div style={{ fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📨</span> AUTOMATED RECRUITMENT EMAIL BROADCAST LOGS:
              </div>
              {notificationLogs.map((log, index) => (
                <div key={index} style={{ margin: "4px 0" }}>{log}</div>
              ))}
            </div>
          )}

          {/* Tab Views Routing Logic */}
          {currentSidebarTab === "dashboard" ? (
            !selectedCompanyData ? (
              role === "admin" ? (
                /* ====================================================
                   RECRUITER ACCESS: CANDIDATE EVALUATION ROSTER
                   ==================================================== */
                <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                      <h3 style={{ color: "#f0f0ff", fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-headings)" }}>Candidate Evaluation Roster</h3>
                      <p style={{ color: "#6b6b90", fontSize: "13px", marginTop: "2px" }}>Verify grades, performance scores, and compliance metrics per candidate.</p>
                    </div>
                    <button
                      onClick={fetchLeaderboard}
                      className="ghost-btn"
                      disabled={loadingLeaderboard}
                      style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      {loadingLeaderboard ? "Refreshing..." : "⟳ Refresh Roster"}
                    </button>
                  </div>

                  {loadingLeaderboard ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6b6b90", fontSize: "14px" }}>
                      <span style={{ display: "inline-block", width: "20px", height: "20px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite", marginRight: "10px", verticalAlign: "middle" }} />
                      Loading candidate credentials...
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6b6b90", fontSize: "14px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "12px" }}>
                      No assessments completed in this campaign yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <th style={{ padding: "12px", color: "#6b6b90", fontWeight: 700 }}>CANDIDATE</th>
                            <th style={{ padding: "12px", color: "#6b6b90", fontWeight: 700 }}>SESSIONS</th>
                            <th style={{ padding: "12px", color: "#6b6b90", fontWeight: 700 }}>AVERAGE SCORE</th>
                            <th style={{ padding: "12px", color: "#6b6b90", fontWeight: 700 }}>BEST SCORE</th>
                            <th style={{ padding: "12px", color: "#6b6b90", fontWeight: 700 }}>COMPLIANCE STATUS</th>
                            <th style={{ padding: "12px", color: "#6b6b90", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((cand, idx) => {
                            const isCandBlocked = cand.avgScore < 4.0;
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                <td style={{ padding: "14px 12px", display: "flex", alignItems: "center", gap: "12px" }}>
                                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "#c4b5fd" }}>
                                    {cand.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ color: "#f0f0ff", fontWeight: 700 }}>{cand.name}</div>
                                    <div style={{ color: "#4a4a6a", fontSize: "11px" }}>{cand.email}</div>
                                  </div>
                                </td>
                                <td style={{ padding: "14px 12px", color: "#d4d4f0" }}>{cand.totalSessions}</td>
                                <td style={{ padding: "14px 12px", fontWeight: 700, color: cand.avgScore >= 7.5 ? "#34d399" : cand.avgScore >= 5.0 ? "#f59e0b" : "#ef4444" }}>
                                  {cand.avgScore}%
                                </td>
                                <td style={{ padding: "14px 12px", fontWeight: 800, color: "#a78bfa" }}>{cand.bestScore}%</td>
                                <td style={{ padding: "14px 12px" }}>
                                  <span style={{
                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                    fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                                    background: isCandBlocked ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                    color: isCandBlocked ? "#f87171" : "#34d399",
                                    border: isCandBlocked ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(16,185,129,0.2)"
                                  }}>
                                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isCandBlocked ? "#ef4444" : "#10b981" }} />
                                    {isCandBlocked ? "VERIFICATION FAILED" : "✓ ZTA SECURED"}
                                  </span>
                                </td>
                                <td style={{ padding: "14px 12px", textAlign: "right" }}>
                                  <button
                                    onClick={async () => {
                                      await handleResetIPBlock();
                                    }}
                                    className="ghost-btn"
                                    style={{ padding: "6px 12px", fontSize: "11px", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}
                                  >
                                    Reset Block
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* ====================================================
                   SLIDE 1: PLACEMENTS CAMPAIGNS CATALOG
                   ==================================================== */
                <div className="fade-in-up">
                {/* Categories Pills Filters */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {domains.map(d => {
                      const isActive = selectedDomain === d;
                      const count = COMPANY_DATABASE.filter(c => d === "All" || c.domain === d).length;
                      return (
                        <button
                          key={d}
                          onClick={() => { setSelectedDomain(d); setVisibleCount(6); }}
                          style={{
                            background: isActive ? "linear-gradient(135deg, var(--color-primary), #6366f1)" : "rgba(255, 255, 255, 0.02)",
                            border: isActive ? "1px solid var(--color-primary)" : "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "20px",
                            padding: "6px 14px",
                            color: isActive ? "#ffffff" : "var(--text-muted)",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "var(--font-headings)",
                            transition: "all 0.2s"
                          }}
                        >
                          {d.toUpperCase()} <span style={{ marginLeft: "4px", fontSize: "10px", opacity: 0.8 }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Company Cards Grid (3 Columns) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                  {filteredCompanies.slice(0, visibleCount).map(comp => {
                    const domainTheme = {
                      "AI Engineering":       { from: "#7c3aed", to: "#6366f1", text: "#c4b5fd", bg: "rgba(124,58,237,0.1)",  border: "rgba(139,92,246,0.3)",  badge: "rgba(124,58,237,0.15)" },
                      "Data Analytics":       { from: "#0891b2", to: "#06b6d4", text: "#67e8f9", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.3)",   badge: "rgba(6,182,212,0.15)" },
                      "Software Engineering": { from: "#059669", to: "#10b981", text: "#6ee7b7", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  badge: "rgba(16,185,129,0.15)" },
                      "Cybersecurity":        { from: "#dc2626", to: "#ef4444", text: "#fca5a5", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   badge: "rgba(239,68,68,0.15)" },
                      "Cloud Computing":      { from: "#d97706", to: "#f59e0b", text: "#fcd34d", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  badge: "rgba(245,158,11,0.15)" },
                    };
                    const theme = domainTheme[comp.domain] || domainTheme["AI Engineering"];
                    const initials = comp.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
                    const fillPct = Math.min(100, Math.round((parseInt(comp.spots) / (parseInt(comp.spots) + 10)) * 100));

                    return (
                      <div
                        key={comp.id}
                        onClick={() => {
                          setSelectedCompanyData(comp);
                          handleRecruiterLogin(comp.name, comp.cutoff, comp.pyq);
                          setJobRole(comp.role);
                          triggerNotificationAlert(comp.name, comp.cutoff, comp.pyq, comp.role);
                          setSelectedInterviewMode(null);
                        }}
                        style={{
                          background: "rgba(8, 8, 20, 0.9)",
                          border: `1px solid ${theme.border}`,
                          borderRadius: "18px",
                          cursor: "pointer",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                          boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
                          backdropFilter: "blur(12px)",
                          position: "relative",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px ${theme.border}, 0 0 30px ${theme.bg}`;
                          e.currentTarget.style.borderColor = theme.from;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
                          e.currentTarget.style.borderColor = theme.border;
                        }}
                      >
                        <div style={{ height: "3px", background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }} />
                        <div style={{
                          padding: "18px 20px 14px",
                          background: `linear-gradient(135deg, ${theme.bg}, transparent)`,
                          borderBottom: `1px solid rgba(255,255,255,0.04)`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{
                              width: "44px", height: "44px", borderRadius: "12px",
                              background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "16px", fontWeight: 900, color: "#fff",
                              boxShadow: `0 4px 14px ${theme.bg}`,
                              flexShrink: 0,
                            }}>
                              {initials}
                            </div>
                            <span style={{
                              fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.08em",
                              textTransform: "uppercase", color: theme.text,
                              background: theme.badge,
                              border: `1px solid ${theme.border}`,
                              padding: "3px 8px", borderRadius: "6px",
                            }}>
                              {comp.domain}
                            </span>
                          </div>
                          <div style={{ marginTop: "12px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0ff", margin: "0 0 3px", fontFamily: "var(--font-headings)" }}>
                              {comp.name}
                            </h3>
                            <div style={{ fontSize: "13px", color: theme.text, fontWeight: 600 }}>
                              {comp.role}
                            </div>
                          </div>
                        </div>

                        <div style={{ padding: "14px 20px 18px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                          <p style={{ fontSize: "12px", color: "#4a4a6a", margin: 0, lineHeight: 1.6, flex: 1 }}>
                            {comp.description}
                          </p>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "5px", fontWeight: 700 }}>
                              <span style={{ color: "#4a4a6a" }}>PLACEMENTS FILL RATE</span>
                              <span style={{ color: theme.text }}>{comp.spots} spots filled</span>
                            </div>
                            <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ width: `${fillPct}%`, height: "100%", background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#34d399", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", padding: "3px 10px", borderRadius: "8px" }}>
                              CGPA ≥ {comp.cutoff}
                            </span>
                            <span style={{ fontSize: "11px", color: "#4a4a6a" }}>📚 PYQ syllabus</span>
                          </div>

                          <button
                            style={{
                              width: "100%", padding: "10px", marginTop: "8px", background: "transparent",
                              border: `1px solid ${theme.border}`, color: theme.text, borderRadius: "10px",
                              fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-headings)", cursor: "pointer",
                              transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${theme.from}, ${theme.to})`;
                              e.currentTarget.style.color = "#fff";
                              e.currentTarget.style.borderColor = "transparent";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = theme.text;
                              e.currentTarget.style.borderColor = theme.border;
                            }}
                          >
                            Start Interview ➔
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredCompanies.length > visibleCount && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                    <button
                      onClick={() => setVisibleCount(prev => prev + 6)}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#cbd5e1", borderRadius: "20px", padding: "8px 24px", fontSize: "12px",
                        fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                      }}
                      className="glow-btn"
                    >
                      Load More Companies ({filteredCompanies.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            ) ) : (
              /* ====================================================
                 SLIDE 2: SELECTED COMPANY FOCUSED WORKSPACE
                 ==================================================== */
              <div className="fade-in-up">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
                  <button
                    onClick={() => {
                      handleRecruiterLogout();
                      setSelectedCompanyData(null);
                      setShowSettings(false);
                      setSelectedInterviewMode(null);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "20px", color: "#cbd5e1", fontSize: "12.5px", fontWeight: 700,
                      cursor: "pointer", padding: "8px 20px", display: "flex", alignItems: "center",
                      gap: "8px", fontFamily: "var(--font-headings)", transition: "all 0.2s"
                    }}
                    className="glow-btn"
                  >
                    ← Back to Placements Catalog
                  </button>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(16, 185, 129, 0.2)", fontWeight: 700 }}>
                      CGPA Cutoff &gt;= {selectedCompanyData.cutoff}
                    </span>
                    <span style={{ fontSize: "12px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(56, 189, 248, 0.2)", fontWeight: 700 }}>
                      {selectedCompanyData.spots} spots filled
                    </span>
                  </div>
                </div>

                {selectedInterviewMode === null ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    {/* Mock Interview */}
                    <div className="glass-card" style={{ padding: "28px", background: "rgba(10, 10, 22, 0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <span className="badge badge-info">PRACTICE SANDBOX</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Unlimited Attempts</span>
                      </div>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", marginBottom: "8px", fontFamily: "var(--font-headings)" }}>
                        Option 1: Practice Mock Interview
                      </h3>
                      <p style={{ color: "#6b6b90", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
                        Take a low-stakes mock interview designed specifically for Google's engineering standard. 
                        Assess your knowledge with instant performance grades. This session does NOT count toward college placements logs.
                      </p>
                      <button
                        onClick={() => { setSelectedInterviewMode("mock"); setInterviewType("mock"); sessionStorage.setItem("interviewType", "mock"); }}
                        className="ghost-btn"
                        style={{ width: "100%", padding: "12px", fontSize: "13.5px" }}
                      >
                        Enter Practice Sandbox →
                      </button>
                    </div>

                    {/* Official Drive */}
                    <div className="glass-card" style={{ padding: "28px", background: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <span className="badge badge-success">🏆 OFFICIAL DRIVE</span>
                        <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 700 }}>1 Graded Attempt</span>
                      </div>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", marginBottom: "8px", fontFamily: "var(--font-headings)" }}>
                        Option 2: Graded Placement Drive
                      </h3>
                      <p style={{ color: "#6b6b90", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
                        Conduct the official placement round. Answers are rigorously evaluated by LLM. 
                        Grade reports are verified and forwarded to the RVCE Placement dashboard for recruitment cataloging.
                      </p>
                      <button
                        onClick={() => { setSelectedInterviewMode("actual"); setInterviewType("actual"); sessionStorage.setItem("interviewType", "actual"); }}
                        className="glow-btn"
                        style={{ width: "100%", padding: "12px", fontSize: "13.5px", background: "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        Launch Graded Placement Round →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px" }} className="fade-in-up">
                    <div style={styles.leftCol}>
                      <div className="glass-card" style={styles.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h2 style={styles.title}>
                            {selectedInterviewMode === "actual" ? "🏆 Graded Placement Drive" : "🧪 Practice Mock Sandbox"}
                          </h2>
                          <button
                            onClick={() => setSelectedInterviewMode(null)}
                            style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-headings)" }}
                          >
                            Change Mode
                          </button>
                        </div>
                        <p style={styles.sub}>
                          {selectedInterviewMode === "actual"
                            ? `Submit your verified credentials to start the official recruitment interview for ${selectedCompanyData.name}.`
                            : "Upload your resume to calibrate practice mock questions for the selected role."}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label style={styles.label}>CANDIDATE FULL NAME</label>
                            <input
                              className="input-field"
                              type="text"
                              placeholder="Enter your full name"
                              value={candidateName}
                              onChange={e => setCandidateName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={styles.label}>TARGET JOB ROLE</label>
                            <input
                              className="input-field"
                              type="text"
                              placeholder="Enter job role"
                              value={jobRole}
                              onChange={e => setJobRole(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={styles.label}>
                              <span>RESUME DOCUMENT (PDF)</span>
                              <span style={{ fontSize: "11px", color: "var(--color-primary-light)" }}>*Text-based PDF only</span>
                            </label>
                            <div
                              className={`drag-zone ${drag ? "active" : ""}`}
                              onDragOver={e => { e.preventDefault(); setDrag(true); }}
                              onDragLeave={() => setDrag(false)}
                              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                              onClick={() => inputRef.current.click()}
                            >
                              <input
                                type="file"
                                ref={inputRef}
                                onChange={e => { const f = e.target.files[0]; if (f) setFile(f); }}
                                style={{ display: "none" }}
                                accept=".pdf"
                              />
                              {file ? (
                                <div style={styles.fileReady}>
                                  <span style={{ fontSize: "32px" }}>📄</span>
                                  <div style={{ textAlign: "left" }}>
                                    <div style={styles.fileName}>{file.name}</div>
                                    <div style={styles.fileMeta}>{(file.size / 1024).toFixed(1)} KB · PDF Document</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setFile(null); }}
                                    style={styles.clearBtn}
                                  >
                                    Clear
                                  </button>
                                </div>
                              ) : (
                                <div style={styles.dropPrompt}>
                                  <span style={{ fontSize: "32px", marginBottom: "8px" }}>📤</span>
                                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary-light)" }}>
                                    Click to upload or drag resume here
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {error && (
                            <div style={{ borderRadius: "12px", border: "1px solid rgba(239,68,68,0.3)", padding: "12px", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "13px" }}>
                              {error}
                            </div>
                          )}

                          <button
                            className="glow-btn"
                            style={{
                              width: "100%", marginTop: 8, padding: "14px", fontSize: 15,
                              background: (busy || isBlocked || !file || !jobRole.trim() || !candidateName.trim() || eligibilityCheck === "failed") 
                                ? "rgba(255, 255, 255, 0.05)" 
                                : (selectedInterviewMode === "actual" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, var(--color-primary), #6366f1)")
                            }}
                            onClick={handleSubmit}
                            disabled={busy || isBlocked || !file || !jobRole.trim() || !candidateName.trim() || eligibilityCheck === "failed"}
                          >
                            {status === "connecting"  && "Establishing ZTA secure session token…"}
                            {status === "uploading"   && "Uploading & parsing resume…"}
                            {status === "checking_eligibility" && "Checking minimum CGPA cutoff…"}
                            {status === "generating"  && "AI generating questions…"}
                            {status === "idle"        && (selectedInterviewMode === "actual" ? "Start Official Placement Interview →" : "Start Practice Mock Interview →")}
                            {status === "done"        && "ZTA Session Ready! Redirecting…"}
                          </button>

                          {busy && (
                            role === "candidate" ? (
                              <div style={{ textAlign: "center", padding: "20px", color: "#6b6b90", fontSize: "13px" }}>
                                <span style={{ display: "inline-block", width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite", marginRight: "10px", verticalAlign: "middle" }} />
                                Authenticating ZTA workload and generating unique questions...
                              </div>
                            ) : (
                              <div style={styles.progressWrap}>
                                {eligibilityLogs.map((log, index) => (
                                  <div key={index} style={styles.progressStep}>
                                    {index === eligibilityLogs.length - 1 && eligibilityCheck !== "passed" ? (
                                      <span style={styles.miniSpinner} />
                                    ) : (
                                      <span style={{ color: "#34d399", marginRight: "8px" }}>✓</span>
                                    )}
                                    {log}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div className="glass-card" style={styles.card}>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "16px", fontFamily: "var(--font-headings)" }}>
                          🛡️ ZTA Session Guard
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1" }}>
                          {role === "admin" && <div>• Minimum CGPA Cutoff: {selectedCompanyData.cutoff}</div>}
                          <div>• Live Camera Face Verification Enforced</div>
                          <div>• L14 Non-repeating unique question seed active</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : currentSidebarTab === "prep" ? (
            <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                {[
                  { title: "💻 Data Structures & Algorithms", items: ["Array & Hashing challenges", "Tree & Graph structures", "Dynamic Programming cheat sheets"], progress: 65, color: "#7c3aed" },
                  { title: "🌐 System Design & Scalability", items: ["Load balancing & Caching", "Database partitioning", "Microservices architecture"], progress: 40, color: "#06b6d4" },
                  { title: "🤖 AI / Machine Learning Fundamentals", items: ["Neural network training dynamics", "Transformer architectures & LLMs", "Evaluation metrics & Bias control"], progress: 80, color: "#10b981" },
                  { title: "🗣️ Behavioral & HR Interview Prep", items: ["STAR method answer builder", "College project summaries", "Leadership situations"], progress: 90, color: "#f59e0b" },
                ].map((topic, i) => (
                  <div key={i} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px" }}>
                    <h4 style={{ color: "#f0f0ff", marginBottom: "12px", fontSize: "15px" }}>{topic.title}</h4>
                    <ul style={{ paddingLeft: "18px", margin: "0 0 16px 0", color: "#6b6b90", fontSize: "12.5px" }}>
                      {topic.items.map((item, j) => <li key={j} style={{ marginBottom: "6px" }}>{item}</li>)}
                    </ul>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4a4a6a", marginBottom: "4px" }}>
                      <span>TOPIC PROGRESS</span>
                      <span style={{ color: topic.color }}>{topic.progress}% Completed</span>
                    </div>
                    <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                      <div style={{ width: `${topic.progress}%`, height: "100%", background: topic.color, borderRadius: "2px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentSidebarTab === "mock" ? (
            <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "28px" }}>
                <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "16px" }}>Initialize New Practice Session</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={styles.label}>TARGET JOB ROLE</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Machine Learning Engineer"
                        value={jobRole}
                        onChange={e => setJobRole(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>UPLOAD RESUME FOR RELEVANCE SCAN</label>
                      <div
                        className={`drag-zone ${drag ? "active" : ""}`}
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                        onClick={() => inputRef.current.click()}
                        style={{ padding: "20px" }}
                      >
                        <input type="file" ref={inputRef} onChange={e => { const f = e.target.files[0]; if (f) setFile(f); }} style={{ display: "none" }} accept=".pdf" />
                        {file ? (
                          <div style={styles.fileReady}>
                            <span style={{ fontSize: "24px" }}>📄</span>
                            <div style={{ textAlign: "left" }}>
                              <div style={styles.fileName}>{file.name}</div>
                              <div style={styles.fileMeta}>{(file.size / 1024).toFixed(1)} KB · Ready to scan</div>
                            </div>
                          </div>
                        ) : (
                          <div style={styles.dropPrompt}>
                            <span style={{ fontSize: "24px", marginBottom: "6px" }}>📤</span>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#c4b5fd" }}>Click or Drag PDF Resume here</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className="glow-btn"
                      onClick={handleSubmit}
                      style={{ padding: "14px", fontSize: "14px" }}
                    >
                      Start Practice Mock Interview
                    </button>
                  </div>
                </div>

                <div style={{ padding: "20px", background: "rgba(124,58,237,0.04)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ color: "#c4b5fd", marginBottom: "8px" }}>Why take practice mocks?</h4>
                    <p style={{ color: "#6b6b90", fontSize: "12.5px", lineHeight: 1.6 }}>
                      Practice mocks let you verify if your resume matches candidate credentials without affecting college drive placement scores. ZTA logs are generated but not reported to the placement coordinator dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSidebarTab === "calendar" ? (
            <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.03)" }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} style={{ textAlign: "center", fontSize: "11.5px", fontWeight: 800, color: "#4a4a6a", padding: "6px 0" }}>{day}</div>
                ))}
                {Array.from({ length: 35 }).map((_, idx) => {
                  const dayNum = idx - 2;
                  const isValid = dayNum > 0 && dayNum <= 31;
                  const events = {
                    5:  { label: "Google Drive Open", color: "#7c3aed" },
                    12: { label: "Microsoft Code Test", color: "#06b6d4" },
                    18: { label: "NVIDIA Cutoff checks", color: "#10b981" },
                    25: { label: "Mock Interviews Walk", color: "#f59e0b" },
                  }[dayNum];

                  return (
                    <div key={idx} style={{
                      minHeight: "75px",
                      background: isValid ? "rgba(255,255,255,0.02)" : "transparent",
                      border: isValid ? "1px solid rgba(255,255,255,0.04)" : "none",
                      borderRadius: "8px",
                      padding: "6px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: isValid ? "#6b6b90" : "transparent" }}>{isValid ? dayNum : ""}</span>
                      {events && (
                        <span style={{
                          fontSize: "9px", fontWeight: 800, color: events.color, background: `${events.color}15`,
                          border: `1px solid ${events.color}30`, padding: "2px 4px", borderRadius: "4px",
                          textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                        }}>{events.label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentSidebarTab === "account" ? (
            <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "28px" }}>
                <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", textAlign: "center" }}>
                  <div style={{
                    width: "72px", height: "72px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "28px", fontWeight: 900, color: "#fff",
                    margin: "0 auto 16px",
                    boxShadow: "0 8px 24px rgba(124,58,237,0.3)"
                  }}>
                    {(candidateName || "C").charAt(0).toUpperCase()}
                  </div>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "4px" }}>{candidateName}</h4>
                  <div style={{ fontSize: "12px", color: "#6b6b90", marginBottom: "16px" }}>{role === "admin" ? "Recruiter ID" : "Candidate ID"}: {sessionStorage.getItem("ztaFingerprint")?.slice(0,8).toUpperCase() || "N/A"}</div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span className="zta-badge" style={{ fontSize: "10px" }}><span className="pulse-dot" /> ZTA VERIFIED</span>
                  </div>
                </div>

                <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "16px" }}>{role === "admin" ? "Recruiter Campaigns Matrix" : "Assessment History"}</h4>
                  {role === "admin" ? (
                    <div style={{ padding: "20px", color: "#6b6b90", fontSize: "13.5px", lineHeight: 1.6 }}>
                      🔒 You are actively logged in as a <strong>Recruiter & Coordinator</strong>. You have permissions to configure proctoring limits, toggle agent templates, audit candidate compliance, and reset security blocks.
                    </div>
                  ) : profileHistory.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#4a4a6a", fontSize: "13px" }}>
                      No placement drives attempted yet. Select a company to start.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "#cbd5e1" }} className="data-table">
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                          <th style={{ padding: "10px" }}>Date</th>
                          <th style={{ padding: "10px" }}>Company</th>
                          <th style={{ padding: "10px" }}>Role</th>
                          <th style={{ padding: "10px" }}>Avg Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileHistory.map((item, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "10px" }}>{item.date}</td>
                            <td style={{ padding: "10px", fontWeight: 700, color: "#ffffff" }}>{item.companyName}</td>
                            <td style={{ padding: "10px" }}>{item.jobRole}</td>
                            <td style={{ padding: "10px", fontWeight: 700, color: "#7c3aed" }}>{item.score} / 10</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : currentSidebarTab === "settings" ? (
            <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                
                {/* Preferences */}
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "4px", fontSize: "15px", fontFamily: "var(--font-headings)", display: "flex", alignItems: "center", gap: "8px" }}>👤 Candidate Preferences</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Toggle email alerts</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>ZTA continuous biometric face checks</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Recruiter & AI Personality */}
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "4px", fontSize: "15px", fontFamily: "var(--font-headings)", display: "flex", alignItems: "center", gap: "8px" }}>🤖 Recruiter Controls & AI Agents</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={styles.label}>ACTIVE LLM MODEL CLUSTER</label>
                      <select
                        className="input-field"
                        value={selectedLLM}
                        onChange={e => setSelectedLLM(e.target.value)}
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      >
                        <option value="llama-3-edge">Llama-3-Edge (ZTA L13 Fact Checker)</option>
                        <option value="gemini-flash">Gemini-Flash fallback</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>PLACEMENT CUTOFF CGPA</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input-field"
                        value={minCgpa}
                        onChange={e => setMinCgpa(e.target.value)}
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>ACTIVE INTERVIEW AGENT PERSONALITY</label>
                      <select
                        className="input-field"
                        value={selectedAgent}
                        onChange={e => setSelectedAgent(e.target.value)}
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      >
                        <option value="skyy">Skyy — Conversational AI Interviewer</option>
                        <option value="zeus">Zeus — Technical Insights Deep Diver</option>
                        <option value="matt">Matt — High-empathy Feedback Agent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Yoodli Speaking Insights */}
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "4px", fontSize: "15px", fontFamily: "var(--font-headings)", display: "flex", alignItems: "center", gap: "8px" }}>🗣️ Yoodli Delivery Insights</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Track words-per-minute pace</span>
                      <input type="checkbox" checked={paceTrackerEnabled} onChange={e => setPaceTrackerEnabled(e.target.checked)} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Scan for filler words (um, ah, like)</span>
                      <input type="checkbox" checked={fillerScannerEnabled} onChange={e => setFillerScannerEnabled(e.target.checked)} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Evaluate grammar & vocabulary density</span>
                      <input type="checkbox" checked={grammarScanEnabled} onChange={e => setGrammarScanEnabled(e.target.checked)} />
                    </div>
                  </div>
                </div>

                {/* Interviewer.ai Screening Weights */}
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "4px", fontSize: "15px", fontFamily: "var(--font-headings)", display: "flex", alignItems: "center", gap: "8px" }}>🎯 ATS Screening Weightage</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b6b90", fontWeight: 700, marginBottom: "4px" }}>
                        <span>RESUME MATCH THRESHOLD</span>
                        <span style={{ color: "#c4b5fd" }}>{keywordMatchThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={keywordMatchThreshold}
                        onChange={e => setKeywordMatchThreshold(e.target.value)}
                        style={{ width: "100%", accentColor: "#7c3aed" }}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>TECHNICAL SKILL WEIGHT (%)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={weightTechnical}
                        onChange={e => setWeightTechnical(e.target.value)}
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={styles.label}>EXPERIENCE (%)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={weightExperience}
                          onChange={e => setWeightExperience(e.target.value)}
                          style={{ fontSize: "12px", padding: "8px 12px" }}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>ACADEMICS (%)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={weightAcademic}
                          onChange={e => setWeightAcademic(e.target.value)}
                          style={{ fontSize: "12px", padding: "8px 12px" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proctor Security Rules */}
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ color: "#f0f0ff", marginBottom: "4px", fontSize: "15px", fontFamily: "var(--font-headings)", display: "flex", alignItems: "center", gap: "8px" }}>🛡️ Proctoring Security Shield</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#cbd5e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Enforce active screen sharing call</span>
                      <input type="checkbox" checked={proctorScreenShareEnforced} onChange={e => setProctorScreenShareEnforced(e.target.checked)} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Detect external AI tools & extensions</span>
                      <input type="checkbox" checked={proctorAiToolsDetection} onChange={e => setProctorAiToolsDetection(e.target.checked)} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Auto-terminate call on security violation</span>
                      <input type="checkbox" checked={proctorAutoTerminate} onChange={e => setProctorAutoTerminate(e.target.checked)} />
                    </div>

                    <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "14px" }}>
                      <button
                        onClick={handleResetIPBlock}
                        className="ghost-btn"
                        style={{ width: "100%", padding: "10px", fontSize: "12px" }}
                      >
                        Reset Proctor Guard / Unblock IP
                      </button>
                      {unblockMessage && (
                        <div style={{ fontSize: "11px", color: "#34d399", marginTop: "8px", textAlign: "center", fontWeight: 700 }}>
                          {unblockMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : currentSidebarTab === "help" ? (
            <div className="glass-card fade-in-up" style={{ padding: "28px", background: "rgba(10,10,22,0.85)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { q: "Why was my resume rejected for the drive?", a: "The ZTA L2/L9 check verifies if the candidate matches the authoritative name in the resume. It also checks if the target job role keywords match your past project experience." },
                  { q: "What is Zero Trust Placement Architecture (ZTA)?", a: "RVCE Placement Cell utilizes a 13-layer ZTA model to prevent evaluation bias, coordinate candidate credential checks, enforce question uniqueness per session, and ensure fully automated grading via secure LLM orchestration." },
                  { q: "My CGPA value is wrong in the profile check.", a: "CGPA is parsed from the uploaded resume file text. Ensure your resume has a clearly visible CGPA pointer (e.g. 'CGPA: 8.8')." }
                ].map((faq, i) => (
                  <div key={i} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
                    <div style={{ fontWeight: 800, color: "#c4b5fd", fontSize: "14px", marginBottom: "6px" }}>Q: {faq.q}</div>
                    <div style={{ color: "#6b6b90", fontSize: "13px", lineHeight: 1.6 }}>A: {faq.a}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Collapsible ZTA Security Matrix Audit Drawer */}
          {isZtaDrawerOpen && (
            <div style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "480px",
              maxWidth: "95%",
              height: "100vh",
              background: "rgba(15, 23, 42, 0.98)",
              boxShadow: "-10px 0 40px rgba(0,0,0,0.8)",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              zIndex: 9999,
              padding: "24px",
              overflowY: "auto",
              backdropFilter: "blur(20px)",
              fontFamily: "var(--font-body)"
            }} className="fade-in-right">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🛡️</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-headings)" }}>
                    ZTA SECURITY AUDIT MATRIX
                  </span>
                </div>
                <button 
                  onClick={() => setIsZtaDrawerOpen(false)} 
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "20px" }}
                >✕</button>
              </div>
              <ZTAStatusDashboard />
            </div>
          )}

          {/* Placement Campaign Portal Footer */}
          <footer style={{
            marginTop: "48px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              © 2026 RVCE Bangalore Campus Placement Cell. Zero Trust Sandbox enabled.
            </div>
            <div style={{ display: "flex", gap: "20px", fontSize: "12.5px" }}>
              <span style={{ color: recruiterCompany ? "#10b981" : "var(--text-muted)" }}>
                🔒 <strong>Eligible Cutoff:</strong> {recruiterCompany ? `CGPA >= ${minCgpa}` : "Not Active"}
              </span>
              <span style={{ color: recruiterCompany ? "#38bdf8" : "var(--text-muted)" }}>
                📚 <strong>PYQs active:</strong> {recruiterCompany ? selectedPYQ : "None"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                🛠️ <strong>LLM:</strong> {selectedLLM.toUpperCase()}
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "24px 20px 48px",
    position: "relative",
    zIndex: 1,
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 28px",
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto 32px",
    borderRadius: 14,
    background: "rgba(17, 24, 39, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  logo: {
    fontFamily: "var(--font-headings)",
    fontSize: 18,
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
  },
  navBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--color-secondary)",
    background: "rgba(6, 182, 212, 0.1)",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    padding: "5px 12px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "var(--font-headings)",
    letterSpacing: "0.05em",
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--color-secondary)",
    display: "inline-block",
    boxShadow: "0 0 8px var(--color-secondary)",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  mainContainer: {
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    flex: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 32,
    alignItems: "start",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    padding: "32px 36px",
    background: "rgba(17, 24, 39, 0.55)",
    borderRadius: 20,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: 10,
    fontFamily: "var(--font-headings)",
    letterSpacing: "-0.01em",
  },
  sub: {
    color: "var(--text-muted)",
    fontSize: 13.5,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: 8,
    fontFamily: "var(--font-headings)",
  },
  hint: {
    display: "block",
    marginTop: 6,
    fontSize: 11,
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  dropZone: {
    border: "1.5px dashed",
    borderRadius: 12,
    padding: "28px 24px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: 20,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dropPrompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  fileReady: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  fileName: {
    fontWeight: 600,
    fontSize: 14,
    color: "#ffffff",
    wordBreak: "break-all",
  },
  fileMeta: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    marginTop: 4,
  },
  clearBtn: {
    background: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    color: "var(--color-error)",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "var(--font-headings)",
    transition: "all 0.2s",
  },
  errorBox: {
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#f43f5e",
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  progressWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 18,
    background: "rgba(255, 255, 255, 0.02)",
    borderRadius: 8,
    padding: 12,
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  progressStep: {
    fontSize: 11.5,
    display: "flex",
    alignItems: "center",
    fontFamily: "var(--font-headings)",
  },
  miniSpinner: {
    display: "inline-block",
    width: 10,
    height: 10,
    border: "2px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "var(--color-primary)",
    borderRadius: "50%",
    marginRight: 8,
    animation: "spin 0.6s linear infinite",
  },
};

if (typeof window !== "undefined") {
  sessionStorage.setItem("ztaRole", "candidate");
  sessionStorage.setItem("ztaFingerprint", (() => {
    const raw = `${navigator.userAgent}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${window.screen.width}x${window.screen.height}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(16).padStart(8, "0");
  })());
  sessionStorage.setItem("ztaIssuedAt", Date.now().toString());
}
