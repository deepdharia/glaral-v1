import Studio from '../studio';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <Studio route="project" slug={slug}/>}
