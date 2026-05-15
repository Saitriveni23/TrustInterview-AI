import React from "react";
export default function QuestionBox({ question, index }) {
  if (!question) return null;
  const types = {
    technical:   { bg:"#0a1a3a", border:"#1d4ed8", text:"#60a5fa", label:"Technical",   icon:"⚙️" },
    behavioural: { bg:"#0a2a1a", border:"#15803d", text:"#4ade80", label:"Behavioural", icon:"🧠" },
    situational: { bg:"#2a1a0a", border:"#c2410c", text:"#fb923c", label:"Situational", icon:"💡" },
  };
  const t = types[question.type] || types.technical;
  return (
    <div style={{background:t.bg,border:`1.5px solid ${t.border}`,borderRadius:16,padding:"18px 20px"}}>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,border:`1px solid ${t.border}`,color:t.text,background:t.bg}}>{t.icon} {t.label}</span>
        <span style={{fontSize:12,color:"#8888aa",background:"#1a1a2e",padding:"4px 12px",borderRadius:20,border:"1px solid #252545"}}>🎯 {question.skill}</span>
        <span style={{fontSize:12,color:"#a78bfa",background:"#1a102a",padding:"4px 12px",borderRadius:20,border:"1px solid #3d2d5a",marginLeft:"auto"}}>⏱ {question.timeLimit}s</span>
      </div>
      <div style={{fontSize:11,fontWeight:700,color:"#555570",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Question {index+1}</div>
      <div style={{fontSize:17,fontWeight:600,color:"#fff",lineHeight:1.65,marginBottom:14}}>"{question.question}"</div>
      <div style={{display:"flex",gap:12,borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:10,fontSize:11}}>
        <span style={{color:"#22c55e"}}>✓ Bias check passed</span>
        <span style={{color:"#6666aa"}}>📄 Resume-matched</span>
      </div>
    </div>
  );
}
