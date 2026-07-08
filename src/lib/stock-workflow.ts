/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

export const partOrderLineStatuses = [
  "a_commander",
  "disponible_en_stock",
  "recuperation_a_planifier",
  "recuperation_planifiee",
  "en_cours_de_recuperation",
  "recuperee",
  "commandee_fournisseur",
  "recue_fournisseur",
  "partiellement_disponible",
  "indisponible",
  "annulee",
] as const;

export const commandTicketStatuses = [
  "brouillon",
  "analyse_stock",
  "pieces_disponibles_en_stock",
  "recuperation_a_planifier",
  "recuperation_en_cours",
  "attente_commande_fournisseur",
  "commande_fournisseur_en_cours",
  "reception_partielle",
  "pieces_pretes",
  "termine",
  "annule",
] as const;

export function distanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
) {
  if (
    [lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined || Number.isNaN(Number(v)))
  )
    return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(lat1))) * Math.cos(toRad(Number(lat2))) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function suggestStorageLocation(
  item: any,
  stocks: any[],
  locations: any[],
  reference: { latitude?: number | null; longitude?: number | null },
) {
  const requested = Number(item.quantity_requested ?? item.quantity ?? 1);
  const candidates = stocks
    .filter((stock) => stock.part_id === item.part_id)
    .map((stock) => {
      const location = locations.find(
        (loc) => loc.id === stock.storage_location_id && loc.is_active !== false,
      );
      const available =
        Number(stock.quantity_available || 0) - Number(stock.quantity_reserved || 0);
      const distance = location
        ? distanceKm(reference.latitude, reference.longitude, location.latitude, location.longitude)
        : null;
      return {
        stock,
        location,
        available,
        missing: Math.max(requested - available, 0),
        distance,
        hasEnough: available >= requested,
      };
    })
    .filter((candidate) => candidate.location && candidate.available > 0)
    .sort(
      (a, b) =>
        Number(b.hasEnough) - Number(a.hasEnough) ||
        (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE) ||
        b.available - a.available,
    );
  return candidates[0] ?? null;
}

export async function geocodeAddress(input: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const q = [input.address, input.postal_code, input.city, input.country]
    .filter(Boolean)
    .join(", ");
  if (!q) return { latitude: null, longitude: null };
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    {
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) return { latitude: null, longitude: null };
  const data = await response.json();
  const first = data?.[0];
  return {
    latitude: first ? Number(first.lat) : null,
    longitude: first ? Number(first.lon) : null,
  };
}

export async function geocodeStorageAddress(input: {
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}) {
  return geocodeAddress(input);
}

export async function refreshCommandTicketReadiness(
  partOrder: any,
  ticket: any,
  quote?: any | null,
) {
  const { data: status, error } = await (supabase.rpc as any)("refresh_part_order_status", {
    p_part_order_id: partOrder.id,
  });
  if (error) throw error;
  if (status === "pieces_pretes") {
    await Promise.all([
      (supabase.from("quotes" as any) as any)
        .update({ status: "pret_pour_intervention" })
        .eq("id", partOrder.quote_id ?? quote?.id)
        .neq("id", null),
      (supabase.from("tickets" as any) as any)
        .update({ status: "reparation_a_planifier" })
        .eq("id", ticket.id),
    ]);
  }
  return status as string;
}
