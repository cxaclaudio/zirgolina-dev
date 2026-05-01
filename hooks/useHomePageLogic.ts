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

function dedupePostos(list: Posto[]): Posto[] {
  const seen = new Set<string>();

  return list.filter((p) => {
    const key = String(p.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type UrlSnapshot = {
  fuelId: string;
  idDistrito: string;
  idMunicipio: string;
  marcaIds: string[];
  search: string;
  ordenacao: CombustivelOrdenacao;
  radiusKm: 5 | 10 | 20 | null;
  lat: number | null;
  lng: number | null;
  radiusMarcaId: string;
};

const VALID_SORTS: CombustivelOrdenacao[] = [
  "gasolina_asc",
  "gasoleo_asc",
  "gpl_asc",
];

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
  const [urlReady, setUrlReady] = useState(false);

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
    marcaIds: [],
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

  const buildUrlSnapshot = useCallback(
    (overrides: Partial<UrlSnapshot> = {}): UrlSnapshot => ({
      fuelId,
      idDistrito: filtersRef.current.idDistrito,
      idMunicipio: filtersRef.current.idMunicipio,
      marcaIds: filtersRef.current.marcaIds,
      search: filtersRef.current.search,
      ordenacao,
      radiusKm: activeRadiusKm,
      lat: userLocation?.lat ?? null,
      lng: userLocation?.lng ?? null,
      radiusMarcaId,
      ...overrides,
    }),
    [fuelId, ordenacao, activeRadiusKm, userLocation, radiusMarcaId]
  );

const syncUrl = useCallback((snap: UrlSnapshot) => {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();

  if (snap.fuelId && snap.fuelId !== "3201") {
    params.set("fuel", snap.fuelId);
  }

  if (snap.idDistrito) {
    params.set("d", snap.idDistrito);
  }

  if (snap.idMunicipio) {
    params.set("m", snap.idMunicipio);
  }

  if (snap.marcaIds.length > 0) {
    params.set("brands", snap.marcaIds.join(","));
  }

  if (snap.search) {
    params.set("q", snap.search);
  }

  if (snap.ordenacao !== "gasolina_asc") {
    params.set("sort", snap.ordenacao);
  }

  if (snap.radiusKm !== null && snap.lat !== null && snap.lng !== null) {
    params.set("r", String(snap.radiusKm));
    params.set("lat", String(snap.lat));
    params.set("lng", String(snap.lng));

    if (snap.radiusMarcaId) {
      params.set("rb", snap.radiusMarcaId);
    }
  }

  const nextQs = params.toString();
  const nextUrl = nextQs
    ? `${window.location.pathname}?${nextQs}`
    : window.location.pathname;

  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}, []);

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
    const temMarca = safeF.marcaIds.length > 0;
    const temSearch = !!safeF.search;

	const podeSearch = temMarca || temDistrito || temSearch;

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

      let filtered = (json.data as Posto[]).filter((p) => {
        if (p.preco !== null && p.preco <= 0) return false;
        return true;
      });

      if (safeF.marcaIds.length > 0) {
        const marcasSelecionadas = new Set(
          ALLOWED_MARCAS
            .filter((m) => safeF.marcaIds.includes(String(m.id)))
            .map((m) => normText(m.nome))
        );

        filtered = filtered.filter((p) => marcasSelecionadas.has(normText(p.marca)));
      }

      filtered = dedupePostos(filtered);

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

  const fetchPostosBySharedRadius = useCallback(
    async ({
      fuelIdArg,
      lat,
      lng,
      radiusKm,
      preserveMarcaId = false,
    }: {
      fuelIdArg: string;
      lat: number;
      lng: number;
      radiusKm: 5 | 10 | 20;
      preserveMarcaId?: boolean;
    }) => {
      setGeoLoading(true);
      setLoading(true);
      setGeoError("");
      setError("");
      setRadiusBasePostos([]);
      if (!preserveMarcaId) {
        setRadiusMarcaId("");
      }

      filtersRef.current = {
        fuelId: fuelIdArg,
        idDistrito: "",
        idMunicipio: "",
        marcaIds: [],
        search: "",
      };

      setFuelId(fuelIdArg);
      setUserLocation({ lat, lng });
      setActiveRadiusKm(radiusKm);
      setDistritoAtivo("");
      setMunicipioAtivo("");
      setHasSearched(true);

      try {
        const params = new URLSearchParams();
        params.set("fuelId", fuelIdArg);
        params.set("bbox", makeBBoxFromRadius(lat, lng, radiusKm));

        const res = await fetch(`/api/combustivel?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          const msg =
            typeof json?.error === "string" && json.error.trim()
              ? json.error
              : "Erro ao obter postos.";
          throw new Error(msg);
        }

        let filtered = (json.data as Posto[]).filter((p) => {
          if (p.preco !== null && p.preco <= 0) return false;
          if (!isValidPortugalLikeCoord(p.lat, p.lng)) return false;

          return haversineKm(lat, lng, p.lat as number, p.lng as number) <= radiusKm;
        });

        filtered = dedupePostos(filtered);

        if (filtered.length === 0) {
          setRadiusBasePostos([]);
          setPostos([]);
          setError(`Não existem postos num raio de ${radiusKm} km.`);
          return;
        }

        ignoreMapClicksRef.current = true;
        setTimeout(() => {
          ignoreMapClicksRef.current = false;
        }, 1500);

        setRadiusBasePostos(filtered);
        setPostos(filtered);
        setError("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao obter localização.";
        setGeoError(msg);
        setError(msg);
        setPostos([]);
        setRadiusBasePostos([]);
        if (!preserveMarcaId) {
          setRadiusMarcaId("");
        }
        setHasSearched(false);
        setUserLocation(null);
        setActiveRadiusKm(null);
      } finally {
        setGeoLoading(false);
        setLoading(false);
      }
    },
    []
  );

useEffect(() => {
  if (urlReady || typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  const fuelFromUrl = params.get("fuel") || "3201";
  const distritoFromUrl = params.get("d") || "";
  const municipiosFromUrl = params.get("m") || "";
  const marcaIdsFromUrl = (params.get("brands") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const searchFromUrl = params.get("q") || "";
  const sortCandidate = params.get("sort");
  const sortFromUrl: CombustivelOrdenacao =
    sortCandidate && VALID_SORTS.includes(sortCandidate as CombustivelOrdenacao)
      ? (sortCandidate as CombustivelOrdenacao)
      : "gasolina_asc";

  const radiusParam = params.get("r");
  const radiusKm =
    radiusParam === "5" || radiusParam === "10" || radiusParam === "20"
      ? (Number(radiusParam) as 5 | 10 | 20)
      : null;

  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const lat = latParam ? Number(latParam) : NaN;
  const lng = lngParam ? Number(lngParam) : NaN;

  const radiusMarcaFromUrl = params.get("rb") || "";

  const next: FilterValues = sanitizeFilters({
    fuelId: fuelFromUrl,
    idDistrito: distritoFromUrl,
    idMunicipio: municipiosFromUrl,
    marcaIds: marcaIdsFromUrl,
    search: searchFromUrl,
  });

  filtersRef.current = next;
  setFuelId(fuelFromUrl);
  setDistritoAtivo(distritoFromUrl);
  setMunicipioAtivo(getPrimaryMunicipioId(municipiosFromUrl));
  setOrdenacao(sortFromUrl);
  setRadiusMarcaId(radiusMarcaFromUrl);
  setUrlReady(true);

  if (radiusKm && Number.isFinite(lat) && Number.isFinite(lng)) {
    void fetchPostosBySharedRadius({
      fuelIdArg: fuelFromUrl,
      lat,
      lng,
      radiusKm,
      preserveMarcaId: true,
    });
    return;
  }

  if (distritoFromUrl || municipiosFromUrl || marcaIdsFromUrl.length > 0 || searchFromUrl) {
    setHasSearched(true);
    void fetchPostos(next);
  }
}, [urlReady, fetchPostos, fetchPostosBySharedRadius]);

  useEffect(() => {
    if (!urlReady) return;
    syncUrl(buildUrlSnapshot({ ordenacao }));
  }, [ordenacao, urlReady, buildUrlSnapshot, syncUrl]);

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

        syncUrl(
          buildUrlSnapshot({
            fuelId,
            idDistrito: "",
            idMunicipio: "",
            marcaIds: [],
            search: "",
            radiusKm,
            lat: loc.lat,
            lng: loc.lng,
            radiusMarcaId: "",
          })
        );

        await fetchPostosBySharedRadius({
          fuelIdArg: fuelId,
          lat: loc.lat,
          lng: loc.lng,
          radiusKm,
        });
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

        syncUrl(
          buildUrlSnapshot({
            radiusKm: null,
            lat: null,
            lng: null,
            radiusMarcaId: "",
          })
        );

        setGeoLoading(false);
        setLoading(false);
      }
    },
    [fuelId, fetchPostosBySharedRadius, syncUrl, buildUrlSnapshot]
  );

  const handleReset = useCallback(() => {
    clearRadiusSearchState();

    filtersRef.current = {
      fuelId: "3201",
      idDistrito: "",
      idMunicipio: "",
      marcaIds: [],
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

    syncUrl({
      fuelId: "3201",
      idDistrito: "",
      idMunicipio: "",
      marcaIds: [],
      search: "",
      ordenacao: "gasolina_asc",
      radiusKm: null,
      lat: null,
      lng: null,
      radiusMarcaId: "",
    });
  }, [clearRadiusSearchState, resetMapsToPortugal, syncUrl]);

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

      syncUrl(
        buildUrlSnapshot({
          fuelId,
          idDistrito: id ?? "",
          idMunicipio: "",
          marcaIds: newF.marcaIds,
          search: newF.search,
          radiusKm: null,
          lat: null,
          lng: null,
          radiusMarcaId: "",
        })
      );

      if (newF.marcaIds.length > 0) {
        setHasSearched(true);
        fetchPostos(newF);
      } else {
        setHasSearched(false);
        setPostos([]);
      }
    },
    [clearRadiusSearchState, fetchPostos, fuelId, syncUrl, buildUrlSnapshot]
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

      syncUrl(
        buildUrlSnapshot({
          fuelId,
          idDistrito: distritoId,
          idMunicipio: concelhoId,
          marcaIds: novoFiltro.marcaIds,
          search: novoFiltro.search,
          radiusKm: null,
          lat: null,
          lng: null,
          radiusMarcaId: "",
        })
      );

      fetchPostos(novoFiltro);
    },
    [clearRadiusSearchState, fetchPostos, fuelId, syncUrl, buildUrlSnapshot]
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

      syncUrl(
        buildUrlSnapshot({
          fuelId: next.fuelId,
          idDistrito: next.idDistrito,
          idMunicipio: next.idMunicipio,
          marcaIds: next.marcaIds,
          search: next.search,
          radiusKm: null,
          lat: null,
          lng: null,
          radiusMarcaId: "",
        })
      );

      if (!next.idDistrito && !next.idMunicipio && next.marcaIds.length === 0 && !next.search) {
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
    [clearRadiusSearchState, flyToConcelho, flyToDistrito, resetMapsToPortugal, syncUrl, buildUrlSnapshot]
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

      syncUrl(
        buildUrlSnapshot({
          fuelId: next.fuelId,
          idDistrito: next.idDistrito,
          idMunicipio: next.idMunicipio,
          marcaIds: next.marcaIds,
          search: next.search,
          radiusKm: null,
          lat: null,
          lng: null,
          radiusMarcaId: "",
        })
      );

      ignoreMapClicksRef.current = true;
      setTimeout(() => {
        ignoreMapClicksRef.current = false;
      }, 1500);

      fetchPostos(next);
    },
    [clearRadiusSearchState, fetchPostos, syncUrl, buildUrlSnapshot]
  );

  const handleCopy = useCallback((addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  }, []);

  const handleRadiusMarcaChange = useCallback(
    (marcaId: string) => {
      setRadiusMarcaId(marcaId);

      syncUrl(
        buildUrlSnapshot({
          radiusMarcaId: marcaId,
        })
      );
    },
    [syncUrl, buildUrlSnapshot]
  );

  const hasMarca = filtersRef.current.marcaIds.length > 0;
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

    return base.filter((p) => normText(p.marca) === normText(selectedRadiusMarca.nome));
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

  const sortedPostos = useMemo(() => {
    const unique = dedupePostos(postosVisiveis);

    return [...unique].sort((a, b) => {
      if (!tipoAtivo) return 0;

      const pa = getPrecoCombustivel(a, tipoAtivo);
      const pb = getPrecoCombustivel(b, tipoAtivo);

      return (pa ?? Infinity) - (pb ?? Infinity);
    });
  }, [postosVisiveis, tipoAtivo]);

  const hasQueryContext =
    distritoAtivo !== "" ||
    hasMunicipioSelecionado ||
    hasMarca ||
    hasSearch ||
    hasRadiusSearch;

	const mostrarPins =
	sortedPostos.length > 0 &&
	(hasMunicipioSelecionado || hasMarca || hasRadiusSearch || (distritoAtivo !== "" && hasSearched));

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
    userLocation,
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