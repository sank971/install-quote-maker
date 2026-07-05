import type { ErpPart, SupplierOffer } from "./types";

export function selectBestSupplier(part: ErpPart, offers: SupplierOffer[]) {
  const salePrice = Number(part.sale_price) || 0;
  return offers
    .filter((offer) => offer.part_id === part.id)
    .map((offer) => {
      const totalCost = Number(offer.purchase_price) + Number(offer.shipping_cost ?? 0);
      return { ...offer, totalCost, margin: salePrice - totalCost };
    })
    .sort(
      (a, b) =>
        a.totalCost - b.totalCost ||
        (b.margin ?? 0) - (a.margin ?? 0) ||
        Number(a.lead_time_days ?? 9999) - Number(b.lead_time_days ?? 9999),
    )[0];
}
