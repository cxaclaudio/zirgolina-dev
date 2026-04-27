const DGEG = "https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb";
const ARCGIS =
  "https://services3.arcgis.com/L8wRKpelHTajqMnK/ArcGIS/rest/services/PostosAbastecimento/FeatureServer/0/query";

// IDs das marcas permitidas
export const ALLOWED_MARCAS = [
  { id: "2", nome: "ALVES BANDEIRA" },
  { id: "5", nome: "AUCHAN" },
  { id: "11", nome: "BP" },
  { id: "15", nome: "CEPSA" },
  { id: "29", nome: "GALP" },
  { id: "38", nome: "INTERMARCHÉ" },
  { id: "40", nome: "LECLERC" },
  { id: "72", nome: "MOEVE" },
  { id: "78", nome: "NOVA" },
  { id: "45", nome: "OZ ENERGIA" },
  { id: "52", nome: "PINGO DOCE" },
  { id: "74", nome: "PLENERGY" },
  { id: "53", nome: "PRIO" },
  { id: "58", nome: "REPSOL" },
  { id: "60", nome: "SHELL" },
] as const;

// Todos os tipos de combustível disponíveis no API da DGEG
export const FUELS = [
  { id: "3201", label: "Gasolina simples 95" },
  { id: "3205", label: "Gasolina especial 95" },
  { id: "3400", label: "Gasolina 98" },
  { id: "3405", label: "Gasolina especial 98" },
  { id: "2101", label: "Gasóleo simples" },
  { id: "2105", label: "Gasóleo especial" },
  { id: "1120", label: "GPL Auto" },
  { id: "2150", label: "Gasóleo colorido" },
] as const;

export interface Distrito {
  Id: number;
  Descritivo: string;
}

export interface Municipio {
  Id: number;
  Descritivo: string;
  IdDistrito: number;
}

export interface CombustivelPreco {
  tipo: string;
  preco: number;
  texto: string;
}

export interface Posto {
  id: number;
  nome: string;
  marca: string;
  distrito: string;
  municipio: string;
  morada: string;
  localidade: string;
  codPostal: string;
  combustiveis: CombustivelPreco[];
  preco: number | null;
  precoTexto: string;
  dataAtualizacao: string | null;
  lat: number | null;
  lng: number | null;
  horario: string;
}

interface DadosMapa {
  Nome: string;
  Marca: string;
  Combustiveis: { TipoCombustivel: string; Preco: string }[] | null;
  Morada: {
    Morada: string;
    Localidade: string;
    CodPostal: string;
  };
  HorarioPosto: {
    DiasUteis: string | null;
    Sabado: string | null;
    Domingo: string | null;
  };
  DataAtualizacao: string;
}

export interface PostoQuery {
  fuelId: string;
  idDistrito?: string;
  idMunicipio?: string;
  idMunicipios?: string;
  marcaId?: string;
  search?: string;
  bbox?: string;
}

async function dgegGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DGEG}/${path}`, {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`DGEG ${path} → HTTP ${res.status}`);
  }

  const json = await res.json();

  if (!json.status) {
    throw new Error(json.mensagem ?? "Erro na DGEG.");
  }

  return json.resultado as T;
}

export async function getDistritos(): Promise<Distrito[]> {
  return (await dgegGet<Distrito[]>("GetDistritos")).sort((a, b) =>
    a.Descritivo.localeCompare(b.Descritivo, "pt")
  );
}

export async function getMunicipios(idDistrito: number): Promise<Municipio[]> {
  return (await dgegGet<Municipio[]>(`GetMunicipios?idDistrito=${idDistrito}`)).sort((a, b) =>
    a.Descritivo.localeCompare(b.Descritivo, "pt")
  );
}

function parsePrecoStr(s: string): number | null {
  const m = s.replace(",", ".").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function normalizeText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .normalize("NFC")
    .trim();
}

function normalizeMunicipiosParam(value?: string): string {
  if (!value) return "";

  return [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  ].join(",");
}

function pickPrecoCombustivel(
  combs: { TipoCombustivel: string; Preco: string }[],
  fuelLabel: string,
  combustiveis: CombustivelPreco[]
): number | null {
  if (!fuelLabel) return combustiveis[0]?.preco ?? null;

  const fuelNorm = normalizeText(fuelLabel);
  const fuelFirst = fuelNorm.replace("gasolina especial", "especial").split(" ")[0];
  const fuelLast = fuelNorm.split(" ").slice(-1)[0];

  const exact =
    combs.find((c) => normalizeText(c.TipoCombustivel) === fuelNorm) ?? null;

  const includesLast =
    combs.find((c) => normalizeText(c.TipoCombustivel).includes(fuelLast)) ?? null;

  const includesFirst =
    combs.find((c) => normalizeText(c.TipoCombustivel).includes(fuelFirst)) ?? null;

  const picked = exact ?? includesLast ?? includesFirst ?? null;

  return picked ? parsePrecoStr(picked.Preco) : (combustiveis[0]?.preco ?? null);
}

function buildHorario(dados: DadosMapa | null): string {
  if (!dados?.HorarioPosto) return "";

  return [
    dados.HorarioPosto.DiasUteis && `Dias úteis: ${dados.HorarioPosto.DiasUteis}`,
    dados.HorarioPosto.Sabado && `Sáb: ${dados.HorarioPosto.Sabado}`,
    dados.HorarioPosto.Domingo && `Dom: ${dados.HorarioPosto.Domingo}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function marcaNameFromId(marcaId?: string): string {
  if (!marcaId) return "";
  return ALLOWED_MARCAS.find((m) => m.id === marcaId)?.nome ?? "";
}

