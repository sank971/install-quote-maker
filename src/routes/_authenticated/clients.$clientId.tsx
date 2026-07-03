import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useOne, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ChevronLeft, MapPin, Pencil, Trash2, User, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const { data: client } = useOne<any>("clients", clientId);
  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "byClient", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("client_id", clientId).order("name");
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
      const { data, error } = await supabase.from("site_contacts").select("*").in("site_id", siteIds).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsertSite = useUpsert("sites", [["sites"], ["sites", "byClient", clientId]]);
  const removeSite = useRemove("sites", [["sites"], ["sites", "byClient", clientId]]);
  const upsertContact = useUpsert("site_contacts", [["site_contacts", "byClient", clientId]]);
  const removeContact = useRemove("site_contacts", [["site_contacts", "byClient", clientId]]);

  const [siteOpen, setSiteOpen] = useState(false);
  const [siteEdit, setSiteEdit] = useState<any>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactEdit, setContactEdit] = useState<any>(null);
  const [contactSiteId, setContactSiteId] = useState<string>("");

  const openNewSite = () => { setSiteEdit({}); setSiteOpen(true); };
  const openEditSite = (s: any) => { setSiteEdit(s); setSiteOpen(true); };
  const openNewContact = (siteId: string) => { setContactEdit({}); setContactSiteId(siteId); setContactOpen(true); };
  const openEditContact = (c: any) => { setContactEdit(c); setContactSiteId(c.site_id); setContactOpen(true); };

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

  if (!client) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div>
      <Link to="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Clients
      </Link>
      <PageHeader
        title={client.name}
        description={[client.contact_name, client.email, client.phone].filter(Boolean).join(" · ")}
        actions={<Button onClick={openNewSite}><Plus className="mr-2 h-4 w-4" />Nouveau site</Button>}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Adresse :</span> {client.address || "—"}</div>
          <div><span className="text-muted-foreground">Notes :</span> {client.notes || "—"}</div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sites ({sites.length})</h2>

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
                    <div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary"><MapPin className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.address || "—"}</div>
                      {(s.email || s.contact_name || s.contact_phone) && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[s.contact_name, s.contact_phone, s.email].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditSite(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Supprimer ${s.name} ?`)) removeSite.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="mt-3 border-t border-border/60 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacts ({siteContacts.length})</span>
                    <Button variant="ghost" size="sm" onClick={() => openNewContact(s.id)}><Plus className="mr-1 h-3.5 w-3.5" />Contact</Button>
                  </div>
                  {siteContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun contact</p>
                  ) : (
                    <div className="space-y-1.5">
                      {siteContacts.map((c: any) => (
                        <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5">
                          <div className="min-w-0 text-xs">
                            <div className="flex items-center gap-1.5 font-medium">
                              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{c.name}</span>
                              {c.role && <span className="truncate text-muted-foreground">— {c.role}</span>}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                              {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                              {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContact(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`Supprimer ${c.name} ?`)) removeContact.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{siteEdit?.id ? "Modifier" : "Nouveau"} site</DialogTitle></DialogHeader>
          <form onSubmit={submitSite} className="space-y-3">
            <div><Label>Nom *</Label><Input name="name" required defaultValue={siteEdit?.name} /></div>
            <div><Label>Adresse</Label><Input name="address" defaultValue={siteEdit?.address} /></div>
            <div><Label>Email du site</Label><Input name="email" type="email" defaultValue={siteEdit?.email} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Contact principal</Label><Input name="contact_name" defaultValue={siteEdit?.contact_name} /></div>
              <div><Label>Téléphone</Label><Input name="contact_phone" defaultValue={siteEdit?.contact_phone} /></div>
            </div>
            <div><Label>Notes</Label><Textarea name="notes" rows={3} defaultValue={siteEdit?.notes} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSiteOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{contactEdit?.id ? "Modifier" : "Nouveau"} contact</DialogTitle></DialogHeader>
          <form onSubmit={submitContact} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Nom *</Label><Input name="name" required defaultValue={contactEdit?.name} /></div>
              <div><Label>Rôle / fonction</Label><Input name="role" placeholder="Responsable, gardien..." defaultValue={contactEdit?.role} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Téléphone</Label><Input name="phone" defaultValue={contactEdit?.phone} /></div>
              <div><Label>Email</Label><Input name="email" type="email" defaultValue={contactEdit?.email} /></div>
            </div>
            <div><Label>Notes</Label><Textarea name="notes" rows={2} defaultValue={contactEdit?.notes} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setContactOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
