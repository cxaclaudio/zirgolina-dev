"use client";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ALLOWED_MARCAS } from "@/lib/dgeg";

interface Distrito { Id: number; Descritivo: string; }
interface Municipio { Id: number; Descritivo: string; }

export interface FilterValues {
  fuelId: string;
  idDistrito: string;
  idMunicipio: string; // CSV: "123,456,789"
  marcaId: string;
  search: string;
}

interface Props {
  onChange: (f: FilterValues) => void;
  onSearch: (f: FilterValues) => void;
  loading: boolean;
  total: number;
  currentFuelId: string;
  distritoAtivo: string;
  municipioAtivo: string; // continua singular para compatibilidade com o mapa
  cheapestPrice?: number | null;
}

export default function FilterPanel({
  onChange,
  onSearch,
  loading,
  total,
  currentFuelId,
  distritoAtivo,
  municipioAtivo,
  cheapestPrice,
}: Props) {
  const { dark } = useTheme();

  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [idDistrito, setIdDistrito] = useState("");
  const [idMunicipios, setIdMunicipios] = useState<string[]>([]);
  const [marcaId, setMarcaId] = useState("");

  const [litros, setLitros] = useState(50);
  const [precoCalc, setPrecoCalc] = useState("");
  const precoNum = parseFloat(precoCalc) || cheapestPrice || 0;
  const totalCalc = precoNum > 0 ? (precoNum * litros).toFixed(2) : null;

  const monoColor = dark ? "#ffffff" : "#000000";

  const toCsv = useCallback((arr: string[]) => arr.join(","), []);
  const fromCsv = useCallback((csv: string) => {
    if (!csv) return [];
    return csv.split(",").map((v) => v.trim()).filter(Boolean);
  }, []);

  useEffect(() => {
    if (!precoCalc && cheapestPrice) {
      setPrecoCalc(cheapestPrice.toFixed(3));
    }
  }, [cheapestPrice, precoCalc]);

  // Distrito vindo do mapa
  useEffect(() => {
    if (distritoAtivo === idDistrito) return;
    setIdDistrito(distritoAtivo);
    setIdMunicipios([]);
  }, [distritoAtivo, idDistrito]);

  // Concelho vindo do mapa (singular) -> substitui seleção atual por 1
useEffect(() => {
  if (!municipioAtivo) return;

  setIdMunicipios((prev) => {
    if (prev.length === 1 && prev[0] === municipioAtivo) return prev;
    return [municipioAtivo];
  });
}, [municipioAtivo]);

  // Quando os municípios carregam e há concelho ativo pendente
  useEffect(() => {
    if (!municipioAtivo || municipios.length === 0) return;
    const existe = municipios.some((m) => String(m.Id) === municipioAtivo);
    if (existe) setIdMunicipios([municipioAtivo]);
  }, [municipios, municipioAtivo]);

  const vals = useCallback(
    (ov: Partial<FilterValues> = {}): FilterValues => ({
      fuelId: currentFuelId,
      idDistrito,
      idMunicipio: toCsv(idMunicipios),
      marcaId,
      search: "",
      ...ov,
    }),
    [currentFuelId, idDistrito, idMunicipios, marcaId, toCsv]
  );

  useEffect(() => {
    fetch("/api/distritos")
      .then((r) => r.json())
      .then((d) => setDistritos(d.data ?? []));
  }, []);

  useEffect(() => {
    if (!idDistrito) {
      setMunicipios([]);
      return;
    }

    fetch(`/api/municipios?id=${idDistrito}`)
      .then((r) => r.json())
      .then((d) => setMunicipios(d.data ?? []));
  }, [idDistrito]);

  function handleDistritoChange(v: string) {
    setIdDistrito(v);
    setIdMunicipios([]);
    onChange(vals({ idDistrito: v, idMunicipio: "" }));
  }

  function handleMunicipioToggle(v: string) {
    const next = idMunicipios.includes(v)
      ? idMunicipios.filter((x) => x !== v)
      : [...idMunicipios, v];

    setIdMunicipios(next);
    onChange(vals({ idMunicipio: toCsv(next) }));
  }

  function handleMarcaChange(v: string) {
    setMarcaId(v);
    onChange(vals({ marcaId: v }));
  }

  function handleReset() {
    setIdDistrito("");
    setIdMunicipios([]);
    setMarcaId("");
    setPrecoCalc("");

    onChange({
      fuelId: currentFuelId,
      idDistrito: "",
      idMunicipio: "",
      marcaId: "",
      search: "",
    });
  }

  const municipiosSelecionados = idMunicipios.length;

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        position: "sticky",
        top: 72,
        maxHeight: "calc(100vh - 80px)",
        overflowY: "auto",
        paddingBottom: "0.5rem",
      }}
    >
      <div
        className="card"
        style={{
          padding: "0.875rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Filtros</p>

        <div>
          <label className="field-label">Distrito</label>
          <select
            value={idDistrito}
            onChange={(e) => handleDistritoChange(e.target.value)}
            className="field-input"
          >
            <option value="">Todos</option>
            {distritos.map((d) => (
              <option key={d.Id} value={String(d.Id)}>
                {d.Descritivo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">
            Concelhos
            {municipiosSelecionados > 0 ? ` (${municipiosSelecionados} selecionado${municipiosSelecionados > 1 ? "s" : ""})` : ""}
          </label>

          <div
            className="field-input"
            style={{
              padding: municipios.length ? "0.35rem" : "0.65rem 0.75rem",
              opacity: municipios.length ? 1 : 0.45,
              minHeight: "44px",
              maxHeight: "190px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            {!municipios.length ? (
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Escolha primeiro um distrito
              </span>
            ) : (
              <>

                {municipios.map((m) => {
                  const checked = idMunicipios.includes(String(m.Id));

                  return (
                    <label
                      key={m.Id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        cursor: "pointer",
                        padding: "0.3rem 0.2rem",
                        borderRadius: "0.45rem",
                        background: checked ? "var(--bg-input)" : "transparent",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleMunicipioToggle(String(m.Id))}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: "#000000",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "0.76rem", lineHeight: 1.2 }}>
                        {m.Descritivo}
                      </span>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div>
          <label className="field-label">Marca</label>
          <select
            value={marcaId}
            onChange={(e) => handleMarcaChange(e.target.value)}
            className="field-input"
          >
            <option value="">Todas</option>
            {ALLOWED_MARCAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => onSearch(vals())}
            disabled={loading}
            className="btn-primary"
            style={{
              background: monoColor,
              color: dark ? "#000000" : "#ffffff",
              borderColor: monoColor,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "A pesquisar..." : "Pesquisar"}
          </button>

          <button type="button" onClick={handleReset} className="btn-ghost">
            Limpar
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: "0.68rem", marginTop: "-0.1rem" }}>
          {total} resultado{total === 1 ? "" : "s"}
        </p>
      </div>

    </aside>
  );
}