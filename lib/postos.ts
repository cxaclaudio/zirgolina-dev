// lib/postos.ts
import type { Posto } from "@/lib/dgeg";

export type TipoCombustivel = "gasolina" | "gasoleo" | "gpl";

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

const MARCA_CORES: Record<string, string> = {
  "ALVES BANDEIRA": "#1D6FA4",
  "AUCHAN": "#E2001A",
  "BP": "#006F3C",
  "CEPSA": "#E2001A",
  "GALP": "#FF6B00",
  "INTERMARCHÉ": "#888888",
  "LECLERC": "#1D6FA4",
  "MOEVE": "#1D6FA4",
  "NOVA": "#1D6FA4",
  "OZ ENERGIA": "#1D6FA4",
  "PETROPRIX": "#D63615",
  "PINGO DOCE": "#006F3C",
  "PLENERGY": "#FFB600",
  "PRIO": "#1D6FA4",
  "REPSOL": "#C45000",
  "SHELL": "#C8960C",
};

export function getMarcaCor(marca: string, fallback = "#22c55e"): string {
  const key = Object.keys(MARCA_CORES).find((k) =>
    marca.toUpperCase().includes(k)
  );
  return key ? MARCA_CORES[key] : fallback;
}

export function getPrecoCombustivel(
  posto: Posto,
  tipo: TipoCombustivel
): number | null {
  const tipos =
    tipo === "gasolina"
      ? GASOLINA_TIPOS
      : tipo === "gasoleo"
      ? GASOLEO_TIPOS
      : GPL_TIPOS;

  const comb = posto.combustiveis?.find((c: any) => {
    const t = c.tipo?.toLowerCase() ?? "";
    if (tipo === "gasoleo" && GASOLEO_EXCLUIR.test(t)) return false;
    return tipos.some((k) => t.includes(k));
  });

  return (comb as any)?.preco ?? null;
}

export function temCombustivel(posto: Posto, tipo: TipoCombustivel): boolean {
  return getPrecoCombustivel(posto, tipo) != null;
}