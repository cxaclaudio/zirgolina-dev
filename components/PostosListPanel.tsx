"use client";

import type { Posto } from "@/lib/dgeg";
import PostoCard from "@/components/PostoCard";

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
  tipoAtivo: TipoAtivo;
};

const SORT_BTNS = [
  { label: "⬇ Gasolina", value: "gasolina_asc" },
  { label: "⬇ Gasóleo", value: "gasoleo_asc" },
  { label: "⬇ GPL", value: "gpl_asc" },
] as const;

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
  tipoAtivo,
}: Props) {
  return (
    <div
      className="lista-col"
      style={{ display: "flex", flexDirection: "column", gap: "0.55rem", minWidth: 0 }}
    >
      <div
        className="card"
        style={{ padding: "0.45rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
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
        <span className="text-muted" style={{ fontSize: "0.72rem" }}>
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

      {!hasSearched && !hasMarca && !distritoAtivo && !loading && !geoLoading && postos.length === 0 && !error && (
        <div
          className="card"
          style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="1.5" />
            <path
              d="M20 10 L20 20 L27 24"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            Selecione um distrito, uma marca ou perto de si
          </p>
          <p className="text-muted" style={{ fontSize: "0.74rem" }}>
            Pode pesquisar por marca em todos os distritos ou por localização.
          </p>
        </div>
      )}

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

      {hasSearched && !busy && postos.length === 0 && !error && (
        <div
          className="card"
          style={{
            padding: "1.25rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Sem resultados</p>
          <p className="text-muted" style={{ fontSize: "0.68rem", marginTop: "0.2rem" }}>
            Nenhum posto encontrado para os filtros atuais.
          </p>
        </div>
      )}

      {postos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {SORT_BTNS.map((opt) => {
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
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: "0.65rem", color: "#f87171", fontSize: "0.73rem" }}>
          {error}
        </div>
      )}

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

      {!busy && postos.length > 0 && postosVisiveis.length === 0 && !error && (
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Sem postos com GPL</p>
          <p className="text-muted" style={{ fontSize: "0.68rem", marginTop: "0.2rem" }}>
            Nenhum posto nesta área tem GPL registado.
          </p>
        </div>
      )}

      {!busy &&
        sortedPostos.map((posto) => (
          <PostoCard key={posto.id} posto={posto} tipoAtivo={tipoAtivo} />
        ))}

      {postos.length > 0 && (
        <p
          className="text-muted"
          style={{ fontSize: "0.56rem", textAlign: "center", padding: "0.2rem 0 0.5rem" }}
        >
          Fonte: DGEG · precoscombustiveis.dgeg.gov.pt
        </p>
      )}
    </div>
  );
}