import { getPostos } from "@/lib/dgeg";
import { NextResponse } from "next/server";

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function dedupePostos<T extends { id?: string | number }>(items: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of items) {
    const key =
      item.id != null
        ? String(item.id)
        : JSON.stringify(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
  };

  try {
    const fuelId = searchParams.get("fuelId") ?? "3201";
    const idDistrito = searchParams.get("idDistrito") ?? undefined;
    const idMunicipios =
      searchParams.get("idMunicipios") ??
      searchParams.get("idMunicipio") ??
      undefined;
    const search = searchParams.get("search") ?? undefined;
    const bbox = searchParams.get("bbox") ?? undefined;

    const marcaIds = [
      ...parseCsv(searchParams.get("marcaIds")),
      ...parseCsv(searchParams.get("marcaId")),
    ].filter(Boolean);

    let data;

    if (marcaIds.length <= 1) {
      data = await getPostos({
        fuelId,
        idDistrito,
        idMunicipios,
        marcaId: marcaIds[0] ?? undefined,
        search,
        bbox,
      });
    } else {
      const results = await Promise.all(
        marcaIds.map((marcaId) =>
          getPostos({
            fuelId,
            idDistrito,
            idMunicipios,
            marcaId,
            search,
            bbox,
          })
        )
      );

      data = dedupePostos(results.flat());
    }

    return NextResponse.json(
      { ok: true, data, total: data.length },
      { headers }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    return NextResponse.json(
      { ok: false, error: message, data: [] },
      { status: 502, headers }
    );
  }
}