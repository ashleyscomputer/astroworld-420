'use client';

import {ArrowUpRight} from 'lucide-react';
import {AnimatedLogoFrame} from './animated-logo-frame';

export function PillHero(){
  return <section className="hero pill-hero logo-hero" aria-label="Astroworld 420">
    <div className="hero-heading">
      <h1 className="sr-only">Astroworld 420</h1>
      <AnimatedLogoFrame className="hero-logo-frame" title="Astroworld 420 animated logo" loading="eager"/>
    </div>
    <div className="hero-bottom">
      <div className="hero-cta">
        <a href="#collection" className="button primary">Shop the collection<ArrowUpRight size={20}/></a>
      </div>
    </div>
  </section>;
}
