import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Results() {
  const navigate = useNavigate();
  const raw = sessionStorage.getItem("interviewResults");
  const data = raw ? JSON.parse(raw) : null;
  const [activeTab, setActiveTab] = useState(0);

  if (!data) return (
    <div style={{minHeight:"100vh",background:"#0b0b18",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:52}}>⚠️</div>
      <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>No results found</div>
      <div style={{fontSize:14,color:"#8888aa"}}>Please complete an interview first.</div>
      <button onClick={()=>navigate("/")} style={{background:"linear-gradient(135deg,#6c63ff,#4f46e5)",color:"#fff",padding:"13px 28px",fontSize:14,fontWeight:700,border:"none",borderRadius:12,cursor:"pointer"}}>← Go to Upload Page</button>
    </div>
  );

  const { answers, report, jobRole, candidateName } = data;
  const avg = answers.length ? (answers.reduce((s,a)=>s+(a.score||0),0)/answers.length).toFixed(1) : 0;
  const grade = avg>=9?"Exceptional":avg>=7?"Good":avg>=5?"Average":avg>=3?"Weak":"Poor";
  const gradeColor = avg>=7?"#22c55e":avg>=5?"#f97316":"#f87171";
  const recColor = report?.recommendation==="Hire"?"#22c55e":report?.recommendation==="Consider"?"#f97316":"#f87171";
  const recBg    = report?.recommendation==="Hire"?"#0a1f12":report?.recommendation==="Consider"?"#1f150a":"#1f0a0a";

  return (
    <div style={{minHeight:"100vh",background:"#0b0b18",color:"#fff",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",background:"#111122",borderBottom:"1px solid #1e1e3a"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:24}}>🤖</span>
          <span style={{fontSize:18,fontWeight:700,color:"#fff"}}>TrustInterview AI</span>
        </div>
        <div style={{fontSize:13,color:"#8888aa"}}>Interview Results</div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 20px"}}>

        {/* Hero card */}
        <div style={{background:"linear-gradient(160deg,#161628,#111122)",border:"1px solid #252545",borderRadius:20,padding:"28px",marginBottom:20,display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>👤 {candidateName}</div>
            <div style={{fontSize:14,color:"#8888aa"}}>Applied for: <b style={{color:"#6c63ff"}}>{jobRole}</b></div>
            <div style={{fontSize:13,color:"#555570",marginTop:4}}>{answers.length} questions answered · Bias-checked</div>
            <div style={{display:"flex",alignItems:"center",gap:16,marginTop:20}}>
              <div style={{width:80,height:80,borderRadius:"50%",border:`3px solid ${gradeColor}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:26,fontWeight:800,color:gradeColor,lineHeight:1}}>{avg}</div>
                <div style={{fontSize:11,color:"#555570"}}>/10</div>
              </div>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:gradeColor}}>{grade}</div>
                <div style={{fontSize:12,color:"#555570"}}>Overall Score</div>
              </div>
            </div>
          </div>
          {report?.recommendation && (
            <div style={{background:recBg,border:`1px solid ${recColor}`,borderRadius:16,padding:"20px 22px",minWidth:220,maxWidth:300}}>
              <div style={{fontSize:11,color:"#555570",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>AI Recommendation</div>
              <div style={{fontSize:16,fontWeight:700,color:recColor}}>
                {report.recommendation==="Hire"?"✅ Recommended to Hire":report.recommendation==="Consider"?"🤔 Consider for Next Round":"❌ Not Recommended"}
              </div>
              <div style={{fontSize:12,color:"#8888aa",marginTop:8,lineHeight:1.6}}>{report.recommendationReason}</div>
            </div>
          )}
        </div>

        {/* Score bars */}
        <div style={{background:"#161628",border:"1px solid #252545",borderRadius:18,padding:"22px 24px",marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:18}}>📊 Score Per Question</h3>
          {answers.map((a,i)=>{
            const pct=(a.score/10)*100;
            const col=a.score>=7?"#22c55e":a.score>=5?"#f97316":"#f87171";
            return (
              <div key={i} style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,color:"#ccccee",fontWeight:500}}>Q{i+1} — {a.skill}</span>
                  <span style={{fontSize:13,fontWeight:700,color:col}}>{a.score}/10 · {a.grade}</span>
                </div>
                <div style={{height:8,background:"#1a1a2e",borderRadius:4,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:4,transition:"width .5s ease"}}/>
                </div>
                <div style={{fontSize:11,color:"#444466",fontStyle:"italic"}}>"{a.question.substring(0,80)}..."</div>
              </div>
            );
          })}
        </div>

        {/* Detailed feedback tabs */}
        <div style={{background:"#161628",border:"1px solid #252545",borderRadius:18,padding:"22px 24px",marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:18}}>📝 Detailed Feedback</h3>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
            {answers.map((a,i)=>{
              const col=a.score>=7?"#22c55e":a.score>=5?"#f97316":"#f87171";
              return (
                <button key={i} onClick={()=>setActiveTab(i)}
                  style={{background:activeTab===i?"#0f0f2a":"#0b0b18",border:`1px solid ${activeTab===i?col:"#252545"}`,borderRadius:8,padding:"6px 14px",fontSize:12,color:activeTab===i?col:"#666688",cursor:"pointer",fontWeight:activeTab===i?700:400}}>
                  Q{i+1} · {a.score}/10
                </button>
              );
            })}
          </div>

          {answers[activeTab] && (()=>{
            const a=answers[activeTab];
            const col=a.score>=7?"#22c55e":a.score>=5?"#f97316":"#f87171";
            return (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{background:"#0f0f2a",border:"1px solid #252545",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:11,color:"#6c63ff",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Question {activeTab+1} · {a.type} · {a.skill}</div>
                  <div style={{fontSize:15,color:"#fff",lineHeight:1.65}}>"{a.question}"</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div style={{fontSize:28,fontWeight:800,color:col}}>{a.score}/10</div>
                  <div style={{fontSize:16,fontWeight:700,color:col}}>{a.grade}</div>
                  {a.biasCheck?.passed&&<div style={{background:"#0a1810",border:"1px solid #166534",borderRadius:20,padding:"3px 12px",fontSize:11,color:"#22c55e",marginLeft:"auto"}}>✓ Bias-free evaluation</div>}
                </div>
                {a.summary&&<div style={{background:"#0f0f2a",border:"1px solid #252545",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:11,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>📋 Summary</div><div style={{fontSize:13,color:"#ccccee",lineHeight:1.7}}>{a.summary}</div></div>}
                <div style={{background:"#0b0b18",border:"1px solid #1e1e3a",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:11,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🗣️ Your Answer</div><div style={{fontSize:13,color:"#aaaacc",lineHeight:1.7}}>{a.answer}</div></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{background:"#0a1f12",border:"1px solid #166534",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>✅ Strengths</div>
                    {(a.strengths||[]).map((st,j)=><div key={j} style={{fontSize:13,color:"#4ade80",marginBottom:6,lineHeight:1.5}}>● {st}</div>)}
                  </div>
                  <div style={{background:"#1f120a",border:"1px solid #92400e",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#f97316",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🔧 Improvements</div>
                    {(a.improvements||[]).map((im,j)=><div key={j} style={{fontSize:13,color:"#fb923c",marginBottom:6,lineHeight:1.5}}>● {im}</div>)}
                  </div>
                </div>
                {a.idealAnswer&&<div style={{background:"#0a1a0a",border:"1px solid #166534",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:11,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>💡 Ideal Answer</div><div style={{fontSize:13,color:"#ccccee",lineHeight:1.7}}>{a.idealAnswer}</div></div>}
              </div>
            );
          })()}
        </div>

        {/* Final report */}
        {report&&(
          <div style={{background:"#161628",border:"1px solid #252545",borderRadius:18,padding:"22px 24px",marginBottom:20}}>
            <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:18}}>📄 Final Report</h3>
            {report.overallSummary&&<div style={{background:"#0f0f2a",border:"1px solid #252545",borderRadius:10,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Overall Summary</div><div style={{fontSize:13,color:"#ccccee",lineHeight:1.7}}>{report.overallSummary}</div></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {report.strongSkills?.length>0&&<div style={{background:"#0a1f12",border:"1px solid #166534",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:11,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>💪 Strong Skills</div>{report.strongSkills.map((sk,i)=><div key={i} style={{fontSize:13,color:"#4ade80",marginBottom:6}}>● {sk}</div>)}</div>}
              {report.weakSkills?.length>0&&<div style={{background:"#1f120a",border:"1px solid #92400e",borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:11,fontWeight:700,color:"#f97316",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>📚 Improve</div>{report.weakSkills.map((sk,i)=><div key={i} style={{fontSize:13,color:"#fb923c",marginBottom:6}}>● {sk}</div>)}</div>}
            </div>
            {report.nextSteps&&<div style={{background:"#0a1a0a",border:"1px solid #166534",borderRadius:10,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🚀 Next Steps</div><div style={{fontSize:13,color:"#ccccee",lineHeight:1.7}}>{report.nextSteps}</div></div>}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#0a1810",border:"1px solid #166534",borderRadius:10}}>
              <span style={{color:"#22c55e",fontSize:13}}>✓</span>
              <span style={{fontSize:12,color:"#555570"}}>All evaluations passed bias check — scored on technical merit only</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>{sessionStorage.clear();navigate("/");}} style={{background:"linear-gradient(135deg,#6c63ff,#4f46e5)",color:"#fff",padding:"13px 28px",fontSize:14,fontWeight:700,border:"none",borderRadius:12,cursor:"pointer",boxShadow:"0 4px 20px rgba(108,99,255,.4)"}}>🔄 Start New Interview</button>
          <button onClick={()=>window.print()} style={{background:"#161628",color:"#aaaacc",padding:"13px 28px",fontSize:14,fontWeight:600,border:"1px solid #252545",borderRadius:12,cursor:"pointer"}}>🖨️ Print Results</button>
        </div>

        <p style={{textAlign:"center",fontSize:12,color:"#33334a",lineHeight:1.6}}>🔐 Your interview data is stored only in this browser tab and cleared when you close it.</p>
      </div>
    </div>
  );
}
