import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const word=readFileSync(new URL('../app/earth-wordmark.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const hero=readFileSync(new URL('../app/portal-hero.tsx',import.meta.url),'utf8');
const map=readFileSync(new URL('../public/art/earth-map.svg',import.meta.url),'utf8');
test('earth wordmark reads as ASTROWORLD',()=>{assert.match(word,/aria-label=\{upper\?'ASTROWORLD'/);assert.match(word,/ASTR/);assert.match(word,/EarthLetter/);});
test('hero renders Earth in first O of ASTRO',()=>assert.match(hero,/ASTR<EarthLetter\/>/));
test('globe rotates and respects reduced motion',()=>{assert.match(css,/@keyframes earth-word-spin/);assert.match(css,/prefers-reduced-motion:reduce/);});
test('continent texture is an SVG asset',()=>{assert.match(map,/<svg /);assert.match(map,/viewBox="0 0 720 360"/);});
