"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  DEMO_ORIGIN,
  defaultFilters,
  demoSearch,
  searchNearby,
  findLocations,
  getCurrentOrigin,
  currencyForCountry,
  locationTimezone,
  dateInZone,
  safeUrl,
  type Filters,
  type Place as SharedPlace,
  type Origin,
} from "../lib/discovery";
import { interpretChat, getLocalAIStatus } from "../lib/chat";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Getting the map ready…</div>,
});
type IconName =
  | "arrow"
  | "sun"
  | "moon"
  | "pin"
  | "clock"
  | "calendar"
  | "walk"
  | "chevron"
  | "close"
  | "sparkle"
  | "check"
  | "settings"
  | "location"
  | "bike"
  | "car"
  | "external"
  | "rain"
  | "back";
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    moon: <path d="M20 15.2A9 9 0 0 1 8.8 4 9 9 0 1 0 20 15.2Z" />,
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 10h18" />
      </>
    ),
    walk: (
      <>
        <circle cx="14" cy="4" r="1.6" />
        <path d="m9 21 3-7-3-4 3-4 4 5 4 1M5 13l4-3m3 4 5 7" />
      </>
    ),
    chevron: <path d="m7 10 5 5 5-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    sparkle: (
      <>
        <path d="m10 3 2.2 6.8L19 12l-6.8 2.2L10 21l-2.2-6.8L1 12l6.8-2.2L10 3Z" />
        <path d="m20 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="16" cy="17" r="3" />
      </>
    ),
    location: (
      <>
        <circle cx="12" cy="12" r="6" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
      </>
    ),
    bike: (
      <>
        <circle cx="5" cy="16" r="4" />
        <circle cx="19" cy="16" r="4" />
        <path d="m5 16 5-9 5 9H5m5-9h5l4 9M8 4h4m3 0h3" />
      </>
    ),
    car: (
      <>
        <path d="m5 7 2-4h10l2 4 2 3v8H3v-8l2-3Zm-2 3h18M5 18v3m14-3v3M6 14h2m8 0h2" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14" />
        <path d="M11 3H4v17h17v-7" />
      </>
    ),
    rain: (
      <>
        <path d="M6 14a5 5 0 1 1 1-9 6 6 0 0 1 11 3 3 3 0 0 1 0 6H6Z" />
        <path d="m8 18-1 3m6-3-1 3m6-3-1 3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

type Place = SharedPlace & {
  area: string;
  image: string;
  cost: number | null;
  out: number | null;
  visit: number;
  back: number | null;
  shelter: string;
  live?: boolean;
  source?: string;
  uncertain?: boolean;
};
const defaults = defaultFilters();
function adapt(p: SharedPlace, live = false): Place {
  return {
    ...p,
    area: p.neighborhood,
    image: p.photo ?? "",
    cost: p.price,
    out: p.minutesOut,
    visit: p.visitMinutes,
    back: p.minutesBack,
    shelter:
      p.indoor === true
        ? "Indoor visit · check travel exposure"
        : p.indoor === false
          ? "Outdoor visit"
          : "Shelter information unavailable",
    live,
    source: safeUrl(p.sourceUrl) ?? undefined,
    uncertain: p.status === "uncertain",
  };
}
const categories = ["Cafés", "Art & culture", "Outdoors", "Food", "Shopping"];
const initialOrigin = DEMO_ORIGIN;
function money(n: number | null, currency: string) {
  return n === null
    ? "Price unknown"
    : `${currency === "PHP" ? "₱" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " "}${n}`;
}
export default function Home() {
  const [theme, setTheme] = useState("light");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(90);
  const [budget, setBudget] = useState<number | null>(300);
  const [budgetMin, setBudgetMin] = useState(0);
  const [radius, setRadius] = useState(3);
  const [mode, setMode] = useState("Walking");
  const [currency, setCurrency] = useState("PHP");
  const [interests, setInterests] = useState<string[]>([]);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState("14:00");
  const [when, setWhen] = useState("Today");
  const [origin, setOrigin] = useState<Origin>(initialOrigin);
  const [area, setArea] = useState("Makati");
  const [areaInput, setAreaInput] = useState("Makati, Philippines");
  const [places, setPlaces] = useState<Place[]>(
    demoSearch(defaults)
      .places.slice(0, 3)
      .map((p) => adapt(p)),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [popover, setPopover] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [listOnly, setListOnly] = useState(false);
  const [save, setSave] = useState(false);
  const [dry, setDry] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState("");
  const [weather, setWeather] = useState("Showers after 3 PM");
  const [zone, setZone] = useState("Asia/Manila");
  const request = useRef<AbortController | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [locationOptions, setLocationOptions] = useState<Origin[]>([]);
  const [resultKey, setResultKey] = useState("");
  const requestKey = useRef("");
  useEffect(() => {
    setDate(dateInZone(DEMO_ORIGIN.timezone));
    if (window.innerWidth > 950) setSelected("demo-coffee");
    try {
      setTheme(localStorage.getItem("roamday-theme") || "light");
    } catch {}
    try {
      const p = localStorage.getItem("roamday-preferences");
      if (p) {
        const v = JSON.parse(p);
        setBudget(
          v?.budget === null
            ? null
            : typeof v?.budget === "number" &&
                Number.isFinite(v.budget) &&
                v.budget >= 0
              ? v.budget
              : 300,
        );
        setBudgetMin(
          typeof v?.budgetMin === "number" &&
            Number.isFinite(v.budgetMin) &&
            v.budgetMin >= 0
            ? v.budgetMin
            : 0,
        );
        setCurrency(
          typeof v?.currency === "string" && /^[A-Z]{3}$/.test(v.currency)
            ? v.currency
            : "PHP",
        );
        setInterests(
          Array.isArray(v?.interests)
            ? v.interests.filter(
                (x: unknown) => typeof x === "string" && categories.includes(x),
              )
            : [],
        );
        setSave(true);
      }
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("roamday-theme", theme);
    } catch {}
  }, [theme]);
  const filters: Filters = {
    date,
    time,
    minutes: duration,
    budget,
    budgetMin,
    radiusKm: radius,
    currency,
    mode: mode.toLowerCase() as Filters["mode"],
    interests,
    indoors: dry,
    timeZone: zone,
  };
  const queryKey = JSON.stringify({
    lat: origin.lat,
    lon: origin.lon,
    filters,
  });
  const stale = !isDemo && resultKey !== queryKey;
  useEffect(() => {
    if (request.current && requestKey.current !== queryKey) {
      request.current.abort();
      setLoading(false);
    }
  }, [queryKey]);
  useEffect(() => () => request.current?.abort(), []);
  const filtered = isDemo
    ? demoSearch(filters)
        .places.slice(0, 3)
        .map((p) => adapt(p))
    : stale
      ? []
      : places;
  const confirmed = filtered.filter((p) => !p.uncertain),
    uncertain = filtered.filter((p) => p.uncertain);
  const displayed = listOnly
    ? filtered
    : [
        ...confirmed.slice(0, 3),
        ...uncertain.slice(0, Math.max(0, 3 - confirmed.length)),
      ];
  const active = filtered.find((p) => p.id === selected);
  const timeLabel = new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  function returnTime(p: Place) {
    if (p.out === null || p.back === null) return "Time unverified";
    const d = new Date(`2000-01-01T${time}`);
    d.setMinutes(d.getMinutes() + p.out + p.visit + p.back);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function toggleInterest(i: string) {
    setInterests((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]));
  }
  async function parsePrompt() {
    const q = prompt.trim();
    if (!q) return;
    const result = await interpretChat(q, filters, useAI);
    const c = result.changes;
    if (c.date) {
      setDate(c.date);
      setWhen("Choose date");
    }
    if (c.time) setTime(c.time);
    if (c.minutes !== undefined) setDuration(c.minutes);
    if (c.budget !== undefined) setBudget(c.budget);
    if (c.budgetMin !== undefined) setBudgetMin(c.budgetMin);
    if (c.radiusKm !== undefined) setRadius(c.radiusKm);
    if (c.interests) setInterests(c.interests);
    if (c.indoors !== undefined) setDry(c.indoors);
    if (c.currency) setCurrency(c.currency);
    if (c.mode) setMode(c.mode[0].toUpperCase() + c.mode.slice(1));
    setMessages((v) => [...v, q]);
    setStatus(result.message);
    setPrompt("");
  }
  async function chooseOrigin(nextOrigin: Origin) {
    setLoading(true);
    request.current?.abort();
    setPlaces([]);
    setSelected(null);
    setWeather("");
    setIsDemo(false);
    setOrigin(nextOrigin);
    setArea(nextOrigin.label.split(",")[0]);
    setZone("");
    setLocationOptions([]);
    try {
      const nextZone =
        nextOrigin.timezone || (await locationTimezone(nextOrigin));
      const updated = { ...nextOrigin, timezone: nextZone };
      setZone(nextZone);
      setDate(dateInZone(nextZone));
      setOrigin(updated);
      const cc = currencyForCountry(nextOrigin.countryCode);
      if (cc) setCurrency(cc);
      setPopover(null);
      await liveSearch(updated, {
        ...filters,
        timeZone: nextZone,
        date: dateInZone(nextZone),
        currency: cc ?? currency,
      });
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Location unavailable. Choose a named city.",
      );
      setLoading(false);
    }
  }
  async function findArea(useLocation = false) {
    setLoading(true);
    setStatus("");
    try {
      if (useLocation) {
        await chooseOrigin(await getCurrentOrigin());
        return;
      }
      const locations = await findLocations(areaInput);
      if (!locations.length)
        throw new Error("No location found. Try a city and country.");
      if (locations.length === 1) {
        await chooseOrigin(locations[0]);
      } else {
        setLocationOptions(locations);
        setStatus("Choose your starting area from the matching locations.");
      }
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Search unavailable. Please try another area.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function liveSearch(at = origin, currentFilters = filters) {
    if (
      !currentFilters.date ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(currentFilters.time)
    ) {
      setStatus("Choose a valid local date and time.");
      return;
    }
    if (
      currentFilters.budget !== null &&
      currentFilters.budget < (currentFilters.budgetMin ?? 0)
    ) {
      setStatus("Maximum spending must be at least the minimum.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    requestKey.current = JSON.stringify({
      lat: at.lat,
      lon: at.lon,
      filters: currentFilters,
    });
    setIsDemo(false);
    setLoading(true);
    setStatus("");
    setPlaces([]);
    setSelected(null);
    setWeather("");
    try {
      const result = await searchNearby(at, currentFilters, controller.signal);
      if (controller.signal.aborted) return;
      const mapped = result.places.map((p) => adapt(p, true));
      setPlaces(mapped);
      setResultKey(requestKey.current);
      setSelected(window.innerWidth > 950 ? (mapped[0]?.id ?? null) : null);
      setWeather(result.weather);
      setStatus(result.notice);
    } catch (e) {
      if (!controller.signal.aborted)
        setStatus(e instanceof Error ? e.message : "Live search unavailable.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function savePreferences() {
    try {
      if (save) {
        localStorage.removeItem("roamday-preferences");
        setSave(false);
        setStatus("Saved preferences removed.");
      } else {
        localStorage.setItem(
          "roamday-preferences",
          JSON.stringify({ budget, budgetMin, currency, interests }),
        );
        setSave(true);
        setStatus("Interests, budget and currency saved on this device.");
      }
    } catch {
      setStatus("This browser could not save preferences.");
    }
  }
  function reset() {
    setBudgetMin(0);
    setBudget(300);
    setCurrency("PHP");
    setDuration(90);
    setRadius(3);
    setMode("Walking");
    setInterests([]);
    setDry(false);
    setSave(false);
    try {
      localStorage.removeItem("roamday-preferences");
    } catch {}
    setStatus("Preferences reset.");
  }
  return (
    <div className="app-shell">
      <div className="explorer">
        <header className="site-header">
          <a href="/" className="brand" aria-label="Roamday home">
            <span className="brand-mark">
              <i />
              <i />
              <i />
            </span>
            roamday
          </a>
          <nav>
            <span className="nav-active">Explore</span>
            <button
              className="icon-button preferences"
              onClick={() =>
                setPopover(popover === "preferences" ? null : "preferences")
              }
              aria-label="Preferences"
            >
              <Icon name="settings" />
            </button>
            <span className="nav-divider" />
            <button
              className="theme-toggle icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={23} />
            </button>
          </nav>
        </header>
        <main>
          <div className="intro">
            <div>
              <button
                className="origin-label"
                onClick={() =>
                  setPopover(popover === "origin" ? null : "origin")
                }
              >
                <Icon name="pin" size={13} />
                {origin.label}
                <Icon name="chevron" size={13} />
              </button>
              <h1>An afternoon in {area}</h1>
            </div>
            <div className="weather">
              <Icon name="rain" size={26} />
              <span>
                {stale
                  ? "Weather pending search"
                  : weather || "Weather unavailable"}
                <small>
                  {isDemo
                    ? "Illustrative forecast"
                    : "Live weather information"}
                </small>
              </span>
            </div>
          </div>
          <form
            className="prompt-bar"
            onSubmit={(e) => {
              e.preventDefault();
              parsePrompt();
            }}
          >
            <span className="sparkle">
              <Icon name="sparkle" size={25} />
            </span>
            <input
              aria-label="Describe your outing"
              placeholder="Find somewhere dry for coffee"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button type="submit" aria-label="Apply your request">
              <Icon name="arrow" size={26} />
            </button>
          </form>
          <div className="filter-row">
            <div className="filter-wrap">
              <button
                className={`filter ${popover === "time" ? "open" : ""}`}
                onClick={() => setPopover(popover === "time" ? null : "time")}
              >
                <Icon name="calendar" />
                {when}, {timeLabel}
                <Icon name="chevron" size={15} />
              </button>
              {popover === "time" && (
                <div className="popover time-pop">
                  <h3>Make a little time</h3>
                  <div className="segmented">
                    {["Today", "Weekend", "Choose date"].map((d) => (
                      <button
                        key={d}
                        className={when === d ? "chosen" : ""}
                        onClick={() => {
                          setWhen(d);
                          if (d === "Weekend") {
                            const now = new Date(
                              dateInZone(zone) + "T12:00:00Z",
                            );
                            now.setUTCDate(
                              now.getUTCDate() +
                                ((6 - now.getUTCDay() + 7) % 7),
                            );
                            setDate(now.toISOString().slice(0, 10));
                          } else if (d === "Today") setDate(dateInZone(zone));
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <label>
                    Date
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setWhen("Choose date");
                      }}
                    />
                  </label>
                  <label>
                    Head out at
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </label>
                  <small>Local time at your destination · {zone}</small>
                  <button
                    className="primary compact"
                    onClick={() => setPopover(null)}
                  >
                    Set time
                    <Icon name="check" size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="filter-wrap">
              <label className="filter">
                <Icon name="clock" />
                <select
                  aria-label="Available time"
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value)}
                >
                  {Array.from(
                    new Set([30, 60, 90, 120, 180, 240, 480, duration]),
                  )
                    .sort((a, b) => a - b)
                    .map((v) => (
                      <option key={v} value={v}>
                        {v} min
                      </option>
                    ))}
                </select>
                <Icon name="chevron" size={15} />
              </label>
            </div>
            <div className="filter-wrap">
              <button
                className="filter"
                onClick={() =>
                  setPopover(popover === "budget" ? null : "budget")
                }
              >
                {budget === null
                  ? "Any budget"
                  : budgetMin
                    ? `${money(budgetMin, currency)}–${money(budget, currency)}`
                    : `${money(budget, currency)} max`}
                <Icon name="chevron" size={15} />
              </button>
              {popover === "budget" && (
                <div className="popover budget-pop">
                  <h3>A comfortable budget</h3>
                  <label>
                    Currency
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {!["PHP", "USD", "EUR"].includes(currency) && (
                        <option value={currency}>{currency}</option>
                      )}
                      <option value="PHP">PHP · Philippine peso</option>
                      <option value="USD">USD · US dollar</option>
                      <option value="EUR">EUR · Euro</option>
                    </select>
                  </label>
                  <label>
                    Minimum per person
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={budgetMin}
                      onChange={(e) =>
                        setBudgetMin(Math.max(0, +e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Maximum per person
                    <input
                      type="number"
                      min={budgetMin}
                      max="100000"
                      value={budget ?? ""}
                      placeholder="No maximum"
                      onChange={(e) =>
                        setBudget(
                          e.target.value === ""
                            ? null
                            : Math.max(0, +e.target.value),
                        )
                      }
                    />
                  </label>
                  {budget !== null && budget < budgetMin && (
                    <p role="alert">Maximum must be at least the minimum.</p>
                  )}
                  <p>
                    Travel and admission count toward your budget. Unknown costs
                    are marked for checking.
                  </p>
                  <button
                    className="primary compact"
                    onClick={() => setPopover(null)}
                  >
                    Set budget
                    <Icon name="check" size={16} />
                  </button>
                </div>
              )}
            </div>
            <label className="filter">
              <Icon name="pin" />
              <select
                aria-label="Search radius"
                value={radius}
                onChange={(e) => setRadius(+e.target.value)}
              >
                {Array.from(new Set([1, 3, 5, 10, 20, radius]))
                  .sort((a, b) => a - b)
                  .map((v) => (
                    <option key={v} value={v}>
                      {v} km
                    </option>
                  ))}
              </select>
              <Icon name="chevron" size={15} />
            </label>
            <label className="filter">
              <Icon
                name={
                  mode === "Walking"
                    ? "walk"
                    : mode === "Cycling"
                      ? "bike"
                      : "car"
                }
              />
              <select
                aria-label="Travel mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {["Walking", "Cycling", "Driving"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <Icon name="chevron" size={15} />
            </label>
            <button
              className={`filter more-filter ${interests.length ? "has-filter" : ""}`}
              onClick={() =>
                setPopover(popover === "interests" ? null : "interests")
              }
            >
              <Icon name="settings" size={17} />
              <span>
                Interests{interests.length ? ` · ${interests.length}` : ""}
              </span>
            </button>
          </div>
          {popover === "interests" && (
            <div className="inline-panel">
              <div className="panel-heading">
                <h3>What are you in the mood for?</h3>
                <button
                  className="icon-button"
                  aria-label="Close interests"
                  onClick={() => setPopover(null)}
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              <div className="interest-options">
                {categories.map((i) => (
                  <button
                    className={`interest ${interests.includes(i) ? "selected" : ""}`}
                    onClick={() => toggleInterest(i)}
                    key={i}
                  >
                    {interests.includes(i) && <Icon name="check" size={15} />}{" "}
                    {i}
                  </button>
                ))}
                <button
                  className={`interest ${dry ? "selected" : ""}`}
                  onClick={() => setDry(!dry)}
                >
                  <Icon name="rain" size={16} />
                  Somewhere dry
                </button>
              </div>
              <p>Leave interests open for a little of everything.</p>
            </div>
          )}
          {popover === "preferences" && (
            <div className="inline-panel">
              <div className="panel-heading">
                <h3>A little more you</h3>
                <button
                  className="icon-button"
                  aria-label="Close preferences"
                  onClick={() => setPopover(null)}
                >
                  <Icon name="close" />
                </button>
              </div>
              <p>
                Save interests, currency and budget on this device. Your
                location and conversation stay in this session.
              </p>
              <div className="preference-actions">
                <button className="primary compact" onClick={savePreferences}>
                  {save ? "Remove saved preferences" : "Save my preferences"}
                </button>
                <button className="text-button" onClick={reset}>
                  Reset preferences
                </button>
                <button
                  className="text-button"
                  onClick={async () => {
                    if (useAI) {
                      setUseAI(false);
                      setAiStatus(
                        "On-device AI disabled. Basic parsing is ready.",
                      );
                      return;
                    }
                    const availability = await getLocalAIStatus();
                    if (availability === "unavailable") {
                      setAiStatus(
                        "On-device AI is unavailable in this browser. Basic parsing is ready.",
                      );
                      return;
                    }
                    setUseAI(true);
                    setAiStatus(
                      availability === "available"
                        ? "On-device AI enabled. Requests stay on this device."
                        : "On-device AI enabled. Your next submitted request may download the browser model. Basic parsing remains available if canceled.",
                    );
                  }}
                >
                  {useAI ? "Disable on-device AI" : "Enable on-device AI"}
                </button>
              </div>
              <p>
                Optional local AI runs on this device. Enabling it may download
                a large browser model, using data and device storage when you
                next submit a request. No AI key or cloud chat is used.
              </p>
              {aiStatus && <p role="status">{aiStatus}</p>}
            </div>
          )}
          {popover === "origin" && (
            <div className="inline-panel origin-panel">
              <div className="panel-heading">
                <h3>Where shall we start?</h3>
                <button
                  className="icon-button"
                  aria-label="Close origin"
                  onClick={() => setPopover(null)}
                >
                  <Icon name="close" />
                </button>
              </div>
              <form
                className="area-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void findArea();
                }}
              >
                <input
                  aria-label="Search city or area"
                  placeholder="City, neighborhood or address"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                />
                <button className="primary compact" type="submit">
                  Find area
                  <Icon name="arrow" size={17} />
                </button>
              </form>
              {locationOptions.length > 0 && (
                <ul className="location-options">
                  {locationOptions.map((option, i) => (
                    <li key={`${option.lat}-${option.lon}-${i}`}>
                      <button onClick={() => void chooseOrigin(option)}>
                        <Icon name="pin" size={16} />
                        <span>{option.label}</span>
                        <Icon name="arrow" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="text-button location-button"
                onClick={() => void findArea(true)}
              >
                <Icon name="location" size={17} />
                Use my current location
              </button>
              <p>
                Live lookup shares your chosen area or location with
                OpenStreetMap, Overpass and Open-Meteo, or the configured
                Geoapify gateway. You can also choose an origin on the map.
                Location is never saved to preferences.
              </p>
            </div>
          )}
          {(status || messages.length > 0) && (
            <div className="status-message" role="status">
              <Icon name="sparkle" size={17} />
              <span>{status}</span>
              <button
                className="icon-button"
                aria-label="Dismiss status"
                onClick={() => {
                  setStatus("");
                  setMessages([]);
                }}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
          <div className="map-toolbar">
            <span>
              <span className="live-dot" />
              {isDemo
                ? "A little look around Legazpi"
                : "Around your starting point"}
            </span>
            <div>
              <button
                className="text-button"
                onClick={() => setListOnly(!listOnly)}
              >
                {listOnly ? "Show map" : "List view"}
              </button>
              <button
                className="text-button"
                disabled={loading || !zone}
                onClick={() => void liveSearch()}
              >
                {loading
                  ? "Looking nearby…"
                  : stale
                    ? "Update search"
                    : "Search live places"}
                <Icon name="arrow" size={14} />
              </button>
            </div>
          </div>
          {!listOnly && (
            <section className="map-section" aria-label="Nearby places map">
              <MapView
                demo={isDemo}
                places={filtered.map((p) => ({
                  id: p.id,
                  name: p.name,
                  lat: p.lat,
                  lon: p.lon,
                }))}
                origin={origin}
                selectedId={selected}
                onSelect={setSelected}
                onOriginChange={(p: { lat: number; lon: number }) => {
                  void chooseOrigin({ ...p, label: "Pinned location" });
                }}
              />
              <button
                className="map-origin"
                onClick={() => setPopover("origin")}
              >
                <span className="origin-dot" />
                Your starting point
                <Icon name="chevron" size={13} />
              </button>
              <div className="map-caption">
                {isDemo
                  ? "Illustrative places · explore the pilot"
                  : "Select a pin to explore"}
              </div>
            </section>
          )}
          <div className="results-heading">
            <div>
              <h2>
                {filtered.length
                  ? `${filtered.length} ${isDemo && !uncertain.length ? "places that fit" : "nearby discoveries"}`
                  : "No matching places yet"}
              </h2>
            </div>
          </div>
          {isDemo && (
            <div className="demo-note">
              <span>DESIGN PREVIEW</span>Illustrative venues, prices and
              journeys. Search live places for sourced nearby results.
            </div>
          )}
          {stale && (
            <div className="search-pending" role="status">
              {loading
                ? "Searching this area…"
                : "Your search has changed. Update search to see current places and weather."}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="result-groups">
              <span>
                {confirmed.length}{" "}
                {isDemo ? "illustrative fits" : "confirmed fits"}
              </span>
              <span>{uncertain.length} need verification</span>
              {!listOnly && filtered.length > 3 && (
                <button
                  className="text-button"
                  onClick={() => setListOnly(true)}
                >
                  Browse all {filtered.length} places
                  <Icon name="arrow" size={13} />
                </button>
              )}
            </div>
          )}
          {filtered.length ? (
            <div className="place-grid">
              {displayed.map((p, i) => (
                <button
                  key={p.id}
                  className={`place-card ${selected === p.id ? "selected" : ""}`}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="card-photo">
                    {p.image ? (
                      <img src={p.image} alt={`${p.category} interior`} />
                    ) : (
                      <div className="place-placeholder">
                        <Icon name="pin" size={35} />
                        <span>{p.category}</span>
                      </div>
                    )}
                    <span className="card-number">
                      {filtered.findIndex((item) => item.id === p.id) + 1}
                    </span>
                    <span className="shelter-badge">
                      {p.uncertain
                        ? "Needs verification"
                        : p.indoor === true
                          ? "Indoor visit"
                          : p.indoor === false
                            ? "Outdoor visit"
                            : "Shelter unknown"}
                    </span>
                  </div>
                  <div className="card-content">
                    <div className="card-title">
                      <h3>{p.name}</h3>
                      <Icon name="arrow" size={18} />
                    </div>
                    <p>
                      {p.category} <span>·</span> {p.area}
                    </p>
                    <div className="card-bottom">
                      <span>
                        <Icon name="clock" size={14} />
                        {p.out === null || p.back === null
                          ? "Journey unverified"
                          : `Back by ${returnTime(p)}`}
                      </span>
                      <strong>
                        {p.live && p.cost !== null && p.priceMax === null
                          ? "From "
                          : ""}
                        {money(p.cost, p.currency)}
                      </strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="sparkle" size={30} />
              <h3>
                {loading
                  ? "Looking for nearby places…"
                  : stale
                    ? "Ready when you are"
                    : "No places match these filters."}
              </h3>
              <p>
                {stale
                  ? "Update search using the current filters."
                  : "Try another interest, allow more time, or explore a wider area."}
              </p>
              {stale ? (
                <button
                  className="primary compact"
                  disabled={loading || !zone}
                  onClick={() => void liveSearch()}
                >
                  Update search
                </button>
              ) : (
                <button
                  className="primary compact"
                  onClick={() => {
                    setInterests([]);
                    setDuration(90);
                    setBudget(300);
                    setBudgetMin(0);
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          <footer className="explore-footer">
            <span>{isDemo ? "Makati preview" : "Nearby discovery"}</span>
            <button
              className="text-button"
              onClick={() => setPopover("preferences")}
            >
              Your preferences
              <Icon name="settings" size={13} />
            </button>
          </footer>
        </main>
      </div>
      {active && (
        <aside className="detail-panel" aria-label={`${active.name} details`}>
          <div className="detail-top">
            <button
              className="icon-button"
              aria-label="Close place details"
              onClick={() => setSelected(null)}
            >
              <Icon name="back" size={23} />
            </button>
            <span>PLACE DETAILS</span>
            <button
              className="icon-button"
              aria-label="Close place details"
              onClick={() => setSelected(null)}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="detail-scroll">
            <div className="detail-photo">
              {active.image ? (
                <img src={active.image} alt={active.name} />
              ) : (
                <div className="place-placeholder">
                  <Icon name="pin" size={45} />
                </div>
              )}
              <span className="photo-tag">
                <Icon name="rain" size={15} />
                {active.uncertain
                  ? "Needs verification"
                  : active.indoor === true
                    ? "Indoor visit"
                    : "Outdoor visit"}
              </span>
            </div>
            <div className="detail-content">
              <span className="detail-eyebrow">
                {active.area.toUpperCase()}
              </span>
              <h2>{active.name}</h2>
              <p className="detail-category">
                {active.category}
                <span> · </span>
                {active.area}
              </p>
              <span className="spend-pill">
                {active.live && active.cost !== null && active.priceMax === null
                  ? "From "
                  : ""}
                {money(active.cost, active.currency)}{" "}
                {active.cost === null
                  ? ""
                  : active.live
                    ? "mapped entry price"
                    : "estimated spend"}
              </span>
              <div className="return-box">
                <div className="return-label">
                  <Icon name="clock" size={17} />
                  {active.uncertain
                    ? "Journey timing unverified"
                    : "Your round-trip plan"}
                </div>
                <h3>
                  {active.out === null || active.back === null
                    ? "Return time unknown"
                    : `Back by ${returnTime(active)}`}
                </h3>
                <div className="timeline">
                  <div style={{ flex: active.out ?? 1 }} />
                  <div style={{ flex: active.visit }} />
                  <div style={{ flex: active.back ?? 1 }} />
                </div>
                <p>
                  {active.out === null
                    ? "Unknown route"
                    : `${active.out} min there`}
                  <span>·</span>
                  {active.visit} min visit<span>·</span>
                  {active.back === null
                    ? "Unknown return"
                    : `${active.back} min back`}
                </p>
              </div>
              <p className="place-description">{active.description}</p>
              <div className="detail-facts">
                <div>
                  <span className="fact-icon">
                    <Icon name="rain" />
                  </span>
                  <span>
                    <strong>
                      {active.indoor === true
                        ? "Sheltered visit"
                        : active.indoor === false
                          ? "Outdoor visit"
                          : "Shelter unverified"}
                    </strong>
                    <small>{active.shelter}</small>
                  </span>
                </div>
                <div>
                  <span className="fact-icon">
                    <Icon name="walk" />
                  </span>
                  <span>
                    <strong>
                      {active.out === null || active.back === null
                        ? "Travel time unverified"
                        : `${active.out + active.back} minutes on the move`}
                    </strong>
                    <small>{mode} · round trip estimate</small>
                  </span>
                </div>
              </div>
              <section className="evidence-section">
                <h3>
                  {active.live ? "Before you head out" : "A note before you go"}
                  <span>GOOD TO KNOW</span>
                </h3>
                <p>
                  {active.live
                    ? "Admission, current opening hours, route timing and shelter may be unverified. This is a discovery result, not a confirmed fit for your budget or return time."
                    : "This is an illustrative place for the Roamday pilot. The image, menu prices, opening hours, weather and travel times are not verified venue information."}
                </p>
                <div className="evidence-tags">
                  <span>Hours unverified</span>
                  <span>
                    {active.live ? "Price unverified" : "Example pricing"}
                  </span>
                </div>
              </section>
              {active.menu.length > 0 && (
                <section className="menu-section">
                  <h3>{isDemo ? "Illustrative menu" : "Menu highlights"}</h3>
                  {active.menu.map((item) => (
                    <div className="menu-item" key={item.name}>
                      <span>{item.name}</span>
                      <strong>{money(item.price, active.currency)}</strong>
                    </div>
                  ))}
                </section>
              )}
              {active.hours && (
                <p className="hours-note">
                  {isDemo ? "Illustrative hours" : "Mapped hours"}:{" "}
                  {active.hours}
                  {!isDemo ? " · confirm with venue" : ""}
                </p>
              )}
              {active.reasons.length > 0 && !isDemo && (
                <p className="hours-note">{active.reasons.join(" ")}</p>
              )}
              {(active.bookingUrl || active.menuUrl || active.website) && (
                <a
                  className="primary venue-button"
                  href={
                    safeUrl(
                      active.bookingUrl || active.menuUrl || active.website,
                    ) || "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {active.bookingUrl
                    ? "Book with venue"
                    : active.menuUrl
                      ? "View venue menu"
                      : "Visit venue website"}
                  <Icon name="external" size={17} />
                </a>
              )}
              {active.source && (
                <a
                  className="primary venue-button"
                  href={active.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View place source
                  <Icon name="external" size={17} />
                </a>
              )}
              <button
                className="primary venue-button"
                onClick={() => {
                  setSelected(null);
                  setPopover("origin");
                  setStatus(
                    "Choose an area, then search live places for sourced results.",
                  );
                }}
              >
                {active.live
                  ? "Explore another area"
                  : "Find a real place nearby"}
                <Icon name="arrow" size={20} />
              </button>
              <div className="venue-note">
                Reservations and purchases stay with the venue.
              </div>
            </div>
          </div>
        </aside>
      )}
      {!active && (
        <button
          className="reopen-detail"
          onClick={() => setSelected(filtered[0]?.id ?? null)}
          disabled={!filtered.length}
        >
          Open a place
          <Icon name="arrow" size={18} />
        </button>
      )}
    </div>
  );
}
