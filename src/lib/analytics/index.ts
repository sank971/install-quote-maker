/* eslint-disable @typescript-eslint/no-explicit-any */
// Profitability & analytics engine — pure functions over raw records.

export type CostSettings = {
  cost_per_km: number;
  fuel_price: number;
  vehicle_consumption: number;
  vehicle_cost_per_km: number;
  technician_hourly_cost: number;
  admin_hourly_cost: number;
  average_shipping_cost: number;
  minimum_margin_pct: number;
  agency_address?: string | null;
};

export const DEFAULT_COST_SETTINGS: CostSettings = {
  cost_per_km: 0.5,
  fuel_price: 1.8,
  vehicle_consumption: 7,
  vehicle_cost_per_km: 0.15,
  technician_hourly_cost: 45,
  admin_hourly_cost: 35,
  average_shipping_cost: 15,
  minimum_margin_pct: 25,
  agency_address: null,
};

export type Period = "day" | "week" | "month" | "quarter" | "year" | "all" | "custom";

export type Filters = {
  period: Period;
  from?: string; // ISO
  to?: string; // ISO
  clientId?: string;
  siteId?: string;
  contractId?: string;
  technicianId?: string;
  installationTypeId?: string;
  brandId?: string;
  supplierId?: string;
  interventionStatus?: string;
  quoteStatus?: string;
  partOrderStatus?: string;
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function periodRange(f: Filters): { from: Date | null; to: Date | null } {
  if (f.period === "all") return { from: null, to: null };
  if (f.period === "custom") {
    return {
      from: f.from ? new Date(f.from) : null,
      to: f.to ? new Date(f.to) : null,
    };
  }
  const to = new Date();
  const from = new Date();
  switch (f.period) {
    case "day":
      from.setHours(0, 0, 0, 0);
      break;
    case "week":
      from.setDate(from.getDate() - 7);
      break;
    case "month":
      from.setMonth(from.getMonth() - 1);
      break;
    case "quarter":
      from.setMonth(from.getMonth() - 3);
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  return { from, to };
}

export function inPeriod(dateStr: string | null | undefined, range: { from: Date | null; to: Date | null }) {
  if (!range.from && !range.to) return true;
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

// ----- Core computations -----

export function computeInterventionCost(intervention: any, settings: CostSettings) {
  const distance = n(intervention.distance_km);
  const travelMin = n(intervention.travel_minutes);
  const onsiteMin = n(intervention.onsite_minutes);
  const adminMin = n(intervention.admin_minutes);
  const km = distance * settings.vehicle_cost_per_km;
  const fuel = intervention.fuel_cost != null
    ? n(intervention.fuel_cost)
    : (distance * settings.vehicle_consumption * settings.fuel_price) / 100;
  const tolls = n(intervention.toll_parking_cost);
  const travelLabor = (travelMin / 60) * settings.technician_hourly_cost;
  const onsiteLabor = (onsiteMin / 60) * settings.technician_hourly_cost;
  const adminLabor = (adminMin / 60) * settings.admin_hourly_cost;
  const subcontractor = n(intervention.subcontractor_cost);
  const extra = n(intervention.extra_cost);
  return {
    travel: km + fuel + tolls + travelLabor,
    labor: onsiteLabor,
    admin: adminLabor,
    subcontractor,
    extra,
    total: km + fuel + tolls + travelLabor + onsiteLabor + adminLabor + subcontractor + extra,
  };
}

export function computeQuoteRevenue(quote: any, items: any[]) {
  const partsRevenue = items.reduce((s, it) => s + n(it.unit_price) * n(it.quantity), 0);
  const partsCost = items.reduce((s, it) => s + n(it.unit_cost) * n(it.quantity), 0);
  const laborRevenue =
    n(quote.labor_hours) * (n(quote.travel_count) || 1) * n(quote.labor_rate);
  const travelRevenue = n(quote.travel_fee);
  return {
    partsRevenue,
    partsCost,
    laborRevenue,
    travelRevenue,
    total: partsRevenue + laborRevenue + travelRevenue,
    grossMargin: partsRevenue - partsCost,
  };
}

export function computePartOrderCost(order: any, items: any[], settings: CostSettings) {
  const itemsCost = items.reduce((s, it) => {
    const cost = it.unit_purchase_cost_actual ?? it.unit_cost;
    return s + n(cost) * n(it.quantity);
  }, 0);
  const shipping = order.shipping_cost != null ? n(order.shipping_cost) : 0;
  const pickup = n(order.pickup_cost);
  const delivery = n(order.supplier_delivery_cost);
  return {
    items: itemsCost,
    shipping: shipping || (items.length > 0 ? settings.average_shipping_cost : 0),
    pickup,
    delivery,
    total:
      itemsCost +
      (shipping || (items.length > 0 ? settings.average_shipping_cost : 0)) +
      pickup +
      delivery,
  };
}

// ----- Aggregations -----

export type ProfitRow = {
  key: string;
  label: string;
  sublabel?: string;
  revenue: number;
  cost: number;
  grossMargin: number;
  netMargin: number;
  marginPct: number;
  interventionCount: number;
  quoteCount: number;
  acceptedQuotes: number;
  status: "green" | "amber" | "red";
};

function statusFor(marginPct: number, revenue: number, minMargin: number): "green" | "amber" | "red" {
  if (revenue <= 0) return "amber";
  if (marginPct < 0) return "red";
  if (marginPct < minMargin) return "amber";
  return "green";
}

export type Datasets = {
  quotes: any[];
  quoteItems: any[];
  interventions: any[];
  partOrders: any[];
  partOrderItems: any[];
  clients: any[];
  sites: any[];
  contracts: any[];
  installations: any[];
  parts: any[];
  suppliers: any[];
  brands: any[];
  installationTypes: any[];
  models: any[];
  supplierParts: any[];
  interventionReports: any[];
};

export function applyFilters(data: Datasets, f: Filters): Datasets {
  const range = periodRange(f);
  const q = data.quotes.filter((x) => {
    if (!inPeriod(x.issued_at ?? x.created_at, range)) return false;
    if (f.clientId && x.client_id !== f.clientId) return false;
    if (f.siteId && x.site_id !== f.siteId) return false;
    if (f.contractId && x.contract_id !== f.contractId) return false;
    if (f.quoteStatus && x.status !== f.quoteStatus) return false;
    return true;
  });
  const qIds = new Set(q.map((x) => x.id));
  const items = data.quoteItems.filter((x) => qIds.has(x.quote_id));

  const it = data.interventions.filter((x) => {
    if (!inPeriod(x.created_at, range)) return false;
    if (f.clientId && x.client_id !== f.clientId) return false;
    if (f.siteId && x.site_id !== f.siteId) return false;
    if (f.technicianId && x.technician_id !== f.technicianId) return false;
    if (f.interventionStatus && x.status !== f.interventionStatus) return false;
    return true;
  });

  const po = data.partOrders.filter((x) => {
    if (!inPeriod(x.created_at, range)) return false;
    if (f.partOrderStatus && x.status !== f.partOrderStatus) return false;
    if (f.supplierId && x.supplier_id !== f.supplierId) return false;
    return true;
  });
  const poIds = new Set(po.map((x) => x.id));
  const poItems = data.partOrderItems.filter((x) => poIds.has(x.part_order_id));

  const installs = data.installations.filter((x) => {
    if (f.installationTypeId && x.type_id !== f.installationTypeId) return false;
    if (f.brandId && x.brand_id !== f.brandId) return false;
    if (f.siteId && x.site_id !== f.siteId) return false;
    return true;
  });

  return {
    ...data,
    quotes: q,
    quoteItems: items,
    interventions: it,
    partOrders: po,
    partOrderItems: poItems,
    installations: installs,
  };
}

const acceptedStatuses = new Set(["accepte", "converti_en_bon_de_commande"]);

export function aggregateByClient(data: Datasets, settings: CostSettings): ProfitRow[] {
  const rows = new Map<string, ProfitRow>();
  const ensure = (id: string, label: string): ProfitRow => {
    let row = rows.get(id);
    if (!row) {
      row = {
        key: id,
        label,
        revenue: 0,
        cost: 0,
        grossMargin: 0,
        netMargin: 0,
        marginPct: 0,
        interventionCount: 0,
        quoteCount: 0,
        acceptedQuotes: 0,
        status: "green",
      };
      rows.set(id, row);
    }
    return row;
  };

  data.quotes.forEach((q) => {
    if (!q.client_id) return;
    const client = data.clients.find((c) => c.id === q.client_id);
    const row = ensure(q.client_id, client?.name ?? "Client inconnu");
    const items = data.quoteItems.filter((it) => it.quote_id === q.id);
    const rev = computeQuoteRevenue(q, items);
    row.quoteCount++;
    if (acceptedStatuses.has(q.status)) {
      row.acceptedQuotes++;
      row.revenue += rev.total;
      row.cost += rev.partsCost;
    }
  });

  data.interventions.forEach((i) => {
    if (!i.client_id) return;
    const client = data.clients.find((c) => c.id === i.client_id);
    const row = ensure(i.client_id, client?.name ?? "Client inconnu");
    row.interventionCount++;
    row.cost += computeInterventionCost(i, settings).total;
  });

  data.partOrders.forEach((po) => {
    const items = data.partOrderItems.filter((it) => it.part_order_id === po.id);
    const cost = computePartOrderCost(po, items, settings).total;
    if (!po.client_id) return;
    const client = data.clients.find((c) => c.id === po.client_id);
    const row = ensure(po.client_id, client?.name ?? "Client inconnu");
    row.cost += cost;
  });

  rows.forEach((row) => {
    row.grossMargin = row.revenue - row.cost;
    row.netMargin = row.grossMargin;
    row.marginPct = row.revenue > 0 ? (row.netMargin / row.revenue) * 100 : 0;
    row.status = statusFor(row.marginPct, row.revenue, settings.minimum_margin_pct);
  });
  return [...rows.values()].sort((a, b) => b.netMargin - a.netMargin);
}

export function aggregateByContract(data: Datasets, settings: CostSettings): ProfitRow[] {
  const rows = new Map<string, ProfitRow>();
  data.contracts.forEach((c) => {
    const client = data.clients.find((x) => x.id === c.client_id);
    rows.set(c.id, {
      key: c.id,
      label: c.name ?? c.contract_number ?? "Contrat",
      sublabel: client?.name,
      revenue: n(c.annual_amount ?? c.amount),
      cost: 0,
      grossMargin: 0,
      netMargin: 0,
      marginPct: 0,
      interventionCount: 0,
      quoteCount: 0,
      acceptedQuotes: 0,
      status: "green",
    });
  });
  data.interventions.forEach((i) => {
    if (!i.contract_id) return;
    const row = rows.get(i.contract_id);
    if (!row) return;
    row.interventionCount++;
    row.cost += computeInterventionCost(i, settings).total;
  });
  rows.forEach((row) => {
    row.grossMargin = row.revenue - row.cost;
    row.netMargin = row.grossMargin;
    row.marginPct = row.revenue > 0 ? (row.netMargin / row.revenue) * 100 : 0;
    row.status = statusFor(row.marginPct, row.revenue, settings.minimum_margin_pct);
  });
  return [...rows.values()].sort((a, b) => b.netMargin - a.netMargin);
}

export function aggregateBySite(data: Datasets, settings: CostSettings): ProfitRow[] {
  const rows = new Map<string, ProfitRow>();
  const ensure = (id: string, label: string, sub?: string) => {
    let r = rows.get(id);
    if (!r) {
      r = { key: id, label, sublabel: sub, revenue: 0, cost: 0, grossMargin: 0, netMargin: 0, marginPct: 0, interventionCount: 0, quoteCount: 0, acceptedQuotes: 0, status: "green" };
      rows.set(id, r);
    }
    return r;
  };
  data.interventions.forEach((i) => {
    if (!i.site_id) return;
    const site = data.sites.find((s) => s.id === i.site_id);
    const client = data.clients.find((c) => c.id === i.client_id);
    const row = ensure(i.site_id, site?.name ?? "Site", client?.name);
    row.interventionCount++;
    row.cost += computeInterventionCost(i, settings).total;
  });
  data.quotes.forEach((q) => {
    if (!q.site_id) return;
    const site = data.sites.find((s) => s.id === q.site_id);
    const client = data.clients.find((c) => c.id === q.client_id);
    const row = ensure(q.site_id, site?.name ?? "Site", client?.name);
    row.quoteCount++;
    if (acceptedStatuses.has(q.status)) {
      const items = data.quoteItems.filter((it) => it.quote_id === q.id);
      const rev = computeQuoteRevenue(q, items);
      row.acceptedQuotes++;
      row.revenue += rev.total;
      row.cost += rev.partsCost;
    }
  });
  rows.forEach((r) => {
    r.grossMargin = r.revenue - r.cost;
    r.netMargin = r.grossMargin;
    r.marginPct = r.revenue > 0 ? (r.netMargin / r.revenue) * 100 : 0;
    r.status = statusFor(r.marginPct, r.revenue, settings.minimum_margin_pct);
  });
  return [...rows.values()].sort((a, b) => b.interventionCount - a.interventionCount);
}

export function topParts(data: Datasets) {
  const map = new Map<string, { label: string; ref?: string; qty: number; orders: number; revenue: number; cost: number }>();
  data.partOrderItems.forEach((it) => {
    const key = it.part_id ?? it.designation ?? "unknown";
    const part = data.parts.find((p) => p.id === it.part_id);
    const row = map.get(key) ?? { label: part?.name ?? it.designation ?? "Pièce", ref: part?.reference, qty: 0, orders: 0, revenue: 0, cost: 0 };
    row.qty += n(it.quantity);
    row.orders += 1;
    row.cost += n(it.unit_purchase_cost_actual ?? it.unit_cost) * n(it.quantity);
    map.set(key, row);
  });
  data.quoteItems.forEach((it) => {
    if (!it.part_id) return;
    const part = data.parts.find((p) => p.id === it.part_id);
    const row = map.get(it.part_id) ?? { label: part?.name ?? "Pièce", ref: part?.reference, qty: 0, orders: 0, revenue: 0, cost: 0 };
    row.revenue += n(it.unit_price) * n(it.quantity);
    map.set(it.part_id, row);
  });
  return [...map.values()]
    .map((r) => ({ ...r, margin: r.revenue - r.cost, marginPct: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0 }))
    .sort((a, b) => b.qty - a.qty);
}

export function topSuppliers(data: Datasets) {
  const map = new Map<string, { label: string; orders: number; volume: number; distinctParts: Set<string> }>();
  data.partOrders.forEach((po) => {
    if (!po.supplier_id) return;
    const supplier = data.suppliers.find((s) => s.id === po.supplier_id);
    const row = map.get(po.supplier_id) ?? { label: supplier?.name ?? "Fournisseur", orders: 0, volume: 0, distinctParts: new Set<string>() };
    row.orders++;
    const items = data.partOrderItems.filter((it) => it.part_order_id === po.id);
    items.forEach((it) => {
      row.volume += n(it.unit_purchase_cost_actual ?? it.unit_cost) * n(it.quantity);
      if (it.part_id) row.distinctParts.add(it.part_id);
    });
    map.set(po.supplier_id, row);
  });
  return [...map.entries()]
    .map(([id, r]) => ({ key: id, label: r.label, orders: r.orders, volume: r.volume, distinctPartCount: r.distinctParts.size }))
    .sort((a, b) => b.volume - a.volume);
}

export function fleetBreakdown(data: Datasets) {
  const byType = new Map<string, number>();
  const byBrand = new Map<string, number>();
  const bySite = new Map<string, number>();
  data.installations.forEach((i) => {
    const type = data.installationTypes.find((t) => t.id === i.type_id)?.name ?? "Sans type";
    const brand = data.brands.find((b) => b.id === i.brand_id)?.name ?? "Sans marque";
    const site = data.sites.find((s) => s.id === i.site_id)?.name ?? "Sans site";
    byType.set(type, (byType.get(type) ?? 0) + 1);
    byBrand.set(brand, (byBrand.get(brand) ?? 0) + 1);
    bySite.set(site, (bySite.get(site) ?? 0) + 1);
  });
  const toRows = (m: Map<string, number>) =>
    [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return { byType: toRows(byType), byBrand: toRows(byBrand), bySite: toRows(bySite) };
}

export function computeTechnicians(data: Datasets, settings: CostSettings) {
  const map = new Map<string, { id: string; interventions: number; km: number; travelCost: number; totalCost: number }>();
  data.interventions.forEach((i) => {
    if (!i.technician_id) return;
    const row = map.get(i.technician_id) ?? { id: i.technician_id, interventions: 0, km: 0, travelCost: 0, totalCost: 0 };
    row.interventions++;
    row.km += n(i.distance_km);
    const c = computeInterventionCost(i, settings);
    row.travelCost += c.travel;
    row.totalCost += c.total;
    map.set(i.technician_id, row);
  });
  return [...map.values()].sort((a, b) => b.interventions - a.interventions);
}

export function computeGlobalKpis(data: Datasets, settings: CostSettings) {
  let revenue = 0;
  let partsCost = 0;
  let acceptedAmount = 0;
  let accepted = 0;
  data.quotes.forEach((q) => {
    const items = data.quoteItems.filter((it) => it.quote_id === q.id);
    const rev = computeQuoteRevenue(q, items);
    if (acceptedStatuses.has(q.status)) {
      revenue += rev.total;
      partsCost += rev.partsCost;
      acceptedAmount += rev.total;
      accepted++;
    }
  });
  const interventionCostBreakdown = data.interventions.reduce(
    (acc, i) => {
      const c = computeInterventionCost(i, settings);
      acc.travel += c.travel;
      acc.labor += c.labor + c.admin;
      acc.total += c.total;
      return acc;
    },
    { travel: 0, labor: 0, total: 0 },
  );
  const partOrdersAmount = data.partOrders.reduce((s, po) => {
    const items = data.partOrderItems.filter((it) => it.part_order_id === po.id);
    return s + computePartOrderCost(po, items, settings).total;
  }, 0);
  const shippingCost = data.partOrders.reduce((s, po) => {
    const items = data.partOrderItems.filter((it) => it.part_order_id === po.id);
    const c = computePartOrderCost(po, items, settings);
    return s + c.shipping + c.pickup + c.delivery;
  }, 0);
  const grossMargin = revenue - partsCost;
  const netMargin = revenue - (partsCost + interventionCostBreakdown.total + shippingCost);
  return {
    revenue,
    grossMargin,
    netMargin,
    marginPct: revenue > 0 ? (netMargin / revenue) * 100 : 0,
    interventionCount: data.interventions.length,
    quoteCount: data.quotes.length,
    acceptanceRate: data.quotes.length > 0 ? (accepted / data.quotes.length) * 100 : 0,
    acceptedAmount,
    partOrdersAmount,
    purchasesCost: partsCost,
    travelCost: interventionCostBreakdown.travel,
    laborCost: interventionCostBreakdown.labor,
    shippingCost,
    activeContracts: data.contracts.filter((c) => c.status === "actif" || c.status === "active" || !c.status).length,
  };
}

export function buildAlerts(clientRows: ProfitRow[], contractRows: ProfitRow[], siteRows: ProfitRow[], parts: ReturnType<typeof topParts>, suppliers: ReturnType<typeof topSuppliers>, settings: CostSettings) {
  const alerts: { level: "red" | "amber"; message: string }[] = [];
  contractRows.filter((c) => c.status === "red").forEach((c) =>
    alerts.push({ level: "red", message: `Contrat déficitaire : ${c.label} (${c.netMargin.toFixed(0)} €)` }),
  );
  clientRows.slice(0, 30).filter((c) => c.status === "red").forEach((c) =>
    alerts.push({ level: "red", message: `Client non rentable : ${c.label} (marge ${c.marginPct.toFixed(1)}%)` }),
  );
  siteRows.filter((s) => s.interventionCount >= 10).forEach((s) =>
    alerts.push({ level: "amber", message: `Site avec beaucoup d'interventions : ${s.label} (${s.interventionCount})` }),
  );
  parts.slice(0, 5).forEach((p) => {
    if (p.orders >= 5) alerts.push({ level: "amber", message: `Pièce très commandée : ${p.label} (${p.orders} commandes) — prévoir du stock.` });
    if (p.revenue > 0 && p.marginPct < settings.minimum_margin_pct) {
      alerts.push({ level: "amber", message: `Marge faible sur ${p.label} (${p.marginPct.toFixed(1)}%)` });
    }
  });
  suppliers.slice(0, 3).forEach((s) => {
    if (s.orders >= 10) alerts.push({ level: "amber", message: `Fournisseur à fort volume : ${s.label} — négocier les tarifs.` });
  });
  return alerts;
}
