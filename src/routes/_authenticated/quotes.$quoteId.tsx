import { createFileRoute, Link } from "@tanstack/react-router";
import { useOne, useList, useRemove } from "@/lib/db-hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Printer, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/quotes/$quoteId")({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { quoteId } = Route.useParams();
  const navigate = useNavigate();
  const { data: quote } = useOne<any>("quotes", quoteId);
  const { data: items = [] } = useQuery({
    queryKey: ["quote_items", "byQuote", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: quoteInstallations = [] } = useList<any>("quote_installations", {
    filter: (q: any) => q.eq("quote_id", quoteId),
    orderBy: "position",
    ascending: true,
    key: ["quote_installations", quoteId],
  });
  const { data: settings = [] } = useList<any>("app_settings");
  const { data: clients = [] } = useList<any>("clients");
  const { data: sites = [] } = useList<any>("sites");
  const { data: installs = [] } = useList<any>("installations");
  const { data: contracts = [] } = useList<any>("contracts");
  const remove = useRemove("quotes");

  if (!quote) return <p className="text-muted-foreground">Chargement...</p>;

  const client = clients.find((c: any) => c.id === quote.client_id);
  const site = sites.find((s: any) => s.id === quote.site_id);
  const linkedInstallations = quoteInstallations.length
    ? quoteInstallations
        .map((qi: any) => installs.find((i: any) => i.id === qi.installation_id))
        .filter(Boolean)
    : installs.filter((i: any) => i.id === quote.installation_id);
  const displayInstallations = linkedInstallations.length
    ? linkedInstallations
    : [{ id: "__general", name: "Chiffrage" }];
  const install = linkedInstallations[0];
  const contract = contracts.find((c: any) => c.id === quote.contract_id);
  const contractDiscountPct = Number(contract?.parts_discount_pct ?? 0);
  const contractTypeLabel = contract?.type ? String(contract.type) : contract?.name;

  const partsHT = items.reduce(
    (s: number, i: any) => s + Number(i.unit_price) * Number(i.quantity),
    0,
  );
  const laborHT = Number(quote.labor_hours ?? 0) * Number(quote.labor_rate ?? 0);
  const shippingFee = Number(quote.shipping_fee ?? 0);
  const wasteTreatmentFee = Number(quote.waste_treatment_fee ?? 0);
  const liftingEquipmentFee = Number(quote.lifting_equipment_fee ?? 0);
  const totalHT =
    partsHT +
    laborHT +
    Number(quote.travel_fee ?? 0) +
    shippingFee +
    wasteTreatmentFee +
    liftingEquipmentFee;
  const vat = (totalHT * Number(quote.vat_rate)) / 100;
  const totalTTC = totalHT + vat;
  const quoteSettings = settings.find((setting: any) => setting.key === "quote_document");
  const pageOneDescription = String(quoteSettings?.value?.description ?? "");
  const terms = String(
    quoteSettings?.value?.terms ?? "Devis valable 30 jours. Bon pour accord : date et signature.",
  );
  const fmt = (n: number) => n.toFixed(2) + " €";

  const del = async () => {
    if (!confirm("Supprimer ce devis ?")) return;
    await remove.mutateAsync(quoteId);
    navigate({ to: "/quotes" });
  };

  return (
    <div>
      <Link
        to="/quotes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ChevronLeft className="h-4 w-4" /> Devis
      </Link>
      <PageHeader
        title={quote.quote_number}
        description={`Émis le ${new Date(quote.issued_at).toLocaleDateString("fr-FR")}`}
        actions={
          <div className="print:hidden flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer / PDF
            </Button>
            <Button variant="ghost" onClick={del}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl bg-card p-8 shadow-sm print:shadow-none print:bg-white print:text-black">
        <div className="mb-8 flex items-start justify-between border-b border-border pb-6">
          <div>
            <div className="text-2xl font-semibold tracking-tight">DEVIS</div>
            <div className="mt-1 text-sm text-muted-foreground">N° {quote.quote_number}</div>
            <div className="text-sm text-muted-foreground">
              Date : {new Date(quote.issued_at).toLocaleDateString("fr-FR")}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">AutoMaintain</div>
            <div className="text-muted-foreground">Maintenance portes automatiques</div>
          </div>
        </div>

        <div className="mb-6 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client
            </div>
            <div className="font-medium">{client?.name}</div>
            <div className="text-muted-foreground">{client?.address}</div>
            <div className="text-muted-foreground">
              {[client?.email, client?.phone].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Intervention
            </div>
            <div>{site?.name}</div>
            <div className="text-muted-foreground">{site?.address}</div>
            {linkedInstallations.length > 0 && (
              <div className="text-muted-foreground">
                Installations : {linkedInstallations.map((x: any) => x.name).join(", ")}
              </div>
            )}
            {contractTypeLabel && (
              <div className="text-muted-foreground">Type de contrat : {contractTypeLabel}</div>
            )}
            <div className="text-muted-foreground">
              Intervention :{" "}
              {quote.intervention_reason === "damage_vandalism"
                ? "Casse / vandalisme"
                : quote.intervention_reason === "new_installation"
                  ? "Nouvelle installation"
                  : "Réparation hors casse"}
              {quote.is_on_call ? " · Astreinte" : ""}
            </div>
          </div>
        </div>

        {pageOneDescription && (
          <div className="mb-8 rounded-md bg-muted/40 p-4 text-sm print:bg-transparent">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </div>
            <div className="whitespace-pre-wrap">{pageOneDescription}</div>
          </div>
        )}

        <div className="print:break-before-page">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2">Désignation</th>
                <th className="py-2 text-right">Qté</th>
                <th className="py-2 text-right">PU HT</th>
                <th className="py-2 text-right">Réduc. contrat</th>
                <th className="py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {displayInstallations.flatMap((inst: any) => [
                <tr key={`inst-${inst.id}`} className="bg-muted/40 font-semibold">
                  <td className="py-2" colSpan={5}>
                    Installation : {inst.name}
                  </td>
                </tr>,
                ...items
                  .filter(
                    (i: any) =>
                      inst.id === "__general" ||
                      !i.installation_id ||
                      i.installation_id === inst.id,
                  )
                  .map((i: any) => (
                    <tr key={i.id}>
                      <td className="py-2">{i.description}</td>
                      <td className="py-2 text-right">{Number(i.quantity)}</td>
                      <td className="py-2 text-right">{fmt(Number(i.unit_price))}</td>
                      <td className="py-2 text-right">
                        {contractDiscountPct > 0 ? `${contractDiscountPct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {fmt(Number(i.unit_price) * Number(i.quantity))}
                      </td>
                    </tr>
                  )),
              ])}
              {Number(quote.labor_hours) > 0 && (
                <tr>
                  <td className="py-2">Main-d'œuvre</td>
                  <td className="py-2 text-right">{quote.labor_hours} h</td>
                  <td className="py-2 text-right">{fmt(Number(quote.labor_rate))}</td>
                  <td className="py-2 text-right">—</td>
                  <td className="py-2 text-right">{fmt(laborHT)}</td>
                </tr>
              )}
              {Number(quote.travel_fee) > 0 && (
                <tr>
                  <td className="py-2" colSpan={4}>
                    Déplacement
                  </td>
                  <td className="py-2 text-right">{fmt(Number(quote.travel_fee))}</td>
                </tr>
              )}
              {shippingFee > 0 && (
                <tr>
                  <td className="py-2" colSpan={4}>
                    Frais de port
                  </td>
                  <td className="py-2 text-right">{fmt(shippingFee)}</td>
                </tr>
              )}
              {wasteTreatmentFee > 0 && (
                <tr>
                  <td className="py-2" colSpan={4}>
                    Traitement déchets
                  </td>
                  <td className="py-2 text-right">{fmt(wasteTreatmentFee)}</td>
                </tr>
              )}
              {liftingEquipmentFee > 0 && (
                <tr>
                  <td className="py-2" colSpan={4}>
                    Engin de levage
                  </td>
                  <td className="py-2 text-right">{fmt(liftingEquipmentFee)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto w-full max-w-xs space-y-1 text-sm">
          {contractDiscountPct > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Réduction contrat pièces</span>
              <span>{contractDiscountPct.toFixed(2)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Total HT</span>
            <span>{fmt(totalHT)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>TVA {quote.vat_rate}%</span>
            <span>{fmt(vat)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total TTC</span>
            <span>{fmt(totalTTC)}</span>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-8 rounded-md bg-muted/40 p-4 text-sm print:bg-transparent">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </div>
            <div className="whitespace-pre-wrap">{quote.notes}</div>
          </div>
        )}

        <div className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground whitespace-pre-wrap">
          {terms}
        </div>
      </div>

      <style>{`@media print { @page { margin: 1.5cm; } body, html { background: white; } }`}</style>
    </div>
  );
}
