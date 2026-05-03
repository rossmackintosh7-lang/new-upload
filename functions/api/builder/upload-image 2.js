
import { json, error } from "../../_lib/json.js";
function clean(n='image'){return String(n).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'image'}
export async function onRequestPost({request,env}){
 const type=request.headers.get('content-type')||''; if(!type.includes('multipart/form-data'))return error('Expected multipart/form-data.',400);
 const form=await request.formData(), file=form.get('image')||form.get('file');
 if(!file||typeof file==='string')return error('No image file received.',400);
 if(!String(file.type||'').startsWith('image/'))return error('Only image uploads are allowed.',400);
 if(file.size>5*1024*1024)return error('Image is too large. Keep uploads under 5MB.',400);
 const buf=await file.arrayBuffer(), ext=(file.type.split('/')[1]||'png').replace('jpeg','jpg'), key=`uploads/${Date.now()}-${crypto.randomUUID()}-${clean(file.name)}.${ext}`;
 if(env.PBI_ASSETS&&env.PBI_ASSETS.put){
  await env.PBI_ASSETS.put(key,buf,{httpMetadata:{contentType:file.type||'application/octet-stream'}});
  const base=String(env.PBI_ASSETS_PUBLIC_URL||'').replace(/\/$/,'');
  return json({ok:true,mode:'r2',url:base?`${base}/${key}`:`/assets/${key}`,key});
 }
 let bin=''; const arr=new Uint8Array(buf); for(let i=0;i<arr.length;i++)bin+=String.fromCharCode(arr[i]);
 return json({ok:true,mode:'data-url',url:`data:${file.type};base64,${btoa(bin)}`,warning:'Using data URL fallback. Add R2 binding PBI_ASSETS for production uploads.'});
}
