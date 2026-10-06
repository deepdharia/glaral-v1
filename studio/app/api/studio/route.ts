import {randomUUID} from 'node:crypto';
import {catalogue,rpc,sameOrigin,safeUrl,cookie,rateKey} from '../../../lib/studio';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(r:Request){try{return json(await catalogue(r));}catch(e:any){return json({error:'The studio is temporarily unavailable. Please try again.'},e.status||503);}}
export async function POST(r:Request){try{
 if(!sameOrigin(r)||!r.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid request origin.'},403);
 const raw=await r.text();if(raw.length>20000)return json({error:'Content is too long.'},413);const b=JSON.parse(raw);
 if(b.action==='react'){
  const {posts}=await catalogue(r);if(!posts.some((p:any)=>p.id===b.postId)||!['useful','love','curious'].includes(b.kind))return json({error:'Invalid reaction.'},400);
  const old=cookie(r,'glaral_visitor');const fresh=!/^[a-f0-9-]{36}$/.test(old);const visitor=fresh?randomUUID():old;
  const data=await rpc(r,'react',{postId:b.postId,kind:b.kind,visitor,rateKey:rateKey(r,visitor)});
  return json(data,data.status||200,fresh?{'Set-Cookie':`glaral_visitor=${visitor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}:{});
 }
 if(b.action==='project'){
  const p=b.project;if(!p||typeof p.slug!=='string'||p.slug.length>80||!/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(p.slug)||['api','admin','projects','feed','pricing','about','privacy','terms','login','auth'].includes(p.slug))return json({error:'Choose a valid project slug.'},400);
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.description!=='string'||p.description.length>3000||!['Tools','Apps','Games','Software'].includes(p.category)||!['Free','Paid'].includes(p.pricing)||!['Live','Beta','Coming soon'].includes(p.status))return json({error:'Check the project fields.'},400);
  p.url=safeUrl(p.url||'');p.checkoutUrl='';p.features=(Array.isArray(p.features)?p.features:[]).slice(0,8).map((x:unknown)=>String(x).slice(0,160));p.tagline=String(p.tagline||'').slice(0,200);p.art=['ledger','prompt','video','drive','cosmic','workbench'].includes(p.art)?p.art:'prompt';p.color=['mint','lilac','peach','blue','yellow'].includes(p.color)?p.color:'mint';
  return json(await rpc(r,'project',p));
 }
 if(b.action==='post'){
  const p=b.post;if(typeof p?.title!=='string'||!p.title.trim()||typeof p.body!=='string'||!p.body.trim()||p.title.length>150||p.body.length>2000)return json({error:'Add a headline and a short post.'},400);
  const data={id:randomUUID(),title:p.title,body:p.body,date:new Date().toISOString().slice(0,10),source:safeUrl(p.source||''),project:'',category:String(p.category||'Studio notes').slice(0,40)};return json(await rpc(r,'post',data));
 }return json({error:'Unknown action.'},400);
}catch(e:any){return json({error:e.status===403?'Only the studio owner can publish.':e.status===401?'Please sign in again.':'Could not save. Please retry.'},e.status||500);}}
