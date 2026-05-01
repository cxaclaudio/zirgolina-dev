import type { FilterValues } from "@/components/FilterPanel";

export type CombustivelOrdenacao = "gasolina_asc" | "gasoleo_asc" | "gpl_asc";
export type SortOrdenacao = "preco_asc" | "preco_desc" | "distancia_asc" | "distancia_desc";
export type TipoCombustivelAtivo = "gasolina" | "gasoleo" | "gpl" | null;

export type MapFlyRefType = {
  flyToDistrito: (id: string) => void;
  flyToConcelho: (dId: string, cNome: string) => void;
  resetView?: () => void;
};

export async function fetchMunicipiosLocal(idDistrito: string) {
  const res = await fetch(`/api/municipios?id=${idDistrito}`);
  const json = await res.json();
  return (json.data ?? []) as Array<{ Id: number; Descritivo: string }>;
}

export function normText(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMunicipiosCsv(csv: string) {
  return [...new Set((csv ?? "").split(",").map((x) => x.trim()).filter(Boolean))].join(",");
}

export function getPrimaryMunicipioId(csv: string) {
  return normalizeMunicipiosCsv(csv).split(",")[0] ?? "";
}

export function getMunicipiosIds(csv: string) {
  return normalizeMunicipiosCsv(csv)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function sanitizeFilters(f: FilterValues): FilterValues {
  const cleanMunicipios = normalizeMunicipiosCsv(f.idMunicipio);

  if (!f.idDistrito && cleanMunicipios) {
    return { ...f, idMunicipio: "" };
  }

  return {
    ...f,
    fuelId: f.fuelId || "3201",
    idMunicipio: cleanMunicipios,
  };
}

export function getTipoAtivo(
  ordenacao: CombustivelOrdenacao | string
): TipoCombustivelAtivo {
  return ordenacao === "gasolina_asc"
    ? "gasolina"
    : ordenacao === "gasoleo_asc"
    ? "gasoleo"
    : ordenacao === "gpl_asc"
    ? "gpl"
    : null;
}