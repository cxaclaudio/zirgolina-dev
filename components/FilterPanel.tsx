"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ALLOWED_MARCAS } from "@/lib/dgeg";

interface Distrito {
  Id: number;
  Descritivo: string;
}

interface Municipio {
  Id: number;
  Descritivo: string;
}

export interface FilterValues {
  fuelId: string;
  idDistrito: string;
  idMunicipio: string;
  marcaIds: string[];
  search: string;
  descontoAtivo: boolean;
  descontoCentimos: number | null;
  descontoMarcaId: string;
}

interface Props {
  onChange: (f: FilterValues) => void;
  onSearch: (f: FilterValues) => void;
  loading: boolean;
  total: number;
  currentFuelId: string;
  distritoAtivo: string;
  municipioAtivo: string;
  cheapestPrice?: number | null;
  // Valores iniciais para restaurar desconto a partir do URL
  initialDescontoAtivo?: boolean;
  initialDescontoCentimos?: number | null;
  initialDescontoMarcaId?: string;
}

export default function FilterPanel({
  onChange,
  onSearch,
  loading,
  total,
  currentFuelId,
  distritoAtivo,
  municipioAtivo,
  initialDescontoAtivo = false,
  initialDescontoCentimos = null,
  initialDescontoMarcaId = "",
}: Props) {
  const { dark } = useTheme();

  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [idDistrito, setIdDistrito] = useState("");
  const [idMunicipios, setIdMunicipios] = useState<string[]>([]);
  const [marcaIds, setMarcaIds] = useState<string[]>([]);
  const [municipiosOpen, setMunicipiosOpen] = useState(false);
  const [marcasOpen, setMarcasOpen] = useState(false);

  const [descontoAtivo, setDescontoAtivo] = useState(initialDescontoAtivo);
  const [descontoCentimos, setDescontoCentimos] = useState<number | null>(initialDescontoCentimos);
  const [descontoMarcaId, setDescontoMarcaId] = useState(initialDescontoMarcaId);

  // Sincroniza uma única vez quando os valores iniciais chegam (restauro do URL)
  const initialDescontoSynced = useRef(false);
  useEffect(() => {
    if (initialDescontoSynced.current) return;
    if (!initialDescontoAtivo && !initialDescontoCentimos && !initialDescontoMarcaId) return;
    initialDescontoSynced.current = true;
    setDescontoAtivo(initialDescontoAtivo);
    setDescontoCentimos(initialDescontoCentimos);
    setDescontoMarcaId(initialDescontoMarcaId);
  }, [initialDescontoAtivo, initialDescontoCentimos, initialDescontoMarcaId]);

  const monoColor = dark ? "#ffffff" : "#000000";

  const municipiosBoxRef = useRef<HTMLDivElement | null>(null);
  const marcasBoxRef = useRef<HTMLDivElement | null>(null);

  const toCsv = useCallback((arr: string[]) => arr.join(","), []);

  const closeDropdowns = useCallback(() => {
    setMunicipiosOpen(false);
    setMarcasOpen(false);
  }, []);

  useEffect(() => {
    if (distritoAtivo === idDistrito) return;
    setIdDistrito(distritoAtivo);
    setIdMunicipios([]);
    closeDropdowns();
  }, [distritoAtivo, idDistrito, closeDropdowns]);

  useEffect(() => {
    if (!municipioAtivo) return;
    setIdMunicipios((prev) => {
      if (prev.length === 1 && prev[0] === municipioAtivo) return prev;
      return [municipioAtivo];
    });
  }, [municipioAtivo]);

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
      marcaIds,
      search: "",
      descontoAtivo,
      descontoCentimos,
      descontoMarcaId,
      ...ov,
    }),
    [currentFuelId, idDistrito, idMunicipios, marcaIds, toCsv, descontoAtivo, descontoCentimos, descontoMarcaId]
  );

  useEffect(() => {
    fetch("/api/distritos")
      .then((r) => r.json())
      .then((d) => setDistritos(d.data ?? []));
  }, []);

  useEffect(() => {
    if (!idDistrito) {
      setMunicipios([]);
      setIdMunicipios([]);
      closeDropdowns();
      return;
    }
    fetch(`/api/municipios?id=${idDistrito}`)
      .then((r) => r.json())
      .then((d) => setMunicipios(d.data ?? []));
  }, [idDistrito, closeDropdowns]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const insideMunicipios = municipiosBoxRef.current?.contains(target) ?? false;
      const insideMarcas = marcasBoxRef.current?.contains(target) ?? false;
      if (!insideMunicipios) setMunicipiosOpen(false);
      if (!insideMarcas) setMarcasOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeDropdowns();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDropdowns]);

  function handleDistritoChange(v: string) {
    setIdDistrito(v);
    setIdMunicipios([]);
    closeDropdowns();
    onChange(vals({ idDistrito: v, idMunicipio: "" }));
  }

  function handleMunicipioToggle(v: string) {
    const next = idMunicipios.includes(v)
      ? idMunicipios.filter((x) => x !== v)
      : [...idMunicipios, v];
    setIdMunicipios(next);
    onChange(vals({ idMunicipio: toCsv(next) }));
  }

  function handleMarcaToggle(v: string) {
    const next = marcaIds.includes(v)
      ? marcaIds.filter((x) => x !== v)
      : [...marcaIds, v];
    setMarcaIds(next);
    onChange(vals({ marcaIds: next }));
  }

  function handleReset() {
    setIdDistrito("");
    setIdMunicipios([]);
    setMarcaIds([]);
    setDescontoAtivo(false);
    setDescontoCentimos(null);
    setDescontoMarcaId("");
    closeDropdowns();
    onChange({
      fuelId: currentFuelId,
      idDistrito: "",
      idMunicipio: "",
      marcaIds: [],
      search: "",
      descontoAtivo: false,
      descontoCentimos: null,
      descontoMarcaId: "",
    });
  }

  const municipiosSelecionadosNomes = municipios
    .filter((m) => idMunicipios.includes(String(m.Id)))
    .map((m) => m.Descritivo);

  const marcasSelecionadasNomes = ALLOWED_MARCAS
    .filter((m) => marcaIds.includes(String(m.id)))
    .map((m) => m.nome);

  const municipiosLabel = !idDistrito
    ? "Escolha primeiro um distrito"
    : municipiosSelecionadosNomes.length === 0
      ? "Todos"
      : municipiosSelecionadosNomes.join(", ");

  const marcasLabel =
    marcasSelecionadasNomes.length === 0
      ? "Todas"
      : marcasSelecionadasNomes.join(", ");

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        position: "sticky",
        top: 72,
        overflow: "visible",
        paddingBottom: "0.5rem",
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        className="card"
        style={{
          padding: "0.65rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          overflow: "visible",
          minWidth: 0,
          width: "100%",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "0.82rem" }}>Filtros</p>

        <div>
          <label className="field-label" style={{ fontSize: "0.58rem" }}>Distrito</label>
          <div style={{ position: "relative" }}>
            <select
              value={idDistrito}
              onChange={(e) => handleDistritoChange(e.target.value)}
              className="field-input"
              style={{
                minHeight: "32px",
                padding: "0.35rem 2rem 0.35rem 0.75rem",
                fontSize: "0.76rem",
                appearance: "none",
                WebkitAppearance: "none",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <option value="">Todos</option>
              {distritos.map((d) => (
                <option key={d.Id} value={String(d.Id)}>
                  {d.Descritivo}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: "0.75rem",
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

        <div ref={municipiosBoxRef} style={{ position: "relative", overflow: "visible" }}>
          <label className="field-label" style={{ fontSize: "0.58rem" }}>Concelhos</label>
          <button
            type="button"
            onClick={() => {
              if (!idDistrito) return;
              setMunicipiosOpen((v) => !v);
              setMarcasOpen(false);
            }}
            disabled={!idDistrito}
            className="field-input"
            aria-expanded={municipiosOpen}
            aria-haspopup="listbox"
            style={{
              width: "100%",
              minWidth: 0,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              overflow: "hidden",
              textAlign: "left",
              cursor: idDistrito ? "pointer" : "not-allowed",
              minHeight: "32px",
              padding: "0.35rem 0.75rem",
              opacity: idDistrito ? 1 : 0.45,
              gap: "0.5rem",
            }}
          >
            <span
              title={municipiosLabel}
              style={{
                fontSize: "0.76rem",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {municipiosLabel}
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                transform: municipiosOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ▾
            </span>
          </button>

          {municipiosOpen && !!idDistrito && (
            <div
              className="field-input"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "calc(100% + 0.35rem)",
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
                      padding: "0.5rem 0.4rem",
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
            </div>
          )}
        </div>

        <div ref={marcasBoxRef} style={{ position: "relative", overflow: "visible" }}>
          <label className="field-label" style={{ fontSize: "0.58rem" }}>Marcas</label>
          <button
            type="button"
            onClick={() => {
              setMarcasOpen((v) => !v);
              setMunicipiosOpen(false);
            }}
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
                bottom: "calc(100% + 0.35rem)",
                zIndex: 40,
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
              {ALLOWED_MARCAS.map((m) => {
                const checked = marcaIds.includes(String(m.id));
                return (
                  <label
                    key={m.id}
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

        {/* ── Desconto ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label className="field-label" style={{ fontSize: "0.58rem", marginBottom: 0 }}>
              Desconto
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={descontoAtivo}
              aria-label="Tem cupão de desconto?"
              onClick={() => {
                if (descontoAtivo) {
                  setDescontoAtivo(false);
                  setDescontoCentimos(null);
                  setDescontoMarcaId("");
                  onChange(vals({ descontoAtivo: false, descontoCentimos: null, descontoMarcaId: "" }));
                } else {
                  setDescontoAtivo(true);
                  onChange(vals({ descontoAtivo: true }));
                }
              }}
              style={{
                position: "relative",
                width: 46,
                height: 26,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: descontoAtivo ? "#22c55e" : dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
                transition: "background 160ms ease, border-color 160ms ease",
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 2,
                  left: descontoAtivo ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: "#ffffff",
                  boxShadow: dark ? "0 1px 4px rgba(0,0,0,0.45)" : "0 1px 4px rgba(0,0,0,0.2)",
                  transition: "left 160ms ease",
                }}
              />
            </button>
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
                    setDescontoCentimos(v);
                    onChange(vals({ descontoCentimos: v }));
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
                      setDescontoMarcaId(e.target.value);
                      onChange(vals({ descontoMarcaId: e.target.value }));
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
                    {ALLOWED_MARCAS.map((m) => (
                      <option key={m.id} value={String(m.id)}>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.4rem",
            marginTop: "0.55rem",
            marginBottom: "0.55rem",
          }}
        >
          <button
            type="button"
            onClick={() => { closeDropdowns(); onSearch(vals()); }}
            disabled={loading}
            className="btn-primary"
            style={{
              background: monoColor,
              color: dark ? "#000000" : "#ffffff",
              borderColor: monoColor,
              opacity: loading ? 0.7 : 1,
              padding: "0.35rem 0.5rem",
              fontSize: "0.7rem",
              minHeight: 32,
              borderRadius: "0.5rem",
            }}
          >
            {loading ? "A pesquisar..." : "Pesquisar"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost"
            style={{
              padding: "0.35rem 0.5rem",
              fontSize: "0.7rem",
              minHeight: 32,
              borderRadius: "0.5rem",
            }}
          >
            Limpar
          </button>
        </div>
      </div>
    </aside>
  );
}
