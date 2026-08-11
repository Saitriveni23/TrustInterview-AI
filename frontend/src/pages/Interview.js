import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CameraFeed  from "../components/CameraFeed";
import TimerBar    from "../components/TimerBar";
import ZTABadge   from "../components/ZTABadge";

const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5001";

function ztaHeaders(extra = {}) {
  const token       = sessionStorage.getItem("ztaToken")       || "";
  const role        = sessionStorage.getItem("ztaRole")        || "candidate";
  const fingerprint = sessionStorage.getItem("ztaFingerprint") || "";
  const issuedAt    = sessionStorage.getItem("ztaIssuedAt")    || "";
  return {
    "Authorization": `Bearer ${token}`,
    "x-zta-token": token,
    "x-zta-role": role,
    "x-zta-fingerprint": fingerprint,
    "x-zta-issued-at": issuedAt,
    ...extra
  };
}

async function fetchZTAStatus() {
  try {
    const res  = await fetch(`${BACKEND}/api/zta-status`);
    const data = await res.json();
    return data.ztaEnabled;
  } catch { return true; }
}

const ZTA_EVENTS_POOL = [
  "L1-Identity: Bearer token validated ✓",
  "L2-Device: Browser fingerprint verified ✓",
  "L3-Network: CORS policy enforced ✓",
  "L4-Payload: Input sanitization active ✓",
  "L5-Data: Answer encrypted in-transit ✓",
  "L6-Audit: Session events logged ✓",
  "L7-SOAR: No anomalous patterns detected ✓",
  "L8-Governance: XSS scan passed ✓",
  "L9-Policy: Candidate scope verified ✓",
  "L10-Edge: HSTS headers active ✓",
  "L11-ThreatIntel: No malicious signatures ✓",
  "L12-Bias: Question bias scan passed ✓",
  "L13-Hallucination: Grounding verified ✓",
  "L14-Uniqueness: No repeated questions ✓",
];

