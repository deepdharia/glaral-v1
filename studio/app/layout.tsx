import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'Glaral — Small tools. Big possibilities.',template:'%s · Glaral'},description:'Explore useful tools, playful games, independent apps and short ideas from Glaral, the product studio by Deep Dharia.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
