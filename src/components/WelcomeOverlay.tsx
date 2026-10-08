import React, { useEffect, useRef, useState } from 'react';

type WelcomeOverlayProps = {
  mode: 'login' | 'logout';
  name: string;
  onDone: () => void;
};

// Tempo total na tela antes de começar a sumir (ms)
const HOLD_MS = 2600;
const FADE_MS = 700;

// Símbolos escolares que flutuam ao fundo, bem discretos
const SYMBOLS = [
  { t: 'π', x: 12, y: 22, s: 34, d: 0 },
  { t: 'a²+b²', x: 74, y: 16, s: 22, d: 0.4 },
  { t: '√x', x: 84, y: 64, s: 30, d: 0.2 },
  { t: 'ABC', x: 18, y: 72, s: 22, d: 0.6 },
  { t: '∑', x: 62, y: 82, s: 32, d: 0.3 },
  { t: '÷', x: 34, y: 12, s: 28, d: 0.8 },
  { t: '✓', x: 90, y: 36, s: 26, d: 0.5 },
  { t: 'H₂O', x: 6, y: 46, s: 22, d: 0.7 },
  { t: '½', x: 44, y: 88, s: 26, d: 0.9 },
];

export function WelcomeOverlay({ mode, name, onDone }: WelcomeOverlayProps) {
  const [leaving, setLeaving] = useState(false);
  // Guarda o callback mais recente sem reiniciar os timers a cada render do pai
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = setTimeout(() => onDoneRef.current(), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const title = mode === 'login' ? 'Olá!' : 'Até logo!';
  const subtitle = mode === 'login' ? `Seja bem-vindo, ${name}.` : `Bons estudos, ${name}.`;

  return (
    <div
      className="welcome-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#fffdf8]"
      style={{ animation: leaving ? `seice-fade-out ${FADE_MS}ms ease forwards` : 'seice-fade-in 400ms ease both' }}
      aria-live="polite"
    >
      {/* Tinta dourada se espalhando, como aquarela no papel */}
      <div className="welcome-ink" style={{ left: '-8%', top: '-12%', width: '42vw', height: '42vw', animationDelay: '0s' }} />
      <div className="welcome-ink" style={{ right: '-10%', top: '-6%', width: '36vw', height: '36vw', animationDelay: '0.25s' }} />
      <div className="welcome-ink" style={{ left: '4%', bottom: '-16%', width: '38vw', height: '38vw', animationDelay: '0.5s' }} />
      <div className="welcome-ink" style={{ right: '2%', bottom: '-14%', width: '30vw', height: '30vw', animationDelay: '0.35s' }} />

      {/* Papel quadriculado de caderno, mais visível no centro */}
      <div className="welcome-grid absolute inset-0" />

      {/* Símbolos flutuando */}
      {SYMBOLS.map((s, i) => (
        <span
          key={i}
          className="welcome-symbol font-display"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.s, animationDelay: `${s.d}s` }}
        >
          {s.t}
        </span>
      ))}

      <div className="relative text-center px-4">
        <h1 className="font-display font-extrabold text-zinc-900 text-6xl sm:text-7xl tracking-tight leading-none">
          {Array.from(title).map((ch, i) => (
            <span
              key={i}
              className="welcome-letter"
              style={{ animationDelay: `${0.25 + i * 0.09}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>

        <p
          className="welcome-sub mt-5 text-lg sm:text-xl text-zinc-600"
          style={{ animationDelay: `${0.45 + title.length * 0.09}s` }}
        >
          {subtitle}
        </p>

        {/* Traço de lápis dourado sendo desenhado */}
        <svg
          className="mx-auto mt-4 block"
          width="120"
          height="14"
          viewBox="0 0 120 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            className="welcome-stroke"
            d="M4 9 C 28 3, 48 12, 70 6 S 106 5, 116 8"
            stroke="var(--seice-gold-light)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ animationDelay: `${0.8 + title.length * 0.09}s` }}
          />
        </svg>
      </div>
    </div>
  );
}
