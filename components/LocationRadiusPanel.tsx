"use client";

import { useState, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface RadiusMarcaOption {
  id: string | number;
  nome: string;
}

interface Props {
  loading: boolean;
  geoLoading?: boolean;
  geoError?: string;
  activeRadiusKm?: number | null;
  onSearchByRadius: (radiusKm: 5 | 10 | 20) => void;

  showRadiusMarcaFilter?: boolean;
  radiusMarcaIds?: string[];
  availableRadiusMarcas?: RadiusMarcaOption[];
  onRadiusMarcaChange?: (marcaIds: string[]) => void;

  descontoAtivo?: boolean;
  descontoCentimos?: number | null;
  descontoMarcaId?: string;
  onDescontoChange?: (ativo: boolean, centimos: number | null, marcaId: string) => void;
}

export default function LocationRadiusPanel({
  loading,
  geoLoading = false,
  geoError = "",
  activeRadiusKm = null,
  onSearchByRadius,

  showRadiusMarcaFilter = false,
  radiusMarcaIds = [],
  availableRadiusMarcas = [],
  onRadiusMarcaChange,

  descontoAtivo: descontoAtivoExterno = false,
  descontoCentimos: descontoCentimosExterno = null,
  descontoMarcaId: descontoMarcaIdExterno = "",
  onDescontoChange,
}: Props) {
  const { dark } = useTheme();

  const [descontoAtivoLocal, setDescontoAtivoLocal] = useState(false);
  const [descontoCentimosLocal, setDescontoCentimosLocal] = useState<number | null>(null);
  const [descontoMarcaIdLocal, setDescontoMarcaIdLocal] = useState("");

  const controlled = !!onDescontoChange;
  const descontoAtivo = controlled ? descontoAtivoExterno : descontoAtivoLocal;
  const descontoCentimos = controlled ? descontoCentimosExterno : descontoCentimosLocal;
  const descontoMarcaId = controlled ? descontoMarcaIdExterno : descontoMarcaIdLocal;

  const [marcasOpen, setMarcasOpen] = useState(false);
  const marcasBoxRef = useRef<HTMLDivElement | null>(null);

  const busy = loading || geoLoading;

  const baseBtnStyle: React.CSSProperties = {
    flex: 1,
    borderRadius: "0.5rem",
    padding: "0.35rem 0.5rem",
    cursor: busy ? "not-allowed" : "pointer",
    fontSize: "0.7rem",
    fontWeight: 700,
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    opacity: busy ? 0.7 : 1,
  };

  function getBtnStyle(km: 5 | 10 | 20): React.CSSProperties {
    const active = activeRadiusKm === km;
    return {
      ...baseBtnStyle,
      background: active ? "var(--accent)" : "transparent",
      color: active ? "#ffffff" : "var(--text)",
      border: active
        ? "1px solid var(--accent)"
        : dark
        ? "1px solid rgba(255,255,255,0.15)"
        : "1px solid var(--border)",
    };
  }

  function handleMarcaToggle(marcaId: string) {
    const next = radiusMarcaIds.includes(marcaId)
      ? radiusMarcaIds.filter((x) => x !== marcaId)
      : [...radiusMarcaIds, marcaId];
    onRadiusMarcaChange?.(next);
  }

  const marcasLabel =
    radiusMarcaIds.length === 0
      ? "Todas as marcas"
      : availableRadiusMarcas
          .filter((m) => radiusMarcaIds.includes(String(m.id)))
          .map((m) => m.nome)
          .join(", ") || "Todas as marcas";

  function fireDescontoChange(atv: boolean, cents: number | null, marcId: string) {
    if (controlled) {
      onDescontoChange?.(atv, cents, marcId);
    } else {
      setDescontoAtivoLocal(atv);
      setDescontoCentimosLocal(cents);
      setDescontoMarcaIdLocal(marcId);
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: "0.85rem",
        paddingBottom: "1.1rem",
        marginBottom: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      {/* ── Cabeçalho ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700 }}>
          Perto de mim
        </p>
        <p
          className="text-muted"
          style={{ margin: 0, fontSize: "0.6rem", lineHeight: 1.45 }}
        >
          Mostrar postos num raio da sua localização atual.
        </p>
      </div>

      {/* ── Botões de raio ── */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button type="button" disabled={busy} onClick={() => onSearchByRadius(5)} style={getBtnStyle(5)}>
          5 km
        </button>
        <button type="button" disabled={busy} onClick={() => onSearchByRadius(10)} style={getBtnStyle(10)}>
          10 km
        </button>
        <button type="button" disabled={busy} onClick={() => onSearchByRadius(20)} style={getBtnStyle(20)}>
          20 km
        </button>
      </div>

      {/* ── Marcas + Desconto: apenas visíveis após pesquisa geo ── */}
      {showRadiusMarcaFilter && (
        <>
          {/* Marcas */}
          <div ref={marcasBoxRef} style={{ position: "relative", overflow: "visible" }}>
            <label className="field-label" style={{ fontSize: "0.58rem" }}>Marcas</label>

            <button
              type="button"
              onClick={() => setMarcasOpen((v) => !v)}
              className="field-input"
              aria-expanded={marcasOpen}
              aria-haspopup="listbox"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "left",
                cursor: "pointer",
                minHeight: "32px",
                padding: "0.35rem 0.75rem",
                gap: "0.5rem",
              }}
            >
              <span
                title={marcasLabel}
                style={{
                  fontSize: "0.76rem",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {marcasLabel}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  transform: marcasOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 160ms ease",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ▾
              </span>
            </button>

            {marcasOpen && (
              <div
                className="field-input"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "calc(100% + 0.35rem)",
                  zIndex: 50,
                  padding: "0.35rem",
                  maxHeight: "220px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  boxShadow: dark
                    ? "0 12px 28px rgba(0,0,0,0.42)"
                    : "0 12px 28px rgba(0,0,0,0.12)",
                  background: "var(--card-bg, var(--bg))",
                }}
              >
                {availableRadiusMarcas.map((m) => {
                  const checked = radiusMarcaIds.includes(String(m.id));
                  return (
                    <label
                      key={String(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        cursor: "pointer",
                        padding: "0.5rem 0.4rem",
                        borderRadius: "0.45rem",
                        background: checked ? "var(--bg-input)" : "transparent",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleMarcaToggle(String(m.id))}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: "#000000",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "0.76rem", lineHeight: 1.2 }}>
                        {m.nome}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desconto */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label className="field-label" style={{ fontSize: "0.58rem", marginBottom: 0 }}>
                Desconto
              </label>
              {/* Pill Não/Sim */}
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  width: "5.6rem",
                  height: 26,
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => fireDescontoChange(false, null, "")}
                  title="Não tenho cupão"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    background: !descontoAtivo ? "#ef4444" : "transparent",
                    color: !descontoAtivo ? "#fff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => fireDescontoChange(true, descontoCentimos, descontoMarcaId)}
                  title="Tenho cupão de desconto"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    background: descontoAtivo ? "#22c55e" : "transparent",
                    color: descontoAtivo ? "#fff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Sim
                </button>
              </div>
            </div>

            {descontoAtivo && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.5rem",
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: dark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div>
                  <label className="field-label" style={{ fontSize: "0.58rem" }}>
                    Desconto (cênt./L)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={descontoCentimos ?? ""}
                    placeholder="ex: 6"
                    onChange={(e) => {
                      const v =
                        e.target.value === ""
                          ? null
                          : Math.max(1, Math.round(Number(e.target.value)));
                      fireDescontoChange(true, v, descontoMarcaId);
                    }}
                    className="field-input"
                    style={{
                      minHeight: "32px",
                      padding: "0.35rem 0.6rem",
                      fontSize: "0.76rem",
                      width: "100%",
                    }}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ fontSize: "0.58rem" }}>
                    Marca do desconto
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={descontoMarcaId}
                      onChange={(e) => {
                        fireDescontoChange(true, descontoCentimos, e.target.value);
                      }}
                      className="field-input"
                      style={{
                        minHeight: "32px",
                        padding: "0.35rem 2rem 0.35rem 0.6rem",
                        fontSize: "0.76rem",
                        appearance: "none",
                        WebkitAppearance: "none",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      <option value="">Selecionar marca</option>
                      {availableRadiusMarcas.map((m) => (
                        <option key={String(m.id)} value={String(m.id)}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        position: "absolute",
                        right: "0.6rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "0.7rem",
                        lineHeight: 1,
                        pointerEvents: "none",
                        color: "var(--text-muted)",
                      }}
                    >
                      ▾
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Estados geo ── */}
      {geoLoading && (
        <p className="text-muted" style={{ margin: 0, fontSize: "0.68rem" }}>
          A obter localização…
        </p>
      )}

      {!geoLoading && geoError && (
        <div style={{ fontSize: "0.7rem", color: "#f87171", lineHeight: 1.45 }}>
          {geoError}
        </div>
      )}
    </div>
  );
}