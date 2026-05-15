import React, { useState, useEffect, useRef } from "react";
export default function TimerBar({ seconds, onTimeout, active }) {
  const [left, setLeft] = useState(seconds);
  const intervalRef = useRef(null);
  useEffect(() => { setLeft(seconds); }, [seconds]);
  useEffect(() => {
    if (!active) return;
    const delay = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setLeft(prev => {
          if (prev <= 1) { clearInterval(intervalRef.current); onTimeout(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, 800);
    return () => { clearTimeout(delay); clearInterval(intervalRef.current); };
  }, [active, seconds, onTimeout]);
  const pct = (left / seconds) * 100;
  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const urgent  = left <= 20;
  const warning = left <= 45 && left > 20;
  const color = urgent ? "#ef4444" : warning ? "#f97316" : "#6c63ff";
  const bg    = urgent ? "#1e0a0a" : warning ? "#1e120a" : "#0f0f1a";
  return (
    <div style={{background:bg,border:"1px solid #252545",borderRadius:14,padding:"14px 16px",transition:"background .5s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,color:"#aaaacc"}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:color,display:"inline-block"}}/>
          {urgent?"⚠️ Time running out!":warning?"⏳ Wrap up your answer":"⏱️ Time Remaining"}
        </div>
        <div style={{fontSize:22,fontWeight:700,color,fontVariantNumeric:"tabular-nums"}}>
          {mins}:{secs.toString().padStart(2,"0")}
        </div>
      </div>
      <div style={{height:10,background:"#1a1a2e",borderRadius:5,overflow:"hidden",marginBottom:8}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:5,transition:"width 1s linear",boxShadow:`0 0 8px ${color}88`}}/>
      </div>
      <div style={{display:"flex",alignItems:"center",fontSize:11}}>
        <span style={{color:urgent?"#ef4444":warning?"#f97316":"#555570"}}>
          {urgent?"Submit now!":warning?"Wrapping up...":left+" seconds left"}
        </span>
        <span style={{color:"#333350",marginLeft:"auto"}}>Limit: {Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,"0")}</span>
      </div>
    </div>
  );
}
