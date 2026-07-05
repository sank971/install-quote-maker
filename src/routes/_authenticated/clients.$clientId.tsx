import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useOne, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ChevronLeft, MapPin, Pencil, Trash2, User, Mail, Phone, Euro } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  component: ClientDetail,
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function quoteTotalTtc(quote: any, items: any[]) {
  const partsHT = items
    .filter((item: any) => item.quote_id === quote.id)
    .reduce(
      (sum: number, item: any) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0,
    );
  const laborHT =
    Number(quote.labor_hours ?? 0) *
    Number(quote.travel_count ?? 1) *
    Number(quote.labor_rate ?? 0);
  const feesHT =
    Number(quote.travel_fee ?? 0) +
    Number(quote.shipping_fee ?? 0) +
    Number(quote.waste_treatment_fee ?? 0) +
    Number(quote.oversized_shipping_fee ?? 0) +
    Number(quote.dump_evacuation_fee ?? 0) +
    Number(quote.lifting_equipment_fee ?? 0);
  const totalHT = partsHT + laborHT + feesHT;
  return totalHT * (1 + Number(quote.vat_rate ?? 20) / 100);
}

function ClientDetail() {
  const { clientId } = Route.useParams();
  const { data: client } = useOne<any>("clients", clientId);
  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "byClient", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["site_contacts", "byClient", clientId],
    enabled: sites.length > 0,
    queryFn: async () => {
      const siteIds = sites.map((s: any) => s.id);
      if (!siteIds.length) return [];
      const { data, error } = await supabase
        .from("site_contacts")
        .select("*")
        .in("site_id", siteIds)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const siteIds = sites.map((site: any) => site.id);
  const { data: installations = [] } = useList<any>("installations", {
    filter: (q: any) => q.in("site_id", siteIds),
    key: ["installations", "byClientSites", clientId, siteIds.join(",")],
    enabled: siteIds.length > 0,
  });
  const { data: contracts = [] } = useList<any>("contracts", { orderBy: "name", ascending: true });
  const { data: installationTypes = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: pricingTiers = [] } = useList<any>("contract_pricing_tiers");
  const { data: clientPricing = [] } = useList<any>("contract_client_pricing");
  const { data: quotes = [] } = useList<any>("quotes", {
    filter: (q: any) => q.eq("client_id", clientId),
    key: ["quotes", "byClient", clientId],
  });
  const { data: quoteItems = [] } = useList<any>("quote_items");

  const upsertSite = useUpsert("sites", [["sites"], ["sites", "byClient", clientId]]);
  const removeSite = useRemove("sites", [["sites"], ["sites", "byClient", clientId]]);
  const upsertContact = useUpsert("site_contacts", [["site_contacts", "byClient", clientId]]);
  const removeContact = useRemove("site_contacts", [["site_contacts", "byClient", clientId]]);

  const [siteOpen, setSiteOpen] = useState(false);
  const [siteEdit, setSiteEdit] = useState<any>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactEdit, setContactEdit] = useState<any>(null);
  const [contactSiteId, setContactSiteId] = useState<string>("");

  const openNewSite = () => {
    setSiteEdit({});
    setSiteOpen(true);
  };
  const openEditSite = (s: any) => {
    setSiteEdit(s);
    setSiteOpen(true);
  };
  const openNewContact = (siteId: string) => {
    setContactEdit({});
    setContactSiteId(siteId);
    setContactOpen(true);
  };
  const openEditContact = (c: any) => {
    setContactEdit(c);
    setContactSiteId(c.site_id);
    setContactOpen(true);
  };

  const submitSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsertSite.mutateAsync({
      id: siteEdit.id,
      client_id: clientId,
      name: fd.get("name"),
      address: fd.get("address") || null,
      email: fd.get("email") || null,
      contact_name: fd.get("contact_name") || null,
      contact_phone: fd.get("contact_phone") || null,
      notes: fd.get("notes") || null,
    });
    setSiteOpen(false);
  };

  const submitContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsertContact.mutateAsync({
      id: contactEdit.id,
      site_id: contactSiteId,
      name: fd.get("name"),
      role: fd.get("role") || null,
      phone: fd.get("phone") || null,
      email: fd.get("email") || null,
      notes: fd.get("notes") || null,
    });
    setContactOpen(false);
  };

  const installationCountByContractType = new Map<string, number>();
  const installationCountByType = new Map<string, number>();
  const installationCountByContractAndType = new Map<string, number>();

  installations.forEach((installation: any) => {
    const typeKey = installation.type_id ?? "none";
    installationCountByType.set(typeKey, (installationCountByType.get(typeKey) ?? 0) + 1);
    if (installation.contract_id) {
      const contract = contracts.find((row: any) => row.id === installation.contract_id);
      const contractType = contract?.type || "Sans type";
      installationCountByContractType.set(
        contractType,
        (installationCountByContractType.get(contractType) ?? 0) + 1,
      );
      installationCountByContractAndType.set(
        `${installation.contract_id}:${typeKey}`,
        (installationCountByContractAndType.get(`${installation.contract_id}:${typeKey}`) ?? 0) + 1,
      );
    }
  });

  const contractAnnualPriceForInstallation = (installation: any) => {
    const contract = contracts.find((row: any) => row.id === installation.contract_id);
    if (!contract) return 0;
    const count =
      installationCountByContractAndType.get(`${contract.id}:${installation.type_id ?? "none"}`) ??
      1;
    const tier = pricingTiers
      .filter(
        (row: any) =>
          row.contract_id === contract.id &&
          row.installation_type_id === installation.type_id &&
          Number(row.min_installations ?? 1) <= count,
      )
      .sort(
        (a: any, b: any) => Number(b.min_installations ?? 1) - Number(a.min_installations ?? 1),
      )[0];
    const customerAdjustment = clientPricing.find(
      (row: any) => row.contract_id === contract.id && row.client_id === clientId,
    );
    const basePrice = Number(tier?.base_annual_price ?? contract.flat_fee ?? 0);
    return basePrice * (1 + Number(customerAdjustment?.adjustment_pct ?? 0) / 100);
  };

  const contractTypeTotals = Array.from(installationCountByContractType.entries()).map(
    ([contractType, count]) => ({
      contractType,
      count,
      total: installations
        .filter((installation: any) => {
          const contract = contracts.find((row: any) => row.id === installation.contract_id);
          return (
            contract?.type === contractType || (!contract?.type && contractType === "Sans type")
          );
        })
        .reduce(
          (sum: number, installation: any) =>
            sum + contractAnnualPriceForInstallation(installation),
          0,
        ),
    }),
  );

  const realizedQuotesTotal = quotes
    .filter((quote: any) => ["envoye", "accepte", "pieces_commandees"].includes(quote.status))
    .reduce((sum: number, quote: any) => sum + quoteTotalTtc(quote, quoteItems), 0);
  const acceptedQuotesTotal = quotes
    .filter((quote: any) => ["accepte", "pieces_commandees"].includes(quote.status))
    .reduce((sum: number, quote: any) => sum + quoteTotalTtc(quote, quoteItems), 0);

  if (!client) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div>
      <Link
        to="/clients"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Clients
      </Link>
      <PageHeader
        title={client.client_number ? `${client.client_number} · ${client.name}` : client.name}
        description={[
          client.siret ? `SIRET ${client.siret}` : null,
          client.contact_name,
          client.email,
          client.phone,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Button onClick={openNewSite}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau site
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">SIRET :</span> {client.siret || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Adresse :</span> {client.address || "—"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Notes :</span> {client.notes || "—"}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Synthèse commerciale</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm lg:grid-cols-3">
          <div className="space-y-2">
            <div className="font-medium">Installations par type</div>
            {Array.from(installationCountByType.entries()).map(([typeId, count]) => {
              const type = installationTypes.find((row: any) => row.id === typeId);
              return (
                <div key={typeId} className="flex justify-between gap-3 text-muted-foreground">
                  <span>{type?.name ?? "Sans type"}</span>
                  <span>{count}</span>
                </div>
              );
            })}
            {installationCountByType.size === 0 && (
              <p className="text-muted-foreground">Aucune installation</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="font-medium">Contrats par type</div>
            {contractTypeTotals.map((row) => (
              <div
                key={row.contractType}
                className="flex justify-between gap-3 text-muted-foreground"
              >
                <span>
                  {row.contractType} · {row.count} install.
                </span>
                <span>{formatCurrency(row.total)}</span>
              </div>
            ))}
            {contractTypeTotals.length === 0 && (
              <p className="text-muted-foreground">Aucun contrat lié</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="font-medium">Devis</div>
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>Réalisé</span>
              <span>{formatCurrency(realizedQuotesTotal)}</span>
            </div>
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>Validé</span>
              <span>{formatCurrency(acceptedQuotesTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Sites ({sites.length})
      </h2>

      {sites.length === 0 ? (
        <EmptyState title="Aucun site" description="Ajoutez un site pour ce client." />
      ) : (
        <div className="grid gap-3">
          {sites.map((s: any) => {
            const siteContacts = contacts.filter((c: any) => c.site_id === s.id);
            return (
              <Card key={s.id} className="p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to="/site/$siteSlug"
                        params={{ siteSlug: s.site_number ?? s.id }}
                        className="truncate font-medium hover:underline"
                      >
                        {s.site_number ? `${s.site_number} · ` : ""}
                        {s.name}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.address || "—"}
                      </div>
                      {(s.email || s.contact_name || s.contact_phone) && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[s.contact_name, s.contact_phone, s.email].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {(() => {
                        const siteInstallations = installations.filter(
                          (installation: any) => installation.site_id === s.id,
                        );
                        const contractedInstallations = siteInstallations.filter(
                          (installation: any) => installation.contract_id,
                        );
                        const siteContractPrice = contractedInstallations.reduce(
                          (sum: number, installation: any) =>
                            sum + contractAnnualPriceForInstallation(installation),
                          0,
                        );
                        return (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                              {siteInstallations.length} installation(s)
                            </span>
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                              {contractedInstallations.length} sous contrat
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                              <Euro className="h-3 w-3" />
                              {formatCurrency(siteContractPrice)} / an
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditSite(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Supprimer ${s.name} ?`)) removeSite.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 border-t border-border/60 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Contacts ({siteContacts.length})
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openNewContact(s.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Contact
                    </Button>
                  </div>
                  {siteContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun contact</p>
                  ) : (
                    <div className="space-y-1.5">
                      {siteContacts.map((c: any) => (
                        <div
                          key={c.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
                        >
                          <div className="min-w-0 text-xs">
                            <div className="flex items-center gap-1.5 font-medium">
                              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{c.name}</span>
                              {c.role && (
                                <span className="truncate text-muted-foreground">— {c.role}</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                              {c.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {c.phone}
                                </span>
                              )}
                              {c.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {c.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditContact(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                if (confirm(`Supprimer ${c.name} ?`)) removeContact.mutate(c.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={siteOpen} onOpenChange={setSiteOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{siteEdit?.id ? "Modifier" : "Nouveau"} site</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitSite} className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={siteEdit?.name} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input name="address" defaultValue={siteEdit?.address} />
            </div>
            <div>
              <Label>Email du site</Label>
              <Input name="email" type="email" defaultValue={siteEdit?.email} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact principal</Label>
                <Input name="contact_name" defaultValue={siteEdit?.contact_name} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="contact_phone" defaultValue={siteEdit?.contact_phone} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} defaultValue={siteEdit?.notes} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSiteOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{contactEdit?.id ? "Modifier" : "Nouveau"} contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitContact} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nom *</Label>
                <Input name="name" required defaultValue={contactEdit?.name} />
              </div>
              <div>
                <Label>Rôle / fonction</Label>
                <Input
                  name="role"
                  placeholder="Responsable, gardien..."
                  defaultValue={contactEdit?.role}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Téléphone</Label>
                <Input name="phone" defaultValue={contactEdit?.phone} />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={contactEdit?.email} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} defaultValue={contactEdit?.notes} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setContactOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
