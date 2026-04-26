"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Posto } from "@/lib/dgeg";
import FilterPanel, { type FilterValues } from "@/components/FilterPanel";
import PostoCard from "@/components/PostoCard";
import Calculadora from "@/components/Calculadora";
import { useTheme } from "@/components/ThemeProvider";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.78rem",
        color: "var(--text-muted)",
      }}
    >
      A carregar mapa…
    </div>
  ),
});

const HEADER_H = 56;

const GASOLINA_TIPOS = [
  "gasolina simples 95",
  "gasolina especial 95",
  "gasolina especial",
  "gasolina simples",
  "gasolina 98",
  "gasolina",
];

const GASOLEO_EXCLUIR = /(agr[ií]col|biodiesel|b[0-9]+|colorid|aditivad)/i;
const GASOLEO_TIPOS = [
  "gasóleo simples",
  "gasoleo simples",
  "gasóleo especial",
  "gasoleo especial",
  "gasóleo",
  "gasoleo",
];
const GPL_TIPOS = ["gpl"];

const CRIPTO = [
  {
    label: "XMR Address",
    addr: "45CQZ4nvwVC4L2x5BTN5F3iZBzW6oqjt6XzNLcm3mocpGKNmAaUAs7DJAddCCMpF1nKUa3Apybw8cDtmNvbFVSux2yZPXaf",
  },
  { label: "BTC Address", addr: "bc1qc7ahx5r0vhrlvmsg54kyk599yyh86fvl7thmsv" },
  { label: "ETH Address", addr: "0x985b833D87AD530790212440C8A3FA751BBC9b90" },
];

function precoRelevante(posto: Posto, tipo: "gasolina" | "gasoleo" | "gpl"): number {
  const tipos =
    tipo === "gasolina" ? GASOLINA_TIPOS :
    tipo === "gasoleo" ? GASOLEO_TIPOS :
    GPL_TIPOS;

  const comb = posto.combustiveis?.find((c: any) => {
    const t = c.tipo?.toLowerCase() ?? "";
    if (tipo === "gasoleo" && GASOLEO_EXCLUIR.test(t)) return false;
    return tipos.some((k) => t.includes(k));
  });

  return (comb as any)?.preco ?? Infinity;
}

function temCombustivel(posto: Posto, tipo: "gasolina" | "gasoleo" | "gpl"): boolean {
  return precoRelevante(posto, tipo) !== Infinity;
}

