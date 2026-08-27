"use client";

import { useEffect, useRef } from "react";
import type { Recommendation } from "@/app/s/[token]/discover/page";

interface Props {
  recs: Recommendation[];
  highlighted: string[];
  propertyLat: number;
  propertyLng: number;
  onSelect: (id: string) => void;
}

export function DiscoverMap({ recs, highlighted, propertyLat, propertyLng, onSelect }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    let L: any;
    import("leaflet").then((mod) => {
      L = mod.default;

      // Guard against React Strict Mode double-init
      if ((divRef.current as any)?._leaflet_id || mapRef.current) return;

      try {
        mapRef.current = L.map(divRef.current!, {
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([propertyLat, propertyLng], 12);
      } catch {
        return; // container already initialized
      }

      // OpenStreetMap tiles (free, no API key needed) — desaturated via CSS
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        subdomains: "abc",
        maxZoom: 19,
      }).addTo(mapRef.current);

      layerRef.current = L.layerGroup().addTo(mapRef.current);
      drawMarkers(L, highlighted);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    import("leaflet").then((mod) => {
      drawMarkers(mod.default, highlighted);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted]);

  function drawMarkers(L: any, lit: string[]) {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    const pinHtml = (color: string, size: number, pulse: boolean) =>
      `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(53,30,28,0.3);${pulse ? "box-shadow:0 0 0 0 rgba(255,96,55,0.4);animation:disc-pulse 2s ease-out infinite" : ""}"></span>`;

    // Property pin
    L.marker([propertyLat, propertyLng], {
      icon: L.divIcon({ className: "", html: pinHtml("#351E1C", 14, true), iconSize: [14, 14], iconAnchor: [7, 7] }),
      zIndexOffset: 800,
    }).addTo(layerRef.current);

    recs.forEach((rec) => {
      if (!rec.lat || !rec.lng) return;
      const isLit = lit.includes(rec.id);
      const m = L.marker([rec.lat, rec.lng], {
        icon: L.divIcon({
          className: "",
          html: `<span style="display:inline-flex;align-items:center;gap:4px;cursor:pointer">${pinHtml(isLit ? "#FF6037" : "#733635", isLit ? 12 : 8, false)}<span style="font-family:monospace;font-size:9px;color:#351E1C;white-space:nowrap;text-shadow:0 1px 0 #F5F4ED,0 -1px 0 #F5F4ED,1px 0 #F5F4ED,-1px 0 #F5F4ED">${rec.name}</span></span>`,
          iconSize: null as any,
          iconAnchor: [6, 6],
        }),
        zIndexOffset: isLit ? 700 : 100,
        opacity: lit.length > 0 && !isLit ? 0.55 : 1,
      });
      m.on("click", () => onSelect(rec.id));
      m.addTo(layerRef.current);
    });

    // Fit to highlighted
    const pts = recs.filter((r) => lit.includes(r.id) && r.lat && r.lng);
    if (pts.length > 0) {
      const bounds = L.latLngBounds(
        pts.map((r) => [r.lat, r.lng] as [number, number]).concat([[propertyLat, propertyLng]])
      );
      mapRef.current?.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: true });
    }
  }

  return (
    <>
      <style>{`@keyframes disc-pulse{0%{box-shadow:0 0 0 0 rgba(255,96,55,0.4)}70%{box-shadow:0 0 0 10px rgba(255,96,55,0)}100%{box-shadow:0 0 0 0 rgba(255,96,55,0)}}`}</style>
      <div
        ref={divRef}
        style={{ width: "100%", height: "260px", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--jood-line)" }}
      />
    </>
  );
}
