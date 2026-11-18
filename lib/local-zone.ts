import lookup from "tz-lookup";

/** Resolve the search origin, including a manually dropped pin, without disclosing it. */
export function localZone(lat: number, lon: number): string {
  return lookup(lat, lon);
}
