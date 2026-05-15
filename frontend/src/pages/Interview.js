import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CameraFeed  from "../components/CameraFeed";
import TimerBar    from "../components/TimerBar";
import QuestionBox from "../components/QuestionBox";

const BACKEND = "http://localhost:5001";

export default function Interview() {
  const navigate = useNavigate();
  const resumeText    = sessionStorage.getItem("resumeText")    || "";
  const jobRole       = sessionStorage.getItem("jobRole")       || "";
  const candidateName = sessionStorage.getItem("candidateName") || "Candidate";
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
  const mediaRecorder = useRef(null);
  const audioChunks   = useRef([]);

  useEffect(() => {
    if (!resumeText) { navigate("/"); return; }
    async function loadQuestions() {
      try {
        setLoadingMsg("Reading your resume...");
        await new Promise(r => setTimeout(r, 600));
        setLoadingMsg("Generating your personalised questions...");
        const res = await axios.post(`${BACKEND}/api/interview/questions`, { resumeText, jobRole });
        if (!res.data.success) throw new Error(res.data.error);
        setQuestions(res.data.questions);
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
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92; utt.pitch = 1;
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = handleAudioStop;
      mediaRecorder.current.start();
      setRecording(true);
    } catch { setMicError("Mic access denied. Please type your answer below."); }
  }

  function stopRecording() {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      setRecording(false);
    }
  }

  async function handleAudioStop() {
    try {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      setTranscript("Transcribing your answer...");
      const res = await axios.post(`${BACKEND}/api/interview/transcribe`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const text = res.data.transcript || "";
      setTranscript(text); setTypedAnswer(text);
    } catch { setTranscript(""); setMicError("Could not transcribe. Please type below."); }
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
    const q = questions[currentIdx];
    const finalAnswer = (answerText || typedAnswer || transcript || "").trim() || "(No answer)";
    let result = { question:q.question, answer:finalAnswer, skill:q.skill, type:q.type, score:0, grade:"N/A", summary:"", strengths:[], improvements:[], idealAnswer:"", biasCheck:{passed:true} };
    try {
      const res = await axios.post(`${BACKEND}/api/evaluate/answer`, { question:q.question, answer:finalAnswer, questionType:q.type, skill:q.skill, jobRole });
      result = { ...result, score:res.data.score, grade:res.data.grade, summary:res.data.summary, strengths:res.data.strengths, improvements:res.data.improvements, idealAnswer:res.data.idealAnswer, biasCheck:res.data.biasCheck };
    } catch (err) { console.error("Eval error: - Interview.js:116", err.message); }
    const updatedAnswers = [...answers, result];
    setAnswers(updatedAnswers);
    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setCurrentIdx(nextIdx); setTranscript(""); setTypedAnswer(""); setMicError("");
      setPhase("question");
      setTimeout(() => speakQuestion(questions[nextIdx].question), 500);
    } else { finishInterview(updatedAnswers); }
  }

  async function finishInterview(allAnswers) {
    setPhase("done");
    let report = null;
    try {
      const res = await axios.post(`${BACKEND}/api/evaluate/final-report`, { jobRole, results:allAnswers });
      report = res.data;
    } catch (err) { console.error("Report error: - Interview.js:133", err.message); }
    sessionStorage.setItem("interviewResults", JSON.stringify({ answers:allAnswers, report, jobRole, candidateName }));
    navigate("/results");
  }

  const q = questions[currentIdx];

  if (phase === "loading" || loading) return (
    <div style={s.page}><style>{anim}</style>
      <div style={s.center}>
        <div style={s.spinner}/>
        <div style={s.bigTitle}>Preparing Your Interview</div>
        <div style={s.sub}>{loadingMsg}</div>
        {["Reading resume","Generating questions","Running bias check"].map((st,i)=>(
          <div key={i} style={{fontSize:13,color:"#6666aa",marginBottom:8}}><span style={{color:"#6c63ff"}}>●</span> {st}</div>
        ))}
      </div>
    </div>
  );

  if (phase === "error") return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={{fontSize:52,marginBottom:16}}>⚠️</div>
        <div style={s.bigTitle}>Something went wrong</div>
        <div style={{color:"#f87171",fontSize:14,marginBottom:24,textAlign:"center",maxWidth:400}}>{error}</div>
        <button onClick={()=>navigate("/")} style={s.btnPrimary}>← Go Back</button>
      </div>
    </div>
  );

  if (phase === "intro") return (
    <div style={s.page}><style>{anim}</style>
      <div style={s.center}>
        <div style={{fontSize:60,marginBottom:16}}>🎯</div>
        <div style={s.bigTitle}>Ready, {candidateName}?</div>
        <div style={{color:"#8888aa",fontSize:14,lineHeight:1.8,textAlign:"center",marginBottom:24,maxWidth:420}}>
          Interview for <b style={{color:"#6c63ff"}}>{jobRole}</b> · <b style={{color:"#fff"}}>{questions.length} questions</b><br/>
          AI reads each question aloud. Answer by <b style={{color:"#fff"}}>mic</b> or <b style={{color:"#fff"}}>typing</b>.
        </div>
        <div style={{background:"#161628",border:"1px solid #252545",borderRadius:14,padding:"20px 24px",marginBottom:24,textAlign:"left",maxWidth:380}}>
          {["🎙️ Allow microphone when asked","⏱️ Answer within the time limit","🔒 Stay on this tab","📋 Answer from real experience"].map((r,i)=>(
            <div key={i} style={{fontSize:13,color:"#aaaacc",marginBottom:10}}>{r}</div>
          ))}
        </div>
        <button onClick={()=>startQuestion(0)} style={s.btnPrimary}>🚀 Start Interview</button>
      </div>
    </div>
  );

  if (phase === "done") return (
    <div style={s.page}><style>{anim}</style>
      <div style={s.center}>
        <div style={{fontSize:52,marginBottom:16}}>📊</div>
        <div style={s.bigTitle}>Generating Your Report...</div>
        <div style={s.spinner}/>
      </div>
    </div>
  );

  return (
    <div style={s.page}><style>{anim}</style>
      <div style={s.topBar}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🤖</span>
          <span style={{fontSize:16,fontWeight:700,color:"#fff"}}>TrustInterview AI</span>
          <span style={{background:"#3a0a0a",color:"#f87171",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>● LIVE</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {speaking&&<span style={{background:"#0a1a3a",color:"#60a5fa",fontSize:11,padding:"3px 10px",borderRadius:20}}>🔊 AI Speaking...</span>}
          <span style={{fontSize:13,color:"#8888aa"}}>Question {currentIdx+1} of {questions.length}</span>
        </div>
      </div>

      <div style={{height:4,background:"#1a1a2e"}}>
        <div style={{height:"100%",width:`${(currentIdx/questions.length)*100}%`,background:"linear-gradient(90deg,#6c63ff,#38bdf8)",transition:"width .5s"}}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:20,padding:20,maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <CameraFeed candidateName={candidateName} recording={recording}/>
          <div style={s.card}>
            <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:12}}>🎙️ Your Answer</div>
            {!recording
              ? <button onClick={startRecording} style={s.btnMic}>🎤 Start Recording</button>
              : <button onClick={stopRecording}  style={s.btnStop}>⏹ Stop Recording</button>
            }
            {recording&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,color:"#f87171",fontSize:13,animation:"pulse 1.2s infinite"}}>● Recording... speak clearly</div>}
            {micError&&<div style={{background:"#1e0f0f",border:"1px solid #7f1d1d",borderRadius:8,padding:"8px 12px",color:"#f87171",fontSize:12,marginTop:10}}>{micError}</div>}
            {transcript&&transcript!=="Transcribing your answer..."&&(
              <div style={{background:"#0b0b18",border:"1px solid #252545",borderRadius:8,padding:"10px 12px",marginTop:10}}>
                <div style={{fontSize:11,color:"#6c63ff",fontWeight:600,marginBottom:4}}>Transcribed:</div>
                <div style={{fontSize:13,color:"#ccccee",lineHeight:1.6}}>{transcript}</div>
              </div>
            )}
            {transcript==="Transcribing your answer..."&&<div style={{fontSize:12,color:"#a78bfa",marginTop:10}}>⏳ Transcribing...</div>}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {q&&<QuestionBox question={q} index={currentIdx}/>}
          {q&&<TimerBar key={`timer-${currentIdx}`} seconds={q.timeLimit||90} onTimeout={handleTimeout} active={phase==="question"}/>}
          <div style={s.card}>
            <label style={{display:"block",fontSize:14,fontWeight:600,color:"#fff",marginBottom:10}}>
              ✍️ Type your answer <span style={{color:"#555570",fontWeight:400}}>(or use mic)</span>
            </label>
            <textarea style={s.textarea} rows={5} placeholder="Type your answer here..." value={typedAnswer} onChange={e=>setTypedAnswer(e.target.value)} disabled={phase==="submitting"}/>
          </div>
          <button
            style={{...s.btnSubmit,...(phase==="submitting"?{opacity:.5,cursor:"not-allowed"}:{})}}
            onClick={()=>handleSubmitAnswer(typedAnswer||transcript)}
            disabled={phase==="submitting"}
          >
            {phase==="submitting"?"⏳ Evaluating...":currentIdx+1===questions.length?"✅ Submit Final Answer":"Submit Answer →"}
          </button>
          <div style={{fontSize:11,color:"#333350",textAlign:"center"}}>✓ Bias check active · Resume-matched question</div>
        </div>
      </div>
    </div>
  );
}

