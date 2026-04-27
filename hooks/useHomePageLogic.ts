"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALLOWED_MARCAS, type Posto } from "@/lib/dgeg";
import type { FilterValues } from "@/components/FilterPanel";
import {
  getUserLocation,
  haversineKm,
  isValidPortugalLikeCoord,
  makeBBoxFromRadius,
} from "@/lib/geolocation";
import { getPrecoCombustivel, temCombustivel } from "@/lib/postos";
import {
  fetchMunicipiosLocal,
  getMunicipiosIds,
  getPrimaryMunicipioId,
  getTipoAtivo,
  normText,
  sanitizeFilters,
  type CombustivelOrdenacao,
  type MapFlyRefType,
} from "@/hooks/homePage.utils";

export function useHomePageLogic() {
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeRadiusKm, setActiveRadiusKm] = useState<5 | 10 | 20 | null>(null);

  const [radiusBasePostos, setRadiusBasePostos] = useState<Posto[]>([]);
  const [radiusMarcaId, setRadiusMarcaId] = useState("");

  const [error, setError] = useState("");
  const [fuelId, setFuelId] = useState("3201");
  const [distritoAtivo, setDistritoAtivo] = useState("");
  const [municipioAtivo, setMunicipioAtivo] = useState("");
  const [ordenacao, setOrdenacao] = useState<CombustivelOrdenacao>("gasolina_asc");
  const [mapaOpen, setMapaOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [doarOpen, setDoarOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [calcAnchor, setCalcAnchor] = useState({ top: 0, left: 0 });

  const calcBtnRef = useRef<HTMLButtonElement | null>(null);
  const calcPopoverRef = useRef<HTMLDivElement | null>(null);

  const mapFlyRefDesktop = useRef<MapFlyRefType | null>(null);
  const mapFlyRefMobile = useRef<MapFlyRefType | null>(null);

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

  useEffect(() => {
    const updateViewport = () => setIsMobileView(window.innerWidth <= 900);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const updateCalcPosition = useCallback(() => {
    if (!calcBtnRef.current) return;

    const r = calcBtnRef.current.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);

    setCalcAnchor({
      top: r.bottom + 8,
      left: Math.min(
        Math.max(12, r.right - width),
        Math.max(12, window.innerWidth - width - 12)
      ),
    });
  }, []);

  useEffect(() => {
    if (!calcOpen || isMobileView) return;

    updateCalcPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedBtn = calcBtnRef.current?.contains(target);
      const clickedPopover = calcPopoverRef.current?.contains(target);

      if (!clickedBtn && !clickedPopover) {
        setCalcOpen(false);
      }
    };

    window.addEventListener("resize", updateCalcPosition);
    window.addEventListener("scroll", updateCalcPosition, true);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", updateCalcPosition);
      window.removeEventListener("scroll", updateCalcPosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calcOpen, isMobileView, updateCalcPosition]);

  const clearRadiusSearchState = useCallback(() => {
    setActiveRadiusKm(null);
    setUserLocation(null);
    setGeoError("");
    setRadiusMarcaId("");
    setRadiusBasePostos([]);
  }, []);

  const resetMapsToPortugal = useCallback(() => {
    mapFlyRefDesktop.current?.resetView?.();
    mapFlyRefMobile.current?.resetView?.();
    mapInvalidateRefDesktop.current?.();
    mapInvalidateRefMobile.current?.();
  }, []);

  const flyToDistrito = useCallback((id: string) => {
    mapFlyRefDesktop.current?.flyToDistrito(id);
    mapFlyRefMobile.current?.flyToDistrito(id);
  }, []);

  const flyToConcelho = useCallback((dId: string, cNome: string) => {
    mapFlyRefDesktop.current?.flyToConcelho(dId, cNome);
    mapFlyRefMobile.current?.flyToConcelho(dId, cNome);
  }, []);

  const fetchPostos = useCallback(async (f: FilterValues) => {
    const safeF = sanitizeFilters(f);

    const temDistrito = !!safeF.idDistrito;
    const temMunicipio = !!safeF.idMunicipio;
    const temMarca = !!safeF.marcaId;
    const temSearch = !!safeF.search;

    const podeSearch = temMarca || (temDistrito && temMunicipio) || temSearch;

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
      if (safeF.idMunicipio) params.set("idMunicipios", safeF.idMunicipio);
      if (safeF.marcaId) params.set("marcaId", safeF.marcaId);
      if (safeF.search) params.set("search", safeF.search);

      const res = await fetch(`/api/combustivel?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const msg =
          typeof json?.error === "string" && json.error.trim()
            ? json.error
            : "Erro ao obter postos.";

        setError(
          msg.toLowerCase().includes("nenhum posto encontrado")
            ? "Não existem postos para os filtros selecionados."
            : msg
        );
        setPostos([]);
        return;
      }

      const filtered = (json.data as Posto[]).filter((p) => {
        if (p.preco !== null && p.preco <= 0) return false;
        return true;
      });

      if (filtered.length === 0) {
        setError("Não existem postos para os filtros selecionados.");
        setPostos([]);
        return;
      }

      setPostos(filtered);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      setError(
        msg.toLowerCase().includes("nenhum posto encontrado")
          ? "Não existem postos para os filtros selecionados."
          : msg || "Erro inesperado ao carregar postos."
      );
      setPostos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchByRadius = useCallback(
    async (radiusKm: 5 | 10 | 20) => {
      setGeoLoading(true);
      setLoading(true);
      setGeoError("");
      setError("");
      setRadiusMarcaId("");
      setRadiusBasePostos([]);

      try {
        const loc = await getUserLocation();

        setUserLocation(loc);
        setActiveRadiusKm(radiusKm);

        filtersRef.current = {
          fuelId,
          idDistrito: "",
          idMunicipio: "",
          marcaId: "",
          search: "",
        };

        setDistritoAtivo("");
        setMunicipioAtivo("");
        setHasSearched(true);

        const params = new URLSearchParams();
        params.set("fuelId", fuelId);
        params.set("bbox", makeBBoxFromRadius(loc.lat, loc.lng, radiusKm));

        const res = await fetch(`/api/combustivel?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          const msg =
            typeof json?.error === "string" && json.error.trim()
              ? json.error
              : "Erro ao obter postos.";
          throw new Error(msg);
        }

        const filtered = (json.data as Posto[]).filter((p) => {
          if (p.preco !== null && p.preco <= 0) return false;
          if (!isValidPortugalLikeCoord(p.lat, p.lng)) return false;

          return haversineKm(loc.lat, loc.lng, p.lat as number, p.lng as number) <= radiusKm;
        });

        if (filtered.length === 0) {
          setRadiusBasePostos([]);
          setRadiusMarcaId("");
          setPostos([]);
          setError(`Não existem postos num raio de ${radiusKm} km.`);
          return;
        }

        ignoreMapClicksRef.current = true;
        setTimeout(() => {
          ignoreMapClicksRef.current = false;
        }, 1500);

        setRadiusBasePostos(filtered);
        setRadiusMarcaId("");
        setPostos(filtered);
        setError("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao obter localização.";
        setGeoError(msg);
        setError(msg);
        setPostos([]);
        setRadiusBasePostos([]);
        setRadiusMarcaId("");
        setHasSearched(false);
        setUserLocation(null);
        setActiveRadiusKm(null);
      } finally {
        setGeoLoading(false);
        setLoading(false);
      }
    },
    [fuelId]
  );

  const handleReset = useCallback(() => {
    clearRadiusSearchState();

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
    resetMapsToPortugal();
  }, [clearRadiusSearchState, resetMapsToPortugal]);

  const handleDistritoClick = useCallback(
    (_nome: string, id?: string) => {
      if (ignoreMapClicksRef.current) return;

      clearRadiusSearchState();

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
    },
    [clearRadiusSearchState, fetchPostos, fuelId]
  );

  const handleConcelhoClick = useCallback(
    async (distritoId: string, concelhoNome: string) => {
      if (ignoreMapClicksRef.current) return;

      clearRadiusSearchState();

      let concelhoId = "";

      try {
        const lista = await fetchMunicipiosLocal(distritoId);
        const target = normText(concelhoNome);

        const found =
          lista.find((m) => normText(m.Descritivo) === target) ||
          lista.find((m) => normText(m.Descritivo).startsWith(target)) ||
          lista.find((m) => target.startsWith(normText(m.Descritivo))) ||
          lista.find((m) => normText(m.Descritivo).includes(target)) ||
          lista.find((m) => target.includes(normText(m.Descritivo)));

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
    },
    [clearRadiusSearchState, fetchPostos, fuelId]
  );

  const handleFilterChange = useCallback(
    (f: FilterValues) => {
      clearRadiusSearchState();

      const next = sanitizeFilters(f);
      const distritoMudou = next.idDistrito !== filtersRef.current.idDistrito;
      const concelhoMudou = next.idMunicipio !== filtersRef.current.idMunicipio;
      const primaryMunicipio = getPrimaryMunicipioId(next.idMunicipio);

      filtersRef.current = next;
      setFuelId(next.fuelId);
      setDistritoAtivo(next.idDistrito);
      setMunicipioAtivo(primaryMunicipio);

      if (!next.idDistrito && !next.idMunicipio && !next.marcaId && !next.search) {
        setHasSearched(false);
        setPostos([]);
        setError("");
        resetMapsToPortugal();
      }

      if (concelhoMudou && primaryMunicipio && next.idDistrito) {
        ignoreMapClicksRef.current = true;
        setTimeout(() => {
          ignoreMapClicksRef.current = false;
        }, 2000);

        fetchMunicipiosLocal(next.idDistrito)
          .then((lista) => {
            const m = lista.find((x) => String(x.Id) === primaryMunicipio);
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
    },
    [clearRadiusSearchState, flyToConcelho, flyToDistrito, resetMapsToPortugal]
  );

  const handleSearch = useCallback(
    (f: FilterValues) => {
      clearRadiusSearchState();

      const next = sanitizeFilters(f);
      const primaryMunicipio = getPrimaryMunicipioId(next.idMunicipio);

      filtersRef.current = next;
      setFuelId(next.fuelId);
      setDistritoAtivo(next.idDistrito);
      setMunicipioAtivo(primaryMunicipio);
      setHasSearched(true);

      ignoreMapClicksRef.current = true;
      setTimeout(() => {
        ignoreMapClicksRef.current = false;
      }, 1500);

      fetchPostos(next);
    },
    [clearRadiusSearchState, fetchPostos]
  );

  const handleCopy = useCallback((addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  }, []);

  const handleRadiusMarcaChange = useCallback((marcaId: string) => {
    setRadiusMarcaId(marcaId);
  }, []);

  const hasMarca = filtersRef.current.marcaId !== "";
  const hasSearch = filtersRef.current.search !== "";
  const hasMunicipioSelecionado = filtersRef.current.idMunicipio !== "";
  const hasRadiusSearch = activeRadiusKm !== null && userLocation !== null;

  const showRadiusMarcaFilter = hasRadiusSearch && radiusBasePostos.length > 0;

  const availableRadiusMarcas = useMemo(() => {
    if (!showRadiusMarcaFilter) return [];

    return ALLOWED_MARCAS.filter((marca) =>
      radiusBasePostos.some((p) => normText(p.marca) === normText(marca.nome))
    );
  }, [showRadiusMarcaFilter, radiusBasePostos]);

  const selectedRadiusMarca = useMemo(
    () => ALLOWED_MARCAS.find((m) => String(m.id) === radiusMarcaId) ?? null,
    [radiusMarcaId]
  );

  const postosBaseFiltrados = useMemo(() => {
    if (!hasRadiusSearch) return postos;

    const base = radiusBasePostos.length > 0 ? radiusBasePostos : postos;

    if (!selectedRadiusMarca) return base;

    return base.filter(
      (p) => normText(p.marca) === normText(selectedRadiusMarca.nome)
    );
  }, [hasRadiusSearch, radiusBasePostos, postos, selectedRadiusMarca]);

  const tipoAtivo = getTipoAtivo(ordenacao);

  const postosVisiveis =
    tipoAtivo === "gpl"
      ? postosBaseFiltrados.filter((p) => temCombustivel(p, "gpl"))
      : postosBaseFiltrados;

  const precosVisiveis = postosVisiveis
    .map((p) => {
      if (!tipoAtivo) return p.preco;
      const pr = getPrecoCombustivel(p, tipoAtivo);
      return pr == null ? null : pr;
    })
    .filter((x): x is number => x !== null);

  const minP = precosVisiveis.length ? Math.min(...precosVisiveis) : 0;

  const cheapestPrice: number | null = (() => {
    if (!tipoAtivo) {
      const p = postosVisiveis.find((p) => p.preco === minP);
      return p?.preco ?? null;
    }

    const p = postosVisiveis.find((p) => getPrecoCombustivel(p, tipoAtivo) === minP);
    if (!p) return null;

    return minP;
  })();

  const sortedPostos = [...postosVisiveis].sort((a, b) => {
    if (!tipoAtivo) return 0;

    const pa = getPrecoCombustivel(a, tipoAtivo);
    const pb = getPrecoCombustivel(b, tipoAtivo);

    return (pa ?? Infinity) - (pb ?? Infinity);
  });

  const hasQueryContext =
    distritoAtivo !== "" ||
    hasMunicipioSelecionado ||
    hasMarca ||
    hasSearch ||
    hasRadiusSearch;

  const mostrarPins =
    postosVisiveis.length > 0 &&
    (hasMunicipioSelecionado || hasMarca || hasRadiusSearch);

  const mostrarPinsDistrito =
    distritoAtivo !== "" &&
    !hasMarca &&
    !hasMunicipioSelecionado &&
    !hasRadiusSearch;

  useEffect(() => {
    if (!mapaOpen) return;

    const distrito = filtersRef.current.idDistrito;
    const municipiosIds = getMunicipiosIds(filtersRef.current.idMunicipio);
    let attempts = 0;

    const tryFly = () => {
      attempts++;
      mapInvalidateRefMobile.current?.();

      if (!mapFlyRefMobile.current) {
        if (attempts < 15) setTimeout(tryFly, 200);
        return;
      }

      if (municipiosIds.length > 1) {
        if (!mostrarPins && distrito) {
          mapFlyRefMobile.current.flyToDistrito(distrito);
        }
        return;
      }

      if (municipiosIds.length === 1 && distrito) {
        fetchMunicipiosLocal(distrito)
          .then((lista) => {
            const m = lista.find((x) => String(x.Id) === municipiosIds[0]);
            if (m) {
              mapFlyRefMobile.current?.flyToConcelho(distrito, m.Descritivo);
            }
          })
          .catch(() => {});
        return;
      }

      if (distrito) {
        mapFlyRefMobile.current.flyToDistrito(distrito);
      }
    };

    const t = setTimeout(tryFly, 150);
    return () => clearTimeout(t);
  }, [mapaOpen, mostrarPins]);

  const busy = loading || geoLoading;

  const mapProps = {
    postos: sortedPostos,
    onDistritoClick: handleDistritoClick,
    onConcelhoClick: handleConcelhoClick,
    mostrarPins,
    mostrarPinsDistrito,
  };

  return {
    postos,
    loading,
    geoLoading,
    geoError,
    userLocation,
    activeRadiusKm,
    radiusMarcaId,
    availableRadiusMarcas,
    showRadiusMarcaFilter,
    error,
    fuelId,
    distritoAtivo,
    municipioAtivo,
    ordenacao,
    mapaOpen,
    calcOpen,
    doarOpen,
    copiedAddr,
    hasSearched,
    isMobileView,
    calcAnchor,
    calcBtnRef,
    calcPopoverRef,
    mapFlyRefDesktop,
    mapFlyRefMobile,
    mapInvalidateRefDesktop,
    mapInvalidateRefMobile,
    setOrdenacao,
    setMapaOpen,
    setCalcOpen,
    setDoarOpen,
    handleSearchByRadius,
    handleRadiusMarcaChange,
    handleReset,
    handleFilterChange,
    handleSearch,
    handleCopy,
    updateCalcPosition,
    postosVisiveis,
    sortedPostos,
    cheapestPrice,
    tipoAtivo,
    hasMarca,
    hasSearch,
    hasMunicipioSelecionado,
    hasRadiusSearch,
    hasQueryContext,
    mostrarPins,
    mostrarPinsDistrito,
    busy,
    mapProps,
  };
}