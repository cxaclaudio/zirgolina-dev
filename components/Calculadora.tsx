"use client";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const EURO = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export default function Calculadora({ defaultPrice = 1.76 }: { defaultPrice?: number }) {
  const { dark } = useTheme();

  const [litrosInput, setLitrosInput] = useState("40");
  const [precoInput, setPrecoInput] = useState(defaultPrice.toFixed(3));

  const monoColor = dark ? "#ffffff" : "#000000";

  useEffect(() => {
    setPrecoInput(defaultPrice.toFixed(3));
  }, [defaultPrice]);

  const litrosNum = useMemo(() => {
    const n = parseInt(litrosInput, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [litrosInput]);

  const precoNum = useMemo(() => {
    const normalized = precoInput.replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [precoInput]);

  const total = litrosNum * precoNum;

  return (
    <div
      className="card"
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <span style={{ fontSize: "1rem" }}>⛽</span>
        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>Calculadora</span>
      </div>

      <div
        style={{
          border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "var(--border)"}`,
          borderRadius: "0.8rem",
          padding: "0.9rem",
          background: dark ? "rgba(255,255,255,0.02)" : "var(--card)",
        }}
      >
        <p className="text-muted" style={{ fontSize: "0.68rem", margin: 0 }}>
          Total estimado
        </p>
        <p
          style={{
            margin: "0.2rem 0 0 0",
            fontWeight: 800,
            fontSize: "1.35rem",
            color: monoColor,
            letterSpacing: "-0.02em",
          }}
        >
          {EURO.format(total)}
        </p>
        <p className="text-muted" style={{ fontSize: "0.68rem", margin: "0.25rem 0 0 0" }}>
          {litrosNum} L × {precoNum.toFixed(3)} €/L
        </p>
        <p className="text-muted" style={{ fontSize: "0.68rem", margin: "0.15rem 0 0 0" }}>
          ≈ {EURO.format(precoNum * 10)} por 10 L
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div>
          <label className="field-label" style={{ display: "block", marginBottom: "0.35rem" }}>
            Litros
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={litrosInput}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setLitrosInput(v);
            }}
            placeholder="0"
            className="field-input text-center"
          />
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            value={Math.min(litrosNum, 120)}
            onChange={(e) => setLitrosInput(e.target.value)}
            style={{ width: "100%", marginTop: "0.45rem", accentColor: "var(--accent)" }}
          />
        </div>

        <div>
          <label className="field-label" style={{ display: "block", marginBottom: "0.35rem" }}>
            € / Litro
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={precoInput}
            onChange={(e) => {
              let v = e.target.value.replace(",", ".");
              v = v.replace(/[^0-9.]/g, "");

              const parts = v.split(".");
              if (parts.length > 2) {
                v = `${parts[0]}.${parts.slice(1).join("")}`;
              }

              setPrecoInput(v);
            }}
            placeholder="1.760"
            className="field-input text-center"
          />
          <input
            type="range"
            min={1}
            max={3}
            step={0.001}
            value={Math.min(Math.max(precoNum || defaultPrice, 1), 3)}
            onChange={(e) => setPrecoInput(Number(e.target.value).toFixed(3))}
            style={{ width: "100%", marginTop: "0.45rem", accentColor: "var(--accent)" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        {[20, 30, 40, 50, 60, 80].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLitrosInput(String(l))}
            className="btn-ghost"
            style={{
              padding: "0.35rem 0.65rem",
              fontSize: "0.72rem",
              background: litrosNum === l ? "var(--accent)" : "transparent",
              color: litrosNum === l ? "#fff" : "var(--text-muted)",
              borderColor: litrosNum === l ? "var(--accent)" : "var(--border)",
            }}
          >
            {l} L
          </button>
        ))}
      </div>
    </div>
  );
}