const anim = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  textarea::placeholder { color:#44445a; }
  textarea:focus { border-color:#6c63ff!important; outline:none; }
`;

const s = {
  page:    { minHeight:"100vh", background:"#0b0b18", color:"#fff", fontFamily:"'Segoe UI',sans-serif" },
  center:  { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:24, textAlign:"center" },
  spinner: { width:52, height:52, border:"4px solid #252545", borderTop:"4px solid #6c63ff", borderRadius:"50%", animation:"spin .9s linear infinite", margin:"16px auto" },
  bigTitle:{ fontSize:24, fontWeight:700, color:"#fff", marginBottom:10 },
  sub:     { fontSize:14, color:"#8888aa", marginBottom:16 },
  topBar:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", background:"#111122", borderBottom:"1px solid #1e1e3a" },
  card:    { background:"#161628", border:"1px solid #252545", borderRadius:16, padding:18 },
  btnPrimary:{ background:"linear-gradient(135deg,#6c63ff,#4f46e5)", color:"#fff", padding:"14px 32px", fontSize:15, fontWeight:700, border:"none", borderRadius:12, cursor:"pointer", boxShadow:"0 4px 20px rgba(108,99,255,.4)" },
  btnMic:  { width:"100%", background:"linear-gradient(135deg,#6c63ff,#4f46e5)", color:"#fff", padding:"11px 0", fontSize:14, fontWeight:600, border:"none", borderRadius:10, cursor:"pointer" },
  btnStop: { width:"100%", background:"linear-gradient(135deg,#dc2626,#b91c1c)", color:"#fff", padding:"11px 0", fontSize:14, fontWeight:600, border:"none", borderRadius:10, cursor:"pointer" },
  btnSubmit:{ background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"#fff", padding:"14px 0", fontSize:15, fontWeight:700, border:"none", borderRadius:12, cursor:"pointer", width:"100%", boxShadow:"0 4px 20px rgba(34,197,94,.3)" },
  textarea:{ width:"100%", background:"#0b0b18", border:"1px solid #252545", borderRadius:10, padding:"12px 14px", fontSize:14, color:"#fff", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", lineHeight:1.6, marginTop:8 },
};
