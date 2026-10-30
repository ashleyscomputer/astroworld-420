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
  title:{default:'ASTROWORLD 420',template:'%s'},
  metadataBase:new URL('https://astroworld-smoothie-orbit.maritzliam.chatgpt.site'),
  openGraph:{title:'ASTROWORLD 420',images:[{url:'/astroworld-420-brand.jpg',width:1254,height:1254,alt:'ASTROWORLD 420'}],type:'website'},
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
      <body><StoreProvider><a className="skip-link" href="#main">Skip to content</a><Header/>{children}<Footer/></StoreProvider></body>
    </html>
  );
}
