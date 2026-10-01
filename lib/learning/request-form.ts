async function readBoundedBody(request:Request,maxBytes:number){
  const origin=request.headers.get('origin');
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')throw Error('request_origin_not_authorized');
  const length=Number(request.headers.get('content-length'));
  if(Number.isFinite(length)&&length>maxBytes)throw Error('request_body_too_large');
  if(!request.body)throw Error('request_body_required');
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{for(;;){const result=await reader.read();if(result.done)break;total+=result.value.byteLength;if(total>maxBytes){await reader.cancel();throw Error('request_body_too_large');}chunks.push(result.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
}
export async function readBoundedForm(request:Request,maxBytes=4*1024*1024){
  const bytes=await readBoundedBody(request,maxBytes);
  return new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
}
export async function readBoundedJson(request:Request,maxBytes=64*1024):Promise<Record<string,unknown>>{
  const value:unknown=JSON.parse(new TextDecoder().decode(await readBoundedBody(request,maxBytes)));
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_request_body');
  return value as Record<string,unknown>;
}
