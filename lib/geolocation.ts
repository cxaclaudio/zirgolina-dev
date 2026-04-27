export type UserCoords = {
  lat: number;
  lng: number;
};

let cachedLocation: { coords: UserCoords; ts: number } | null = null;

function getPosition(options?: PositionOptions): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalização não suportada neste dispositivo."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Permissão de localização negada."));
          return;
        }

        if (err.code === err.TIMEOUT) {
          reject(new Error("Tempo excedido ao obter localização."));
          return;
        }

        reject(new Error("Não foi possível obter a localização."));
      },
      options
    );
  });
}

export async function getUserLocation(): Promise<UserCoords> {
  const now = Date.now();

  if (cachedLocation && now - cachedLocation.ts < 1000 * 60 * 3) {
    return cachedLocation.coords;
  }

  try {
    const quick = await getPosition({
      enableHighAccuracy: false,
      timeout: 2500,
      maximumAge: 1000 * 60 * 5,
    });

    cachedLocation = { coords: quick, ts: Date.now() };
    return quick;
  } catch {
    const precise = await getPosition({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 0,
    });

    cachedLocation = { coords: precise, ts: Date.now() };
    return precise;
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isValidPortugalLikeCoord(
  lat?: number | null,
  lng?: number | null
): boolean {
  if (lat == null || lng == null) return false;
  return lat >= 36.8 && lat <= 42.3 && lng >= -9.7 && lng <= -6.0;
}