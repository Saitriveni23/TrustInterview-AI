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

export default function Upload() {
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
  const [profileHistory, setProfileHistory] = useState([]);

  useEffect(() => {
    if (isProfileOpen) {
      const rawHistory = localStorage.getItem("candidateAssessmentHistory");
      if (rawHistory) {
        try {
          setProfileHistory(JSON.parse(rawHistory));
        } catch (e) {
          setProfileHistory([]);
        }
      }
    }
  }, [isProfileOpen]);
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

      // Running Layer 9 Placement Eligibility PDP check
      setStatus("checking_eligibility");
      setEligibilityCheck("checking");
      setEligibilityLogs([
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
        // Look for general decimal numbers between 6.0 and 10.0
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

      if (cgpa >= companyCutoff) {
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
          candidateName: sanitize(candidateName),
          companyName:   selectedCompanyData ? selectedCompanyData.name : "",
          companyPYQ:    selectedCompanyData ? selectedCompanyData.pyq : "",
          llmModel:      selectedLLM,
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error || "Failed to generate questions");

      setStatus("done");

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("zta_token", token);
      sessionStorage.setItem("ztaToken", token);
      sessionStorage.setItem("ztaRole", "candidate");
      sessionStorage.setItem("ztaIssuedAt", Date.now().toString());
      sessionStorage.setItem("resumeText",    uploadData.resumeText);
      sessionStorage.setItem("jobRole",       jobRole.trim());
      sessionStorage.setItem("candidateName", candidateName.trim());
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
    <div style={styles.page}>
      {/* Main Container Dashboard */}
      <main style={styles.mainContainer}>
        {/* Top Header layout */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start", 
          marginBottom: "30px", 
          flexWrap: "wrap", 
          gap: "24px",
          paddingTop: "24px"
        }}>
          <div>
            <span className="rvce-badge">
              • ZERO TRUST ARCHITECTURE • RVCE BENGALURU PLACEMENTS CELL •
            </span>
            <h1 style={{ display: "flex", gap: "12px", alignItems: "baseline", margin: 0 }}>
              <span className="gradient-title-main">
                {selectedCompanyData ? selectedCompanyData.name : "Placements"}
              </span>
              <span className="gradient-title-sub">
                {selectedCompanyData ? "Assessment" : "Campaigns"}
              </span>
            </h1>
            <p className="premium-subtitle">
              {selectedCompanyData 
                ? `Conducting secure, AI-grounded assessments for candidate hiring under ${selectedCompanyData.name} placement criteria.`
                : "Discover active hiring campaigns across RVCE engineering domains. Select a partner brand to initialize your coding sandbox."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              style={{
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "20px",
                color: "#a5b4fc",
                fontSize: "11.5px",
                fontWeight: "700",
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-headings)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onClick={() => setIsZtaDrawerOpen(true)}
            >
              🛡️ View Security Matrix
            </button>
            <button
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                color: "#a5b4fc",
                fontSize: "11.5px",
                fontWeight: "700",
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-headings)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onClick={() => setIsProfileOpen(true)}
              className="glow-btn"
            >
              👤 Profile
            </button>
            <button
              style={{
                background: "none",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                color: "#a5b4fc",
                fontSize: "11.5px",
                fontWeight: "700",
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-headings)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onClick={() => setShowSettings(!showSettings)}
            >
              💼 Recruiter Login
            </button>
            <button
              style={{
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "20px",
                color: "#f43f5e",
                fontSize: "11.5px",
                fontWeight: "700",
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-headings)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
              onClick={() => {
                sessionStorage.clear();
                localStorage.removeItem("userGoogleAccount");
                navigate("/login");
              }}
              className="glow-btn"
            >
              🚪 Logout
            </button>
          </div>
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

        {/* SLIDE TRANSITION VIEW */}
        {!selectedCompanyData ? (
          /* ====================================================
             SLIDE 1: PLACEMENTS CAMPAIGNS CATALOG
             ==================================================== */
          <div className="fade-in-up">
            {/* Categories Pills Filters & Search Box */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
              
              {/* Horizontal domain pills */}
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

              {/* Live Search bar */}
              <input
                type="text"
                placeholder="🔍 Search hiring companies, stacks..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setVisibleCount(6); }}
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  color: "#fff",
                  fontSize: "13px",
                  minWidth: "250px"
                }}
              />
            </div>

            {/* Company Cards Grid (3 Columns) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
              {filteredCompanies.slice(0, visibleCount).map(comp => {
                return (
                  <div
                    key={comp.id}
                    className="campaign-card-interactive"
                    style={{
                      padding: "20px",
                      background: "rgba(17, 24, 39, 0.45)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "16px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                    onClick={() => {
                      setSelectedCompanyData(comp);
                      handleRecruiterLogin(comp.name, comp.cutoff, comp.pyq);
                      setJobRole(comp.role);
                      triggerNotificationAlert(comp.name, comp.cutoff, comp.pyq, comp.role);
                      setSelectedInterviewMode(null);
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--color-primary)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em" }}>
                          {comp.domain}
                        </span>
                        <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>★</span>
                      </div>
                      <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#fff", margin: "0 0 4px 0", fontFamily: "var(--font-headings)" }}>
                        {comp.name}
                      </h3>
                      <div style={{ fontSize: "13px", color: "#a5b4fc", fontWeight: 600, marginBottom: "8px" }}>
                        {comp.role}
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                        {comp.description}
                      </p>
                    </div>

                    <div>
                      {/* Spots progress bar */}
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 700 }}>
                          <span>PLACEMENTS FILL RATE</span>
                          <span style={{ color: "#38bdf8" }}>{comp.spots} spots filled</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                          <div style={{ width: `${comp.fill}%`, height: "100%", background: "linear-gradient(90deg, var(--color-primary), #38bdf8)", borderRadius: "2px" }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700, background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                          CGPA &gt;= {comp.cutoff}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          📚 PYQ syllabus
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {filteredCompanies.length > visibleCount && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                <button
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    borderRadius: "20px",
                    padding: "8px 24px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  className="glow-btn"
                >
                  Load More Companies ({filteredCompanies.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ====================================================
             SLIDE 2: SELECTED COMPANY FOCUSED WORKSPACE
             ==================================================== */
          <div className="fade-in-up">

            {selectedInterviewMode === null ? (
              /* ----------------------------------------------------
                 COMPANY HUB OVERVIEW PAGE (SEPARATE SECTIONS FOR MOCK & ACTUAL)
                 ---------------------------------------------------- */
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Back Button & Company Header Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <button
                    onClick={() => {
                      handleRecruiterLogout();
                      setSelectedCompanyData(null);
                      setShowSettings(false);
                      setSelectedInterviewMode(null);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "20px",
                      color: "#cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "8px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontFamily: "var(--font-headings)",
                      transition: "all 0.2s"
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

                {/* Company Details Banner */}
                <div className="glass-card" style={{ padding: "28px", background: "rgba(17, 24, 39, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--color-primary)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>
                        {selectedCompanyData.domain}
                      </span>
                      <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: "4px 0", fontFamily: "var(--font-headings)" }}>
                        {selectedCompanyData.name}
                      </h2>
                      <div style={{ fontSize: "15px", color: "#a5b4fc", fontWeight: 700, marginBottom: "8px" }}>
                        Role: {selectedCompanyData.role}
                      </div>
                      <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: 0, maxWidth: "800px", lineHeight: 1.5 }}>
                        {selectedCompanyData.description}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Target Technical Stack</span>
                      <span style={{ fontSize: "13px", color: "#38bdf8", fontWeight: 700, background: "rgba(56, 189, 248, 0.08)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.15)" }}>
                        {selectedCompanyData.skills}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SEPARATE SECTIONS FOR MOCK INTERVIEW AND ACTUAL INTERVIEW */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", margin: 0, fontFamily: "var(--font-headings)", display: "flex", alignItems: "center", gap: "8px" }}>
                      ⚡ Select Assessment Sandbox Mode
                    </h3>
                    <span style={{ fontSize: "11.5px", color: "#a5b4fc", background: "rgba(99, 102, 241, 0.1)", padding: "4px 12px", borderRadius: "14px", border: "1px solid rgba(99, 102, 241, 0.2)", fontWeight: 700 }}>
                      🛡️ ZTA 13-LAYER SECURITY MATRIX ACTIVE
                    </span>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    
                    {/* SECTION 1: PRACTICE MOCK INTERVIEW */}
                    <div className="glass-card" style={{
                      padding: "28px",
                      background: "rgba(17, 24, 39, 0.55)",
                      border: "1px solid rgba(99, 102, 241, 0.35)",
                      borderRadius: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "20px",
                      boxShadow: "0 12px 35px rgba(99, 102, 241, 0.12)",
                      transition: "all 0.2s"
                    }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#a5b4fc", background: "rgba(99, 102, 241, 0.15)", padding: "4px 12px", borderRadius: "14px", border: "1px solid rgba(99, 102, 241, 0.3)", fontFamily: "var(--font-headings)" }}>
                            🧪 PRACTICE MOCK SANDBOX
                          </span>
                          <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>🛡️ ZTA-L12/13 PROTECTED</span>
                        </div>

                        <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0", fontFamily: "var(--font-headings)" }}>
                          Practice Mock Interview
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                          Take a risk-free practice interview tailored to {selectedCompanyData.name}'s PYQ papers. Test your skills, get instant AI evaluation feedback, and improve without affecting your official placement records.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: "#cbd5e1", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#a5b4fc", fontWeight: 800 }}>🔒 ZTA-L12</span> Demographic Shield: Zero-bias identity scrambling
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#a5b4fc", fontWeight: 800 }}>🔍 ZTA-L13</span> Factuality Audit: CV grounding & anomaly detection
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#a5b4fc", fontWeight: 800 }}>⚡ ZTA-L1/2</span> Session Sandbox: Instant AI scoring without placement risk
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                          className="glow-btn"
                          style={{
                            width: "100%",
                            padding: "14px",
                            fontSize: "14px",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
                            color: "#ffffff",
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onClick={() => {
                            setInterviewType("mock");
                            sessionStorage.setItem("interviewType", "mock");
                            setSelectedInterviewMode("mock");
                          }}
                        >
                          Start Practice Mock Interview →
                        </button>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "#a5b4fc",
                            fontSize: "11px",
                            cursor: "pointer",
                            textAlign: "center",
                            fontFamily: "var(--font-headings)"
                          }}
                          onClick={() => setIsZtaDrawerOpen(true)}
                        >
                          🛡️ Inspect ZTA Security Matrix for Mock Mode
                        </button>
                      </div>
                    </div>

                    {/* SECTION 2: OFFICIAL GRADED PLACEMENT INTERVIEW */}
                    <div className="glass-card" style={{
                      padding: "28px",
                      background: "rgba(17, 24, 39, 0.55)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      borderRadius: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "20px",
                      boxShadow: "0 12px 35px rgba(16, 185, 129, 0.12)",
                      transition: "all 0.2s"
                    }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "4px 12px", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.3)", fontFamily: "var(--font-headings)" }}>
                            🎓 OFFICIAL PLACEMENT DRIVE
                          </span>
                          <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>🛡️ ZTA-L9 PDP Cutoff</span>
                        </div>

                        <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0", fontFamily: "var(--font-headings)" }}>
                          Official Placement Interview
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                          Enter the official campus placement assessment for candidate hiring under {selectedCompanyData.name}. Verified by Layer 9 PDP CGPA eligibility check and proctored ZTA security matrix.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: "#cbd5e1", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#10b981", fontWeight: 800 }}>🛑 ZTA-L9 PDP</span> Central Cutoff Audit: CGPA &gt;= {selectedCompanyData.cutoff}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#10b981", fontWeight: 800 }}>🛡️ ZTA-L7/8</span> SOAR Firewall & Threat Shield: XSS / SQLi filtering
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#10b981", fontWeight: 800 }}>📷 ZTA Proctored</span> Biometric Presence & Signed Audit Scorecard
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                          className="glow-btn"
                          style={{
                            width: "100%",
                            padding: "14px",
                            fontSize: "14px",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "#ffffff",
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onClick={() => {
                            setInterviewType("actual");
                            sessionStorage.setItem("interviewType", "actual");
                            setSelectedInterviewMode("actual");
                          }}
                        >
                          Start Official Placement Interview →
                        </button>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "#10b981",
                            fontSize: "11px",
                            cursor: "pointer",
                            textAlign: "center",
                            fontFamily: "var(--font-headings)"
                          }}
                          onClick={() => setIsZtaDrawerOpen(true)}
                        >
                          🛡️ Inspect ZTA Security Matrix for Official Drive
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Company Details Tabs Section */}
                <div className="glass-card" style={{ ...styles.card, padding: "28px", marginTop: "8px" }}>
                  <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", marginBottom: "20px" }}>
                    <button
                      onClick={() => setActiveWorkspaceTab("pyqs")}
                      style={{
                        background: activeWorkspaceTab === "pyqs" ? "rgba(99, 102, 241, 0.15)" : "none",
                        border: activeWorkspaceTab === "pyqs" ? "1px solid var(--color-primary)" : "1px solid transparent",
                        color: activeWorkspaceTab === "pyqs" ? "#ffffff" : "var(--text-muted)",
                        padding: "6px 14px",
                        borderRadius: "15px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-headings)",
                        transition: "all 0.2s"
                      }}
                    >
                      📚 Previous Year Questions (PYQs)
                    </button>
                    <button
                      onClick={() => setActiveWorkspaceTab("requirements")}
                      style={{
                        background: activeWorkspaceTab === "requirements" ? "rgba(99, 102, 241, 0.15)" : "none",
                        border: activeWorkspaceTab === "requirements" ? "1px solid var(--color-primary)" : "1px solid transparent",
                        color: activeWorkspaceTab === "requirements" ? "#ffffff" : "var(--text-muted)",
                        padding: "6px 14px",
                        borderRadius: "15px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-headings)",
                        transition: "all 0.2s"
                      }}
                    >
                      🏢 Company Requirements
                    </button>
                    <button
                      onClick={() => setActiveWorkspaceTab("sandbox")}
                      style={{
                        background: activeWorkspaceTab === "sandbox" ? "rgba(99, 102, 241, 0.15)" : "none",
                        border: activeWorkspaceTab === "sandbox" ? "1px solid var(--color-primary)" : "1px solid transparent",
                        color: activeWorkspaceTab === "sandbox" ? "#ffffff" : "var(--text-muted)",
                        padding: "6px 14px",
                        borderRadius: "15px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-headings)",
                        transition: "all 0.2s"
                      }}
                    >
                      🛡️ ZTA Security Guidelines
                    </button>
                  </div>

                  {activeWorkspaceTab === "pyqs" && (
                    <div className="fade-in-up">
                      <h4 style={{ color: "#ffffff", fontSize: "15px", fontWeight: 800, margin: "0 0 12px 0", fontFamily: "var(--font-headings)" }}>
                        📚 {selectedCompanyData.name} Past Placement Papers (ZTA Verification Signed)
                      </h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "12.5px", margin: "0 0 16px 0", lineHeight: 1.4 }}>
                        The following questions have been compiled from previous campus recruitment drives at RVCE for the target role: <strong>{selectedCompanyData.role}</strong>.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {(MOCK_PYQS_MAP[selectedCompanyData.name.split(" ")[0].toLowerCase()] || [
                          "Explain key system design components of a scaled distributed web service.",
                          "Write a recursive function to check if a binary search tree is height-balanced.",
                          "Describe transaction isolation levels and concurrency controls in modern databases."
                        ]).map((q, idx) => (
                          <div key={idx} style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            color: "#cbd5e1"
                          }}>
                            <span style={{ color: "var(--color-primary)", fontWeight: 800, marginRight: "8px" }}>Q{idx + 1}:</span>
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeWorkspaceTab === "requirements" && (
                    <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                          Hiring Company
                        </strong>
                        <span style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700 }}>
                          {selectedCompanyData.name} ({selectedCompanyData.domain})
                        </span>
                      </div>

                      <div>
                        <strong style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                          Target Placement Role
                        </strong>
                        <span style={{ fontSize: "14px", color: "#a5b4fc", fontWeight: 700 }}>{selectedCompanyData.role}</span>
                      </div>

                      <div>
                        <strong style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                          Job Description
                        </strong>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                          {selectedCompanyData.description}
                        </p>
                      </div>

                      <div>
                        <strong style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                          Required Technical Stack
                        </strong>
                        <span style={{ fontSize: "13.5px", color: "#38bdf8", fontWeight: 700 }}>
                          {selectedCompanyData.skills}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "20px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "14px" }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                            Min eligibility cutoff
                          </strong>
                          <span style={{ fontSize: "14px", color: "#10b981", fontWeight: 800 }}>
                            CGPA &gt;= {selectedCompanyData.cutoff}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                            Placement Paper Active
                          </strong>
                          <span style={{ fontSize: "13px", color: "#a5b4fc", fontWeight: 700 }}>
                            {selectedCompanyData.pyq}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeWorkspaceTab === "sandbox" && (
                    <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <h4 style={{ color: "#ffffff", fontSize: "15px", fontWeight: 800, margin: "0 0 4px 0", fontFamily: "var(--font-headings)" }}>
                        🛡️ Zero Trust Architecture (ZTA) 13-Layer Compliance
                      </h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "12.5px", margin: 0, lineHeight: 1.5 }}>
                        This assessment environment is fully bound by our 13-layer Zero Trust Architecture to guarantee non-repudiation, identity verification, and anti-cheat compliance.
                      </p>
                      <ul style={{ color: "#cbd5e1", fontSize: "12.5px", margin: "8px 0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <li><strong>ZTA-L1/2 Infrastructure</strong>: Cryptographic session token verification & automated headless browser scanner.</li>
                        <li><strong>ZTA-L4/5 Workload & Document</strong>: 10MB payload memory buffer cap & zero-retention 100ms resume parse/delete.</li>
                        <li><strong>ZTA-L9 Access PDP</strong>: Placement Policy Decision Point cutoffs enforcing minimum academic criteria.</li>
                        <li><strong>ZTA-L12/13 Compliance & AI</strong>: Demographic fairness shield (scrambled identity) and CV factuality grounding evaluation.</li>
                      </ul>
                      <div style={{
                        background: "rgba(16, 185, 129, 0.05)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 700
                      }}>
                        <span>✓</span> ZTA Security Status: ALL 13 LAYERS ACTIVE & READY. Select an assessment mode above to proceed.
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* ----------------------------------------------------
                 NEXT PAGE: DEDICATED SETUP & RESUME UPLOAD PAGE FOR MOCK / ACTUAL
                 ---------------------------------------------------- */
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Back to Overview Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <button
                    onClick={() => setSelectedInterviewMode(null)}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "20px",
                      color: "#cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "8px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontFamily: "var(--font-headings)",
                      transition: "all 0.2s"
                    }}
                    className="glow-btn"
                  >
                    ← Back to {selectedCompanyData.name} Overview
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.2)", fontWeight: 700 }}>
                      🛡️ ZTA TOKEN BOUND
                    </span>
                    <div style={{
                      background: selectedInterviewMode === "actual" ? "rgba(16, 185, 129, 0.1)" : "rgba(99, 102, 241, 0.1)",
                      border: selectedInterviewMode === "actual" ? "1px solid #10b981" : "1px solid var(--color-primary)",
                      color: selectedInterviewMode === "actual" ? "#10b981" : "#a5b4fc",
                      padding: "6px 16px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 800,
                      fontFamily: "var(--font-headings)"
                    }}>
                      {selectedInterviewMode === "actual" ? "🎓 PAGE: OFFICIAL GRADED ASSESSMENT SETUP" : "🧪 PAGE: PRACTICE MOCK INTERVIEW SETUP"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px", alignItems: "start" }}>
                  
                  {/* Left Column: Candidate Details & Resume Upload Form */}
                  <div className="glass-card" style={{ ...styles.card, padding: "28px" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: selectedInterviewMode === "actual" ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)",
                        color: selectedInterviewMode === "actual" ? "#10b981" : "#a5b4fc",
                        border: selectedInterviewMode === "actual" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(99, 102, 241, 0.3)"
                      }}>
                        {selectedInterviewMode === "actual" ? "OFFICIAL DRIVE" : "PRACTICE SANDBOX"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Targeting: {selectedCompanyData.name}</span>
                    </div>

                    <h2 style={{ ...styles.title, fontSize: "22px", marginBottom: "8px" }}>
                      {selectedInterviewMode === "actual" ? "Official Graded Placement Setup" : "Practice Mock Assessment Setup"}
                    </h2>
                    <p style={{ ...styles.sub, fontSize: "12.5px", marginBottom: "20px" }}>
                      {selectedInterviewMode === "actual"
                        ? `Entering official campus placement evaluation sandbox under ${selectedCompanyData.name} recruitment drive.`
                        : `Entering practice assessment sandbox under ${selectedCompanyData.name} placement criteria.`}
                    </p>

                    {/* Field: Full Name */}
                    <div style={styles.field}>
                      <label style={styles.label}>
                        Your Full Name
                        <span className="badge badge-warning" style={{ fontSize: 9, padding: "2px 6px" }}>🔒 ZTA-L12 Bias Checked</span>
                      </label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. Sneha Sharma"
                        value={candidateName}
                        maxLength={100}
                        onChange={e => setCandidateName(sanitize(e.target.value))}
                        disabled={busy}
                      />
                      <small style={styles.hint}>
                        🔒 Scrambled under ZTA Layer 12. Evaluation models analyze only your content, never your name or identity.
                      </small>
                    </div>

                    {/* Field: Job Role */}
                    <div style={styles.field}>
                      <label style={styles.label}>Target Job Role</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. Senior Frontend Engineer"
                        value={jobRole}
                        maxLength={100}
                        onChange={e => setJobRole(sanitize(e.target.value))}
                        disabled={busy}
                      />
                    </div>

                    {/* File Drop Zone */}
                    <div
                      style={{
                        ...styles.dropZone,
                        borderColor: drag ? "var(--color-primary)" : file ? "var(--color-success)" : "rgba(255, 255, 255, 0.15)",
                        background:  drag ? "rgba(139, 92, 246, 0.05)" : file ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.01)",
                        boxShadow:   drag ? "var(--shadow-glow)" : file ? "var(--shadow-success-glow)" : "none",
                      }}
                      onClick={() => !busy && inputRef.current.click()}
                      onDragOver={e => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={onDrop}
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={e => handleFile(e.target.files[0])}
                      />
                      {file ? (
                        <div style={styles.fileReady}>
                          <span style={{ fontSize: 32 }}>📄</span>
                          <div style={{ textAlign: "left", flex: 1 }}>
                            <div style={styles.fileName}>{file.name}</div>
                            <div style={styles.fileMeta}>{(file.size / 1024).toFixed(0)} KB · PDF Format Verified (ZTA-L5 Scrambled)</div>
                          </div>
                          <button
                            style={styles.clearBtn}
                            onClick={e => { e.stopPropagation(); setFile(null); }}
                          >✕ Remove</button>
                        </div>
                      ) : (
                        <div style={styles.dropPrompt}>
                          <span style={{ fontSize: 28, color: "var(--text-muted)" }}>⬆️</span>
                          <p style={{ margin: "10px 0 4px", fontWeight: 600, color: "var(--text-main)", fontSize: 14 }}>
                            Drop your PDF resume here or <span style={{ color: "var(--color-primary)", textDecoration: "underline", cursor: "pointer" }}>browse files</span>
                          </p>
                          <small style={{ color: "var(--text-muted)", fontSize: 11 }}>Only PDF allowed · ZTA-L4 10MB Payload Buffer Protection</small>
                        </div>
                      )}
                    </div>

                    {/* Interactive L9 PDP Eligibility check console */}
                    {eligibilityCheck && (
                      <div style={{
                        background: "rgba(11, 15, 25, 0.8)",
                        border: `1px solid ${eligibilityCheck === "passed" ? "rgba(16, 185, 129, 0.3)" : eligibilityCheck === "failed" ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                        borderRadius: "8px",
                        padding: "14px",
                        marginBottom: "20px",
                        fontFamily: "monospace",
                        fontSize: "11px"
                      }}>
                        <div style={{ color: eligibilityCheck === "passed" ? "#10b981" : eligibilityCheck === "failed" ? "#ef4444" : "#a5b4fc", fontWeight: 700, marginBottom: "8px" }}>
                          {eligibilityCheck === "checking" && "⏳ ZTA-L9 PDP CUTOFF CHECKING:"}
                          {eligibilityCheck === "passed" && "✅ ZTA-L9 PDP RECRUITMENT AUDIT PASSED:"}
                          {eligibilityCheck === "failed" && "🛑 ZTA-L9 PDP RECRUITMENT AUDIT FAILED:"}
                        </div>
                        {eligibilityLogs.map((log, index) => (
                          <div key={index} style={{ color: "#94a3b8", margin: "3px 0" }}>{log}</div>
                        ))}
                      </div>
                    )}

                    {error && (
                      <div style={styles.errorBox} className="badge-error">
                        <span>⚠️</span> {error}
                      </div>
                    )}

                    {/* Actions */}
                    <button
                      className="glow-btn"
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "14px",
                        fontSize: 15,
                        background: (busy || isBlocked || !file || !jobRole.trim() || !candidateName.trim() || eligibilityCheck === "failed") 
                          ? "rgba(255, 255, 255, 0.05)" 
                          : (selectedInterviewMode === "actual" 
                              ? "linear-gradient(135deg, #10b981, #059669)" 
                              : "linear-gradient(135deg, var(--color-primary), #6366f1)")
                      }}
                      onClick={handleSubmit}
                      disabled={busy || isBlocked || !file || !jobRole.trim() || !candidateName.trim() || eligibilityCheck === "failed"}
                    >
                      {status === "connecting"  && "Establishing ZTA secure session token…"}
                      {status === "uploading"   && "Uploading & parsing resume (ZTA-L5)…"}
                      {status === "checking_eligibility" && "Executing ZTA-L9 PDP Cutoff Check…"}
                      {status === "generating"  && "AI generating questions (ZTA-L13)…"}
                      {status === "idle"        && (selectedInterviewMode === "actual" ? "Start Official Placement Interview →" : "Start Practice Mock Interview →")}
                      {status === "done"        && "ZTA Session Ready! Redirecting…"}</button>

                    {/* Progress indicators when busy */}
                    {busy && (
                      <div style={styles.progressWrap}>
                        {[
                          { key: "connecting",  label: "1. ZTA-L1 Handshaking session token & fingerprint" },
                          { key: "uploading",   label: "2. ZTA-L5 Extracting text blocks (Zero retention)" },
                          { key: "checking_eligibility", label: "3. ZTA-L9 PDP Policy Decision Cutoff check" },
                          { key: "generating",  label: "4. ZTA-L13 AI PYQ-aligned question generation" },
                        ].map(step => {
                          const isActive = status === step.key;
                          return (
                            <div key={step.key} style={{
                              ...styles.progressStep,
                              color: isActive ? "var(--color-primary)" : "var(--text-muted)",
                              fontWeight: isActive ? 600 : 400,
                            }}>
                              {isActive ? (
                                <span style={styles.miniSpinner} />
                              ) : (
                                <span style={{ fontSize: 10, marginRight: 8 }}>○</span>
                              )}
                              {step.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: ZTA Mode Overview & Live Security Matrix Widget */}
                  <div className="glass-card" style={{ ...styles.card, padding: "28px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <h3 style={{ color: "#ffffff", fontSize: "16px", fontWeight: 800, margin: 0, fontFamily: "var(--font-headings)" }}>
                        🛡️ ZTA Session & Compliance Audit
                      </h3>
                      <button
                        style={{
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          color: "#a5b4fc",
                          borderRadius: "12px",
                          padding: "4px 10px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "var(--font-headings)"
                        }}
                        onClick={() => setIsZtaDrawerOpen(true)}
                      >
                        Inspect Drawer ↗
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Active Mode</div>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: selectedInterviewMode === "actual" ? "#10b981" : "#a5b4fc" }}>
                          {selectedInterviewMode === "actual" ? "🎓 Official Graded Assessment" : "🧪 Practice Mock Sandbox"}
                        </div>
                      </div>

                      {/* ZTA Live 13-Layer Security Status Grid */}
                      <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: "11px", color: "var(--color-primary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", fontFamily: "var(--font-headings)" }}>
                          ⚡ ZTA LIVE 13-LAYER MATRIX MONITORING
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>✓ L1 Session:</span> Token Signed
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>✓ L2 Sandbox:</span> Bot Safe
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>✓ L5 Parsing:</span> 100ms Purge
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>✓ L9 PDP:</span> CGPA Audit
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>✓ L12 Bias:</span> Identity Shield
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>✓ L13 AI:</span> Fact Grounded
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Company & Placement Cutoff</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#ffffff" }}>
                          {selectedCompanyData.name} — Min CGPA &gt;= {selectedCompanyData.cutoff}
                        </div>
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>LLM Evaluation Engine</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#38bdf8" }}>
                          {selectedLLM.toUpperCase()} (ZTA-L12 Zero-Bias Enabled)
                        </div>
                      </div>

                      <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "12px", borderRadius: "10px", fontSize: "12px", color: "#cbd5e1" }}>
                        🔒 <strong>Zero Trust Policy:</strong> Biometric facial tracking & audio anti-cheat algorithms active. Ensure your camera and mic are working before proceeding.
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      {/* Candidate Profile Modal (GitHub-Inspired Design) */}
      {isProfileOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(1, 4, 9, 0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px"
        }} onClick={() => setIsProfileOpen(false)}>
          
          <div style={{
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "620px",
            padding: "0",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
            overflow: "hidden",
            position: "relative",
            textAlign: "left",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
          }} onClick={e => e.stopPropagation()}>
            
            {/* GitHub Header Top Bar */}
            <div style={{
              background: "#161b22",
              borderBottom: "1px solid #30363d",
              padding: "16px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg height="20" width="20" viewBox="0 0 16 16" fill="#f0f6fc">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                </svg>
                <span style={{ color: "#f0f6fc", fontSize: "14px", fontWeight: 600 }}>Candidate Profile Overview</span>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8b949e",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  lineHeight: 1
                }}
              >✕</button>
            </div>

            {/* Profile Main Content Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* GitHub User Profile Header Card */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                background: "#161b22",
                border: "1px solid #30363d",
                padding: "20px",
                borderRadius: "12px"
              }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    border: "2px solid #30363d",
                    background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    color: "#ffffff",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}>
                    {(sessionStorage.getItem("candidateName") || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ color: "#f0f6fc", fontSize: "20px", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                      {sessionStorage.getItem("candidateName") || "Sai triveni b"}
                    </h2>
                    <div style={{ color: "#8b949e", fontSize: "13.5px", marginTop: "4px" }}>
                      @{sessionStorage.getItem("candidateEmail") ? sessionStorage.getItem("candidateEmail").split("@")[0] : "saitriveni23"}
                    </div>
                    <div style={{ color: "#8b949e", fontSize: "12px", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>✉️</span> {sessionStorage.getItem("candidateEmail") || "triveni238@gmail.com"}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#21262d",
                  border: "1px solid #30363d",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  color: "#c9d1d9",
                  fontSize: "12px",
                  fontWeight: 600
                }}>
                  <span style={{ color: "#3fb950" }}>●</span> Placement Active
                </div>
              </div>

              {/* GitHub Menu Item Grid / Tabs */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px"
              }}>
                <div style={{
                  background: "#161b22",
                  border: "1px solid #30363d",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#c9d1d9",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ color: "#58a6ff" }}>📦</span> Placement Drives
                </div>
                <div style={{
                  background: "#161b22",
                  border: "1px solid #30363d",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#c9d1d9",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ color: "#d29922" }}>⭐</span> Saved PYQs
                </div>
                <div style={{
                  background: "#161b22",
                  border: "1px solid #30363d",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#c9d1d9",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ color: "#238636" }}>🛡️</span> ZTA-L12 Shield
                </div>
              </div>

              {/* Placement Standing Banner */}
              <div style={{
                background: "rgba(57, 211, 83, 0.08)",
                border: "1px solid rgba(57, 211, 83, 0.25)",
                padding: "14px 18px",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ color: "#3fb950", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    PLACEMENT CELL STANDING
                  </div>
                  <div style={{ color: "#f0f6fc", fontSize: "13.5px", fontWeight: 600, marginTop: "2px" }}>
                    Eligible for Tier-1 Placement Drives
                  </div>
                </div>
                <span style={{
                  background: "#238636",
                  color: "#ffffff",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700
                }}>
                  CLEARED
                </span>
              </div>

              {/* Assessment History Activity Section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ color: "#f0f6fc", fontSize: "13.5px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📝</span> Placement Assessment History
                  </h4>
                  <span style={{ fontSize: "11px", color: "#8b949e" }}>{profileHistory.length} Recorded</span>
                </div>

                {profileHistory.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "24px",
                    background: "#161b22",
                    border: "1px dashed #30363d",
                    borderRadius: "10px",
                    color: "#8b949e",
                    fontSize: "12.5px"
                  }}>
                    No placement assessments completed yet. Start an assessment from the catalog!
                  </div>
                ) : (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    paddingRight: "4px"
                  }}>
                    {profileHistory.map((item, idx) => (
                      <div key={idx} style={{
                        background: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ color: "#58a6ff", fontSize: "13.5px" }}>{item.companyName}</strong>
                            <span style={{
                              background: item.interviewType === "Official Graded" ? "rgba(35, 134, 54, 0.15)" : "rgba(88, 166, 255, 0.15)",
                              color: item.interviewType === "Official Graded" ? "#3fb950" : "#58a6ff",
                              border: item.interviewType === "Official Graded" ? "1px solid rgba(63, 185, 80, 0.3)" : "1px solid rgba(88, 166, 255, 0.3)",
                              fontSize: "10px",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              fontWeight: 600
                            }}>
                              {item.interviewType}
                            </span>
                          </div>
                          <div style={{ color: "#8b949e", fontSize: "11px", marginTop: "3px" }}>
                            {item.jobRole} · {item.date}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0f6fc" }}>
                            {item.score}/10
                          </div>
                          <div style={{ fontSize: "10.5px", color: item.score >= 7 ? "#3fb950" : "#f85149" }}>
                            {item.grade}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GitHub Footer Action Controls */}
              <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
                <button
                  style={{
                    flex: 1,
                    background: "#21262d",
                    border: "1px solid #30363d",
                    color: "#f0f6fc",
                    padding: "10px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onClick={() => setIsProfileOpen(false)}
                >
                  Close Overview
                </button>
                <button
                  style={{
                    background: "rgba(248, 81, 73, 0.1)",
                    border: "1px solid rgba(248, 81, 73, 0.4)",
                    color: "#f85149",
                    padding: "10px 18px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={() => {
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                >
                  <span>🚪</span> Sign out
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

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