async function fetchMunicipiosLocal(idDistrito: string) {
  const res = await fetch(`/api/municipios?id=${idDistrito}`);
  const json = await res.json();
  return (json.data ?? []) as Array<{ Id: number; Descritivo: string }>;
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

function sanitizeFilters(f: FilterValues): FilterValues {
  if (!f.idDistrito && f.idMunicipio) {
    return { ...f, idMunicipio: "" };
  }
  return f;
}

export default function Home() {
  const { dark, toggle } = useTheme();

  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fuelId, setFuelId] = useState("3201");
  const [distritoAtivo, setDistritoAtivo] = useState("");
  const [municipioAtivo, setMunicipioAtivo] = useState("");
  const [ordenacao, setOrdenacao] = useState("gasolina_asc");
  const [mapaOpen, setMapaOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [doarOpen, setDoarOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const mapFlyRefDesktop = useRef<{
    flyToDistrito: (id: string) => void;
    flyToConcelho: (dId: string, cNome: string) => void;
  } | null>(null);

  const mapFlyRefMobile = useRef<{
    flyToDistrito: (id: string) => void;
    flyToConcelho: (dId: string, cNome: string) => void;
  } | null>(null);

  const mapInvalidateRefDesktop = useRef<(() => void) | null>(null);
  const mapInvalidateRefMobile = useRef<(() => void) | null>(null);

  const ignoreMapClicksRef = useRef(false);

  const filtersRef = useRef<FilterValues>({
    fuelId: "3201",
    idDistrito: "",
    idMunicipio: "",
    marcaId: "",
    search: "",
  });

  const flyToDistrito = useCallback((id: string) => {
    mapFlyRefDesktop.current?.flyToDistrito(id);
    mapFlyRefMobile.current?.flyToDistrito(id);
  }, []);

  const flyToConcelho = useCallback((dId: string, cNome: string) => {
    mapFlyRefDesktop.current?.flyToConcelho(dId, cNome);
    mapFlyRefMobile.current?.flyToConcelho(dId, cNome);
  }, []);

  const fetchPostos = useCallback(async (f: FilterValues) => {
    const safeF = sanitizeFilters({
      ...f,
      fuelId: f.fuelId || "3201",
    });

    const temDistrito = !!safeF.idDistrito;
    const temMunicipio = !!safeF.idMunicipio;
    const temMarca = !!safeF.marcaId;
    const temSearch = !!safeF.search;

    const podeSearch =
      temMarca ||
      (temDistrito && temMunicipio) ||
      temSearch;

    if (!podeSearch) {
      setError("");
      setPostos([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("fuelId", safeF.fuelId);
      if (safeF.idDistrito) params.set("idDistrito", safeF.idDistrito);
      if (safeF.idMunicipio) params.set("idMunicipio", safeF.idMunicipio);
      if (safeF.marcaId) params.set("marcaId", safeF.marcaId);
      if (safeF.search) params.set("search", safeF.search);

      const res = await fetch(`/api/combustivel?${params}`);
      const json = await res.json();

      if (!json.ok) throw new Error(json.error ?? "Erro desconhecido");

      const filtered = (json.data as Posto[]).filter((p) => {
        if (p.preco !== null && p.preco <= 0) return false;
        return true;
      });

      setPostos(filtered);
    } catch (e) {
      setError(String(e));
      setPostos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleReset() {
    filtersRef.current = {
      fuelId: "3201",
      idDistrito: "",
      idMunicipio: "",
      marcaId: "",
      search: "",
    };
    setPostos([]);
    setError("");
    setDistritoAtivo("");
    setMunicipioAtivo("");
    setFuelId("3201");
    setOrdenacao("gasolina_asc");
    setHasSearched(false);
  }

  const handleDistritoClick = useCallback((nome: string, id?: string) => {
    if (ignoreMapClicksRef.current) return;

    const newF: FilterValues = sanitizeFilters({
      ...filtersRef.current,
      fuelId,
      idDistrito: id ?? "",
      idMunicipio: "",
    });

    filtersRef.current = newF;
    setDistritoAtivo(id ?? "");
    setMunicipioAtivo("");

    if (newF.marcaId) {
      setHasSearched(true);
      fetchPostos(newF);
    } else {
      setHasSearched(false);
      setPostos([]);
    }
  }, [fetchPostos, fuelId]);

  const handleConcelhoClick = useCallback(async (distritoId: string, concelhoNome: string) => {
    if (ignoreMapClicksRef.current) return;

    let concelhoId = "";

    try {
      const lista = await fetchMunicipiosLocal(distritoId);
      const target = normText(concelhoNome);

      const found =
        lista.find((m: any) => normText(m.Descritivo) === target) ||
        lista.find((m: any) => normText(m.Descritivo).startsWith(target)) ||
        lista.find((m: any) => target.startsWith(normText(m.Descritivo))) ||
        lista.find((m: any) => normText(m.Descritivo).includes(target)) ||
        lista.find((m: any) => target.includes(normText(m.Descritivo)));

      if (found) concelhoId = String(found.Id);
      if (!concelhoId) return;
    } catch {
      return;
    }

    const novoFiltro: FilterValues = sanitizeFilters({
      ...filtersRef.current,
      fuelId,
      idDistrito: distritoId,
      idMunicipio: concelhoId,
    });

    filtersRef.current = novoFiltro;
    setDistritoAtivo(distritoId);
    setMunicipioAtivo(concelhoId);
    setHasSearched(true);
    fetchPostos(novoFiltro);
  }, [fetchPostos, fuelId]);

  const handleFilterChange = useCallback((f: FilterValues) => {
    const next = sanitizeFilters(f);

    const distritoMudou = next.idDistrito !== filtersRef.current.idDistrito;
    const concelhoMudou = next.idMunicipio !== filtersRef.current.idMunicipio;

    filtersRef.current = next;
    setFuelId(next.fuelId);
    setDistritoAtivo(next.idDistrito);
    setMunicipioAtivo(next.idMunicipio);

    if (!next.idDistrito && !next.idMunicipio && !next.marcaId && !next.search) {
      setHasSearched(false);
      setPostos([]);
      setError("");
    }

    if (concelhoMudou && next.idMunicipio && next.idDistrito) {
      ignoreMapClicksRef.current = true;
      setTimeout(() => {
        ignoreMapClicksRef.current = false;
      }, 2000);

      fetchMunicipiosLocal(next.idDistrito)
        .then((lista) => {
          const m = lista.find((x) => String(x.Id) === next.idMunicipio);
          if (m) flyToConcelho(next.idDistrito, m.Descritivo);
        })
        .catch(() => {});
    } else if (distritoMudou && next.idDistrito) {
      ignoreMapClicksRef.current = true;
      setTimeout(() => {
        ignoreMapClicksRef.current = false;
      }, 2000);
      flyToDistrito(next.idDistrito);
    }
  }, [flyToDistrito, flyToConcelho]);

  const handleSearch = useCallback((f: FilterValues) => {
    const next = sanitizeFilters(f);

    filtersRef.current = next;
    setFuelId(next.fuelId);
    setDistritoAtivo(next.idDistrito);
    setMunicipioAtivo(next.idMunicipio);
    setHasSearched(true);

    ignoreMapClicksRef.current = true;
    setTimeout(() => {
      ignoreMapClicksRef.current = false;
    }, 1500);

    fetchPostos(next);
  }, [fetchPostos]);

  useEffect(() => {
    if (!mapaOpen) return;

    const distrito = filtersRef.current.idDistrito;
    const municipio = filtersRef.current.idMunicipio;
    let attempts = 0;

    const tryFly = () => {
      attempts++;
      mapInvalidateRefMobile.current?.();

      if (!mapFlyRefMobile.current) {
        if (attempts < 15) setTimeout(tryFly, 200);
        return;
      }

      if (municipio && distrito) {
        fetchMunicipiosLocal(distrito)
          .then((lista) => {
            const m = lista.find((x) => String(x.Id) === municipio);
            if (m) mapFlyRefMobile.current?.flyToConcelho(distrito, m.Descritivo);
          })
          .catch(() => {});
      } else if (distrito) {
        mapFlyRefMobile.current.flyToDistrito(distrito);
      }
    };

    const t = setTimeout(tryFly, 150);
    return () => clearTimeout(t);
  }, [mapaOpen]);

  function handleCopy(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  }

  const tipoAtivo: "gasolina" | "gasoleo" | "gpl" | null =
    ordenacao === "gasolina_asc" ? "gasolina" :
    ordenacao === "gasoleo_asc" ? "gasoleo" :
    ordenacao === "gpl_asc" ? "gpl" :
    null;

  const postosVisiveis = tipoAtivo === "gpl"
    ? postos.filter((p) => temCombustivel(p, "gpl"))
    : postos;

  const precosVisiveis = postosVisiveis
    .map((p) => {
      if (!tipoAtivo) return p.preco;
      const pr = precoRelevante(p, tipoAtivo);
      return pr === Infinity ? null : pr;
    })
    .filter((x): x is number => x !== null);

  const minP = precosVisiveis.length ? Math.min(...precosVisiveis) : 0;

  const cheapestPrice: number | null = (() => {
    if (!tipoAtivo) {
      const p = postosVisiveis.find((p) => p.preco === minP);
      return p?.preco ?? null;
    }
    const p = postosVisiveis.find((p) => precoRelevante(p, tipoAtivo) === minP);
    if (!p) return null;
    return minP;
  })();

  const sortedPostos = [...postosVisiveis].sort((a, b) => {
    if (tipoAtivo) return precoRelevante(a, tipoAtivo) - precoRelevante(b, tipoAtivo);
    return 0;
  });

  const hasMarca = filtersRef.current.marcaId !== "";
  const hasSearch = filtersRef.current.search !== "";
  const hasQueryContext =
    distritoAtivo !== "" ||
    municipioAtivo !== "" ||
    hasMarca ||
    hasSearch;

  const mostrarPins =
    postosVisiveis.length > 0 &&
    (municipioAtivo !== "" || hasMarca);

  const mostrarPinsDistrito =
    distritoAtivo !== "" &&
    !hasMarca &&
    municipioAtivo === "";

  const SORT_BTNS = [
    { label: "⬇ Gasolina", value: "gasolina_asc" },
    { label: "⬇ Gasóleo", value: "gasoleo_asc" },
    { label: "⬇ GPL", value: "gpl_asc" },
  ] as const;

  const mapProps = {
    postos: sortedPostos,
    onDistritoClick: handleDistritoClick,
    onConcelhoClick: handleConcelhoClick,
    mostrarPins,
    mostrarPinsDistrito,
  };

  const themeBtn = (
    <button
      onClick={toggle}
      style={{
        background: "transparent",
        color: dark ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
        border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
        borderRadius: "0.6rem",
        padding: "0.35rem 0.6rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
      }}
    >
      {dark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );

  const doarBtn = (
    <button
      onClick={() => setDoarOpen(true)}
      style={{
        background: "transparent",
        color: dark ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
        border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
        borderRadius: "0.6rem",
        padding: "0.35rem 0.6rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontSize: "0.72rem",
        fontWeight: 500,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`
        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .mapa-col  { display: none !important; }
          .lista-col  { order: 1; }
          .filtros-col { order: 0; }
          .mobile-actions { display: flex !important; }
          .desktop-only { display: none !important; }
          .calc-sidebar { display: none !important; }
        }
        @media (min-width: 901px) {
          .mobile-actions { display: none !important; }
          .filtros-col {
            position: sticky;
            top: ${HEADER_H + 8}px;
            max-height: calc(100vh - ${HEADER_H + 24}px);
            overflow-y: auto;
          }
        }
      `}</style>

      <header
        style={{
          background: dark ? "#000000" : "#ffffff",
          borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e0d8",
          position: "sticky",
          top: 0,
          zIndex: 40,
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            padding: "0 1.25rem",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", height: HEADER_H }}>
            <img
              src={dark ? "/logo-dark.png" : "/logo-light.png"}
              alt="Zirgolina"
              style={{
                height: HEADER_H - 4,
                width: "auto",
                maxWidth: 220,
                display: "block",
                objectFit: "contain",
                objectPosition: "left center",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (fb) fb.style.display = "block";
              }}
            />
            <span
              style={{
                display: "none",
                fontFamily: "Georgia,'Times New Roman',serif",
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: "1.9rem",
                color: dark ? "#22c55e" : "#16a34a",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              zirgolina
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div className="mobile-actions" style={{ gap: "0.5rem" }}>
            <button
              onClick={() => {
                setMapaOpen(true);
                setCalcOpen(false);
                setTimeout(() => mapInvalidateRefMobile.current?.(), 200);
              }}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "0.6rem",
                padding: "0.35rem 0.7rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              Mapa
            </button>

            <button
              onClick={() => {
                setCalcOpen(true);
                setMapaOpen(false);
              }}
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: "0.6rem",
                padding: "0.35rem 0.6rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <rect x="7" y="5" width="10" height="4" rx="1" />
                <circle cx="8" cy="14" r="0.8" fill="currentColor" />
                <circle cx="12" cy="14" r="0.8" fill="currentColor" />
                <circle cx="16" cy="14" r="0.8" fill="currentColor" />
                <circle cx="8" cy="18" r="0.8" fill="currentColor" />
                <circle cx="12" cy="18" r="0.8" fill="currentColor" />
                <circle cx="16" cy="18" r="0.8" fill="currentColor" />
              </svg>
            </button>

            {doarBtn}
            {themeBtn}
          </div>

          <div className="desktop-only" style={{ display: "flex", gap: "0.5rem" }}>
            {doarBtn}
            {themeBtn}
          </div>
        </div>
      </header>

      <div
        className="main-grid"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "1rem 1.25rem",
          display: "grid",
          gridTemplateColumns: "280px 540px 1fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div className="filtros-col">
          <FilterPanel
            onChange={handleFilterChange}
            onSearch={handleSearch}
            loading={loading}
            total={postosVisiveis.length}
            currentFuelId={fuelId}
            distritoAtivo={distritoAtivo}
            municipioAtivo={municipioAtivo}
            cheapestPrice={cheapestPrice}
          />
        </div>

        <div className="lista-col" style={{ display: "flex", flexDirection: "column", gap: "0.55rem", minWidth: 0 }}>
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
                background: loading ? "#f97316" : hasQueryContext ? "#22c55e" : "var(--text-muted)",
              }}
            />
            <span className="text-muted" style={{ fontSize: "0.72rem" }}>
              {loading
                ? "A carregar…"
                : hasSearched
                ? `${postosVisiveis.length} postos`
                : hasQueryContext
                ? "Pronto a pesquisar"
                : "Selecione filtros"}
            </span>
          </div>

          {!hasSearched && !hasMarca && !distritoAtivo && !loading && postos.length === 0 && !error && (
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
                <path d="M20 10 L20 20 L27 24" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Selecione um distrito ou uma marca</p>
              <p className="text-muted" style={{ fontSize: "0.74rem" }}>
                Pode pesquisar por marca em todos os distritos.
              </p>
            </div>
          )}

          {!hasSearched && distritoAtivo && !municipioAtivo && !hasMarca && !loading && postos.length === 0 && !error && (
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
                Selecione um concelho <strong>ou</strong> uma marca e clique <strong>Pesquisar</strong>.
              </p>
            </div>
          )}

          {hasSearched && !loading && postos.length === 0 && !error && (
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

          {loading && (
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
              <p className="text-muted" style={{ fontSize: "0.68rem" }}>A carregar…</p>
            </div>
          )}

          {!loading && postos.length > 0 && postosVisiveis.length === 0 && !error && (
            <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Sem postos com GPL</p>
              <p className="text-muted" style={{ fontSize: "0.68rem", marginTop: "0.2rem" }}>
                Nenhum posto nesta área tem GPL registado.
              </p>
            </div>
          )}

          {!loading && sortedPostos.map((posto) => (
            <PostoCard key={posto.id} posto={posto} tipoAtivo={tipoAtivo} />
          ))}

          {postos.length > 0 && (
            <p className="text-muted" style={{ fontSize: "0.56rem", textAlign: "center", padding: "0.2rem 0 0.5rem" }}>
              Fonte: DGEG · precoscombustiveis.dgeg.gov.pt
            </p>
          )}
        </div>

        <div
          className="card mapa-col"
          style={{
            overflow: "hidden",
            position: "sticky",
            top: HEADER_H + 8,
            height: `calc(100vh - ${HEADER_H + 24}px)`,
          }}
        >
          <MapView
            key="desktop"
            {...mapProps}
            flyRef={mapFlyRefDesktop}
            invalidateRef={mapInvalidateRefDesktop}
          />
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          transform: mapaOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.25s ease",
          pointerEvents: mapaOpen ? "auto" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1rem",
            height: HEADER_H,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Mapa</span>
          <button
            onClick={() => setMapaOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "1.4rem",
              lineHeight: 1,
              padding: "0.2rem",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <MapView
            key="mobile"
            {...mapProps}
            flyRef={mapFlyRefMobile}
            invalidateRef={mapInvalidateRefMobile}
          />
        </div>
      </div>

      {calcOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "var(--bg)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 1rem",
              height: HEADER_H,
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Calculadora</span>
            <button
              onClick={() => setCalcOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: "1.4rem",
                lineHeight: 1,
                padding: "0.2rem",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, padding: "1rem" }}>
            <Calculadora />
          </div>
        </div>
      )}

      {doarOpen && (
        <div
          onClick={() => setDoarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              maxWidth: 480,
              width: "100%",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Apoiar o projeto 💚</span>
              <button
                onClick={() => setDoarOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "1.4rem",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.78rem", lineHeight: 1.6, color: "var(--text)", margin: 0 }}>
              Esta aplicação é completamente gratuita e não tem qualquer publicidade, é apenas
              carregada de boa vontade! Se queres ajudar-me a manter este projeto, tens algumas
              formas de como contribuir abaixo. Se queres contribuir de outra forma, por favor
              envia um email para{" "}
              <a href="mailto:zirgolina@sapo.pt" style={{ color: "var(--accent)" }}>
                zirgolina@sapo.pt
              </a>.
            </p>

            {CRIPTO.map(({ label, addr }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <p className="field-label" style={{ margin: 0 }}>{label}</p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    padding: "0.4rem 0.6rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontFamily: "monospace",
                      color: "var(--text)",
                      flex: 1,
                      wordBreak: "break-all",
                    }}
                  >
                    {addr}
                  </span>
                  <button
                    onClick={() => handleCopy(addr)}
                    title="Copiar"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: copiedAddr === addr ? "var(--accent)" : "var(--text-muted)",
                      flexShrink: 0,
                      padding: "0.1rem",
                      display: "flex",
                      alignItems: "center",
                      transition: "color 0.2s",
                    }}
                  >
                    {copiedAddr === addr ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}