import './easter-egg.css';

export function EasterEggLink() {
  return (
    <a
      href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Easter egg: opens Rick Astley Never Gonna Give You Up in a new tab. No passwords are stored or displayed."
      title="Music easter egg · opens YouTube"
      className="rgb-easter-egg"
    >
      View My Passwords 👀
    </a>
  );
}
