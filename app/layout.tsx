import type { Metadata } from "next";
import "./globals.css";
import './admin.css';
import './experience.css';
import './member.css';
import './ui-polish.css';
import './premium.css';
import './admin-pos.css';
import './mobile-responsive.css';
import './account-flow.css';
import './galaxy-blue.css';
import {StoreProvider,Header,Footer} from './storefront';

export const metadata: Metadata = {
  title:{default:'ASTROWORLD 420',template:'%s · Astroworld 420'},
  description:'Astroworld 420.',
  metadataBase:new URL('https://astroworld-smoothie-orbit.maritzliam.chatgpt.site'),
  openGraph:{title:'ASTROWORLD 420',images:[{url:'/og.svg',width:1200,height:630,alt:'Astroworld 420'}],type:'website'},
  icons: {
    icon: "/astroworld420-favicon.svg",
    shortcut: "/astroworld420-favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><div className="cosmic-sky" aria-hidden="true"><div className="cosmic-stars"/><div className="cosmic-stars cosmic-stars-far"/><span className="cosmic-shooting-star"/><span className="cosmic-shooting-star"/><span className="cosmic-shooting-star"/><span className="cosmic-shooting-star"/><span className="cosmic-shooting-star"/></div><StoreProvider><a className="skip-link" href="#main">Skip to content</a><Header/>{children}<Footer/></StoreProvider></body>
    </html>
  );
}
