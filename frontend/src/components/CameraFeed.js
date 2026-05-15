import React, { useRef, useEffect, useState } from "react";
export default function CameraFeed({ candidateName, recording }) {
  const videoRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) { videoRef.current.srcObject = stream; setCamOn(true); }
      } catch { setCamErr("Camera access denied. Please allow camera in browser settings."); }
    }
    start();
    return () => { if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop()); };
  }, []);
  return (
    <div style={{background:"#161628",border:"1px solid #252545",borderRadius:16,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#111122",borderBottom:"1px solid #1e1e3a"}}>
        <span style={{fontSize:13,fontWeight:600,color:"#fff",flex:1}}>📷 Camera Feed</span>
        <span style={{width:8,height:8,borderRadius:"50%",background:camOn?"#22c55e":"#f87171",display:"inline-block"}}/>
        <span style={{fontSize:11,color:"#8888aa"}}>{camOn?"Live":"Off"}</span>
      </div>
      <div style={{position:"relative",background:"#0b0b18",aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        {camErr ? (
          <div style={{textAlign:"center",padding:24}}>
            <div style={{fontSize:40,marginBottom:12}}>📷</div>
            <div style={{fontSize:13,color:"#f87171",lineHeight:1.6}}>{camErr}</div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)",display:"block"}}/>
            {recording && <div style={{position:"absolute",top:10,left:10,background:"rgba(220,38,38,.85)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>● REC</div>}
            <div style={{position:"absolute",bottom:10,left:10,background:"rgba(0,0,0,.65)",color:"#fff",fontSize:12,padding:"4px 12px",borderRadius:20}}>👤 {candidateName}</div>
          </>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-around",padding:"8px 14px",background:"#111122",borderTop:"1px solid #1e1e3a",fontSize:11,color:"#555570"}}>
        <span>💡 Look at the camera</span><span>�� Quiet environment</span>
      </div>
    </div>
  );
}
