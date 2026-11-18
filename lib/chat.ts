import {
  dateInZone,
  interestGroups,
  normalizeText,
  type Filters,
} from "./discovery";
export interface ChatResult {
  changes: Partial<Filters>;
  message: string;
}
const currencyCode: Record<string, string> = {
  "₱": "PHP",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
};
const modes: Record<string, Filters["mode"]> = {
  walk: "walking",
  walking: "walking",
  cycle: "cycling",
  cycling: "cycling",
  bike: "cycling",
  bicycle: "cycling",
  drive: "driving",
  driving: "driving",
  car: "driving",
};
function bounded(x: number, min: number, max: number) {
  return Number.isFinite(x) && x >= min && x <= max;
}
export function parseChat(text: string, f: Filters): ChatResult {
  const q = normalizeText(text.trim()).replace(/(\d),(?=\d{3}\b)/g, "$1"),
    changes: Partial<Filters> = {};
  const minutes = q.match(
    /\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|h)\b/,
  );
  if (minutes) {
    const n = Math.round(+minutes[1] * (minutes[2].startsWith("h") ? 60 : 1));
    if (bounded(n, 1, 1440)) changes.minutes = n;
  }
  const price =
    q.match(
      /(?:under|below|up to|at most|max(?:imum)?|budget(?: of)?)\s*([₱$€£¥]|php|usd|eur|gbp|jpy)?\s*(\d+(?:\.\d+)?)\b/,
    ) ?? q.match(/([₱$€£¥]|\bphp|\busd|\beur|\bgbp|\bjpy)\s*(\d+(?:\.\d+)?)\b/);
  if (
    price &&
    !/^(?:\s*)(?:minutes?|mins?|hours?|hrs?|km|miles?)\b/.test(
      q.slice((price.index ?? 0) + price[0].length),
    ) &&
    bounded(+price[2], 0, 10000000)
  ) {
    changes.budget = +price[2];
    if (price[1])
      changes.currency = currencyCode[price[1]] ?? price[1].toUpperCase();
  }
  if (
    /\bfree (only|entry|activities|things|places)\b|\bfor free\b|^free$/.test(q)
  )
    changes.budget = 0;
  const radius = q.match(
    /\b(\d+(?:\.\d+)?)\s*(km|kilomet(?:er|re)s?|miles?|mi)\b/,
  );
  if (radius) {
    const n = +radius[1] * (radius[2].startsWith("mi") ? 1.60934 : 1);
    if (bounded(n, 0.1, 20)) changes.radiusKm = Math.round(n * 100) / 100;
  }
  const mode = q.match(
    /\b(walk|walking|cycling|cycle|bicycle|bike|drive|driving|car)\b/,
  );
  if (mode) changes.mode = modes[mode[1]];
  if (/\b(indoors?|sheltered|dry|avoid rain)\b/.test(q)) changes.indoors = true;
  if (/\b(include outdoor|outdoors? too|any weather)\b/.test(q))
    changes.indoors = false;
  const chosen = Object.entries(interestGroups)
    .filter(([, words]) =>
      words.some((w) => new RegExp("\\b" + w + "s?\\b").test(q)),
    )
    .map(([label]) => label);
  if (chosen.length) changes.interests = chosen;
  if (/\b(any interest|all categories|anything|show everything)\b/.test(q))
    changes.interests = [];
  const day = q.match(/\b(today|tomorrow|this weekend|weekend)\b/);
  if (day) {
    const today = dateInZone(f.timeZone ?? "Asia/Manila"),
      d = new Date(today + "T12:00:00Z");
    if (day[1] === "tomorrow") d.setUTCDate(d.getUTCDate() + 1);
    else if (day[1].includes("weekend") && d.getUTCDay() !== 0)
      d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
    changes.date = d.toISOString().slice(0, 10);
  }
  const explicitTime = q.match(
    /\b(?:start(?:ing)?(?: at)?|from|leave at)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/,
  );
  const readTime = (
    h: string,
    m: string | undefined,
    ap: string | undefined,
  ) => {
    let hh = +h;
    const mm = +(m ?? 0);
    if (!bounded(mm, 0, 59) || !bounded(hh, ap ? 1 : 0, ap ? 12 : 23))
      return null;
    if (ap) hh = (hh % 12) + (ap === "pm" ? 12 : 0);
    return hh * 60 + mm;
  };
  if (explicitTime) {
    const t = readTime(explicitTime[1], explicitTime[2], explicitTime[3]);
    if (t !== null)
      changes.time =
        String(Math.floor(t / 60)).padStart(2, "0") +
        ":" +
        String(t % 60).padStart(2, "0");
  }
  const deadline = q.match(
    /\b(?:back (?:by|before)|return (?:by|before))\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/,
  );
  if (deadline && (deadline[3] || +deadline[1] > 12 || deadline[2])) {
    const end = readTime(deadline[1], deadline[2], deadline[3]),
      [h, m] = (changes.time ?? f.time).split(":").map(Number);
    if (end !== null && end > h * 60 + m)
      changes.minutes = Math.min(changes.minutes ?? 1440, end - (h * 60 + m));
  }
  return {
    changes,
    message: Object.keys(changes).length
      ? "Updated your search. You can edit any filter."
      : "Try a budget, time window, travel mode, interest or radius. For example: “90 minutes, under ₱300, somewhere dry.”",
  };
}
interface LocalModel {
  availability: () => Promise<string>;
  create: (
    options: Record<string, unknown>,
  ) => Promise<{ prompt: (s: string) => Promise<string>; destroy: () => void }>;
}
export async function interpretChat(
  text: string,
  f: Filters,
  useAI = false,
): Promise<ChatResult> {
  const fallback = parseChat(text, f);
  const model = (
    globalThis as typeof globalThis & { LanguageModel?: LocalModel }
  ).LanguageModel;
  if (!useAI || !model || !text.trim()) return fallback;
  let session: Awaited<ReturnType<LocalModel["create"]>> | undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    if ((await model.availability()) === "unavailable") return fallback;
    session = await model.create({
      signal: controller.signal,
      initialPrompts: [
        {
          role: "system",
          content:
            "Rewrite the user’s outing request into simple English preserving only explicitly stated facts. Use digits and units. Preserve currencies, budget, dates, times, activities and locations. Do not answer, add a place, assume a filter or invent any details. Output the rewritten request only.",
        },
      ],
    });
    const result = await session.prompt(text.slice(0, 800));
    if (result.length > 900) return fallback;
    // Explicitly parsed constraints always take precedence over model interpretation.
    const parsed = parseChat(result, f);
    return {
      changes: { ...parsed.changes, ...fallback.changes },
      message: Object.keys(parsed.changes).length
        ? "Suggested filters from on-device AI. Review your selections."
        : fallback.message,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
    session?.destroy();
  }
}
export async function getLocalAIStatus(): Promise<
  "available" | "downloadable" | "downloading" | "unavailable"
> {
  const model = (
    globalThis as typeof globalThis & { LanguageModel?: LocalModel }
  ).LanguageModel;
  try {
    const s = await model?.availability();
    return s === "available" || s === "downloadable" || s === "downloading"
      ? s
      : "unavailable";
  } catch {
    return "unavailable";
  }
}
