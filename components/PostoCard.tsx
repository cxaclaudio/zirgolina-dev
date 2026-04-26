"use client";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import type { Posto } from "@/lib/dgeg";

interface Props {
  posto: Posto;
  tipoAtivo?: "gasolina" | "gasoleo" | "gpl" | null;
}

const GASOLINA_TIPOS = [
  "gasolina simples 95", "gasolina especial 95", "gasolina especial",
  "gasolina simples", "gasolina 98", "gasolina",
];
const GASOLEO_EXCLUIR = /(agr[ií]col|biodiesel|b[0-9]+|colorid|aditivad)/i;
const GASOLEO_TIPOS = ["gasóleo simples", "gasoleo simples", "gasóleo especial", "gasoleo especial", "gasóleo", "gasoleo"];
const GPL_TIPOS = ["gpl"];

const MARCA_CORES: Record<string, string> = {
  "ALVES BANDEIRA": "#1D6FA4",
  "AUCHAN": "#E2001A",
  "BP": "#006F3C",
  "CEPSA": "#E2001A",
  "GALP": "#FF6B00",
  "INTERMARCHÉ": "#888888",
  "LECLERC": "#1D6FA4",
  "MOEVE": "#1D6FA4",
  "NOVA": "#1D6FA4",
  "OZ ENERGIA": "#1D6FA4",
  "PINGO DOCE": "#006F3C",
  "PLENERGY": "#FFB600",
  "PRIO": "#1D6FA4",
  "REPSOL": "#C45000",
  "SHELL": "#C8960C",
};

function getMarcaCor(marca: string): string {
  const key = Object.keys(MARCA_CORES).find((k) =>
    marca.toUpperCase().includes(k)
  );
  return key ? MARCA_CORES[key] : "var(--accent)";
}

function getPrecoDestaque(posto: Posto, tipo: "gasolina" | "gasoleo" | "gpl"): number | null {
  const tipos =
    tipo === "gasolina" ? GASOLINA_TIPOS :
    tipo === "gasoleo" ? GASOLEO_TIPOS :
    GPL_TIPOS;

  const comb = posto.combustiveis?.find((c: any) => {
    const t = c.tipo?.toLowerCase() ?? "";
    if (tipo === "gasoleo" && GASOLEO_EXCLUIR.test(t)) return false;
    return tipos.some((k) => t.includes(k));
  });

  return (comb as any)?.preco ?? null;
}

function formatDataAtualizacao(value: string | null | undefined): string {
  if (!value) return "—";

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value.replace("T", " ").slice(0, 16);
}

export default function PostoCard({ posto, tipoAtivo }: Props) {
  const { dark } = useTheme();
  const [detalhesOpen, setDetalhesOpen] = useState(false);

  const horarioLines = posto.horario
    ? posto.horario.split(" · ").map((s) => s.trim()).filter(Boolean)
    : [];

  const precoDestaque: number | null = tipoAtivo
    ? getPrecoDestaque(posto, tipoAtivo)
    : posto.preco;

  const precoTexto = precoDestaque != null
    ? `${precoDestaque.toFixed(3)} €/L`
    : posto.precoTexto ?? "—";

  const precoColor =
    tipoAtivo === "gasoleo" ? (dark ? "#ffffff" : "#000000") :
    tipoAtivo === "gpl" ? "#00A8FF" :
    "var(--accent)";

  const ultimaAtualizacao = formatDataAtualizacao(posto.dataAtualizacao);

  function handleDirecoes(e: React.MouseEvent) {
    e.stopPropagation();
    const url = posto.lat && posto.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${posto.lat},${posto.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [posto.nome, posto.morada, posto.localidade, posto.codPostal].filter(Boolean).join(", ")
        )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="card" style={{ padding: "0.6rem 0.875rem", fontSize: "0.8rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.6rem" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.3, margin: 0 }}>
            <span style={{ color: getMarcaCor(posto.marca ?? "") }}>{posto.marca}</span>
            <span style={{ color: "var(--text-muted)", margin: "0 0.3rem" }}>|</span>
            {posto.nome}
          </h3>

          <p
            style={{
              fontWeight: 800,
              fontSize: "1.1rem",
              color: precoColor,
              lineHeight: 1,
              margin: "0.3rem 0 0",
            }}
          >
            {precoTexto}
          </p>
        </div>

        <button
          onClick={handleDirecoes}
          title="Abrir no Google Maps"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "0.45rem",
            padding: "0.22rem 0.55rem",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: "0.67rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Direções
        </button>
      </div>

      {posto.combustiveis.length > 0 && (
        <div
          style={{
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "1px solid var(--border)",
            margin: "0.45rem 0 0",
          }}
        >
          {posto.combustiveis.map((c, i) => (
            <div
              key={`${posto.id}-${c.tipo}-${c.texto}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.25rem 0.7rem",
                background: i % 2 === 0 ? "var(--bg-input)" : "transparent",
                borderBottom: i < posto.combustiveis.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span className="text-muted" style={{ fontSize: "0.68rem" }}>
                {c.tipo}
              </span>
              <strong style={{ fontSize: "0.72rem", color: dark ? "#aaaaaa" : "#555555" }}>
                {c.texto}
              </strong>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "0.45rem",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => setDetalhesOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.68rem",
            fontWeight: 500,
            color: "var(--text-muted)",
            padding: 0,
            flexShrink: 0,
          }}
        >
          {detalhesOpen ? "Fechar detalhes" : "Ver detalhes"}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ transform: detalhesOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            textAlign: "right",
            color: "var(--text-muted)",
            lineHeight: 1.15,
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: "0.5rem" }}>Última atualização: {ultimaAtualizacao}</span>
        </div>
      </div>

      {detalhesOpen && (
        <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
            <p className="field-label" style={{ margin: 0, flexShrink: 0 }}>
              Morada:
            </p>
            <p style={{ fontSize: "0.72rem", fontWeight: 500, margin: 0, color: "var(--text)" }}>
              {posto.morada || "—"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
            <p className="field-label" style={{ margin: 0, flexShrink: 0 }}>
              Cód. Postal:
            </p>
            <p style={{ fontSize: "0.72rem", fontWeight: 500, margin: 0, color: "var(--text)" }}>
              {posto.codPostal || "—"}
            </p>
          </div>

          <div>
            <p className="field-label" style={{ margin: "0 0 2px" }}>
              Horário:
            </p>
            {horarioLines.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {horarioLines.map((l, i) => (
                  <p key={i} style={{ fontSize: "0.72rem", margin: 0, color: "var(--text)" }}>
                    {l}
                  </p>
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontSize: "0.72rem",
                  margin: 0,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                Sem informação
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}