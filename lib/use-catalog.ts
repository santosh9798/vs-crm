"use client";

import { useEffect, useState } from "react";
import { loadCatalog, MOCK_CATALOG, type ResolvedCatalog } from "@/lib/catalog";

export function useCatalog(apiUrl: string, apiKey: string) {
  const [catalog, setCatalog] = useState<ResolvedCatalog>(MOCK_CATALOG);
  const [status, setStatus] = useState<"mock" | "live" | "loading" | "error">(
    apiUrl.trim() ? "loading" : "mock",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const url = apiUrl.trim();
    if (!url) {
      setCatalog(MOCK_CATALOG);
      setStatus("mock");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    loadCatalog(url, apiKey)
      .then((c) => {
        if (cancelled) return;
        setCatalog(c);
        setStatus("live");
        setError("");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setCatalog(MOCK_CATALOG);
        setStatus("error");
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, apiKey]);

  return { catalog, status, error };
}

export function planNamesFromCatalog(catalog: ResolvedCatalog) {
  const names = new Set<string>();
  for (const space of catalog.spaces) {
    for (const plan of space.plans) {
      if (plan.name) names.add(plan.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function citiesInState(catalog: ResolvedCatalog, stateName: string) {
  if (!stateName) return [];
  const seen = new Set<string>();
  return catalog.cities
    .filter((c) => c.stateId === stateName || c.id.startsWith(`${stateName}|`))
    .filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function locationsInPlace(catalog: ResolvedCatalog, stateName: string, cityName: string) {
  return catalog.spaces
    .filter((s) => (s.state || "") === stateName)
    .filter((s) => !cityName || (s.city || "") === cityName)
    .map((s) => s.location || s.name)
    .filter(Boolean)
    .filter((name, i, all) => all.indexOf(name) === i)
    .sort((a, b) => a.localeCompare(b));
}
