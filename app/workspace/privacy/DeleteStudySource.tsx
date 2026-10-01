"use client";
import { useState } from "react";
export default function DeleteStudySource({organizationId,sourceId}:{organizationId:string;sourceId:string}){
  const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
  async function remove(){
    setBusy(true);setStatus('');
    try{
      const response=await fetch('/api/ai-study/source',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,sourceId})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Source removal unavailable; submit a privacy rights request.');
      setStatus('Provider file removed; retained metadata marked deleted. / Đã xóa tệp nhà cung cấp; metadata đánh dấu xóa.');
    }catch(error){setStatus(error instanceof Error?error.message:'Removal unavailable; contact the privacy owner.');}
    finally{setBusy(false);}
  }
  return <div><button type="button" className="button" disabled={busy||status.startsWith('Provider file removed')} onClick={remove}>{busy?'Removing…':'Delete provider source / Xóa nguồn nhà cung cấp'}</button><p role="status">{status}</p></div>;
}
