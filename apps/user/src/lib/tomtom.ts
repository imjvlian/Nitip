const apiKey = (process.env.EXPO_PUBLIC_TOMTOM_API_KEY ?? "").trim();

export const tomTomApiKey = apiKey;
export const tomTomConfigured = apiKey.length > 0;

const DEFAULT_BIAS = {
  latitude: -8.1335,
  longitude: 113.2248,
};

export interface TomTomPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface TomTomSearchResult {
  id?: string;
  type?: string;
  poi?: { name?: string };
  address?: {
    freeformAddress?: string;
    streetName?: string;
    municipality?: string;
    municipalitySubdivision?: string;
    countrySubdivision?: string;
  };
  position?: { lat?: number; lon?: number };
}

interface TomTomSearchResponse {
  results?: TomTomSearchResult[];
}

function placeAddress(result: TomTomSearchResult) {
  const direct = result.address?.freeformAddress?.trim();
  if (direct) return direct;

  return [
    result.address?.streetName,
    result.address?.municipalitySubdivision,
    result.address?.municipality,
    result.address?.countrySubdivision,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ");
}

function placeName(result: TomTomSearchResult, address: string) {
  return (
    result.poi?.name?.trim() ||
    result.address?.streetName?.trim() ||
    result.address?.municipalitySubdivision?.trim() ||
    result.address?.municipality?.trim() ||
    address.split(",")[0]?.trim() ||
    "Lokasi"
  );
}

export async function searchTomTomPlaces(
  query: string,
  options?: {
    language?: "id-ID" | "en-US";
    latitude?: number | null;
    longitude?: number | null;
    limit?: number;
  },
): Promise<TomTomPlace[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];
  if (!tomTomConfigured) {
    throw new Error("EXPO_PUBLIC_TOMTOM_API_KEY is not configured");
  }

  const latitude =
    options?.latitude != null && Number.isFinite(options.latitude)
      ? options.latitude
      : DEFAULT_BIAS.latitude;
  const longitude =
    options?.longitude != null && Number.isFinite(options.longitude)
      ? options.longitude
      : DEFAULT_BIAS.longitude;

  const params = new URLSearchParams({
    key: tomTomApiKey,
    typeahead: "true",
    limit: String(Math.max(1, Math.min(options?.limit ?? 6, 10))),
    countrySet: "ID",
    language: options?.language ?? "id-ID",
    idxSet: "POI,PAD,Addr,Geo,Str,XStr",
    geobias: `point:${latitude},${longitude}`,
  });

  const response = await fetch(
    `https://api.tomtom.com/search/2/search/${encodeURIComponent(needle)}.json?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`TomTom Search failed (${response.status})`);
  }

  const body = (await response.json()) as TomTomSearchResponse;

  return (body.results ?? []).flatMap((result) => {
    const latitudeValue = result.position?.lat;
    const longitudeValue = result.position?.lon;

    if (
      typeof latitudeValue !== "number" ||
      !Number.isFinite(latitudeValue) ||
      typeof longitudeValue !== "number" ||
      !Number.isFinite(longitudeValue)
    ) {
      return [];
    }

    const address = placeAddress(result);
    const name = placeName(result, address);

    return [
      {
        id:
          result.id?.trim() ||
          `${latitudeValue.toFixed(6)}:${longitudeValue.toFixed(6)}:${name}`,
        name,
        address: address || name,
        latitude: latitudeValue,
        longitude: longitudeValue,
        type: result.type?.trim() || "place",
      },
    ];
  });
}