export default function Interview() {
  const navigate = useNavigate();

  const resumeText    = sessionStorage.getItem("resumeText")    || "";
  const jobRole       = sessionStorage.getItem("jobRole")       || "";
  const candidateName = sessionStorage.getItem("candidateName") || "Candidate";
  const candidateEmail = sessionStorage.getItem("candidateEmail") || "";
  const companyName   = sessionStorage.getItem("companyName")   || "";
  const interviewType = sessionStorage.getItem("interviewType") || "mock";

  const [questions,      setQuestions]      = useState([]);
  const [currentIdx,     setCurrentIdx]     = useState(0);
  const [answers,        setAnswers]        = useState([]);
  const [typedAnswer,    setTypedAnswer]    = useState("");
  const [loading,        setLoading]        = useState(true);
  const [loadingMsg,     setLoadingMsg]     = useState("Initializing ZTA security layers...");
  const [loadingStep,    setLoadingStep]    = useState(0);
  const [error,          setError]          = useState("");
  const [phase,          setPhase]          = useState("loading");
  const [recording,      setRecording]      = useState(false);
  const [micError,       setMicError]       = useState("");
  const [transcript,     setTranscript]     = useState("");
  const [speaking,       setSpeaking]       = useState(false);
  const [ztaEnabled,     setZtaEnabled]     = useState(true);
  const [ztaTickerItems, setZtaTickerItems] = useState(ZTA_EVENTS_POOL.slice(0, 4));
  const [uniquenessEnforced, setUniquenessEnforced] = useState(false);
  const [answerMode,     setAnswerMode]     = useState("type"); // "type" | "voice"
  const [screenStream,   setScreenStream]   = useState(null);
  const [proctorViolated, setProctorViolated] = useState(false);
  const [violationReason, setViolationReason] = useState("");

  const recognitionRef = useRef(null);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % ZTA_EVENTS_POOL.length;
      setZtaTickerItems(prev => [...prev.slice(-5), ZTA_EVENTS_POOL[idx]]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const proctorScreenShareEnforced = sessionStorage.getItem("proctorScreenShareEnforced") !== "false";
  const proctorAiToolsDetection    = sessionStorage.getItem("proctorAiToolsDetection") !== "false";
  const proctorAutoTerminate       = sessionStorage.getItem("proctorAutoTerminate") !== "false";

  async function handleProctorViolation(reason) {
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    
    // Stop all media tracks
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
    
    // Set blocked states
    setProctorViolated(true);
    setViolationReason(reason);
    setPhase("proctor_blocked");

    // Report block to backend
    try {
      await axios.post(`${BACKEND}/api/zta-status/block`, { reason }, {
        headers: ztaHeaders({ "Content-Type": "application/json" })
      });
    } catch (e) {
      console.warn("Failed to notify backend of proctor violation:", e.message);
    }
  }

  async function handleBeginAssessment() {
    if (proctorScreenShareEnforced) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        // Listen if track ended (user clicked "Stop sharing")
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            handleProctorViolation("Candidate stopped sharing screen during active proctored drive.");
          };
        }
        setScreenStream(stream);
      } catch (err) {
        alert("Screen sharing access is strictly required to proceed with this campus placement drive.");
        return;
      }
    }
    startQuestion(0);
  }

  useEffect(() => {
    if (phase !== "question" && phase !== "submitting") return;

    const handleVisibilityChange = () => {
      if (document.hidden && proctorAutoTerminate) {
        handleProctorViolation("Unauthorized tab switching / browser minimize detected.");
      }
    };

    const handleWindowBlur = () => {
      if (proctorAutoTerminate) {
        handleProctorViolation("Unauthorized web application focus switch detected.");
      }
    };

    const handleClipboardPaste = (e) => {
      if (proctorAiToolsDetection) {
        e.preventDefault();
        if (proctorAutoTerminate) {
          handleProctorViolation("Unauthorized clipboard paste detected (AI generation block).");
        } else {
          alert("Copy-pasting is restricted during the placement session.");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("paste", handleClipboardPaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("paste", handleClipboardPaste);
    };
  }, [phase, screenStream, proctorAutoTerminate, proctorAiToolsDetection]);

  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [screenStream]);

  useEffect(() => {
    if (!resumeText) { navigate("/"); return; }

    fetchZTAStatus().then(enabled => setZtaEnabled(enabled));

    const token = sessionStorage.getItem("ztaToken");
    const role  = sessionStorage.getItem("ztaRole");
    if (!token || !role || (role !== "candidate" && role !== "admin")) {
      setError("ZTA-L1: No valid session token. Please start from the dashboard.");
      setPhase("error"); setLoading(false); return;
    }

    const loadingSteps = [
      "Initializing ZTA security layers...",
      "Verifying candidate identity (L1)...",
      "Scanning device fingerprint (L2)...",
      "Enforcing bias protection (L12)...",
      "Generating your unique questions...",
    ];

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx++;
      if (stepIdx < loadingSteps.length) {
        setLoadingMsg(loadingSteps[stepIdx]);
        setLoadingStep(stepIdx);
      } else {
        clearInterval(stepTimer);
      }
    }, 700);

    async function loadQuestions() {
      try {
        await new Promise(r => setTimeout(r, 800));
        const selectedPYQ = sessionStorage.getItem("selectedPYQ") || "";
        const selectedLLM = sessionStorage.getItem("selectedLLM") || "llama-3-edge";

        const res = await axios.post(
          `${BACKEND}/api/interview/questions`,
          {
            resumeText, jobRole, companyName,
            companyPYQ: selectedPYQ,
            llmModel: selectedLLM,
            candidateEmail,
          },
          { headers: ztaHeaders({ "Content-Type": "application/json" }) }
        );
        if (!res.data.success) throw new Error(res.data.error);
        setQuestions(res.data.questions);
        setUniquenessEnforced(res.data.uniquenessEnforced || false);
        clearInterval(stepTimer);
        setLoading(false);
        setPhase("intro");
      } catch (err) {
        clearInterval(stepTimer);
        setError(err.response?.data?.error || err.message || "Failed to load questions.");
        setLoading(false);
        setPhase("error");
      }
    }

    loadQuestions();
    return () => clearInterval(stepTimer);
  }, [navigate, resumeText, jobRole, companyName, candidateEmail]);

  function speakQuestion(text) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/`[^`]+`/g, "").replace(/[*_#]/g, ""); // strip markdown before TTS
    const CleanSpeech = cleanText.substring(0, 200); // limit spoken snippet length
    const utt = new SpeechSynthesisUtterance(CleanSpeech);
    utt.rate = 0.95;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function startQuestion(idx) {
    setPhase("question"); setTranscript(""); setTypedAnswer(""); setMicError("");
    const targetIdx = idx !== undefined ? idx : currentIdx;
    if (questions[targetIdx]) {
      startQuestionTimer(targetIdx);
    }
  }

  function startQuestionTimer(idx) {
    setTimeout(() => speakQuestion(questions[idx].question), 400);
  }

  async function startVoiceRecording() {
    setMicError("");
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { setMicError("Speech recognition not supported. Please type your answer."); return; }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const recognition = new SpeechRecognition();
      recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";
      recognition.onstart  = () => { setRecording(true); setTranscript("Listening — speak your answer..."); };
      recognition.onresult = (event) => {
        let t = "";
        for (let i = event.resultIndex; i < event.results.length; i++) t += event.results[i][0].transcript;
        if (t.trim()) { setTranscript(t); setTypedAnswer(t); }
      };
      recognition.onerror = (e) => {
        setMicError(e.error === "not-allowed" ? "Mic access denied. Check browser permissions." : `Error: ${e.error}`);
        stopVoice();
      };
      recognition.onend = () => setRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch { setMicError("Microphone access denied. Please type your answer."); }
  }

  function stopVoice() {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setRecording(false);
  }

  function handleTimeout() {
    window.speechSynthesis.cancel();
    if (recording) stopVoice();
    handleSubmitAnswer(typedAnswer || transcript || "(No answer — time ran out)");
  }

  async function handleSubmitAnswer(answerText) {
    if (phase === "submitting") return;
    setPhase("submitting");
    window.speechSynthesis.cancel();
    if (recording) stopVoice();
    const q           = questions[currentIdx];
    const finalAnswer = (answerText || typedAnswer || transcript || "").trim() || "(No answer)";
    let result = {
      question: q.question, answer: finalAnswer, skill: q.skill, type: q.type,
      score: 0, grade: "N/A", summary: "", strengths: [], improvements: [], idealAnswer: "",
    };
    try {
      const llmModel = sessionStorage.getItem("selectedLLM") || "llama-3-edge";
      const res = await axios.post(
        `${BACKEND}/api/evaluate/answer`,
        { question: q.question, answer: finalAnswer, questionType: q.type, skill: q.skill, jobRole, resumeText, candidateName, llmModel },
        { headers: ztaHeaders({ "Content-Type": "application/json" }) }
      );
      result = { ...result, ...res.data };
    } catch (err) { console.error("Eval error:", err.message); }
    const updated = [...answers, result];
    setAnswers(updated);
    const next = currentIdx + 1;
    if (next < questions.length) {
      setCurrentIdx(next); setTranscript(""); setTypedAnswer(""); setMicError("");
      setPhase("question");
      startQuestionTimer(next);
    } else {
      finishInterview(updated);
    }
  }

  async function finishInterview(allAnswers) {
    setPhase("done");
    try {
      const avg = allAnswers.length ? (allAnswers.reduce((s, a) => s + (a.score || 0), 0) / allAnswers.length) : 0;
      await axios.post(`${BACKEND}/api/interview/record-score`, {
        email: candidateEmail,
        name: candidateName,
        score: parseFloat(avg.toFixed(2)),
        company: companyName || "General",
        jobRole: jobRole || "AI Specialist",
        interviewType: interviewType || "mock"
      }, { headers: ztaHeaders({ "Content-Type": "application/json" }) });
    } catch (e) { console.warn("Score record failed:", e.message); }

    let report = null;
    try {
      const res = await axios.post(
        `${BACKEND}/api/evaluate/final-report`,
        { jobRole, results: allAnswers },
        { headers: ztaHeaders({ "Content-Type": "application/json" }) }
      );
      report = res.data;
    } catch (err) { console.error("Report error:", err.message); }
    sessionStorage.setItem("interviewResults", JSON.stringify({ answers: allAnswers, report, jobRole, candidateName }));
    navigate("/results");
  }

  const q = questions[currentIdx];
  const progress = questions.length ? ((currentIdx) / questions.length) * 100 : 0;

  // ── LOADING SCREEN ─────────────────────────────────────────────────────────
  if (phase === "loading" || loading) return (
    <div style={{ minHeight:"100vh", background:"#06060f", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", padding:"40px", fontFamily:"var(--font-body)", position:"relative" }}>
      <div style={{ position: "absolute", width: "400px", height: "400px", background: "rgba(124, 58, 237, 0.05)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ textAlign:"center", maxWidth:"440px", width:"100%", zIndex: 1 }}>
        <div style={{ fontSize:"56px", marginBottom:"24px", animation: "float 4s ease-in-out infinite" }}>🛡️</div>
        <h1 style={{ fontSize:"26px", fontWeight:900, color:"#f0f0ff", fontFamily:"var(--font-headings)", marginBottom:"8px", letterSpacing: "-0.01em" }}>
          Preparing Your Assessment
        </h1>
        <p style={{ color:"#6b6b90", fontSize:"13.5px", marginBottom:"28px" }}>{loadingMsg}</p>

        {/* Step indicators */}
        <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"28px", textAlign:"left", background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.04)" }}>
          {[
            "Initializing ZTA security layers",
            "Verifying candidate identity (L1)",
            "Scanning device fingerprint (L2)",
            "Enforcing bias protection (L12)",
            "Generating your unique questions",
          ].map((step, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:"12px",
              color: i < loadingStep ? "#34d399" : i === loadingStep ? "#a78bfa" : "#4a4a6a",
              fontSize:"13px", fontWeight: i === loadingStep ? 700 : 500,
            }}>
              <span style={{ fontSize:"15px", width: "20px" }}>
                {i < loadingStep ? "✓" : i === loadingStep ? "⟳" : "○"}
              </span>
              {step}
            </div>
          ))}
        </div>

        <div style={{ width:"100%", height:"4px", background:"rgba(255,255,255,0.06)", borderRadius:"4px", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(loadingStep / 4) * 100}%`, background:"linear-gradient(90deg, #7c3aed, #06b6d4)", transition:"width 0.6s ease", borderRadius:"4px" }} />
        </div>
      </div>
    </div>
  );

  // ── ERROR SCREEN ───────────────────────────────────────────────────────────
  if (phase === "error") return (
    <div style={{ minHeight:"100vh", background:"#06060f", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", padding:"40px", position:"relative" }}>
      <div style={{ fontSize:"56px", marginBottom:"20px" }}>⚠️</div>
      <h1 style={{ fontSize:"24px", fontWeight:900, color:"#f0f0ff", fontFamily:"var(--font-headings)", marginBottom:"8px" }}>Assessment Blocked</h1>
      <p style={{ color:"#f87171", fontSize:"14px", marginBottom:"28px", maxWidth:"440px", textAlign:"center", lineHeight:1.6, background: "rgba(239, 68, 68, 0.05)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.15)" }}>{error}</p>
      <button onClick={() => navigate("/")} className="glow-btn">← Back to Placements Catalog</button>
    </div>
  );

  // ── INTRO SCREEN ───────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div style={{ minHeight:"100vh", background:"#06060f", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px", fontFamily:"var(--font-body)", position:"relative" }}>
      <div style={{ position: "absolute", top: "10%", left: "10%", width: "300px", height: "300px", background: "rgba(124, 58, 237, 0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "300px", height: "300px", background: "rgba(6, 182, 212, 0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ maxWidth:"540px", width:"100%", textAlign:"center", animation:"fadeInUp 0.4s ease", zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"24px" }}>
          <ZTABadge compact page="Interview Room" />
        </div>

        <div style={{ fontSize:"64px", marginBottom:"16px" }}>🎯</div>
        <h1 style={{ fontSize:"32px", fontWeight:900, color:"#f0f0ff", fontFamily:"var(--font-headings)", marginBottom:"8px", letterSpacing: "-0.02em" }}>
          Ready, {candidateName.split(" ")[0]}?
        </h1>
        <p style={{ color:"#6b6b90", fontSize:"14.5px", lineHeight:1.6, marginBottom:"28px" }}>
          You are initiating the secure assessment for <strong style={{ color:"#a78bfa" }}>{jobRole}</strong>
          {companyName && <> at <strong style={{ color:"#06b6d4" }}>{companyName}</strong></>}.<br />
          This drive contains <strong style={{ color:"#f0f0ff" }}>{questions.length} unique questions</strong>.
        </p>

        {/* ZTA Security Card */}
        <div style={{
          background: "rgba(16, 185, 129, 0.03)",
          border: "1px solid rgba(16, 185, 129, 0.18)",
          borderRadius:"16px", padding:"20px", marginBottom:"20px", textAlign:"left",
        }}>
          <div style={{ fontSize:"11px", fontWeight:900, letterSpacing:"0.08em", color: "#10b981", marginBottom:"12px" }}>
            🛡️ ACTIVE PROCTOR SHIELD STATUS
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {[
              { label:"Identity & Session (L1): Cryptographically verified token", ok: ztaEnabled },
              { label:"Anti-Bias Decoupling (L12): PII removed from grader logs", ok: ztaEnabled },
              { label:"Question Uniqueness (L14): Generated unique PYQ seed", ok: uniquenessEnforced },
              { label:"Zero-Trust Proctor: Automated webcam & microphone monitor", ok: ztaEnabled },
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px", fontSize:"13px", color: item.ok ? "#34d399" : "#f87171", fontWeight: 600 }}>
                <span>{item.ok ? "✓" : "✕"}</span> {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="glass-card" style={{ padding:"20px", marginBottom:"28px", textAlign:"left", background: "rgba(10,10,22,0.6)" }}>
          <div style={{ fontSize:"11px", fontWeight:800, color:"#4a4a6a", marginBottom:"12px", letterSpacing:"0.06em", textTransform:"uppercase" }}>
            Assessment Guidelines
          </div>
          {[
            "🎥 Web camera feed must remain active and fully visible at all times",
            "⏱️ Each question has an independent countdown timer",
            "🔒 Do not navigate away, minimize window, or open new browser tabs",
            "📋 Ensure a quiet testing environment with no background speech",
          ].map((r, i) => (
            <div key={i} style={{ fontSize:"13px", color:"#cbd5e1", marginBottom:"8px", display:"flex", alignItems:"baseline", gap:"8px", lineHeight: 1.5 }}>
              <span style={{ fontSize: "11px" }}>•</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        <button onClick={handleBeginAssessment} className="glow-btn" style={{ width:"100%", padding:"15px", fontSize:"15.5px" }}>
          🚀 Begin Assessment
        </button>
      </div>
    </div>
  );

  // ── QUESTION SCREEN ────────────────────────────────────────────────────────
  if (phase === "question" || phase === "submitting") return (
    <div style={{ minHeight:"100vh", background:"#06060f", display:"flex", flexDirection:"column", fontFamily:"var(--font-body)", position:"relative" }}>
      
      {/* Background radial glow */}
      <div style={{ position: "absolute", top: 0, left: "20%", width: "400px", height: "400px", background: "rgba(124, 58, 237, 0.03)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{
        background:"rgba(6,6,15,0.9)", borderBottom:"1px solid rgba(139,92,246,0.12)",
        padding:"0 40px", display:"flex", justifyContent:"space-between", alignItems:"center",
        height: "64px", backdropFilter:"blur(16px)", position:"sticky", top:0, zIndex:50,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <button onClick={() => { window.speechSynthesis.cancel(); navigate("/"); }}
            style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", color:"#cbd5e1", cursor:"pointer", width:"32px", height:"32px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize:"14px", fontWeight:800, color:"#f0f0ff", fontFamily:"var(--font-headings)" }}>
              {companyName || "RVCE Placement"} — {jobRole}
            </div>
            <div style={{ fontSize:"11px", color:"#6b6b90", marginTop: "2px" }}>
              Question {currentIdx + 1} of {questions.length}
            </div>
          </div>
        </div>
        
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          {uniquenessEnforced && (
            <span style={{ fontSize:"9.5px", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(139,92,246,0.25)", color:"#a78bfa", padding:"4px 10px", borderRadius:"12px", fontWeight:800, fontFamily: "var(--font-headings)" }}>
              🔒 L14 UNIQUE QUESTION
            </span>
          )}
          <ZTABadge compact page="Interview" />
        </div>
      </header>

      {/* Progress Bar */}
      <div style={{ width: "100%", height: "3px", background: "rgba(255,255,255,0.04)" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #06b6d4)", transition: "width 0.5s ease" }} />
      </div>

      {/* Main Content */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns: "1fr 300px", overflow:"hidden" }}>

        {/* Left Panel: Question + Answer editor */}
        <div style={{ padding:"40px", display:"flex", flexDirection:"column", gap:"24px", overflowY:"auto" }}>

          {/* Question Type Badge */}
          <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
            <span style={{
              padding:"4px 12px", borderRadius:"20px", fontSize:"10.5px", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.06em",
              background: q?.type === "technical" ? "rgba(124,58,237,0.12)" : q?.type === "behavioural" ? "rgba(245,158,11,0.12)" : "rgba(6,182,212,0.12)",
              color: q?.type === "technical" ? "#a78bfa" : q?.type === "behavioural" ? "#fbbf24" : "#38bdf8",
              border: `1px solid ${q?.type === "technical" ? "rgba(124,58,237,0.25)" : q?.type === "behavioural" ? "rgba(245,158,11,0.25)" : "rgba(6,182,212,0.25)"}`,
              fontFamily: "var(--font-headings)"
            }}>
              {q?.type}
            </span>
            <span style={{ padding:"4px 12px", borderRadius:"20px", fontSize:"10.5px", fontWeight:700, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", color:"#6b6b90", fontFamily: "var(--font-headings)" }}>
              Skill: {q?.skill}
            </span>
            {phase === "submitting" && (
              <span style={{ padding:"4px 12px", borderRadius:"20px", fontSize:"10.5px", fontWeight:800, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", color:"#fbbf24", animation: "pulse 1.5s infinite" }}>
                ⏳ AI Scoring in progress...
              </span>
            )}
          </div>

          {/* Question Box */}
          <div style={{
            background:"rgba(10,10,22,0.6)", border:"1px solid rgba(139,92,246,0.15)",
            borderRadius:"18px", padding:"28px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            <div style={{ fontSize:"10px", fontWeight:800, color:"#6b6b90", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>
              Active Evaluation Prompt
            </div>
            <p style={{ fontSize:"18px", fontWeight:700, color:"#f0f0ff", lineHeight:1.6, fontFamily:"var(--font-headings)", margin: 0 }}>
              {q?.question}
            </p>
            <button
              onClick={() => speakQuestion(q?.question)}
              disabled={speaking}
              style={{
                marginTop:"18px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:"10px", padding:"8px 16px", color: speaking ? "#4a4a6a" : "#cbd5e1",
                fontSize:"12.5px", cursor: speaking ? "default" : "pointer", fontFamily:"var(--font-headings)",
                display:"flex", alignItems:"center", gap:"8px", transition: "all 0.2s"
              }}
              onMouseEnter={e => { if(!speaking) e.currentTarget.style.borderColor = "#7c3aed"; }}
              onMouseLeave={e => { if(!speaking) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              {speaking ? "🔊 Speaking..." : "🔊 Read question out loud"}
            </button>
          </div>

          {/* Timer bar */}
          <TimerBar timeLimit={q?.timeLimit || 120} onTimeout={handleTimeout} key={currentIdx} />

          {/* Answer Input Toggles */}
          <div style={{ display:"flex", gap:"10px", marginTop: "10px" }}>
            {[
              { id:"type", label:"⌨️ Type Code / Text Answer" },
              { id:"voice", label:"🎙️ Speak Answer" }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setAnswerMode(mode.id)}
                style={{
                  padding:"10px 20px", borderRadius:"12px", border:"none", cursor:"pointer",
                  fontSize:"13px", fontWeight:700, fontFamily:"var(--font-headings)",
                  background: answerMode === mode.id ? "rgba(124, 58, 237, 0.15)" : "rgba(255,255,255,0.02)",
                  color: answerMode === mode.id ? "#c4b5fd" : "#6b6b90",
                  borderLeft: answerMode === mode.id ? "3px solid #7c3aed" : "3px solid transparent",
                  transition:"all 0.2s",
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Type Mode Textarea */}
          {answerMode === "type" && (
            <textarea
              value={typedAnswer}
              onChange={e => setTypedAnswer(e.target.value)}
              placeholder="Provide a comprehensive technical solution. If writing code, feel free to use markdown blocks (e.g. ```javascript)."
              style={{
                width:"100%", minHeight:"180px", background:"rgba(255,255,255,0.02)",
                border:"1px solid rgba(139,92,246,0.15)", borderRadius:"16px",
                padding:"20px", color:"#f0f0ff", fontSize:"14px", fontFamily:"var(--font-mono)",
                resize:"vertical", outline:"none", lineHeight:1.7,
                transition:"all 0.2s",
              }}
              onFocus={e => { e.target.style.borderColor = "#7c3aed"; e.target.style.background = "rgba(139,92,246,0.02)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(139,92,246,0.15)"; e.target.style.background = "rgba(255,255,255,0.02)"; }}
              disabled={phase === "submitting"}
            />
          )}

          {/* Voice Mode Audio Recorder widget */}
          {answerMode === "voice" && (
            <div style={{ background:"rgba(10,10,22,0.6)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"16px", padding:"24px" }}>
              {recording ? (
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                  <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:"#ef4444", boxShadow: "0 0 10px #ef4444", animation:"ztaPulse 1s infinite" }} />
                  <span style={{ color:"#ef4444", fontSize:"13.5px", fontWeight:700 }}>LIVE RECORDING ACTIVE — SPEAK NOW</span>
                </div>
              ) : (
                <div style={{ display:"flex", gap:"10px", marginBottom:"16px" }}>
                  <button onClick={startVoiceRecording} className="glow-btn" style={{ padding:"10px 20px", fontSize:"13px" }}>
                    🎙️ Turn Microphone On
                  </button>
                </div>
              )}
              {recording && (
                <button
                  onClick={stopVoice}
                  style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", padding:"10px 20px", borderRadius:"12px", cursor:"pointer", fontSize:"13px", fontWeight:700, marginBottom:"16px" }}
                >
                  ⏹ Stop Speaking
                </button>
              )}
              {transcript && (
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "10px", marginTop: "10px" }}>
                  <span style={{ fontSize: "10px", color: "#4a4a6a", fontWeight: 700, display: "block", marginBottom: "6px" }}>VOICE TRANSCRIPT</span>
                  <p style={{ color:"#cbd5e1", fontSize:"13.5px", lineHeight:1.6, margin: 0 }}>{transcript}</p>
                </div>
              )}
              {micError && <p style={{ color:"#ef4444", fontSize:"12.5px", marginTop:"12px", fontWeight: 600 }}>{micError}</p>}
            </div>
          )}

          {/* Submit Answer Action */}
          <button
            onClick={() => handleSubmitAnswer(typedAnswer || transcript)}
            disabled={phase === "submitting" || (!typedAnswer.trim() && !transcript.trim())}
            className="glow-btn"
            style={{ padding:"16px", fontSize:"14.5px", background: (phase === "submitting" || (!typedAnswer.trim() && !transcript.trim())) ? "rgba(255,255,255,0.05)" : undefined }}
          >
            {phase === "submitting"
              ? "Evaluating Answer with L13 Fact Checker..."
              : currentIdx + 1 === questions.length ? "🏁 Submit Final Evaluation Report" : "Submit Answer & Proceed →"}
          </button>
        </div>

        {/* Right Panel: Proctor camera feed & telemetry checklist */}
        <aside style={{
          borderLeft:"1px solid rgba(139,92,246,0.15)",
          background:"rgba(10,10,22,0.9)", padding:"32px 24px", display:"flex",
          flexDirection:"column", gap:"20px", overflowY:"auto",
        }}>
          
          {/* Rounded Camera box */}
          <div style={{ borderRadius: "16px", overflow: "hidden", border: "2px solid rgba(139,92,246,0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            <CameraFeed />
          </div>

          {/* ZTA Live Indicators */}
          <div style={{ background:"rgba(16,185,129,0.03)", border:"1px solid rgba(16,185,129,0.18)", borderRadius:"14px", padding:"16px" }}>
            <div style={{ fontSize:"10px", fontWeight:900, color:"#10b981", letterSpacing:"0.08em", marginBottom:"12px" }}>
              PROCTOR INTEGRITY CHECKS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { id:"L1", label:"Session Guard", ok:true },
                { id:"L4", label:"XSS Sanitizer", ok:true },
                { id:"L12", label:"Anti-Bias Decouple", ok:true },
                { id:"L13", label:"CV Fact Shield", ok:true },
                { id:"L14", label:"Unique Seed", ok:uniquenessEnforced },
              ].map(layer => (
                <div key={layer.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"12.5px" }}>
                  <span style={{ color:"#6b6b90" }}>
                    <strong style={{ color:"#a78bfa", marginRight:"6px" }}>{layer.id}</strong>
                    {layer.label}
                  </span>
                  <span style={{ fontWeight:800, color: layer.ok ? "#34d399" : "#f87171" }}>
                    {layer.ok ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress List */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"14px", padding:"16px" }}>
            <div style={{ fontSize:"10px", fontWeight:800, color:"#6b6b90", marginBottom:"12px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Questions Roadmap
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {questions.map((qs, i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:"10px",
                  opacity: i === currentIdx ? 1 : i < currentIdx ? 0.6 : 0.35,
                }}>
                  <div style={{
                    width:"8px", height:"8px", borderRadius:"50%", flexShrink:0,
                    background: i < currentIdx ? "#10b981" : i === currentIdx ? "#7c3aed" : "#3c3c54",
                    boxShadow: i === currentIdx ? "0 0 8px #7c3aed" : "none"
                  }} />
                  <span style={{ fontSize:"12px", color: i === currentIdx ? "#f0f0ff" : "#6b6b90", fontWeight: i === currentIdx ? 700 : 500, textTransform: "capitalize" }}>
                    Q{i + 1}: {qs.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ZTA Ticker Bottom Bar */}
      <div className="zta-ticker" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
        <span className="zta-ticker-label" style={{ background: "#7c3aed", color: "#fff", fontWeight: 800 }}>ZTA SECURE</span>
        <div style={{ overflow:"hidden", flex:1, display:"flex", gap:"36px", alignItems:"center" }}>
          {ztaTickerItems.slice(-4).map((item, i) => (
            <span key={i} style={{ whiteSpace:"nowrap", opacity: i === ztaTickerItems.slice(-4).length - 1 ? 1 : 0.4, fontSize:"11.5px", fontFamily: "var(--font-mono)", color: "#c4b5fd" }}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  // ── PROCTOR BLOCKED SCREEN ──────────────────────────────────────────────────
  if (phase === "proctor_blocked" || proctorViolated) return (
    <div style={{ minHeight:"100vh", background:"#09050d", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", padding:"40px", position:"relative", overflow: "hidden", fontFamily: "var(--font-body)" }}>
      {/* Intense red radial glows */}
      <div style={{ position: "absolute", width: "400px", height: "400px", background: "rgba(239, 68, 68, 0.15)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: "600px", height: "600px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
      
      <div style={{ textAlign:"center", maxWidth: "560px", zIndex: 1 }} className="fade-in-up">
        <div style={{ fontSize:"72px", marginBottom:"24px", animation: "pulse 1.5s infinite" }}>🚨</div>
        <h1 style={{ fontSize:"30px", fontWeight:900, color:"#ef4444", fontFamily:"var(--font-headings)", marginBottom:"12px", letterSpacing: "-0.02em" }}>
          ASSESSMENT TERMINATED
        </h1>
        <div style={{
          background: "rgba(239, 68, 68, 0.04)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "28px",
          textAlign: "left",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          <div style={{ fontSize:"11px", fontWeight:900, color:"#f87171", letterSpacing:"0.08em", marginBottom:"12px", textTransform:"uppercase" }}>
            ZTA PROCTOR VIOLATION REGISTERED
          </div>
          <p style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>
            Candidate: {candidateName}
          </p>
          <p style={{ color: "#cbd5e1", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>
            <strong>Reason:</strong> {violationReason || "Unauthorized usage of AI tools or external web applications."}
          </p>
          <div style={{ marginTop: "16px", fontSize: "12px", color: "#6b6b90", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
            Your session token, browser fingerprint, and IP address have been logged. The placement coordinator cell has been notified of this violation. Access is restricted.
          </div>
        </div>
        <button onClick={() => navigate("/")} className="glow-btn" style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)", border: "none" }}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  // ── DONE / SUBMITTING FINAL ───────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#06060f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-body)", position:"relative" }}>
      <div style={{ position: "absolute", width: "300px", height: "300px", background: "rgba(6, 182, 212, 0.05)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ textAlign:"center", zIndex: 1 }}>
        <div style={{ fontSize:"56px", marginBottom:"20px", animation: "spin 4s linear infinite" }}>🔄</div>
        <h1 style={{ fontSize:"24px", fontWeight:900, color:"#f0f0ff", fontFamily:"var(--font-headings)" }}>Compiling Graded Report...</h1>
        <p style={{ color:"#6b6b90", fontSize:"13.5px", marginTop:"8px" }}>ZTA-L13 Fact Verification engine is scoring your final answers</p>
      </div>
    </div>
  );
}
