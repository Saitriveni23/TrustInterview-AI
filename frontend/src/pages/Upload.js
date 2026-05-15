import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const BACKEND = "http://localhost:5001";
export default function Upload() {
  const navigate=useNavigate(),fileInput=useRef(null);
  const [name,setName]=useState(""),[ jobRole,setJobRole]=useState(""),[ file,setFile]=useState(null);
  const [dragging,setDragging]=useState(false),[ loading,setLoading]=useState(false);
  const [progress,setProgress]=useState(""),[ error,setError]=useState("");
  function onDragOver(e){e.preventDefault();setDragging(true);}
  function onDragLeave(){setDragging(false);}
  function onDrop(e){e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f?.type==="application/pdf"){setFile(f);setError("");}else setError("Only PDF files allowed.");}
  function onFileChange(e){const f=e.target.files[0];if(f?.type==="application/pdf"){setFile(f);setError("");}else setError("Only PDF files allowed.");}
  async function handleStart(e){
    e.preventDefault();setError("");
    if(!name.trim())return setError("Please enter your full name.");
    if(!jobRole.trim())return setError("Please enter the job role.");
    if(!file)return setError("Please upload your resume PDF.");
    setLoading(true);
    try{
      setProgress("Reading your resume...");
      const form=new FormData();form.append("resume",file);
      const res=await axios.post(`${BACKEND}/api/resume/upload`,form,{headers:{"Content-Type":"multipart/form-data"}});
      if(!res.data.success)throw new Error(res.data.error||"Upload failed.");
      setProgress("Preparing interview...");
      sessionStorage.setItem("resumeText",res.data.resumeText);
      sessionStorage.setItem("jobRole",jobRole.trim());
      sessionStorage.setItem("candidateName",name.trim());
      navigate("/interview");
    }catch(err){setError(err.response?.data?.error||err.message||"Something went wrong.");setLoading(false);setProgress("");}
  }
  const inp={width:"100%",display:"block",background:"#0b0b18",border:"1px solid #252545",borderRadius:10,padding:"13px 16px",fontSize:15,color:"#fff",outline:"none",boxSizing:"border-box",marginBottom:16};
  return(
    <div style={{minHeight:"100vh",background:"#0b0b18",display:"flex",justifyContent:"center",padding:"48px 16px",overflow:"hidden"}}>
      <div style={{width:"100%",maxWidth:560,zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:24}}>
          <span style={{fontSize:36}}>🤖</span>
          <span style={{fontSize:22,fontWeight:700,color:"#fff"}}>TrustInterview <span style={{color:"#6c63ff"}}>AI</span></span>
        </div>
        <h1 style={{fontSize:30,fontWeight:800,color:"#fff",textAlign:"center",marginBottom:12}}>Your AI Interview Starts Here</h1>
        <p style={{fontSize:14,color:"#8888aa",textAlign:"center",lineHeight:1.65,marginBottom:24}}>Upload your resume — AI reads it and asks personalised, bias-free questions.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:28}}>
          {["🔒 Zero Trust","⚖️ Bias-Free","🎙️ Voice AI","📊 Live Scoring"].map(p=>(
            <span key={p} style={{background:"#151528",border:"1px solid #2a2a4a",borderRadius:20,padding:"5px 14px",fontSize:12,color:"#9999bb"}}>{p}</span>
          ))}
        </div>
        <div style={{background:"#161628",border:"1px solid #252545",borderRadius:22,padding:"32px 28px",marginBottom:28,boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
          <h2 style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:22}}>Fill in your details</h2>
          <form onSubmit={handleStart}>
            <label style={{display:"block",fontSize:13,fontWeight:600,color:"#9999bb",marginBottom:7}}>Full Name</label>
            <input style={inp} type="text" placeholder="e.g. Sai Triveni" value={name} onChange={e=>setName(e.target.value)} disabled={loading}/>
            <label style={{display:"block",fontSize:13,fontWeight:600,color:"#9999bb",marginBottom:7}}>Job Role Applying For</label>
            <input style={inp} type="text" placeholder="e.g. Frontend Developer" value={jobRole} onChange={e=>setJobRole(e.target.value)} disabled={loading}/>
            <label style={{display:"block",fontSize:13,fontWeight:600,color:"#9999bb",marginBottom:7}}>Resume <span style={{fontSize:11,color:"#555570",fontWeight:400}}>PDF only · max 5MB</span></label>
            <div style={{border:`2px ${file?"solid":"dashed"} ${file?"#22c55e":dragging?"#6c63ff":"#252545"}`,borderRadius:14,padding:28,cursor:"pointer",textAlign:"center",background:file?"#0a1810":dragging?"#10102a":"#0b0b18",marginBottom:16}}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={()=>!loading&&fileInput.current.click()}>
              <input ref={fileInput} type="file" accept="application/pdf" style={{display:"none"}} onChange={onFileChange} disabled={loading}/>
              {file?(
                <div style={{display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                  <span style={{fontSize:34}}>��</span>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#22c55e",wordBreak:"break-all"}}>{file.name}</div><div style={{fontSize:12,color:"#55556a"}}>{(file.size/1024).toFixed(1)} KB</div></div>
                  <button type="button" onClick={ev=>{ev.stopPropagation();setFile(null);}} style={{background:"#2a1010",border:"1px solid #4a2020",borderRadius:6,color:"#f87171",padding:"4px 10px",fontSize:13,cursor:"pointer"}}>✕</button>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <div style={{fontSize:38}}>{dragging?"📂":"📁"}</div>
                  <div style={{fontSize:15,color:"#ccccee",fontWeight:500}}>{dragging?"Drop it here!":"Drag & drop your resume"}</div>
                  <div style={{fontSize:13,color:"#55556a"}}>or click to browse</div>
                </div>
              )}
            </div>
            {error&&<div style={{background:"#1e0f0f",border:"1px solid #7f1d1d",borderRadius:10,padding:"12px 16px",color:"#f87171",fontSize:13,marginBottom:16}}>⚠️ {error}</div>}
            {loading&&progress&&<div style={{background:"#10102a",border:"1px solid #3d3d7f",borderRadius:10,padding:"12px 16px",color:"#a78bfa",fontSize:13,display:"flex",alignItems:"center",gap:10,marginBottom:16}}>⏳ {progress}</div>}
            <button type="submit" disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#6c63ff,#4f46e5)",color:"#fff",padding:"15px 24px",fontSize:16,fontWeight:700,border:"none",borderRadius:12,cursor:loading?"not-allowed":"pointer",opacity:loading?.6:1,boxShadow:"0 4px 20px rgba(108,99,255,.4)"}}>
              {loading?"Please wait…":"🚀 Start My Interview"}
            </button>
          </form>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          {[{icon:"📄",n:"1",text:"AI reads resume"},{icon:"🎯",n:"2",text:"7 custom questions"},{icon:"🎙️",n:"3",text:"Answer via mic"},{icon:"📊",n:"4",text:"AI scores you"}].map(st=>(
            <div key={st.n} style={{background:"#161628",border:"1px solid #252545",borderRadius:14,padding:"14px 8px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:6}}>{st.icon}</div>
              <div style={{fontSize:10,color:"#6c63ff",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Step {st.n}</div>
              <div style={{fontSize:11,color:"#8888aa",lineHeight:1.4}}>{st.text}</div>
            </div>
          ))}
        </div>
        <p style={{textAlign:"center",fontSize:12,color:"#33334a"}}>🔐 Your resume is deleted from our server immediately after reading.</p>
      </div>
    </div>
  );
}
