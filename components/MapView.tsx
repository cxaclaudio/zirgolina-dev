"use client";

import { useEffect, useRef } from "react";
import type { Posto } from "@/lib/dgeg";
import { getMarcaCor } from "@/lib/postos";

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
}

const DISTRITOS_URL = "/distritos.geojson";
const MUNICIPIOS_URL = "/municipios.geojson";
const PT_BOUNDS = { minLat: 29.0, maxLat: 42.2, minLng: -31.3, maxLng: -6.1 };

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

/** Converte texto de preço "1,234" ou "1.234" → número, null se inválido */
function parsePreco(texto: string): number | null {
  const n = parseFloat(texto.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
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

  useEffect(() => {
    cbDistrito.current = onDistritoClick;
  }, [onDistritoClick]);

  useEffect(() => {
    cbConcelho.current = onConcelhoClick;
  }, [onConcelhoClick]);

  useEffect(() => {
    mostrarPinsDistritoRef.current = mostrarPinsDistrito;
  }, [mostrarPinsDistrito]);

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!containerRef.current) return;
      if ((containerRef.current as any)._leaflet_id) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
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
        invalidateRef.current = () => {
          setTimeout(() => map.invalidateSize(), 150);
        };
      }

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

            if (nome) {
              layer.bindTooltip(`<b>${nome}</b>`, {
                sticky: true,
                className: "map-tip",
                direction: "top",
              });
            }

            layer.on("mouseover", () => layer.setStyle(sDH));
            layer.on("mouseout", () => distritosRef.current?.resetStyle(layer));

            layer.on("click", (e: any) => {
              L.DomEvent.stopPropagation(e);

              if (e.originalEvent?.target) {
                (e.originalEvent.target as HTMLElement).style.outline = "none";
              }

              map.fitBounds(layer.getBounds(), { padding: [30, 30], animate: true });

              setTimeout(() => {
                if (map.getZoom() < 9) map.setZoom(9, { animate: true });
              }, 350);

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

              if (id !== "20" && id !== "21") {
                setTimeout(() => {
                  if (map.getZoom() < 9) map.setZoom(9, { animate: true });
                }, 350);
              }
            },
            flyToConcelho: (distritoId: string, concelhoNome: string) => {
              const norm = normalizeName(concelhoNome);
              const layer = concelhoLayerMap[`${distritoId}_${norm}`];
              if (layer) {
                map.fitBounds(layer.getBounds(), {
                  padding: [20, 20],
                  maxZoom: 14,
                  animate: true,
                });
              }
            },
            resetView: () => {
              map.setView([39.6, -8.0], 7, { animate: true });
            },
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

            if (distritoId && conNome) {
              const norm = normalizeName(conNome);
              concelhoLayerMap[`${distritoId}_${norm}`] = layer;
            }

            if (conNome) {
              layer.bindTooltip(`<b>${conNome}</b>${disNome ? ` · ${disNome}` : ""}`, {
                sticky: true,
                className: "map-tip",
                direction: "top",
              });
            }

            layer.on("mouseover", () => layer.setStyle(sMH));
            layer.on("mouseout", () => municipiosRef.current?.resetStyle(layer));

            layer.on("click", (e: any) => {
              L.DomEvent.stopPropagation(e);

              if (e.originalEvent?.target) {
                (e.originalEvent.target as HTMLElement).style.outline = "none";
              }

              map.fitBounds(layer.getBounds(), {
                padding: [20, 20],
                maxZoom: 14,
                animate: true,
              });

              if (distritoId && conNome) cbConcelho.current?.(distritoId, conNome);
            });
          },
        });

        if (flyRef) {
          const prev = flyRef.current as any;
          flyRef.current = {
            flyToDistrito: prev?.flyToDistrito ?? (() => {}),
            flyToConcelho: (distritoId: string, concelhoNome: string) => {
              const norm = normalizeName(concelhoNome);
              const layer = concelhoLayerMap[`${distritoId}_${norm}`];
              if (layer) {
                map.fitBounds(layer.getBounds(), {
                  padding: [20, 20],
                  maxZoom: 14,
                  animate: true,
                });
              }
            },
            resetView: prev?.resetView ?? (() => {
              map.setView([39.6, -8.0], 7, { animate: true });
            }),
          } as any;
        }

        function syncLayers() {
          const z = map.getZoom();

          if (z >= 9) {
            if (distritosRef.current && map.hasLayer(distritosRef.current)) {
              map.removeLayer(distritosRef.current);
            }
            if (municipiosRef.current && !map.hasLayer(municipiosRef.current)) {
              map.addLayer(municipiosRef.current);
            }
          } else {
            if (municipiosRef.current && map.hasLayer(municipiosRef.current)) {
              map.removeLayer(municipiosRef.current);
            }
            if (distritosRef.current && !map.hasLayer(distritosRef.current)) {
              map.addLayer(distritosRef.current);
            }
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

  useEffect(() => {
    if (!mapRef.current) return;

    const tryAdd = (retries = 20) => {
      if (!mapReadyRef.current || !pinsLayerRef.current) {
        if (retries > 0) setTimeout(() => tryAdd(retries - 1), 200);
        return;
      }

      (async () => {
        const L = (await import("leaflet")).default;
        const map = mapRef.current;

        if (map.hasLayer(pinsLayerRef.current)) {
          map.removeLayer(pinsLayerRef.current);
        }

        pinsLayerRef.current.clearLayers();

        if (!mostrarPins || postos.length === 0) return;

        const bounds: [number, number][] = [];

        postos.forEach((posto) => {
          if (posto.lat === null || posto.lng === null) return;

          if (
            posto.lat < PT_BOUNDS.minLat ||
            posto.lat > PT_BOUNDS.maxLat ||
            posto.lng < PT_BOUNDS.minLng ||
            posto.lng > PT_BOUNDS.maxLng
          ) {
            return;
          }

          // Desconto: só aplica se o posto tem a marca certa e o desconto está definido
          const postoMarcaId = String(posto.marcaId ?? "");
          const temDesconto =
            !!descontoCentimos &&
            descontoCentimos > 0 &&
            !!descontoMarcaId &&
            postoMarcaId === descontoMarcaId;

          const marcaCor = getMarcaCor(posto.marca ?? "");
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${marcaCor};box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });

          const combsHtml =
            posto.combustiveis
              .map((c: any) => {
                const precoOriginal = parsePreco(c.texto);
                const temDesc = temDesconto && precoOriginal !== null;
                const precoDesc = temDesc
                  ? ((precoOriginal! * 1000 - descontoCentimos!) / 1000).toFixed(3)
                  : null;

                const precoHtml = temDesc
                  ? `<span style="display:inline-flex;align-items:center;gap:0.35rem">
                       <s style="color:#bbb;font-size:0.68rem">${c.texto}</s>
                       <b style="color:#16a34a">${precoDesc}</b>
                       <span style="font-size:0.6rem;color:#16a34a;background:#dcfce7;padding:1px 4px;border-radius:3px">-${descontoCentimos}c</span>
                     </span>`
                  : `<b style="color:#555">${c.texto}</b>`;

                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;font-size:0.72rem">
                    <span style="color:#888">${c.tipo}</span>
                    ${precoHtml}
                  </div>`;
              })
              .join("") || `<span style="font-size:0.72rem;color:#888">Sem preços</span>`;

          const descontoBadge = temDesconto
            ? `<div style="margin-top:6px;font-size:0.65rem;color:#15803d;background:#dcfce7;padding:2px 7px;border-radius:4px;display:inline-block">
                 🏷️ Cupão ${descontoCentimos}c/L aplicado
               </div>`
            : "";

          const marker = L.marker([posto.lat, posto.lng], { icon }).bindPopup(
            `
<div style="min-width:190px">
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
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
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
      })();
    };

    tryAdd();
  }, [postos, mostrarPins, descontoCentimos, descontoMarcaId]);

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
        userLocation.lat < PT_BOUNDS.minLat ||
        userLocation.lat > PT_BOUNDS.maxLat ||
        userLocation.lng < PT_BOUNDS.minLng ||
        userLocation.lng > PT_BOUNDS.maxLng
      ) {
        return;
      }

      const userIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:18px;
            height:18px;
            border-radius:50%;
            background:#2b7fff;
            border:3px solid #ffffff;
            box-shadow:
              0 0 0 4px rgba(43,127,255,0.22),
              0 3px 10px rgba(0,0,0,0.28);
          "></div>
        `,
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

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
    />
  );
}
