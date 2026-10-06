import {NextResponse} from 'next/server';
export function GET(r:Request){return NextResponse.redirect(new URL('/udhar/index.html',r.url));}
