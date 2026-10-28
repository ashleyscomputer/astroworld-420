import type { Metadata } from "next";
import "./globals.css";
import {StoreProvider,Header,Footer} from './storefront';

export const metadata: Metadata = {
  title:{default:'ASTROWORLD — Smoothies from another dimension',template:'%s · Astroworld'},
  description:'Escape the ordinary. Discover eight colourful smoothie originals, in full or half portions. A little taste of another world.',
  metadataBase:new URL('https://astroworld-smoothie-orbit.maritzliam.chatgpt.site'),
  openGraph:{title:'ASTROWORLD — Enter another world.',description:'Eight originals. Infinite good energy. Explore the Astroworld smoothie collection.',images:['/og.svg'],type:'website'},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
