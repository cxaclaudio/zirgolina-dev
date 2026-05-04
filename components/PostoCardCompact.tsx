"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import type { Posto } from "@/lib/dgeg";
import { getMarcaCor, getPrecoCombustivel } from "@/lib/postos";

interface Props {
  posto: Posto;
  tipoAtivo?: "gasolina" | "gasoleo" | "gpl" | null;
  descontoAtivo?: boolean;
  descontoCentimos?: number | null;
  descontoMarcaNome?: string;
}

function normText(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDataAtualizacao(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return value.replace("T", " ").slice(0, 16);
}

export default function PostoCardCompact({
  posto,
  tipoAtivo,
  descontoAtivo = false,
  descontoCentimos = null,
  descontoMarcaNome = "",
}: Props) {
  const { dark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const precoDestaque: number | null = tipoAtivo
    ? getPrecoCombustivel(posto, tipoAtivo)
    : posto.preco;

  const precoColor =
    tipoAtivo === "gasoleo"
      ? dark ? "#ffffff" : "#000000"
      : tipoAtivo === "gpl"
      ? "#00A8FF"
      : "var(--accent)";

  const horarioLines = posto.horario
    ? posto.horario.split(" · ").map((s) => s.trim()).filter(Boolean)
    : [];

  const ultimaAtualizacao = formatDataAtualizacao(posto.dataAtualizacao);

  // ── desconto ──
  const temDesconto =
    descontoAtivo &&
    descontoCentimos != null &&
    descontoCentimos > 0 &&
    !!descontoMarcaNome &&
    normText(posto.marca ?? "") === normText(descontoMarcaNome) &&
    precoDestaque != null;

  const precoComDesconto =
    temDesconto && precoDestaque != null
      ? Math.max(0, precoDestaque - descontoCentimos! / 100)
      : null;

  function handleDirecoes(e: React.MouseEvent) {
    e.stopPropagation();
    const url =
      posto.lat && posto.lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${posto.lat},${posto.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [posto.nome, posto.morada, posto.localidade, posto.codPostal]
              .filter(Boolean).join(", ")
          )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="card" style={{ padding: 0, fontSize: "0.8rem", overflow: "hidden" }}>
      <div
        onClick={() => setExpanded((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.45rem 0.875rem", cursor: "pointer", gap: "0.5rem", userSelect: "none",
        }}
      >
        {/* Marca | Nome */}
        <span style={{
          flex: 1, minWidth: 0, fontSize: "0.78rem", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          <span style={{ color: getMarcaCor(posto.marca ?? "", "var(--accent)") }}>{posto.marca}</span>
          <span style={{ color: "var(--text-muted)", margin: "0 0.3rem" }}>|</span>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{posto.nome}</span>
        </span>

        {/* Preço + badge desconto + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          {temDesconto && precoComDesconto != null ? (
            <>
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: precoColor }}>
                {precoComDesconto.toFixed(3)} €/L
              </span>
              <span style={{
                fontSize: "0.58rem", fontWeight: 700,
                background: "#22c55e22", color: "#22c55e",
                borderRadius: "0.3rem", padding: "0.1rem 0.3rem", lineHeight: 1.4,
              }}>
                -{descontoCentimos}c
              </span>
              <span style={{
                fontSize: "0.72rem", color: "var(--text-muted)",
                textDecoration: "line-through", fontWeight: 500,
              }}>
                {precoDestaque!.toFixed(3)}
              </span>
            </>
          ) : (
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: precoColor }}>
              {precoDestaque != null ? `${precoDestaque.toFixed(3)} €/L` : posto.precoTexto ?? "—"}
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "var(--text-muted)", flexShrink: 0 }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.6rem 0.875rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {posto.combustiveis.length > 0 && (
            <div style={{ borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border)" }}>
              {posto.combustiveis.map((c, i) => (
                <div key={`${posto.id}-${c.tipo}-${i}`} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.25rem 0.7rem",
                  background: i % 2 === 0 ? "var(--bg-input)" : "transparent",
                  borderBottom: i < posto.combustiveis.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span className="text-muted" style={{ fontSize: "0.68rem" }}>{c.tipo}</span>
                  <strong style={{ fontSize: "0.72rem", color: dark ? "#aaaaaa" : "#555555" }}>{c.texto}</strong>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
            <p className="field-label" style={{ margin: 0, flexShrink: 0 }}>Morada:</p>
            <p style={{ fontSize: "0.72rem", fontWeight: 500, margin: 0, color: "var(--text)" }}>{posto.morada || "—"}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
            <p className="field-label" style={{ margin: 0, flexShrink: 0 }}>Cód. Postal:</p>
            <p style={{ fontSize: "0.72rem", fontWeight: 500, margin: 0, color: "var(--text)" }}>{posto.codPostal || "—"}</p>
          </div>
          <div>
            <p className="field-label" style={{ margin: "0 0 2px" }}>Horário:</p>
            {horarioLines.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {horarioLines.map((l, i) => (
                  <p key={i} style={{ fontSize: "0.72rem", margin: 0, color: "var(--text)" }}>{l}</p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.72rem", margin: 0, color: "var(--text-muted)", fontStyle: "italic" }}>Sem informação</p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.15rem", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>
              Última atualização: {ultimaAtualizacao}
            </span>
            <button onClick={handleDirecoes} title="Abrir no Google Maps" style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: "0.45rem", padding: "0.22rem 0.55rem",
              cursor: "pointer", color: "var(--text-muted)",
              fontSize: "0.67rem", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Direções
            </button>
          </div>
        </div>
      )}
    </article>
  );
}