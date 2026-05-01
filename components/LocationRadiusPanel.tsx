"use client";

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
  radiusMarcaId?: string;
  availableRadiusMarcas?: RadiusMarcaOption[];
  onRadiusMarcaChange?: (marcaId: string) => void;
}

export default function LocationRadiusPanel({
  loading,
  geoLoading = false,
  geoError = "",
  activeRadiusKm = null,
  onSearchByRadius,

  showRadiusMarcaFilter = false,
  radiusMarcaId = "",
  availableRadiusMarcas = [],
  onRadiusMarcaChange,
}: Props) {
  const { dark } = useTheme();

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
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700 }}>
          Perto de mim
        </p>

        <p
          className="text-muted"
          style={{
            margin: 0,
            fontSize: "0.6rem",
            lineHeight: 1.45,
          }}
        >
          Mostrar postos num raio da sua localização atual.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSearchByRadius(5)}
          style={getBtnStyle(5)}
        >
          5 km
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onSearchByRadius(10)}
          style={getBtnStyle(10)}
        >
          10 km
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onSearchByRadius(20)}
          style={getBtnStyle(20)}
        >
          20 km
        </button>
      </div>

      {showRadiusMarcaFilter && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label
            htmlFor="radius-marca"
            className="text-muted"
            style={{
              margin: 0,
              fontSize: "0.68rem",
              fontWeight: 600,
            }}
          >
            Filtrar por marca
          </label>

          <select
            id="radius-marca"
            value={radiusMarcaId}
            onChange={(e) => onRadiusMarcaChange?.(e.target.value)}
            className="field-input"
          >
            <option value="">Todas as marcas</option>

            {availableRadiusMarcas.map((marca) => (
              <option key={String(marca.id)} value={String(marca.id)}>
                {marca.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {geoLoading && (
        <p
          className="text-muted"
          style={{
            margin: 0,
            fontSize: "0.68rem",
          }}
        >
          A obter localização…
        </p>
      )}

      {!geoLoading && geoError && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "#f87171",
            lineHeight: 1.45,
          }}
        >
          {geoError}
        </div>
      )}
    </div>
  );
}