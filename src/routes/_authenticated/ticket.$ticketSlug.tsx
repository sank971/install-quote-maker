/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  FileText,
  PackageCheck,
  CheckCircle2,
  UserCheck,
  History,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useList, useOneByRouteParam } from "@/lib/db-hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { canCloseTicket, currentUserId, setTicketStatus } from "@/lib/ticket-workflow";

export const Route = createFileRoute("/_authenticated/ticket/$ticketSlug")({
  component: TicketDetail,
});

function num(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    en_attente_assignation: "bg-gray-100 text-gray-800",
    diagnostic_en_cours: "bg-blue-100 text-blue-800",
    diagnostic_termine: "bg-blue-200 text-blue-900",
    rapport_a_rediger: "bg-yellow-100 text-yellow-800",
    devis_a_creer: "bg-orange-100 text-orange-800",
    en_attente_pieces: "bg-orange-100 text-orange-800",
    pieces_recues: "bg-green-100 text-green-800",
    reparation_a_planifier: "bg-purple-100 text-purple-800",
    reparation_en_cours: "bg-purple-200 text-purple-900",
    bon_de_commande_recu: "bg-green-200 text-green-900",
    probleme_persistant: "bg-red-100 text-red-800",
    termine: "bg-green-300 text-green-900",
    cloture: "bg-gray-300 text-gray-900",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

function TicketDetail() {
  const { ticketSlug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: ticket } = useOneByRouteParam<any>("tickets", ticketSlug, "ticket_number");
  const ticketId = ticket?.id;
  const { data: clients = [] } = useList<any>("clients");
  const { data: sites = [] } = useList<any>("sites");
  const { data: installations = [] } = useList<any>("installations");
  const { data: interventions = [] } = useList<any>("interventions");
  const { data: reports = [] } = useList<any>("intervention_reports");
  const { data: quotes = [] } = useList<any>("quotes");
  const { data: quoteTickets = [] } = useList<any>("quote_tickets");
  const { data: purchaseOrders = [] } = useList<any>("purchase_orders");
  const { data: partOrders = [] } = useList<any>("part_orders");
  const { data: history = [] } = useList<any>("history_events");
  const { data: suppliers = [] } = useList<any>("suppliers");
  const { data: parts = [] } = useList<any>("parts");
  const { data: types = [] } = useList<any>("installation_types");
  const { data: models = [] } = useList<any>("models");
  const { data: installationParts = [] } = useList<any>("installation_parts");
  const { data: partCategories = [] } = useList<any>("part_categories", {
    orderBy: "name",
    ascending: true,
  });

  const [expandedIntervention, setExpandedIntervention] = useState<string | null>(null);
  const [selectedPartTypes, setSelectedPartTypes] = useState<string[]>([]);

  const invalidate = () =>
    [
      "tickets",
      "interventions",
      "intervention_reports",
      "quotes",
      "purchase_orders",
      "part_orders",
      "history_events",
      "quote_tickets",
    ].forEach((t) => qc.invalidateQueries({ queryKey: [t] }));

  if (!ticket) return <p className="text-muted-foreground">Chargement...</p>;

  const site = sites.find((s: any) => s.id === ticket.site_id);
  const client = clients.find((c: any) => c.id === ticket.client_id);
  const installation = installations.find((i: any) => i.id === ticket.installation_id);

  // Get related data
  const ticketInterventions = interventions.filter((i: any) => i.ticket_id === ticketId);
  const ticketReports = reports.filter((r: any) => r.ticket_id === ticketId);
  const ticketQuotes = quotes.filter((q: any) => q.ticket_id === ticketId);
  const ticketPOs = purchaseOrders.filter((p: any) => p.ticket_id === ticketId);
  const ticketPartOrders = partOrders.filter((p: any) => p.ticket_id === ticketId);
  const ticketHistory = history.filter((h: any) => h.ticket_id === ticketId);

  // Get quotes linked to this ticket via quote_tickets
  const linkedQuoteIds = new Set(
    quoteTickets.filter((qt: any) => qt.ticket_id === ticketId).map((qt: any) => qt.quote_id),
  );
  const linkedQuotes = quotes.filter((q: any) => linkedQuoteIds.has(q.id));

  // Get part types for this installation
  const installationModel = models.find((m: any) => m.id === installation?.model_id);
  const effectiveTypeId = installation?.type_id || installationModel?.type_id;
  const installationType = types.find((t: any) => t.id === effectiveTypeId);
  const componentTypes = Array.isArray(installationType?.component_types)
    ? installationType.component_types
    : [];
  const availablePartTypes = [
    ...new Set(
      (componentTypes.length
        ? componentTypes.map((name: unknown) => String(name))
        : partCategories.map((category: any) => String(category.name))
      ).filter(Boolean),
    ),
  ];

  const formatPartTypeList = (value: unknown) => {
    const values = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
    return values
      .map((item) => String(item))
      .filter(Boolean)
      .join(", ");
  };

  const assign = async (intervention: any) => {
    const user = await currentUserId();
    const { error } = await (supabase.from("interventions" as any) as any)
      .update({ status: "assignee", technician_id: user })
      .eq("id", intervention.id);
    if (error) return toast.error(error.message);
    invalidate();
    toast.success("Intervention assignée");
  };

  const updateIntervention = async (intervention: any, status: string) => {
    const patch: any = { status };
    if (status === "en_cours") patch.started_at = new Date().toISOString();
    if (["terminee", "echec"].includes(status)) patch.completed_at = new Date().toISOString();
    const { error } = await (supabase.from("interventions" as any) as any)
      .update(patch)
      .eq("id", intervention.id);
    if (error) return toast.error(error.message);
    await setTicketStatus(
      ticket,
      status === "en_cours"
        ? intervention.type === "reparation"
          ? "reparation_en_cours"
          : "diagnostic_en_cours"
        : status === "rapport_a_rediger"
          ? "rapport_a_rediger"
          : ticket.status,
      `intervention_${status}`,
      `Intervention ${status}`,
    );
    invalidate();
  };

  const createReport = async (e: any, intervention: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const owner_id = await currentUserId();
    const ok = fd.get("reparation_reussie") === "true";
    const partId = fd.get("part_id");
    const problemPartTypes = fd.getAll("problem_part_types").map((value) => String(value));
    const successParts = partId
      ? [{ part_id: partId, quantity: Number(fd.get("quantity") || 1) }]
      : [];
    const report = {
      owner_id,
      ticket_id: ticketId,
      intervention_id: intervention.id,
      site_id: ticket.site_id,
      installation_id: ticket.installation_id,
      technician_id: intervention.technician_id,
      constat: fd.get("constat"),
      actions_realisees: fd.get("actions"),
      conclusion: fd.get("conclusion"),
      reparation_reussie: fd.get("reparation_reussie") ? ok : null,
      besoin_devis: fd.get("besoin_devis") === "on",
      besoin_commande_pieces: fd.get("besoin_commande_pieces") === "on",
      pieces_defectueuses: problemPartTypes.map((type) => ({ type })),
      pieces_remplacees: problemPartTypes.map((type) => ({ type, quantity: 1 })),
      pieces_remplacees_succes: successParts,
      problem_part_type: problemPartTypes[0] ?? null,
    };
    const { error } = await (supabase.from("intervention_reports" as any) as any).insert(report);
    if (error) return toast.error(error.message);

    await setTicketStatus(
      ticket,
      report.besoin_devis
        ? "devis_a_creer"
        : report.besoin_commande_pieces
          ? "en_attente_pieces"
          : ok
            ? "termine"
            : "probleme_persistant",
      ok ? "repair_success" : "repair_failed",
      ok ? "Réparation réussie" : "Rapport traité",
    );
    e.currentTarget.reset();
    setSelectedPartTypes([]);
    invalidate();
    toast.success("Rapport créé");
  };

  const createQuoteFromTicket = async () => {
    if (!ticket || !installation) return toast.error("Données manquantes");
    const owner_id = await currentUserId();
    try {
      const number = `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      // Get linked tickets with the same installation
      const groupTicketIds = new Set<string>();
      groupTicketIds.add(ticketId);

      // Find the diagnostic report to get the reported faulty/replacement part types
      const diagnosticReport = ticketReports.find((r: any) => {
        const intervention = ticketInterventions.find((i: any) => i.id === r.intervention_id);
        return intervention?.type === "diagnostic";
      });

      const reportedPartTypes = new Set<string>(
        [
          ...(Array.isArray(diagnosticReport?.pieces_defectueuses)
            ? diagnosticReport.pieces_defectueuses.map((piece: any) => piece?.type)
            : []),
          ...(Array.isArray(diagnosticReport?.pieces_remplacees)
            ? diagnosticReport.pieces_remplacees.map((piece: any) => piece?.type)
            : []),
          diagnosticReport?.problem_part_type,
        ]
          .map((value) => String(value ?? ""))
          .filter(Boolean),
      );

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          owner_id,
          quote_number: number,
          client_id: ticket.client_id,
          site_id: ticket.site_id,
          installation_id: ticket.installation_id,
          vat_rate: 20,
          notes: [
            `Devis créé depuis le ticket ${ticket.ticket_number}`,
            diagnosticReport?.constat ? `Problèmes signalés : ${diagnosticReport.constat}` : null,
            reportedPartTypes.size > 0
              ? `Pièces à remplacer : ${Array.from(reportedPartTypes).join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Add installation to quote
      const { error: qiError } = await (supabase.from("quote_installations" as any) as any).insert({
        owner_id,
        quote_id: quote.id,
        installation_id: ticket.installation_id,
        position: 0,
      });
      if (qiError) throw qiError;

      // Link quote to ticket
      const { error: qtError } = await (supabase.from("quote_tickets" as any) as any).insert(
        Array.from(groupTicketIds).map((tickId) => ({
          owner_id,
          quote_id: quote.id,
          ticket_id: tickId,
        })),
      );
      if (qtError) throw qtError;

      // Add pre-filled parts if problem part types are specified
      if (reportedPartTypes.size > 0 && installation.id) {
        const presentParts = installationParts.filter(
          (p: any) => p.installation_id === installation.id,
        );

        const quoteItems = presentParts
          .map((ip: any) => {
            const part = parts.find((p: any) => p.id === ip.part_id);
            if (!part || !reportedPartTypes.has(String(part.category))) return null;

            return {
              owner_id,
              quote_id: quote.id,
              part_id: part.id,
              installation_id: installation.id,
              description: part.name,
              quantity: 1,
              unit_price: Number(part.sale_price || 0),
              unit_cost: 0,
              position: 0,
            };
          })
          .filter(Boolean);

        if (quoteItems.length > 0) {
          const { error: itemsError } = await supabase.from("quote_items").insert(quoteItems);
          if (itemsError) throw itemsError;
        }
      }

      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote_tickets"] });

      toast.success("Devis créé avec succès");
      navigate({ to: "/quotes/$quoteId", params: { quoteId: quote.id } });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createPO = async (quote: any) => {
    const owner_id = await currentUserId();
    const { error } = await (supabase.from("purchase_orders" as any) as any).insert({
      owner_id,
      ticket_id: ticketId,
      quote_id: quote.id,
      order_number: num("BC"),
    });
    if (error) return toast.error(error.message);
    await (supabase.from("quotes" as any) as any)
      .update({ status: "converti_en_bon_de_commande" })
      .eq("id", quote.id);
    await setTicketStatus(
      ticket,
      "bon_de_commande_recu",
      "purchase_order_created",
      "Bon de commande créé",
    );
    invalidate();
    toast.success("Bon de commande créé");
  };

  const createPartOrder = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const owner_id = await currentUserId();
    const { data: po, error } = await (supabase.from("part_orders" as any) as any)
      .insert({
        owner_id,
        ticket_id: ticketId,
        installation_id: ticket.installation_id,
        supplier_id: fd.get("supplier_id") || null,
        status: "a_commander",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const part = parts.find((p: any) => p.id === fd.get("part_id"));
    await (supabase.from("part_order_items" as any) as any).insert({
      owner_id,
      part_order_id: po.id,
      part_id: part?.id,
      designation: part?.name ?? "Pièce",
      reference: part?.reference,
      quantity: Number(fd.get("quantity") || 1),
    });
    await setTicketStatus(
      ticket,
      "en_attente_pieces",
      "part_order_created",
      "Commande de pièces créée",
    );
    e.currentTarget.reset();
    invalidate();
    toast.success("Commande de pièces créée");
  };

  const markReceived = async (order: any) => {
    const { error } = await (supabase.from("part_orders" as any) as any)
      .update({ status: "recue", received_at: new Date().toISOString().slice(0, 10) })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    await setTicketStatus(ticket, "pieces_recues", "parts_received", "Pièces reçues");
    invalidate();
    toast.success("Pièces marquées comme reçues");
  };

  const createRepair = async () => {
    const owner_id = await currentUserId();
    const { error } = await (supabase.from("interventions" as any) as any).insert({
      owner_id,
      ticket_id: ticketId,
      site_id: ticket.site_id,
      installation_id: ticket.installation_id,
      title: `Réparation ${ticket.ticket_number}`,
      type: "reparation",
      status: "non_assignee",
    });
    if (error) return toast.error(error.message);
    await setTicketStatus(
      ticket,
      "reparation_a_planifier",
      "repair_intervention_created",
      "Intervention de réparation créée",
    );
    invalidate();
    toast.success("Intervention de réparation créée");
  };

  const close = async () => {
    const c = canCloseTicket(
      ticket,
      ticketInterventions,
      ticketReports,
      [...ticketQuotes, ...linkedQuotes],
      ticketPartOrders,
    );
    if (!c.allowed) return toast.error(`Clôture impossible : ${c.reasons.join(", ")}`);
    await setTicketStatus(ticket, "cloture", "ticket_closed", "Ticket clôturé");
    invalidate();
    toast.success("Ticket clôturé");
  };

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/tickets" })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Retour aux tickets
      </button>

      <PageHeader
        title={`${ticket.ticket_number} · ${ticket.title}`}
        description={[client?.name, site?.name, installation?.name].filter(Boolean).join(" · ")}
      />

      {/* Ticket Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Informations du ticket</CardTitle>
            <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Numéro :</span> {ticket.ticket_number}
          </div>
          <div>
            <span className="text-muted-foreground">Client :</span> {client?.name || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Site :</span> {site?.name || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Installation :</span>{" "}
            {installation?.name || "—"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Titre :</span> {ticket.title}
          </div>
          {ticket.description && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Description :</span> {ticket.description}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Créé :</span> {formatDate(ticket.created_at)}
          </div>
        </CardContent>
      </Card>

      {/* Workflow */}
      <div className="space-y-6">
        {/* Diagnostic */}
        {ticketInterventions
          .filter((i: any) => i.type === "diagnostic")
          .map((intervention: any) => {
            const report = ticketReports.find((r: any) => r.intervention_id === intervention.id);
            const isExpanded = expandedIntervention === intervention.id;
            return (
              <Card key={intervention.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedIntervention(isExpanded ? null : intervention.id)}
                      className="flex flex-1 items-center justify-between text-left"
                    >
                      <CardTitle className="text-base">📋 Diagnostic</CardTitle>
                      <ChevronLeft
                        className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{intervention.status}</Badge>
                      {intervention.status === "non_assignee" && (
                        <Button size="sm" onClick={() => assign(intervention)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          M'assigner
                        </Button>
                      )}
                    </div>

                    {/* Status buttons */}
                    <div className="flex flex-wrap gap-2">
                      {["planifiee", "en_cours", "rapport_a_rediger", "terminee", "echec"].map(
                        (s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() => updateIntervention(intervention, s)}
                          >
                            {s}
                          </Button>
                        ),
                      )}
                    </div>

                    {/* Report Form */}
                    {!report && intervention.status === "rapport_a_rediger" && (
                      <form onSubmit={(e) => createReport(e, intervention)} className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input name="constat" placeholder="Constat" required />
                          <Input name="actions" placeholder="Actions réalisées" />
                        </div>
                        <Input name="conclusion" placeholder="Conclusion" />

                        {/* Part Type Selection */}
                        {availablePartTypes.length > 0 && (
                          <div className="rounded-md border border-dashed border-orange-200 bg-orange-50 p-3">
                            <Label className="text-xs font-semibold text-orange-900">
                              ⚠️ Type de pièce défaillante (pour pré-remplir le devis)
                            </Label>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {availablePartTypes.map((type) => (
                                <label
                                  key={type}
                                  className="flex items-center gap-2 rounded border bg-background px-2 py-1 text-sm"
                                >
                                  <input
                                    name="problem_part_types"
                                    type="checkbox"
                                    value={type}
                                    checked={selectedPartTypes.includes(type)}
                                    onChange={(event) =>
                                      setSelectedPartTypes((current) =>
                                        event.target.checked
                                          ? [...current, type]
                                          : current.filter((item) => item !== type),
                                      )
                                    }
                                  />
                                  {type}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid gap-2 md:grid-cols-3">
                          <Select name="reparation_reussie">
                            <SelectTrigger>
                              <SelectValue placeholder="Réparation réussie ?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Oui</SelectItem>
                              <SelectItem value="false">Non</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select name="part_id">
                            <SelectTrigger>
                              <SelectValue placeholder="Pièce remplacée" />
                            </SelectTrigger>
                            <SelectContent>
                              {parts.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input name="quantity" type="number" step="1" placeholder="Qté" />
                        </div>
                        <div className="flex gap-2">
                          <label className="text-sm">
                            <input name="besoin_devis" type="checkbox" /> Besoin devis
                          </label>
                          <label className="text-sm">
                            <input name="besoin_commande_pieces" type="checkbox" /> Besoin pièces
                          </label>
                        </div>
                        <Button size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          Créer rapport
                        </Button>
                      </form>
                    )}

                    {/* Report Display */}
                    {report && (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3">
                        <p className="text-sm font-medium text-green-900">✓ Rapport créé</p>
                        <div className="mt-2 space-y-1 text-xs text-green-800">
                          <p>
                            <b>Constat :</b> {report.constat}
                          </p>
                          <p>
                            <b>Actions :</b> {report.actions_realisees}
                          </p>
                          <p>
                            <b>Conclusion :</b> {report.conclusion}
                          </p>
                          {(report.problem_part_type ||
                            (Array.isArray(report.pieces_defectueuses) &&
                              report.pieces_defectueuses.length > 0)) && (
                            <p>
                              <b>Types de pièces défaillantes :</b>{" "}
                              {formatPartTypeList(
                                Array.isArray(report.pieces_defectueuses) &&
                                  report.pieces_defectueuses.length > 0
                                  ? report.pieces_defectueuses.map((piece: any) => piece?.type)
                                  : report.problem_part_type,
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

        {/* Create Quote Button - appears when report is done */}
        {ticketReports.length > 0 && ticketQuotes.length === 0 && linkedQuotes.length === 0 && (
          <Button onClick={createQuoteFromTicket} className="w-full" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Créer un devis depuis ce ticket
          </Button>
        )}

        {/* Devis */}
        {(ticketQuotes.length > 0 || linkedQuotes.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                📄 Devis ({ticketQuotes.length + linkedQuotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...ticketQuotes, ...linkedQuotes].map((quote: any) => (
                <Link
                  key={quote.id}
                  to="/quotes/$quoteId"
                  params={{ quoteId: quote.id }}
                  className="block"
                >
                  <div className="rounded-md border p-3 transition-colors hover:bg-accent/50">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <b>{quote.quote_number}</b>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(quote.issued_at)}
                        </div>
                      </div>
                      <Badge variant="secondary">{quote.status || "brouillon"}</Badge>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create PO from accepted quotes */}
              {ticketQuotes
                .filter((q: any) => q.status === "accepte")
                .map((quote: any) => (
                  <Button
                    key={quote.id}
                    size="sm"
                    onClick={() => createPO(quote)}
                    className="w-full"
                  >
                    Créer bon de commande pour {quote.quote_number}
                  </Button>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Purchase Orders */}
        {ticketPOs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                📋 Bons de Commande ({ticketPOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticketPOs.map((po: any) => (
                <div key={po.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <b>{po.order_number}</b>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(po.created_at)}
                      </div>
                    </div>
                    <Badge variant="secondary">Créé</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Part Orders */}
        {ticketPartOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                📦 Commandes de Pièces ({ticketPartOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticketPartOrders.map((order: any) => (
                <div key={order.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">Commande #{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  {order.status !== "recue" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markReceived(order)}
                      className="mt-2 w-full"
                    >
                      Marquer pièces reçues
                    </Button>
                  )}
                </div>
              ))}

              {/* Create Part Order Form */}
              <form onSubmit={createPartOrder} className="space-y-3 border-t pt-3">
                <div className="text-sm font-medium">Ajouter une commande de pièces</div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Select name="supplier_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select name="part_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pièce" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input name="quantity" type="number" defaultValue="1" placeholder="Qté" />
                </div>
                <Button size="sm" className="w-full" variant="outline">
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Commander
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Repair */}
        {ticketInterventions
          .filter((i: any) => i.type === "reparation")
          .map((intervention: any) => {
            const report = ticketReports.find((r: any) => r.intervention_id === intervention.id);
            const isExpanded = expandedIntervention === intervention.id;
            return (
              <Card key={intervention.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedIntervention(isExpanded ? null : intervention.id)}
                      className="flex flex-1 items-center justify-between text-left"
                    >
                      <CardTitle className="text-base">🔧 Réparation</CardTitle>
                      <ChevronLeft
                        className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <Badge variant="outline">{intervention.status}</Badge>
                    {intervention.status === "non_assignee" && (
                      <Button size="sm" onClick={() => assign(intervention)}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        M'assigner
                      </Button>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {["planifiee", "en_cours", "rapport_a_rediger", "terminee", "echec"].map(
                        (s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() => updateIntervention(intervention, s)}
                          >
                            {s}
                          </Button>
                        ),
                      )}
                    </div>
                    {report && (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3">
                        <p className="text-sm font-medium text-green-900">✓ Rapport créé</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

        {/* Create Repair Button */}
        {!ticketInterventions.find((i: any) => i.type === "reparation") &&
          ticketReports.length > 0 && (
            <Button onClick={createRepair} variant="outline" className="w-full">
              Créer intervention de réparation
            </Button>
          )}

        {/* Close Button */}
        <Button onClick={close} className="w-full" disabled={ticket.status === "cloture"}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {ticket.status === "cloture" ? "Ticket clôturé" : "Clôturer le ticket"}
        </Button>
      </div>

      {/* History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun historique</p>
          ) : (
            <div className="space-y-2">
              {ticketHistory.map((h: any) => (
                <div key={h.id} className="text-xs">
                  <span className="font-medium">{h.title}</span>
                  <div className="text-muted-foreground">{formatDate(h.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
