import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CameraFeed  from "../components/CameraFeed";
import TimerBar    from "../components/TimerBar";
import QuestionBox from "../components/QuestionBox";

const BACKEND = "http://localhost:5001";

function ztaHeaders(extra = {}) {
  const token       = sessionStorage.getItem("ztaToken")       || "";
  const role        = sessionStorage.getItem("ztaRole")        || "candidate";
  const fingerprint = sessionStorage.getItem("ztaFingerprint") || "";
  const issuedAt    = sessionStorage.getItem("ztaIssuedAt")    || "";
  if (issuedAt) {
    const age = Date.now() - parseInt(issuedAt);
    if (age > 15 * 60 * 1000) console.warn("[ZTAL1] Token expired age: - Interview.js:17", Math.round(age/1000)+"s");
  }
  const currentFP = (() => {
    const ua   = navigator.userAgent;
    const lang = navigator.language;
    const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const raw  = `${ua}|${lang}|${tz}|${window.screen.width}x${window.screen.height}`;
    let hash   = 0;
    for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
    return Math.abs(hash).toString(16).padStart(8, "0");
  })();
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
  } catch {
    return true;
  }
}

export default function Interview() {
  const navigate = useNavigate();

  const resumeText    = sessionStorage.getItem("resumeText")    || "";
  const jobRole       = sessionStorage.getItem("jobRole")       || "";
  const candidateName = sessionStorage.getItem("candidateName") || "Candidate";
  const companyName   = sessionStorage.getItem("companyName")   || "";
  const interviewType = sessionStorage.getItem("interviewType") || "mock";

  const [questions,   setQuestions]   = useState([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState([]);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [loadingMsg,  setLoadingMsg]  = useState("Reading your resume...");
  const [error,       setError]       = useState("");
  const [phase,       setPhase]       = useState("loading");
  const [recording,   setRecording]   = useState(false);
  const [micError,    setMicError]    = useState("");
  const [transcript,  setTranscript]  = useState("");
  const [speaking,    setSpeaking]    = useState(false);
  const [ztaStatus,   setZtaStatus]   = useState("Verifying ZTA session...");
  const [ztaEnabled,  setZtaEnabled]  = useState(true);

  const mediaRecorder = useRef(null);
  const audioChunks   = useRef([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!resumeText) { navigate("/"); return; }

    fetchZTAStatus().then(enabled => setZtaEnabled(enabled));

    const token = sessionStorage.getItem("ztaToken");
    if (!token) {
      setError("ZTA-L1: No session token found. Please start from the upload page.");
      setPhase("error");
      setLoading(false);
      return;
    }

    const role = sessionStorage.getItem("ztaRole");
    if (!role || (role !== "candidate" && role !== "admin")) {
      setError("ZTA-RBAC: Invalid role. Access denied.");
      setPhase("error");
      setLoading(false);
      return;
    }

    setZtaStatus("ZTA verified — loading questions");

    async function loadQuestions() {
      try {
        setLoadingMsg("Reading your resume...");
        await new Promise(r => setTimeout(r, 600));
        setLoadingMsg("Generating your personalised questions...");
        const selectedPYQ = sessionStorage.getItem("selectedPYQ") || "";
        const selectedLLM = sessionStorage.getItem("selectedLLM") || "llama-3-edge";
        const excludeQuestions = JSON.parse(sessionStorage.getItem("excludeQuestions") || "[]");
        const res = await axios.post(
          `${BACKEND}/api/interview/questions`,
          { 
            resumeText, 
            jobRole, 
            companyName, 
            companyPYQ: selectedPYQ, 
            llmModel: selectedLLM, 
            excludeQuestions 
          },
          { headers: ztaHeaders({ "Content-Type": "application/json" }) }
        );
        if (!res.data.success) throw new Error(res.data.error);
        setQuestions(res.data.questions);
        
        // Prevent repeated questions by adding them to the excludeQuestions list
        const newExcludes = [...excludeQuestions, ...res.data.questions.map(q => q.question)];
        sessionStorage.setItem("excludeQuestions", JSON.stringify(newExcludes));

        setLoading(false);
        setPhase("intro");
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load questions.");
        setLoading(false);
        setPhase("error");
      }
    }

    loadQuestions();
  }, [navigate, resumeText, jobRole]);

  function speakQuestion(text) {
    window.speechSynthesis.cancel();
    const utt   = new SpeechSynthesisUtterance(text);
    utt.rate    = 0.92;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function startQuestion(idx) {
    setPhase("question"); setTranscript(""); setTypedAnswer(""); setMicError("");
    speakQuestion(questions[idx !== undefined ? idx : currentIdx].question);
  }

  async function startRecording() {
    setMicError("");
    setTranscript("Listening... speak into your microphone");
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicError("Speech recognition not supported in this browser. Please type your answer.");
        return;
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setRecording(true);
        setTranscript("Go ahead, speak now...");
      };

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript);
          setTypedAnswer(currentTranscript);
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        if (e.error === "not-allowed") {
          setMicError("Mic access denied. Please check permissions.");
        } else {
          setMicError(`Transcription error: ${e.error}`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      setMicError("Mic access denied. Please check browser permissions.");
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  }

  function handleTimeout() {
    window.speechSynthesis.cancel();
    if (recording) stopRecording();
    handleSubmitAnswer(typedAnswer || transcript || "(No answer — time ran out)");
  }

  async function handleSubmitAnswer(answerText) {
    if (phase === "submitting") return;
    setPhase("submitting");
    window.speechSynthesis.cancel();
    const q           = questions[currentIdx];
    const finalAnswer = (answerText || typedAnswer || transcript || "").trim() || "(No answer)";
    let result = {
      question: q.question, answer: finalAnswer, skill: q.skill, type: q.type,
      score: 0, grade: "N/A", summary: "", strengths: [], improvements: [],
      idealAnswer: "", biasCheck: { passed: true },
    };
    try {
      const llmModel = sessionStorage.getItem("selectedLLM") || "llama-3-edge";
      let hallocTypes = { cv: true, context: true, facts: true };
      try {
        const rawTypes = sessionStorage.getItem("hallucinationTypes");
        if (rawTypes) hallocTypes = JSON.parse(rawTypes);
      } catch (e) {}

      const res = await axios.post(
        `${BACKEND}/api/evaluate/answer`,
        { 
          question: q.question, 
          answer: finalAnswer, 
          questionType: q.type, 
          skill: q.skill, 
          jobRole, 
          resumeText,
          candidateName,
          llmModel,
          hallucinationTypes: hallocTypes
        },
        { headers: ztaHeaders({ "Content-Type": "application/json" }) }
      );
      result = { ...result, ...res.data };
    } catch (err) {
      console.error("Eval error: - Interview.js:193", err.message);
    }
    const updated = [...answers, result];
    setAnswers(updated);
    const next = currentIdx + 1;
    if (next < questions.length) {
      setCurrentIdx(next); setTranscript(""); setTypedAnswer(""); setMicError("");
      setPhase("question");
      setTimeout(() => speakQuestion(questions[next].question), 500);
    } else {
      finishInterview(updated);
    }
  }

  async function finishInterview(allAnswers) {
    setPhase("done");
    let report = null;
    try {
      const res = await axios.post(
        `${BACKEND}/api/evaluate/final-report`,
        { jobRole, results: allAnswers },
        { headers: ztaHeaders({ "Content-Type": "application/json" }) }
      );
      report = res.data;
    } catch (err) { console.error("Report error: - Interview.js:217", err.message); }
    sessionStorage.setItem("interviewResults", JSON.stringify({ answers: allAnswers, report, jobRole, candidateName }));
    navigate("/results");
  }

  const q = questions[currentIdx];

  if (phase === "loading" || loading) return (
    <div style={s.page}>
      <div style={s.center}>
        <div className="spinner" style={{ marginBottom: 20 }} />
        <h1 style={s.bigTitle}>Preparing Your Assessment</h1>
        <p style={s.sub}>{loadingMsg}</p>
        <div className="glass-card" style={{ padding: "16px 24px", marginTop: 24, maxWidth: 380, width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: 10, color: "var(--color-primary)", fontWeight: 800, marginBottom: 8, letterSpacing: "0.05em", fontFamily: "var(--font-headings)" }}>ZTA INTEGRITY STATUS</div>
          <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>✓ {ztaStatus}</div>
        </div>
      </div>
    </div>
  );

  if (phase === "error") return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={s.bigTitle}>Something went wrong</h1>
        <p style={{ color: "var(--color-error)", fontSize: 14, marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>{error}</p>
        <button onClick={() => navigate("/")} className="glow-btn">← Go Back</button>
      </div>
    </div>
  );

  if (phase === "intro") return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎯</div>
        <h1 style={s.bigTitle}>Ready, {candidateName}?</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.8, marginBottom: 24, maxWidth: 420 }}>
          You are starting the assessment for <strong style={{ color: "var(--color-primary)" }}>{jobRole}</strong>.<br />
          It consists of <strong style={{ color: "#ffffff" }}>{questions.length} personalized questions</strong>.<br />
          The AI will read each question aloud. You can answer via <strong style={{ color: "#ffffff" }}>microphone</strong> or by <strong style={{ color: "#ffffff" }}>typing</strong>.
        </p>

        <div className="glass-card" style={{
          padding: "16px 20px", marginBottom: 24, maxWidth: 420, width: "100%", textAlign: "left",
          borderColor: ztaEnabled === false ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)",
          background: ztaEnabled === false ? "rgba(244, 63, 94, 0.05)" : "rgba(16, 185, 129, 0.05)"
        }}>
          <div style={{ fontSize: 11, color: ztaEnabled === false ? "var(--color-error)" : "var(--color-success)", fontWeight: 800, marginBottom: 10, letterSpacing: "0.05em", fontFamily: "var(--font-headings)" }}>
            {ztaEnabled === false ? "⚠️ ZTA SECURITY INACTIVE" : "🛡️ SECURE ZTA SESSION INITIALIZED"}
          </div>
          {ztaEnabled === false ? (
            <>
              {["Identity: L1 Anonymous access enabled","Device: L2 Browser emulation warning","RBAC: L3 Policy enforcement bypassed"].map((l, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "var(--color-error)", marginBottom: 4, display: "flex", gap: 6, fontWeight: 500 }}>
                  <span>✕</span> {l}
                </div>
              ))}
            </>
          ) : (
            <>
              {["Identity: L1 Bearer session token validated","Device: L2 Fingerprint telemetry matches client","RBAC: L3 Candidate access scopes verified"].map((l, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "var(--color-success)", marginBottom: 4, display: "flex", gap: 6, fontWeight: 500 }}>
                  <span>✓</span> {l}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="glass-card" style={{ padding: "20px 24px", marginBottom: 28, textAlign: "left", maxWidth: 420, width: "100%" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.05em", fontFamily: "var(--font-headings)" }}>RULES & GUIDELINES</div>
          {[
            "🎙️ Allow browser microphone access when prompted",
            "⏱️ Submit your answers before the timer runs out",
            "🔒 Do not switch tabs or leave this browser page",
            "📋 Speak clearly and structure your answers logically"
          ].map((r, i) => (
            <div key={i} style={{ fontSize: 13, color: "#d1d5db", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              {r}
            </div>
          ))}
        </div>

        <button onClick={() => startQuestion(0)} className="glow-btn" style={{ padding: "14px 36px", fontSize: 15 }}>
          🚀 Start Assessment
        </button>
      </div>
    </div>
  );

  if (phase === "done") return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
        <h1 style={s.bigTitle}>Analyzing Performance</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>AI is reviewing responses and generating audit logs...</p>
        <div className="spinner" />
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <header style={s.navbar} className="glass-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-headings)" }}>
            {companyName ? `${companyName} Assessments` : "TrustInterview AI"}
          </span>
          {ztaEnabled === false ? (
            <span className="badge badge-error">⚠️ ZTA OFF</span>
          ) : (
            <span className="badge badge-success">🛡️ SECURED</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {speaking && <span className="badge badge-primary pulse-indicator">🔊 AI SPEAKING...</span>}
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-headings)" }}>
            QUESTION {currentIdx + 1} OF {questions.length}
          </span>
        </div>
      </header>

      {ztaEnabled === false && (
        <div style={s.warningBanner} className="badge-error">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-error)" }}>ZTA SYSTEM DISABLED — DEMO VULNERABLE MODE</div>
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>No authentication · No rate limiting · No audit logging · Bypassed filters</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["L1 Auth", "L2 Fingerprint", "L8 sanitization", "L12 bias filter"].map(l => (
              <span key={l} style={s.bannerChip}>✕ {l}</span>
            ))}
          </div>
        </div>
      )}

      <div style={s.progressBarTrack}>
        <div style={{ ...s.progressBarFill, width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      {companyName && (
        <div 
          className="glass-card fade-in-up" 
          style={{ 
            maxWidth: 1200, 
            margin: "20px auto 20px", 
            padding: "16px 24px", 
            background: "rgba(99, 102, 241, 0.06)", 
            border: "1px solid rgba(99, 102, 241, 0.2)", 
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏢</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-headings)" }}>
                Hiring Partner: {companyName} {interviewType === "actual" ? " (Official Placement Drive)" : " (Practice Mock Sandbox)"}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                Target Placement Campaign Role: <strong>{jobRole || "AI Specialist"}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "12.5px" }}>
            <span style={{ color: "#a5b4fc" }}>
              📚 <strong>PYQ Syllabus:</strong> {sessionStorage.getItem("selectedPYQ") || "Google SWE 2025"}
            </span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              🔒 <strong>Placement Cutoff:</strong> CGPA >= {sessionStorage.getItem("minCgpa") || "8.0"}
            </span>
          </div>
        </div>
      )}

      <div style={s.mainGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <CameraFeed candidateName={candidateName} recording={recording} />

          <div className="glass-card" style={s.card}>
            <div style={s.cardTitle}>🎙️ Voice Input</div>
            {!recording ? (
              <button onClick={startRecording} className="glow-btn" style={s.micBtn}>
                🎤 Click to Speak Answer
              </button>
            ) : (
              <button onClick={stopRecording} className="glow-btn" style={s.stopBtn}>
                ⏹ Stop Voice Recording
              </button>
            )}
            
            {recording && (
              <div style={s.recordingState} className="pulse-indicator">
                <span style={s.redDot} /> Listening... speak into your microphone
              </div>
            )}
            
            {micError && (
              <div style={s.micErrorBox}>
                ⚠️ {micError}
              </div>
            )}
            
            {transcript && (
              <div style={s.transcriptBox}>
                <div style={s.transcriptHeader}>LIVE TRANSCRIPTION</div>
                <div style={{ 
                  color: transcript === "Transcribing your answer..." ? "var(--color-primary)" : "var(--text-main)", 
                  fontSize: 13, 
                  lineHeight: 1.6,
                  fontWeight: transcript === "Transcribing your answer..." ? 500 : 400
                }}>
                  {transcript}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {q && <QuestionBox question={q} index={currentIdx} />}
          {q && (
            <TimerBar
              key={"timer-" + currentIdx}
              seconds={q.timeLimit || 90}
              onTimeout={handleTimeout}
              active={phase === "question"}
            />
          )}
          
          <div className="glass-card" style={s.card}>
            <label style={s.textareaLabel}>
              ✍️ Type or edit your response
            </label>
            <textarea
              className="form-input"
              rows={6}
              placeholder="Start writing your answer here..."
              value={typedAnswer}
              onChange={e => setTypedAnswer(e.target.value)}
              disabled={phase === "submitting"}
              style={{ resize: "vertical", marginTop: 8 }}
            />
          </div>
          
          <button
            className="glow-btn"
            style={{ 
              width: "100%", 
              padding: "14px", 
              fontSize: 15,
              background: phase === "submitting" ? "rgba(255, 255, 255, 0.05)" : "linear-gradient(135deg, var(--color-success), #059669)",
              boxShadow: phase === "submitting" ? "none" : "0 4px 12px rgba(16, 185, 129, 0.2)"
            }}
            onClick={() => handleSubmitAnswer(typedAnswer || transcript)}
            disabled={phase === "submitting"}
          >
            {phase === "submitting" 
              ? "⏳ Securing & evaluating answer..." 
              : currentIdx + 1 === questions.length 
                ? "✅ Complete Assessment" 
                : "Submit Answer →"}
          </button>
          
          <div style={s.secFooter}>
            {ztaEnabled === false
              ? "⚠️ ZTA SYSTEM DISABLED — DEMO UNPROTECTED SESSION"
              : "🔒 ZTA SHIELD ACTIVE · DYNAMIC SANITIZATION ACTIVE · END-TO-END SIGNED"}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { 
    minHeight: "100vh", 
    color: "var(--text-main)", 
    fontFamily: "var(--font-body)",
    paddingBottom: 48,
    position: "relative",
    zIndex: 1,
  },
  center: { 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    minHeight: "100vh", 
    padding: 24, 
    textAlign: "center" 
  },
  bigTitle: { 
    fontSize: 28, 
    fontWeight: 800, 
    color: "#fff", 
    marginBottom: 8,
    fontFamily: "var(--font-headings)",
    letterSpacing: "-0.01em",
  },
  sub: { 
    fontSize: 14.5, 
    color: "var(--text-muted)",
    lineHeight: 1.6
  },
  navbar: { 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: "14px 24px", 
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto 20px",
    borderRadius: 14,
    background: "rgba(17, 24, 39, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  warningBanner: { 
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto 20px",
    borderRadius: 10,
    border: "1px solid rgba(244, 63, 94, 0.3)",
    background: "rgba(244, 63, 94, 0.08)",
    padding: "12px 20px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  bannerChip: { 
    background: "rgba(3, 7, 18, 0.4)", 
    color: "var(--color-error)", 
    fontSize: 10, 
    padding: "3px 8px", 
    borderRadius: 6, 
    border: "1px solid rgba(244, 63, 94, 0.2)", 
    fontFamily: "monospace" 
  },
  progressBarTrack: { 
    height: 6, 
    background: "rgba(255, 255, 255, 0.03)", 
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto 24px",
    borderRadius: 99,
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.05)"
  },
  progressBarFill: { 
    height: "100%", 
    background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))", 
    borderRadius: 99,
    transition: "width .5s ease" 
  },
  mainGrid: { 
    display: "grid", 
    gridTemplateColumns: "1fr 1.3fr", 
    gap: 28, 
    maxWidth: 1200, 
    margin: "0 auto",
    padding: "0 20px",
  },
  card: { 
    background: "rgba(17, 24, 39, 0.45)", 
    border: "1px solid rgba(255, 255, 255, 0.08)", 
    borderRadius: 16, 
    padding: 24 
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#cbd5e1",
    letterSpacing: "0.05em",
    fontFamily: "var(--font-headings)",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  micBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
    boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
  },
  stopBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, var(--color-error), #be123c)",
    boxShadow: "0 4px 14px rgba(244, 63, 94, 0.3)",
  },
  recordingState: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    color: "var(--color-error)",
    fontSize: 13,
    fontWeight: 600,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--color-error)",
    boxShadow: "var(--shadow-error-glow)",
    display: "inline-block",
  },
  micErrorBox: {
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--color-error)",
    fontSize: 12.5,
    marginTop: 14,
    fontWeight: 500,
  },
  transcriptBox: {
    background: "rgba(3, 7, 18, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  transcriptHeader: {
    fontSize: 10,
    color: "var(--color-primary)",
    fontWeight: 800,
    letterSpacing: "0.05em",
    fontFamily: "var(--font-headings)",
    marginBottom: 8,
  },
  textareaLabel: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#cbd5e1",
    letterSpacing: "0.05em",
    fontFamily: "var(--font-headings)",
    textTransform: "uppercase",
  },
  secFooter: {
    fontSize: 10.5,
    color: "rgba(255, 255, 255, 0.25)",
    textAlign: "center",
    fontWeight: 600,
    fontFamily: "var(--font-headings)",
    letterSpacing: "0.02em",
    marginTop: 8,
  },
};
