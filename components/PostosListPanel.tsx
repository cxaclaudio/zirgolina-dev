"use client";

import { useState } from "react";
import type { Posto } from "@/lib/dgeg";
import PostoCard from "@/components/PostoCard";
import PostoCardCompact from "@/components/PostoCardCompact";
import type { SortOrdenacao } from "@/hooks/homePage.utils";

type TipoAtivo = "gasolina" | "gasoleo" | "gpl" | null;

type Props = {
  dark: boolean;
  busy: boolean;
  loading: boolean;
  geoLoading: boolean;
  error: string;
  postos: Posto[];
  postosVisiveis: Posto[];
  sortedPostos: Posto[];
  hasSearched: boolean;
  hasMarca: boolean;
  distritoAtivo: string;
  hasMunicipioSelecionado: boolean;
  hasQueryContext: boolean;
  hasRadiusSearch: boolean;
  activeRadiusKm: 5 | 10 | 20 | null;
  ordenacao: string;
  setOrdenacao: (value: string) => void;
  sortOrdenacao: SortOrdenacao;
  setSortOrdenacao: (value: SortOrdenacao) => void;
  tipoAtivo: TipoAtivo;
  // desconto
  descontoAtivo?: boolean;
  descontoCentimos?: number | null;
  descontoMarcaNome?: string;
};

const FILTER_BTNS = [
  { label: "Gasolina", value: "gasolina_asc" },
  { label: "Gasóleo", value: "gasoleo_asc" },
  { label: "GPL", value: "gpl_asc" },
] as const;

const SORT_OPTIONS: { value: SortOrdenacao; label: string; radiusOnly?: boolean }[] = [
  { value: "preco_asc",      label: "Preço ↑" },
  { value: "preco_desc",     label: "Preço ↓" },
  { value: "distancia_asc",  label: "Distância ↑", radiusOnly: true },
  { value: "distancia_desc", label: "Distância ↓", radiusOnly: true },
];