function matchesMarca(postoMarca: string, marcaId?: string): boolean {
  if (!marcaId) return true;

  const marcaNome = marcaNameFromId(marcaId);
  if (!marcaNome) return true;

  const a = normalizeText(postoMarca);
  const b = normalizeText(marcaNome);

  return a === b || a.includes(b) || b.includes(a);
}

function matchesSearch(p: Posto, search?: string): boolean {
  if (!search?.trim()) return true;

  const q = search.toLowerCase();

  return [p.nome, p.marca, p.morada, p.localidade, p.codPostal].some((v) =>
    v.toLowerCase().includes(q)
  );
}

async function getDadosMapa(id: number): Promise<DadosMapa | null> {
  try {
    const res = await fetch(`${DGEG}/GetDadosPostoMapa?id=${id}`, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json",
        Referer: "https://precoscombustiveis.dgeg.gov.pt/",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.status ? (json.resultado as DadosMapa) : null;
  } catch {
    return null;
  }
}

async function getCoordsArcGIS(
  ids: number[],
  bbox?: string
): Promise<Record<number, { lat: number; lng: number }>> {
  const coordMap: Record<number, { lat: number; lng: number }> = {};
  const idChunks: number[][] = [];

  for (let i = 0; i < ids.length; i += 150) {
    idChunks.push(ids.slice(i, i + 150));
  }

  await Promise.all(
    idChunks.map(async (chunk) => {
      if (chunk.length === 0) return;

      const arcParams = new URLSearchParams({
        where: `CodInterno IN (${chunk.join(",")})`,
        outFields: "CodInterno,nLatitude,nLongitude",
        returnGeometry: "false",
        resultRecordCount: String(chunk.length),
        f: "json",
      });

      if (bbox) {
        arcParams.set("geometry", bbox);
        arcParams.set("geometryType", "esriGeometryEnvelope");
        arcParams.set("spatialRel", "esriSpatialRelIntersects");
        arcParams.set("inSR", "4326");
      }

      const arcRes = await fetch(`${ARCGIS}?${arcParams}`, {
        next: { revalidate: 300 },
      });

      if (!arcRes.ok) return;

      const arcJson = await arcRes.json();

      for (const f of (arcJson.features ?? []) as { attributes: Record<string, unknown> }[]) {
        const a = f.attributes;

        if (
          typeof a.CodInterno === "number" &&
          typeof a.nLatitude === "number" &&
          typeof a.nLongitude === "number"
        ) {
          coordMap[a.CodInterno] = {
            lat: a.nLatitude,
            lng: a.nLongitude,
          };
        }
      }
    })
  );

  return coordMap;
}

async function getIdsFromArcGISBbox(
  bbox: string
): Promise<Array<{ id: number; lat: number; lng: number }>> {
  const arcParams = new URLSearchParams({
    where: "1=1",
    outFields: "CodInterno,nLatitude,nLongitude",
    returnGeometry: "false",
    resultRecordCount: "500",
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    f: "json",
  });

  const arcRes = await fetch(`${ARCGIS}?${arcParams}`, {
    next: { revalidate: 300 },
  });

  if (!arcRes.ok) {
    throw new Error(`ArcGIS HTTP ${arcRes.status}`);
  }

  const arcJson = await arcRes.json();

  return (arcJson.features ?? [])
    .map((f: { attributes?: Record<string, unknown> }) => {
      const a = f.attributes ?? {};

      if (
        typeof a.CodInterno !== "number" ||
        typeof a.nLatitude !== "number" ||
        typeof a.nLongitude !== "number"
      ) {
        return null;
      }

      return {
        id: a.CodInterno,
        lat: a.nLatitude,
        lng: a.nLongitude,
      };
    })
    .filter((x): x is { id: number; lat: number; lng: number } => x !== null);
}

function mapDadosToPosto(
  id: number,
  dados: DadosMapa | null,
  fuelLabel: string,
  coords?: { lat: number; lng: number }
): Posto {
  const combs = dados?.Combustiveis ?? [];

  const combustiveis: CombustivelPreco[] = combs
    .map((c) => {
      const preco = parsePrecoStr(c.Preco);
      return preco !== null
        ? {
            tipo: c.TipoCombustivel,
            preco,
            texto: `${preco.toFixed(3)} €/L`,
          }
        : null;
    })
    .filter((x): x is CombustivelPreco => x !== null);

  const preco = pickPrecoCombustivel(combs, fuelLabel, combustiveis);

  return {
    id,
    nome: dados?.Nome ?? `Posto ${id}`,
    marca: dados?.Marca ?? "—",
    distrito: "—",
    municipio: dados?.Morada?.Localidade ?? "—",
    morada: dados?.Morada?.Morada ?? "",
    localidade: dados?.Morada?.Localidade ?? "",
    codPostal: dados?.Morada?.CodPostal ?? "",
    combustiveis,
    preco,
    precoTexto: preco !== null ? `${preco.toFixed(3)} €/L` : "Sem preço",
    dataAtualizacao: dados?.DataAtualizacao ?? null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    horario: buildHorario(dados),
  };
}

export async function getPostos(query: PostoQuery): Promise<Posto[]> {
  const municipiosParam = normalizeMunicipiosParam(
    query.idMunicipios ?? query.idMunicipio
  );

  const fuelLabel = FUELS.find((f) => f.id === query.fuelId)?.label ?? "";

  // Fluxo especial para pesquisa por raio:
  // primeiro obtemos candidatos geográficos no ArcGIS via bbox,
  // depois enriquecemos com detalhes/preços na DGEG.
  if (query.bbox && !query.idDistrito && !municipiosParam) {
    const nearby = await getIdsFromArcGISBbox(query.bbox);

    if (nearby.length === 0) {
      return [];
    }

    let result = await Promise.all(
      nearby.map(async ({ id, lat, lng }) => {
        const dados = await getDadosMapa(id);
        return mapDadosToPosto(id, dados, fuelLabel, { lat, lng });
      })
    );

    result = result.filter((p) => matchesMarca(p.marca, query.marcaId));
    result = result.filter((p) => matchesSearch(p, query.search));

    return result.sort((a, b) => {
      if (a.preco === null) return 1;
      if (b.preco === null) return -1;
      return a.preco - b.preco;
    });
  }

  // Fluxo normal: DGEG primeiro, ArcGIS depois
  const dgegParams = new URLSearchParams({
    idsTiposComb: query.fuelId,
    idMarca: query.marcaId ?? "",
    idTipoPosto: "",
    idDistrito: query.idDistrito ?? "",
    idsMunicipios: municipiosParam,
    qtd: "999",
  });

  const dgegRes = await fetch(`${DGEG}/ListarDadosPostos?${dgegParams.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Referer: "https://precoscombustiveis.dgeg.gov.pt/",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!dgegRes.ok) {
    throw new Error(`DGEG HTTP ${dgegRes.status}`);
  }

  const dgegJson = await dgegRes.json();

  if (!dgegJson.status) {
    throw new Error(dgegJson.mensagem ?? "Nenhum posto encontrado.");
  }

  const postoIds: { Id: number }[] = dgegJson.resultado ?? [];
  const toEnrich = postoIds.slice(0, 999);

  if (toEnrich.length === 0) {
    return [];
  }

  const enriched: Posto[] = await Promise.all(
    toEnrich.map(async (p): Promise<Posto> => {
      const dados = await getDadosMapa(p.Id);
      return mapDadosToPosto(p.Id, dados, fuelLabel);
    })
  );

  try {
    const coordMap = await getCoordsArcGIS(
      toEnrich.map((p) => p.Id),
      query.bbox
    );

    for (const p of enriched) {
      const c = coordMap[p.id];
      if (c) {
        p.lat = c.lat;
        p.lng = c.lng;
      }
    }
  } catch {
    // coords opcionais
  }

  let result: Posto[] = enriched;

  result = result.filter((p) => matchesSearch(p, query.search));

  return result.sort((a, b) => {
    if (a.preco === null) return 1;
    if (b.preco === null) return -1;
    return a.preco - b.preco;
  });
}