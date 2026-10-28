# Animated Earth wordmark

The first **O** in **ASTROWORLD 420** is replaced by a miniature rotating Earth in the hero, storefront navigation, footer, admin sidebar and admin login. The `EarthWord` component supplies an accessible label of ASTROWORLD (with original spelling) while the decorative globe is hidden from assistive technology. The hero already has a screen-reader-only complete heading.

The effect uses a locally hosted SVG continent texture, CSS shading and a seamless horizontal pan to simulate planetary rotation. No tracking services, third-party globe assets, JavaScript timers, new dependencies or canvas/webGL context are needed. `prefers-reduced-motion` disables the animation.

**Validation:** run `node --experimental-strip-types --test tests/earth-wordmark.test.mjs`, TypeScript and lint. Visual checks at mobile/tablet/desktop sizes, dark mode and reduced-motion should be completed before merge. Original hero island animation remains unchanged.
