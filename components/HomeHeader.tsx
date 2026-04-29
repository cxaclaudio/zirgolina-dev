"use client";

import type { CSSProperties, MutableRefObject } from "react";

type Props = {
  dark: boolean;
  toggleTheme: () => void;
  onOpenMap: () => void;
  onToggleCalc: () => void;
  onOpenDonate: () => void;
  onGoHome: () => void;
  calcBtnRef: MutableRefObject<HTMLButtonElement | null>;
  headerHeight: number;
};

export default function HomeHeader({
  dark,
  toggleTheme,
  onOpenMap,
  onToggleCalc,
  onOpenDonate,
  onGoHome,
  calcBtnRef,
  headerHeight,
}: Props) {
  const baseBtnStyle: CSSProperties = {
    background: "transparent",
    color: dark ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
    border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
    borderRadius: "0.6rem",
    padding: "0.35rem 0.6rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  };

  const desktopLabeledBtnStyle: CSSProperties = {
    ...baseBtnStyle,
    gap: "0.4rem",
    fontSize: "0.72rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };

  return (
    <header
      style={{
        background: dark ? "#000000" : "#ffffff",
        borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e0d8",
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: headerHeight,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 1.25rem",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <button
          type="button"
          onClick={onGoHome}
          title="Ir para a homepage"
          aria-label="Ir para a homepage"
          style={{
            display: "flex",
            alignItems: "center",
            height: headerHeight,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <img
            src={dark ? "/logo-dark.png" : "/logo-light.png"}
            alt="Zirgolina"
            style={{
              height: headerHeight - 4,
              width: "auto",
              maxWidth: 220,
              display: "block",
              objectFit: "contain",
              objectPosition: "left center",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (fb) fb.style.display = "block";
            }}
          />
          <span
            style={{
              display: "none",
              fontFamily: "Georgia,'Times New Roman',serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "1.9rem",
              color: dark ? "#22c55e" : "#16a34a",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            zirgolina
          </span>
        </button>

        <div style={{ flex: 1 }} />

        <div className="mobile-actions" style={{ gap: "0.5rem" }}>
          <button
            type="button"
            onClick={onOpenMap}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "0.6rem",
              padding: "0.35rem 0.7rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            Mapa
          </button>

          <button
            type="button"
            onClick={onToggleCalc}
            style={baseBtnStyle}
            title="Calculadora"
            aria-label="Abrir calculadora"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <rect x="7" y="5" width="10" height="4" rx="1" />
              <circle cx="8" cy="14" r="0.8" fill="currentColor" />
              <circle cx="12" cy="14" r="0.8" fill="currentColor" />
              <circle cx="16" cy="14" r="0.8" fill="currentColor" />
              <circle cx="8" cy="18" r="0.8" fill="currentColor" />
              <circle cx="12" cy="18" r="0.8" fill="currentColor" />
              <circle cx="16" cy="18" r="0.8" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenDonate}
            style={baseBtnStyle}
            title="Doar"
            aria-label="Abrir janela de apoio ao projeto"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            style={baseBtnStyle}
            title="Tema"
            aria-label="Alternar tema"
          >
            {dark ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <div className="desktop-only" style={{ display: "flex", gap: "0.5rem" }}>
          <button
            ref={calcBtnRef}
            type="button"
            onClick={onToggleCalc}
            style={desktopLabeledBtnStyle}
            title="Calculadora"
            aria-label="Abrir calculadora"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <rect x="7" y="5" width="10" height="4" rx="1" />
              <circle cx="8" cy="14" r="0.8" fill="currentColor" />
              <circle cx="12" cy="14" r="0.8" fill="currentColor" />
              <circle cx="16" cy="14" r="0.8" fill="currentColor" />
              <circle cx="8" cy="18" r="0.8" fill="currentColor" />
              <circle cx="12" cy="18" r="0.8" fill="currentColor" />
              <circle cx="16" cy="18" r="0.8" fill="currentColor" />
            </svg>
            <span>Calculadora</span>
          </button>

          <button
            type="button"
            onClick={onOpenDonate}
            style={desktopLabeledBtnStyle}
            title="Doar"
            aria-label="Abrir janela de apoio ao projeto"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            <span>Doar</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            style={baseBtnStyle}
            title="Tema"
            aria-label="Alternar tema"
          >
            {dark ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}