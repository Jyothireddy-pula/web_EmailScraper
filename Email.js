@import "tailwindcss";

@font-face {
  font-family: 'ArcadeStyle';
  src: url('./assets/arcadeclassic/ARCADECLASSIC.TTF') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@theme {
  --color-cyber-pink: #FF3E9B;
  --color-soft-pink: #FF88BA;
  --color-deep-teal: #3A8B95;
  --color-neon-mint: #66D0BC;
  --color-arcade-yell: #FFF580;

  --font-arcade: "ArcadeStyle", system-ui;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

body {
  background-color: #fce7f3;
  background-image: 
    linear-gradient(to right, rgba(0, 0, 0, 0.08) 2px, transparent 2px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 2px, transparent 2px);
  background-size: 50px 50px;
  background-position: center;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
}

::selection {
  background: var(--color-neon-mint);
  color: black;
}