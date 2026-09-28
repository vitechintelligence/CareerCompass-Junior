"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  capabilitySummary,
  chooseRecorderMime,
  createCompatibleMediaRecorder,
  microphoneErrorMessage,
  stopStream,
  type DeviceCapabilitySnapshot,
} from "@/lib/device/media-recorder";

export default function DeviceCheckClient() {
  const [snapshot,setSnapshot]=useState<DeviceCapabilitySnapshot|null>(null);
  const [micState,setMicState]=useState<"idle"|"requesting"|"recording"|"ready"|"failed">("idle");
  const [micMessage,setMicMessage]=useState("");
  const [audioUrl,setAudioUrl]=useState<string|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const chunksRef=useRef<BlobPart[]>([]);

  useEffect(()=>{
    const recorderAvailable=typeof MediaRecorder!=="undefined";
    setSnapshot({
      secureContext:window.isSecureContext,
      mediaDevices:Boolean(navigator.mediaDevices?.getUserMedia),
      mediaRecorder:recorderAvailable,
      recorderMime:recorderAvailable ? chooseRecorderMime(MediaRecorder.isTypeSupported?.bind(MediaRecorder)) : "",
      speechSynthesis:"speechSynthesis" in window,
      serviceWorker:"serviceWorker" in navigator,
      online:navigator.onLine,
      standalone:window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone),
    });
    return ()=>{
      if(audioUrl) URL.revokeObjectURL(audioUrl);
      stopStream(streamRef.current);
    };
  },[audioUrl]);

  const summary=useMemo(()=>snapshot?capabilitySummary(snapshot):null,[snapshot]);

  async function startMic(){
    setMicMessage("");
    if(!window.isSecureContext){
      setMicState("failed");
      setMicMessage("Recording requires HTTPS.");
      return;
    }
    if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined"){
      setMicState("failed");
      setMicMessage("This browser does not expose the required microphone recording APIs.");
      return;
    }
    try{
      setMicState("requesting");
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      streamRef.current=stream;
      chunksRef.current=[];
      const recorder=createCompatibleMediaRecorder(stream);
      recorderRef.current=recorder;
      recorder.ondataavailable=e=>{if(e.data.size>0) chunksRef.current.push(e.data);};
      recorder.onerror=e=>{
        setMicState("failed");
        setMicMessage(microphoneErrorMessage(e,"en"));
        stopStream(stream);
      };
      recorder.onstop=()=>{
        const part=chunksRef.current.find(v=>v instanceof Blob && v.type) as Blob|undefined;
        const blob=new Blob(chunksRef.current,{type:recorder.mimeType||part?.type||"audio/mp4"});
        if(audioUrl) URL.revokeObjectURL(audioUrl);
        if(blob.size>0){
          setAudioUrl(URL.createObjectURL(blob));
          setMicState("ready");
          setMicMessage(`Captured ${Math.max(1,Math.round(blob.size/1024))} KB as ${blob.type||"browser default"}.`);
        }else{
          setMicState("failed");
          setMicMessage("No audio bytes were captured.");
        }
        stopStream(stream);
        streamRef.current=null;
        recorderRef.current=null;
      };
      stream.getAudioTracks().forEach(track=>{
        track.onended=()=>{
          if(recorder.state!=="inactive"){try{recorder.stop();}catch{}}
        };
      });
      recorder.start();
      setMicState("recording");
      setMicMessage("Recording locally. Speak for a few seconds, then stop.");
    }catch(error){
      stopStream(streamRef.current);
      streamRef.current=null;
      setMicState("failed");
      setMicMessage(microphoneErrorMessage(error,"en"));
    }
  }

  function stopMic(){
    const recorder=recorderRef.current;
    if(recorder && recorder.state!=="inactive"){try{recorder.stop();}catch{stopStream(streamRef.current);}}
  }

  if(!snapshot||!summary) return <p role="status">Checking device capabilities…</p>;

  const rows=[
    ["Secure HTTPS context",snapshot.secureContext],
    ["Microphone API",snapshot.mediaDevices],
    ["MediaRecorder",snapshot.mediaRecorder],
    ["Speech synthesis",snapshot.speechSynthesis],
    ["Service worker / PWA",snapshot.serviceWorker],
    ["Currently online",snapshot.online],
    ["Installed / standalone",snapshot.standalone],
  ] as const;

  return <div className="workspaceContent">
    <section className="panel">
      <div className="eyebrow">Device capability snapshot</div>
      <h1 className="workspaceHeroTitle">Career Compass device check</h1>
      <p className="muted">Use this screen on each target device before marking the physical acceptance matrix complete.</p>
      <div className="workspaceList">
        {rows.map(([label,ok])=><div className="workspaceRow" key={label}><strong>{label}</strong><span className="pill">{ok?"available":"not detected"}</span></div>)}
        <div className="workspaceRow"><strong>Preferred recording format</strong><span className="pill">{summary.recorderMime}</span></div>
      </div>
    </section>

    <section className="panel">
      <div className="eyebrow">Microphone test</div>
      <p className="muted">The sample stays in this browser tab. It is never uploaded.</p>
      <div className="actions">
        {micState!=="recording"
          ? <button className="button primary" type="button" onClick={startMic}>Start microphone test</button>
          : <button className="button primary" type="button" onClick={stopMic}>Stop microphone test</button>}
      </div>
      <p role={micState==="failed"?"alert":"status"} aria-live="polite">{micMessage}</p>
      {audioUrl&&<audio controls preload="metadata" src={audioUrl} aria-label="Device microphone test playback"/>}
    </section>

    <section className="panel">
      <div className="eyebrow">Acceptance reminder</div>
      <p>Run this page plus an authenticated save/reload test on desktop Chrome, Android Chrome, iPhone Safari, and the installed PWA. Code-level checks do not substitute for those physical-device tests.</p>
    </section>
  </div>;
}
