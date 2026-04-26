import { getPostos } from "@/lib/dgeg";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
  };

  try {
    const idMunicipios =
      searchParams.get("idMunicipios") ??
      searchParams.get("idMunicipio") ??
      undefined;

    const data = await getPostos({
      fuelId: searchParams.get("fuelId") ?? "3201",
      idDistrito: searchParams.get("idDistrito") ?? undefined,
      idMunicipios,
      marcaId: searchParams.get("marcaId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      bbox: searchParams.get("bbox") ?? undefined,
    });

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