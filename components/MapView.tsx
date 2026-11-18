"use client";

import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";
import type { Origin } from "../lib/discovery";
interface Point {
  lat: number;
  lon: number;
}
interface Props {
  origin: Point;
  places: ({ id: string; name: string } & Point)[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOriginChange?: (point: Point) => void;
  onPick?: (point: Origin) => void;
  picking?: boolean;
  demo?: boolean;
}
const previewBounds: L.LatLngBoundsExpression = [
  [14.5448, 121.0012],
  [14.5668, 121.039],
];
function icon(html: string, size: number, origin = false) {
  return L.divIcon({
    className: "rd-leaflet-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, origin ? size / 2 : size],
  });
}
export default function MapView(props: Props) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    latest = useRef(props),
    pins = useRef<L.LayerGroup | null>(null);
  const [picking, setPicking] = useState(false),
    pickRef = useRef(false),
    [offline, setOffline] = useState(false);
  latest.current = props;
  pickRef.current = picking || !!props.picking;
  const demo =
    props.demo ??
    (props.places.length > 0 &&
      props.places.every((p) =>
        /^(demo-|coffee$|gallery$|arcade$)/.test(p.id),
      ));
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      zoomSnap: 0.25,
      minZoom: 2,
      maxZoom: 19,
    });
    map.current = m;
    L.control.zoom({ position: "topright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    m.on("click", (event: L.LeafletMouseEvent) => {
      if (!pickRef.current) return;
      const p = {
        lat: event.latlng.lat,
        lon: ((event.latlng.lng + 540) % 360) - 180,
      };
      if (latest.current.onPick)
        latest.current.onPick({ ...p, label: "Map pin" });
      else latest.current.onOriginChange?.(p);
      setPicking(false);
    });
    pins.current = L.layerGroup().addTo(m);
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(el.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      pins.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    setOffline(false);
    if (demo) {
      const layer = L.imageOverlay("/images/makati-map.svg", previewBounds, {
        interactive: false,
      }).addTo(m);
      return () => {
        layer.remove();
      };
    }
    const layer = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, updateWhenIdle: true, keepBuffer: 1 },
    ).addTo(m);
    let failed = false;
    layer.on("tileerror", () => {
      failed = true;
      setOffline(true);
    });
    layer.on("loading", () => {
      failed = false;
    });
    layer.on("load", () => setOffline(failed));
    return () => {
      layer.off();
      layer.remove();
    };
  }, [demo]);
  const coordinates = props.places
    .map((p) => [p.id, p.lat, p.lon].join(","))
    .join("|");
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const positions: L.LatLngTuple[] = [
      [props.origin.lat, props.origin.lon],
      ...latest.current.places.map((p): L.LatLngTuple => [p.lat, p.lon]),
    ];
    if (positions.length === 1) m.setView(positions[0], 15);
    else
      m.fitBounds(L.latLngBounds(positions), {
        paddingTopLeft: [55, 45],
        paddingBottomRight: [48, 34],
        maxZoom: demo ? 16 : 16.5,
        animate: false,
      });
  }, [coordinates, props.origin.lat, props.origin.lon, demo]);
  useEffect(() => {
    const group = pins.current;
    if (!group) return;
    group.clearLayers();
    L.marker([props.origin.lat, props.origin.lon], {
      icon: icon('<span class="rd-origin"></span>', 24, true),
      interactive: false,
      title: "Starting point",
    }).addTo(group);
    props.places.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lon], {
        icon: icon(
          '<span class="rd-pin ' +
            (props.selectedId === p.id ? "rd-pin-selected" : "") +
            '"><b>' +
            (i + 1) +
            "</b></span>",
          32,
        ),
        title: p.name,
        alt: "Place " + (i + 1) + ", " + p.name,
        zIndexOffset: props.selectedId === p.id ? 700 : 100,
      }).addTo(group);
      marker.on("click", () => latest.current.onSelect(p.id));
    });
  }, [props.places, props.origin.lat, props.origin.lon, props.selectedId]);
  return (
    <div
      className={"rd-map " + (picking || props.picking ? "rd-map-picking" : "")}
    >
      <div
        ref={el}
        className="rd-map-canvas"
        aria-label="Map of nearby places"
      />
      {(props.onOriginChange || props.onPick) && !props.picking && (
        <button
          type="button"
          className="rd-pick"
          aria-pressed={picking}
          onClick={() => setPicking((v) => !v)}
        >
          {picking ? "Tap map · Cancel" : "Drop a pin"}
        </button>
      )}
      {offline && (
        <span className="rd-tile-status">
          Street tiles unavailable · pins show coordinates
        </span>
      )}
      <span className="rd-map-credit">
        {demo ? (
          "Illustrated preview"
        ) : (
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
        )}
      </span>
    </div>
  );
}
