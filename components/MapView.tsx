"use client";

import { useEffect, useRef } from "react";
import type { Posto } from "@/lib/dgeg";
import { ALLOWED_MARCAS } from "@/lib/dgeg";
import { getMarcaCor } from "@/lib/postos";

type TipoAtivo = "gasolina" | "gasoleo" | "gpl" | null;

interface Props {
  postos: Posto[];
  userLocation?: { lat: number; lng: number } | null;
  onBoundsChange?: (bbox: string) => void;
  onDistritoClick?: (nome: string, id?: string) => void;
  onConcelhoClick?: (distritoId: string, concelhoNome: string) => void;
  mostrarPins: boolean;
  mostrarPinsDistrito: boolean;
  invalidateRef?: React.MutableRefObject<(() => void) | null>;
  flyRef?: React.MutableRefObject<{
    flyToDistrito: (id: string) => void;
    flyToConcelho: (distritoId: string, concelhoNome: string) => void;
  } | null>;
  descontoCentimos?: number | null;
  descontoMarcaId?: string;
  tipoAtivo?: TipoAtivo;
}

const DISTRITOS_URL = "/distritos.geojson";
const MUNICIPIOS_URL = "/municipios.geojson";
const PT_BOUNDS = { minLat: 29.0, maxLat: 42.2, minLng: -31.3, maxLng: -6.1 };
const ZOOM_BALAO = 11;

const NOME_PARA_ID: Record<string, string> = {
  "aveiro": "1",
  "beja": "2",
  "braga": "3",
  "bragança": "4",
  "braganca": "4",
  "castelo branco": "5",
  "coimbra": "6",
  "évora": "7",
  "evora": "7",
  "faro": "8",
  "guarda": "9",
  "leiria": "10",
  "lisboa": "11",
  "portalegre": "12",
  "porto": "13",
  "santarém": "14",
  "santarem": "14",
  "setúbal": "15",
  "setubal": "15",
  "viana do castelo": "16",
  "vila real": "17",
  "viseu": "18",
  "açores": "20",
  "acores": "20",
  "madeira": "21",
};

function disCodeToDgeg(disCode: string) {
  return String(parseInt(disCode, 10));
}

function normalizeName(s: string): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .normalize("NFC");
}

function getDistritoId(nome: string): string | undefined {
  const norm = normalizeName(nome);
  for (const [k, v] of Object.entries(NOME_PARA_ID)) {
    const kn = normalizeName(k);
    if (norm === kn) return v;
  }
  for (const [k, v] of Object.entries(NOME_PARA_ID)) {
    const kn = normalizeName(k);
    if (norm.startsWith(kn + " ") || norm.startsWith(kn + ",")) return v;
  }
}

async function fetchGeoJSON(url: string) {
  try {
    const r = await fetch(url, { cache: "force-cache" });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.features?.length ? j : null;
  } catch {
    return null;
  }
}