export default function PostosListPanel({
  dark,
  busy,
  loading,
  geoLoading,
  error,
  postos,
  postosVisiveis,
  sortedPostos,
  hasSearched,
  hasMarca,
  distritoAtivo,
  hasMunicipioSelecionado,
  hasQueryContext,
  hasRadiusSearch,
  activeRadiusKm,
  ordenacao,
  setOrdenacao,
  sortOrdenacao,
  setSortOrdenacao,
  tipoAtivo,
  descontoAtivo = false,
  descontoCentimos = null,
  descontoMarcaNome = "",
}: Props) {
  const [vistaDetalhada, setVistaDetalhada] = useState(false);

  const showControls = hasSearched && !busy && postosVisiveis.length > 0;

  return (
    <div
      className="lista-col"
      style={{ display: "flex", flexDirection: "column", gap: "0.55rem", minWidth: 0 }}
    >
      {/* ── Barra de status + toggle + sort ── */}
      <div style={{ display: "flex", gap: "0.4rem", minWidth: 0, alignItems: "stretch" }}>

        {/* Card esquerdo — nr de postos */}
        <div
          className="card"
          style={{
            padding: "0.35rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: 1,
            minWidth: 0,
            borderRadius: "0.75rem",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              flexShrink: 0,
              display: "inline-block",
              background: busy ? "#f97316" : hasQueryContext ? "#22c55e" : "var(--text-muted)",
            }}
          />
          <span className="text-muted" style={{ fontSize: "0.72rem", minWidth: 0 }}>
            {busy
              ? "A carregar…"
              : hasSearched && hasRadiusSearch
              ? `${postosVisiveis.length} postos até ${activeRadiusKm} km`
              : hasSearched
              ? `${postosVisiveis.length} postos`
              : hasQueryContext
              ? "Pronto a pesquisar"
              : "Selecione filtros"}
          </span>
        </div>

        {/* Card centro — toggle vista */}
        {showControls && (
          <div
            className="card"
            style={{
              padding: 0,
              minWidth: "5.6rem",
              display: "flex",
              alignItems: "stretch",
              flexShrink: 0,
              gap: 0,
              alignSelf: "stretch",
              borderRadius: "0.75rem",
              overflow: "hidden",
            }}
          >
		    <button
              onClick={() => setVistaDetalhada(false)}
              title="Vista resumida"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background: !vistaDetalhada ? "var(--accent)" : "transparent",
                color: !vistaDetalhada ? "#fff" : "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
            >
			              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>

            </button>
			
			<button
              onClick={() => setVistaDetalhada(true)}
              title="Vista detalhada"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background: vistaDetalhada ? "var(--accent)" : "transparent",
                color: vistaDetalhada ? "#fff" : "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="5" rx="1" />
                <rect x="3" y="10" width="18" height="5" rx="1" />
                <rect x="3" y="17" width="18" height="5" rx="1" />
              </svg>
            </button>
          </div>
        )}

        {/* Sort */}
        {showControls && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          >
            <select
              value={sortOrdenacao}
              onChange={(e) => setSortOrdenacao(e.target.value as SortOrdenacao)}
              className="field-input"
              style={{
                fontSize: "0.65rem",
                padding: "0 0.6rem",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                outline: "none",
                minWidth: 80,
                minHeight: 0,
                height: "100%",
                borderRadius: "0.75rem",
                background: "var(--bg-card)",
                borderColor: "var(--border)",
                textAlign: "center",
              }}
            >
              {SORT_OPTIONS.filter((o) => !o.radiusOnly || hasRadiusSearch).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Estado vazio inicial ── */}
      {!hasSearched && !hasMarca && !distritoAtivo && !loading && !geoLoading && postos.length === 0 && !error && (
        <div
          className="card"
          style={{
            padding: "1rem 1.25rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>
            Pesquise por distrito, concelhos, marcas ou localização.
          </p>
        </div>
      )}

      {/* ── Distrito selecionado mas sem concelho/marca ── */}
      {!hasSearched && distritoAtivo && !hasMunicipioSelecionado && !hasMarca && !loading && !geoLoading && postos.length === 0 && !error && (
        <div
          className="card"
          style={{
            padding: "1.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "0.82rem" }}>Escolha concelho ou marca</p>
          <p className="text-muted" style={{ fontSize: "0.72rem" }}>
            Selecione um ou vários concelhos <strong>ou</strong> uma marca e clique{" "}
            <strong>Pesquisar</strong>.
          </p>
        </div>
      )}

      {/* ── Sem resultados após pesquisa ── */}
      {hasSearched && !busy && postos.length === 0 && !error && (
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Sem resultados</p>
          <p className="text-muted" style={{ fontSize: "0.68rem", marginTop: "0.2rem" }}>
            Nenhum posto encontrado para os filtros atuais.
          </p>
        </div>
      )}

      {/* ── Botões de filtro por tipo de combustível ── */}
      {postos.length > 0 && (
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {FILTER_BTNS.map((opt) => {
            const active = ordenacao === opt.value;

            const colors: Record<string, { bg: string; border: string; text: string }> = {
              gasolina_asc: {
                bg: active ? "var(--accent)" : "transparent",
                border: active ? "var(--accent)" : "var(--border)",
                text: active ? "#fff" : "var(--text-muted)",
              },
              gasoleo_asc: {
                bg: active ? (dark ? "#ffffff" : "#000000") : "transparent",
                border: active ? (dark ? "#ffffff" : "#000000") : "var(--border)",
                text: active ? (dark ? "#000000" : "#ffffff") : "var(--text-muted)",
              },
              gpl_asc: {
                bg: active ? "#00A8FF" : "transparent",
                border: active ? "#00A8FF" : "var(--border)",
                text: active ? "#ffffff" : "var(--text-muted)",
              },
            };

            const c = colors[opt.value];

            return (
              <button
                key={opt.value}
                onClick={() => setOrdenacao(opt.value)}
                className="btn-ghost"
                style={{
                  fontSize: "0.68rem",
                  padding: "0.25rem 0.5rem",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                  background: c.bg,
                  color: c.text,
                  borderColor: c.border,
                  transition: "all 0.15s ease",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Erro ── */}
      {error && (
        <div className="card" style={{ padding: "0.65rem", color: "#f87171", fontSize: "0.73rem" }}>
          {error}
        </div>
      )}

      {/* ── Loading spinner ── */}
      {busy && (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div
            style={{
              width: 16,
              height: 16,
              border: "2px solid var(--accent)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 0.4rem",
            }}
          />
          <p className="text-muted" style={{ fontSize: "0.68rem" }}>
            {geoLoading ? "A obter localização…" : "A carregar…"}
          </p>
        </div>
      )}

      {/* ── Sem postos com GPL ── */}
      {!busy && postos.length > 0 && postosVisiveis.length === 0 && !error && (
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Sem postos com GPL</p>
          <p className="text-muted" style={{ fontSize: "0.68rem", marginTop: "0.2rem" }}>
            Nenhum posto nesta área tem GPL registado.
          </p>
        </div>
      )}

      {/* ── Lista de postos ── */}
      {!busy && vistaDetalhada && sortedPostos.map((posto) => (
        <PostoCard
          key={posto.id}
          posto={posto}
          tipoAtivo={tipoAtivo}
          descontoAtivo={descontoAtivo}
          descontoCentimos={descontoCentimos}
          descontoMarcaNome={descontoMarcaNome}
        />
      ))}

      {!busy && !vistaDetalhada && sortedPostos.map((posto) => (
        <PostoCardCompact
          key={posto.id}
          posto={posto}
          tipoAtivo={tipoAtivo}
          descontoAtivo={descontoAtivo}
          descontoCentimos={descontoCentimos}
          descontoMarcaNome={descontoMarcaNome}
        />
      ))}

      {/* ── Rodapé DGEG ── */}
      {postos.length > 0 && (
        <p
          className="text-muted"
          style={{ fontSize: "0.56rem", textAlign: "center", padding: "0.2rem 0 0.5rem" }}
        >
          Fonte: DGEG · Direção-Geral de Energia e Geologia
        </p>
      )}
    </div>
  );
}