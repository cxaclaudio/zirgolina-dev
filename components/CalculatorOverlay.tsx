"use client";

import type { MutableRefObject } from "react";
import Calculadora from "@/components/Calculadora";

type Props = {
  open: boolean;
  isMobileView: boolean;
  onClose: () => void;
  dark: boolean;
  calcAnchor: { top: number; left: number };
  calcPopoverRef: MutableRefObject<HTMLDivElement | null>;
  headerHeight: number;
};

export default function CalculatorOverlay({
  open,
  isMobileView,
  onClose,
  dark,
  calcAnchor,
  calcPopoverRef,
  headerHeight,
}: Props) {
  if (!open) return null;

  if (isMobileView) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1rem",
            height: headerHeight,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Calculadora</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "1.4rem",
              lineHeight: 1,
              padding: "0.2rem",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, padding: "1rem" }}>
          <Calculadora />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={calcPopoverRef}
      className="card"
      style={{
        position: "fixed",
        top: calcAnchor.top,
        left: calcAnchor.left,
        width: 340,
        maxWidth: "calc(100vw - 24px)",
        zIndex: 120,
        padding: "0.85rem",
        boxShadow: dark
          ? "0 18px 40px rgba(0,0,0,0.45)"
          : "0 18px 40px rgba(0,0,0,0.12)",
        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--border)",
        borderRadius: "0.9rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.6rem",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>Calculadora</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: "1rem",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      <Calculadora />
    </div>
  );
}