function parsePreco(texto: string): number | null {
  const n = parseFloat(texto.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

function marcaNomeFromId(marcaId: string): string {
  return ALLOWED_MARCAS.find((m) => m.id === marcaId)?.nome ?? "";
}

function corPorTipoCombustivel(tipo: string): string {
  const t = normalizeName(tipo);
  if (t.startsWith("gpl") || t.includes("gas de petroleo") || t.includes("gas petroleo")) return "#2563eb";
  if (t.startsWith("gasoleo") || t.includes(" gasoleo") || t === "gasoleo") return "#1a1a1a";
  if (t.startsWith("gasolina") || t.includes(" gasolina")) return "#16a34a";
  if (t.includes("gasoleo")) return "#1a1a1a";
  if (t.includes("gasolina")) return "#16a34a";
  if (t.includes("gpl")) return "#2563eb";
  return "#555";
}

function getPrecoPorTipo(
  posto: Posto,
  tipoAtivo: TipoAtivo,
  centimos: number | null,
  descontoMarcaNome: string
): { texto: string; cor: string; precoDesc: string | null } | null {
  if (!tipoAtivo || !posto.combustiveis?.length) return null;

  const comb = (posto.combustiveis as any[]).find((c) => {
    const t = normalizeName(c.tipo ?? "");
    if (tipoAtivo === "gasolina") return t.startsWith("gasolina") || t.includes(" gasolina");
    if (tipoAtivo === "gasoleo") return t.startsWith("gasoleo") || t === "gasoleo" || t.includes(" gasoleo");
    if (tipoAtivo === "gpl") return t.startsWith("gpl") || t.includes("gas de petroleo") || t.includes("gas petroleo");
    return false;
  });

  if (!comb) return null;

  const cor = corPorTipoCombustivel(comb.tipo ?? "");
  const precoOriginal = parsePreco(comb.texto);
  const temDesc =
    !!centimos && centimos > 0 && !!descontoMarcaNome &&
    normalizeName(posto.marca ?? "") === normalizeName(descontoMarcaNome);
  const precoDesc =
    temDesc && precoOriginal !== null
      ? Math.max(0, precoOriginal - centimos! / 100).toFixed(3)
      : null;

  return { texto: comb.texto, cor, precoDesc };
}

export default function MapView({
  postos,
  userLocation,
  onBoundsChange,
  onDistritoClick,
  onConcelhoClick,
  mostrarPins,
  mostrarPinsDistrito,
  flyRef,
  invalidateRef,
  descontoCentimos = null,
  descontoMarcaId = "",
  tipoAtivo = null,
}: Props) {
  const mapRef = useRef<any>(null);
  const pinsLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const distritosRef = useRef<any>(null);
  const municipiosRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cbDistrito = useRef(onDistritoClick);
  const cbConcelho = useRef(onConcelhoClick);
  const mostrarPinsDistritoRef = useRef(mostrarPinsDistrito);
  const descontoCentimosRef = useRef(descontoCentimos);
  const descontoMarcaIdRef = useRef(descontoMarcaId);
  const tipoAtivoRef = useRef(tipoAtivo);

  // Balões ativos por defeito
  const showBaloesRef = useRef(true);
  const redrawPinsRef = useRef<(() => void) | null>(null);

  useEffect(() => { cbDistrito.current = onDistritoClick; }, [onDistritoClick]);
  useEffect(() => { cbConcelho.current = onConcelhoClick; }, [onConcelhoClick]);
  useEffect(() => { mostrarPinsDistritoRef.current = mostrarPinsDistrito; }, [mostrarPinsDistrito]);
  useEffect(() => { descontoCentimosRef.current = descontoCentimos; }, [descontoCentimos]);
  useEffect(() => { descontoMarcaIdRef.current = descontoMarcaId; }, [descontoMarcaId]);
  useEffect(() => { tipoAtivoRef.current = tipoAtivo; }, [tipoAtivo]);

  // ─── Inicialização do mapa ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!containerRef.current) return;
      if ((containerRef.current as any)._leaflet_id) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        boxZoom: false,
        tapTolerance: 15,
      }).setView([39.6, -8.0], 7);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "© OSM © CARTO",
      }).addTo(map);

      mapRef.current = map;
      pinsLayerRef.current = L.layerGroup();
      mapReadyRef.current = true;

      if (invalidateRef) {
        invalidateRef.current = () => setTimeout(() => map.invalidateSize(), 150);
      }

      // ── Cria um único leaflet-bar no topleft com € + + - ──
      // A técnica: render o botão € como primeiro <a> do mesmo container do zoom
      const ComboControl = L.Control.extend({
        onAdd() {
          // Container igual ao leaflet-control-zoom nativo
          const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-zoom");

          // Botão € — igual em tudo ao + e ao -
          const euroBtn = L.DomUtil.create("a", "leaflet-control-zoom-in", container) as HTMLAnchorElement;
          euroBtn.innerHTML = "€";
          euroBtn.title = "Mostrar/ocultar preços no mapa";
          euroBtn.setAttribute("role", "button");
          euroBtn.href = "#";

          const updateEuro = () => {
            const on = showBaloesRef.current;
            euroBtn.style.color = on ? "#15803d" : "";
            euroBtn.style.background = on ? "#dcfce7" : "";
            euroBtn.style.fontWeight = "700";
          };
          updateEuro();

          L.DomEvent.on(euroBtn, "click", (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            showBaloesRef.current = !showBaloesRef.current;
            updateEuro();
            redrawPinsRef.current?.();
          });

          // Divisor entre € e +
          const sep = L.DomUtil.create("span", "", container);
          sep.style.cssText = "display:block;border-top:1px solid #ccc;margin:0;";

          // Botão +
          const zoomIn = L.DomUtil.create("a", "leaflet-control-zoom-in", container) as HTMLAnchorElement;
          zoomIn.innerHTML = "+";
          zoomIn.title = "Zoom in";
          zoomIn.href = "#";
          zoomIn.setAttribute("role", "button");
          L.DomEvent.on(zoomIn, "click", (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            map.zoomIn();
          });

          // Botão -
          const zoomOut = L.DomUtil.create("a", "leaflet-control-zoom-out", container) as HTMLAnchorElement;
          zoomOut.innerHTML = "−";
          zoomOut.title = "Zoom out";
          zoomOut.href = "#";
          zoomOut.setAttribute("role", "button");
          L.DomEvent.on(zoomOut, "click", (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            map.zoomOut();
          });

          return container;
        },
      });

      new ComboControl({ position: "topleft" }).addTo(map);

      // Re-desenha pins ao mudar zoom
      map.on("zoomend", () => redrawPinsRef.current?.());

      const sD = { color: "#22c55e", weight: 1.6, fillColor: "#22c55e", fillOpacity: 0.06 };
      const sDH = { fillOpacity: 0.2, weight: 2.2 };
      const sM = { color: "#22c55e", weight: 0.8, fillColor: "#22c55e", fillOpacity: 0.03 };
      const sMH = { fillOpacity: 0.14, weight: 1.4 };

      const distritoLayerMap: Record<string, any> = {};
      const concelhoLayerMap: Record<string, any> = {};

      fetchGeoJSON(DISTRITOS_URL).then((geojson) => {
        if (!geojson) return;
        distritosRef.current = L.geoJSON(geojson, {
          style: () => ({ ...sD }),
          onEachFeature(feature: any, layer: any) {
            const nome: string = feature.properties?.name ?? "";
            const id = getDistritoId(nome);
            if (id) distritoLayerMap[id] = layer;
            if (nome) layer.bindTooltip(`<b>${nome}</b>`, { sticky: true, className: "map-tip", direction: "top" });
            layer.on("mouseover", () => layer.setStyle(sDH));
            layer.on("mouseout", () => distritosRef.current?.resetStyle(layer));
            layer.on("click", (e: any) => {
              L.DomEvent.stopPropagation(e);
              if (e.originalEvent?.target) (e.originalEvent.target as HTMLElement).style.outline = "none";
              map.fitBounds(layer.getBounds(), { padding: [30, 30], animate: true });
              setTimeout(() => { if (map.getZoom() < 9) map.setZoom(9, { animate: true }); }, 350);
              cbDistrito.current?.(nome, id);
            });
          },
        }).addTo(map);

        if (flyRef) {
          flyRef.current = {
            flyToDistrito: (id: string) => {
              const layer = distritoLayerMap[id];
              if (!layer) return;
              map.fitBounds(layer.getBounds(), { padding: [30, 30], animate: true });
              if (id !== "20" && id !== "21") setTimeout(() => { if (map.getZoom() < 9) map.setZoom(9, { animate: true }); }, 350);
            },
            flyToConcelho: (distritoId: string, concelhoNome: string) => {
              const layer = concelhoLayerMap[`${distritoId}_${normalizeName(concelhoNome)}`];
              if (layer) map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 14, animate: true });
            },
            resetView: () => map.setView([39.6, -8.0], 7, { animate: true }),
          } as any;
        }
      });

      fetchGeoJSON(MUNICIPIOS_URL).then((geojson) => {
        if (!geojson) return;
        municipiosRef.current = L.geoJSON(geojson, {
          style: () => ({ ...sM }),
          onEachFeature(feature: any, layer: any) {
            const p = feature.properties ?? {};
            const conNome = (p.con_name ?? p.name ?? "") as string;
            const disNome = (p.dis_name ?? "") as string;
            const disCode = (p.dis_code ?? "") as string;
            const distritoId = disCode ? disCodeToDgeg(disCode) : getDistritoId(disNome) ?? "";
            if (distritoId && conNome) concelhoLayerMap[`${distritoId}_${normalizeName(conNome)}`] = layer;
            if (conNome) layer.bindTooltip(`<b>${conNome}</b>${disNome ? ` · ${disNome}` : ""}`, { sticky: true, className: "map-tip", direction: "top" });
            layer.on("mouseover", () => layer.setStyle(sMH));
            layer.on("mouseout", () => municipiosRef.current?.resetStyle(layer));
            layer.on("click", (e: any) => {
              L.DomEvent.stopPropagation(e);
              if (e.originalEvent?.target) (e.originalEvent.target as HTMLElement).style.outline = "none";
              map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 14, animate: true });
              if (distritoId && conNome) cbConcelho.current?.(distritoId, conNome);
            });
          },
        });

        if (flyRef) {
          const prev = flyRef.current as any;
          flyRef.current = {
            flyToDistrito: prev?.flyToDistrito ?? (() => {}),
            flyToConcelho: (distritoId: string, concelhoNome: string) => {
              const layer = concelhoLayerMap[`${distritoId}_${normalizeName(concelhoNome)}`];
              if (layer) map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 14, animate: true });
            },
            resetView: prev?.resetView ?? (() => map.setView([39.6, -8.0], 7, { animate: true })),
          } as any;
        }

        function syncLayers() {
          const z = map.getZoom();
          if (z >= 9) {
            if (distritosRef.current && map.hasLayer(distritosRef.current)) map.removeLayer(distritosRef.current);
            if (municipiosRef.current && !map.hasLayer(municipiosRef.current)) map.addLayer(municipiosRef.current);
          } else {
            if (municipiosRef.current && map.hasLayer(municipiosRef.current)) map.removeLayer(municipiosRef.current);
            if (distritosRef.current && !map.hasLayer(distritosRef.current)) map.addLayer(distritosRef.current);
          }
        }
        map.on("zoomend", syncLayers);
        syncLayers();
      });

      map.on("moveend", () => {
        if (!onBoundsChange) return;
        const b = map.getBounds();
        onBoundsChange(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
      });
    })();
  }, []);

  // ─── Renderização dos pins ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    const drawPins = async () => {
      if (!mapReadyRef.current || !pinsLayerRef.current) return;

      const L = (await import("leaflet")).default;
      const map = mapRef.current;

      const centimos = descontoCentimosRef.current;
      const marcaId = descontoMarcaIdRef.current;
      const descontoMarcaNome = marcaId ? marcaNomeFromId(marcaId) : "";
      const tipoAtivoAtual = tipoAtivoRef.current;
      const showBaloes = showBaloesRef.current;
      const zoomPermiteBaloes = map.getZoom() >= ZOOM_BALAO;

      if (map.hasLayer(pinsLayerRef.current)) map.removeLayer(pinsLayerRef.current);
      pinsLayerRef.current.clearLayers();

      if (!mostrarPins || postos.length === 0) return;

      const bounds: [number, number][] = [];

      postos.forEach((posto) => {
        if (posto.lat === null || posto.lng === null) return;
        if (
          posto.lat < PT_BOUNDS.minLat || posto.lat > PT_BOUNDS.maxLat ||
          posto.lng < PT_BOUNDS.minLng || posto.lng > PT_BOUNDS.maxLng
        ) return;

        const temDesconto =
          !!centimos && centimos > 0 && !!descontoMarcaNome &&
          normalizeName(posto.marca ?? "") === normalizeName(descontoMarcaNome);

        const marcaCor = getMarcaCor(posto.marca ?? "");
        const precoInfo = getPrecoPorTipo(posto, tipoAtivoAtual, centimos, descontoMarcaNome);
        const precoDisplay = precoInfo?.precoDesc ?? precoInfo?.texto ?? null;

        const mostrarBalao = showBaloes && zoomPermiteBaloes && !!precoInfo && !!precoDisplay;

        const pinSize = mostrarBalao ? 10 : 14;
        const balaoBg = precoInfo?.precoDesc ? "#dcfce7" : "white";
        const balaoBorder = precoInfo?.cor ?? marcaCor;
        const balaoColor = precoInfo?.cor ?? marcaCor;

        const icon = L.divIcon({
          className: "",
          html: mostrarBalao
            ? `<div style="display:flex;flex-direction:column;align-items:center;gap:0px;cursor:pointer">
                <div style="
                  background:${balaoBg};
                  color:${balaoColor};
                  border:1.5px solid ${balaoBorder};
                  border-radius:5px;
                  padding:2px 6px;
                  font-size:11px;
                  font-weight:700;
                  font-family:sans-serif;
                  white-space:nowrap;
                  box-shadow:0 2px 6px rgba(0,0,0,0.16);
                  line-height:1.4;
                  position:relative;
                ">
                  ${precoDisplay}
                  <div style="
                    position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
                    width:0;height:0;
                    border-left:4px solid transparent;
                    border-right:4px solid transparent;
                    border-top:4px solid ${balaoBorder};
                  "></div>
                </div>
                <div style="
                  width:${pinSize}px;
                  height:${pinSize}px;
                  border-radius:50%;
                  background:${marcaCor};
                  box-shadow:0 1px 3px rgba(0,0,0,.3);
                  margin-top:4px;
                "></div>
              </div>`
            : `<div style="
                width:${pinSize}px;
                height:${pinSize}px;
                border-radius:50%;
                background:${marcaCor};
                box-shadow:0 1px 4px rgba(0,0,0,.35);
              "></div>`,
          iconSize: mostrarBalao ? [60, 38] : [14, 14],
          iconAnchor: mostrarBalao ? [30, 33] : [7, 7],
        });

        const combsHtml =
          posto.combustiveis
            .map((c: any) => {
              const precoOriginal = parsePreco(c.texto);
              const temDesc = temDesconto && precoOriginal !== null;
              const precoDesc = temDesc
                ? Math.max(0, precoOriginal! - centimos! / 100).toFixed(3)
                : null;
              const corPreco = corPorTipoCombustivel(c.tipo ?? "");
              const precoHtml = temDesc
                ? `<span style="display:inline-flex;align-items:center;gap:0.35rem">
                     <s style="color:#bbb;font-size:0.68rem">${c.texto}</s>
                     <span style="font-weight:700;color:${corPreco}">${precoDesc}</span>
                     <span style="font-size:0.6rem;color:${corPreco};background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px">-${centimos}c</span>
                   </span>`
                : `<span style="font-weight:700;color:${corPreco}">${c.texto}</span>`;
              return `<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;font-size:0.72rem">
                <span style="color:#888">${c.tipo}</span>${precoHtml}
              </div>`;
            })
            .join("") || `<span style="font-size:0.72rem;color:#888">Sem preços</span>`;

        const descontoBadge = temDesconto
          ? `<div style="margin-top:6px;font-size:0.65rem;color:#15803d;background:#dcfce7;padding:2px 7px;border-radius:4px;display:inline-block">Cupão ${centimos}c/L aplicado</div>`
          : "";

        const marker = L.marker([posto.lat, posto.lng], { icon }).bindPopup(
          `<div style="min-width:190px;font-family:sans-serif">
  <p style="font-weight:700;margin:0 0 2px">
    <span style="color:${marcaCor}">${posto.marca}</span>
    <span style="color:#aaa;margin:0 0.3rem">|</span>
    ${posto.nome}
  </p>
  <p style="font-size:0.72rem;color:#888;margin:0 0 6px">${posto.localidade}</p>
  ${combsHtml}
  ${descontoBadge}
  <a href="${
    posto.lat && posto.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${posto.lat},${posto.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [posto.nome, posto.morada, posto.localidade].filter(Boolean).join(", ")
        )}`
  }" target="_blank" rel="noopener noreferrer"
    style="display:inline-flex;align-items:center;gap:0.3rem;margin-top:8px;padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:0.67rem;font-weight:500;color:#555;text-decoration:none;">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
    Direções
  </a>
</div>`,
          { maxWidth: 280 }
        );

        pinsLayerRef.current.addLayer(marker);
        bounds.push([posto.lat, posto.lng]);
      });

      map.addLayer(pinsLayerRef.current);

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      }
    };

    redrawPinsRef.current = drawPins;

    const tryAdd = (retries = 20) => {
      if (!mapReadyRef.current || !pinsLayerRef.current) {
        if (retries > 0) setTimeout(() => tryAdd(retries - 1), 200);
        return;
      }
      drawPins();
    };

    tryAdd();
  }, [postos, mostrarPins, descontoCentimos, descontoMarcaId, tipoAtivo]);

  // ─── Marcador de localização do utilizador ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }

      if (
        !userLocation ||
        userLocation.lat < PT_BOUNDS.minLat || userLocation.lat > PT_BOUNDS.maxLat ||
        userLocation.lng < PT_BOUNDS.minLng || userLocation.lng > PT_BOUNDS.maxLng
      ) return;

      const userIcon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2b7fff;border:3px solid #ffffff;box-shadow:0 0 0 4px rgba(43,127,255,0.22),0 3px 10px rgba(0,0,0,0.28);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 2000,
        keyboard: false,
      }).bindPopup("A sua localização");

      userMarkerRef.current.addTo(mapRef.current);
    })();

    return () => { cancelled = true; };
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
    />
  );
}
