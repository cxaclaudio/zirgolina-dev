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

const GASOLINA_KEYWORDS = ["gasolina"];
const GASOLEO_KEYWORDS = ["gasóleo", "gasoleo"];
const GASOLEO_EXCLUIR = /(agr[ií]col|biodiesel|b[0-9]+|colorid|aditivad)/i;
const GPL_KEYWORDS = ["gpl"];

function getTipoCombustivel(tipo: string): "gasolina" | "gasoleo" | "gpl" | null {
  const t = tipo?.toLowerCase() ?? "";
  if (GPL_KEYWORDS.some((k) => t.includes(k))) return "gpl";
  if (GASOLEO_EXCLUIR.test(t)) return null;
  if (GASOLEO_KEYWORDS.some((k) => t.includes(k))) return "gasoleo";
  if (GASOLINA_KEYWORDS.some((k) => t.includes(k))) return "gasolina";
  return null;
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

function getPrecoCor(tipo: "gasolina" | "gasoleo" | "gpl" | null, dark: boolean): string {
  if (tipo === "gasoleo") return dark ? "#ffffff" : "#1a1a1a";
  if (tipo === "gpl") return "#00A8FF";
  if (tipo === "gasolina") return "var(--accent)";
  return "var(--text)";
}

export default function PostoCard({
  posto,
  tipoAtivo,
  descontoAtivo = false,
  descontoCentimos = null,
  descontoMarcaNome = "",
}: Props) {
  const { dark } = useTheme();
  const [detalhesOpen, setDetalhesOpen] = useState(false);

  const horarioLines = posto.horario
    ? posto.horario.split(" · ").map((s) => s.trim()).filter(Boolean)
    : [];

  const precoDestaque: number | null = tipoAtivo
    ? getPrecoCombustivel(posto, tipoAtivo)
    : posto.preco;

  // marca bate com o cupão?
  const marcaMatch =
    descontoAtivo &&
    descontoCentimos != null &&
    descontoCentimos > 0 &&
    !!descontoMarcaNome &&
    normText(posto.marca ?? "") === normText(descontoMarcaNome);

  // desconto no preço destaque
  const temDesconto = marcaMatch && precoDestaque != null;

  const precoComDesconto =
    temDesconto && precoDestaque != null
      ? Math.max(0, precoDestaque - descontoCentimos! / 100)
      : null;

  const precoColor = getPrecoCor(tipoAtivo ?? null, dark);
  const ultimaAtualizacao = formatDataAtualizacao(posto.dataAtualizacao);

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
    <article className="card" style={{ padding: "0.6rem 0.875rem", fontSize: "0.8rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.6rem" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.3, margin: 0 }}>
            <span style={{ color: getMarcaCor(posto.marca ?? "", "var(--accent)") }}>
              {posto.marca}
            </span>
            <span style={{ color: "var(--text-muted)", margin: "0 0.3rem" }}>|</span>
            {posto.nome}
          </h3>

          {/* Preço destaque — com ou sem desconto */}
          {temDesconto && precoComDesconto != null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem", marginTop: "0.3rem" }}>
              <p style={{ fontWeight: 800, fontSize: "1.1rem", color: precoColor, lineHeight: 1, margin: 0 }}>
                {precoComDesconto.toFixed(3)} €/L
              </p>
              <p style={{ fontWeight: 600, fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "line-through", lineHeight: 1, margin: 0 }}>
                {precoDestaque!.toFixed(3)}
              </p>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, background: "#22c55e22",
                color: "#22c55e", borderRadius: "0.3rem", padding: "0.1rem 0.35rem", lineHeight: 1.4,
              }}>
                -{descontoCentimos}c/L
              </span>
            </div>
          ) : (
            <p style={{ fontWeight: 800, fontSize: "1.1rem", color: precoColor, lineHeight: 1, margin: "0.3rem 0 0" }}>
              {precoDestaque != null ? `${precoDestaque.toFixed(3)} €/L` : posto.precoTexto ?? "—"}
            </p>
          )}
        </div>

        <button
          onClick={handleDirecoes}
          title="Abrir no Google Maps"
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "transparent", border: "1px solid var(--border)",
            borderRadius: "0.45rem", padding: "0.22rem 0.55rem",
            cursor: "pointer", color: "var(--text-muted)",
            fontSize: "0.67rem", fontWeight: 500, whiteSpace: "nowrap",
            flexShrink: 0, marginTop: 2,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Direções
        </button>
      </div>

      {/* Tabela de combustíveis */}
      {posto.combustiveis.length > 0 && (
        <div style={{ borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border)", margin: "0.45rem 0 0" }}>
          {posto.combustiveis.map((c, i) => {
            const tipoComb = getTipoCombustivel(c.tipo ?? "");
            const corPreco = getPrecoCor(tipoComb, dark);
            const precoNum: number | null = (c as any).preco ?? null;
            // desconto aplica-se a TODOS os combustíveis da marca
            const aplicarDesconto = marcaMatch && precoNum != null;
            const precoDescNum = aplicarDesconto
              ? Math.max(0, precoNum! - descontoCentimos! / 100)
              : null;

            return (
              <div
                key={`${posto.id}-${c.tipo}-${c.texto}-${i}`}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.25rem 0.7rem",
                  background: i % 2 === 0 ? "var(--bg-input)" : "transparent",
                  borderBottom: i < posto.combustiveis.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span className="text-muted" style={{ fontSize: "0.68rem" }}>{c.tipo}</span>
                {aplicarDesconto && precoDescNum != null ? (
                  <span style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                    <strong style={{ fontSize: "0.72rem", color: corPreco }}>
                      {precoDescNum.toFixed(3)} €/L
                    </strong>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textDecoration: "line-through" }}>
                      {precoNum!.toFixed(3)}
                    </span>
                    <span style={{
                      fontSize: "0.58rem", fontWeight: 700,
                      background: "#22c55e22", color: "#22c55e",
                      borderRadius: "0.3rem", padding: "0.08rem 0.28rem", lineHeight: 1.4,
                    }}>
                      -{descontoCentimos}c
                    </span>
                  </span>
                ) : (
                  <strong style={{ fontSize: "0.72rem", color: corPreco }}>
                    {c.texto}
                  </strong>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "0.45rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem" }}>
        <button
          onClick={() => setDetalhesOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.68rem", fontWeight: 500, color: "var(--text-muted)", padding: 0, flexShrink: 0,
          }}
        >
          {detalhesOpen ? "Fechar detalhes" : "Ver detalhes"}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ transform: detalhesOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>
          Última atualização: {ultimaAtualizacao}
        </span>
      </div>

      {detalhesOpen && (
        <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
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
        </div>
      )}
    </article>
  );
}
