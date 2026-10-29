import type { Metadata } from "next";
import "./globals.css";
import './admin.css';
import './experience.css';
import './member.css';
import './ui-polish.css';
import './premium.css';
import './admin-pos.css';
import './account-flow.css';
import './galaxy-blue.css';
import {StoreProvider,Header,Footer} from './storefront';

export const metadata: Metadata = {
  title:{default:'ASTROWORLD 420 — Explore the collection',template:'%s · Astroworld 420'},
  description:'Escape the ordinary. Discover eight colourful products, in 1 g or 0.5 g. A little taste of another world.',
  metadataBase:new URL('https://astroworld-smoothie-orbit.maritzliam.chatgpt.site'),
  openGraph:{title:'ASTROWORLD 420 — Enter another world.',description:'Eight originals. Infinite good energy. Explore the Astroworld 420 collection.',images:[{url:'/astroworld-420-brand.jpg',width:1254,height:1254,alt:'Astroworld 420 — Wish you were here'}],type:'website'},
  icons: {
    icon: "/astroworld-official-logo.jpeg",
    shortcut: "/astroworld-official-logo.jpeg",
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
