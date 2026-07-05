import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TableName =
  | "clients"
  | "sites"
  | "site_contacts"
  | "installations"
  | "installation_types"
  | "part_categories"
  | "brands"
  | "models"
  | "parts"
  | "part_model_compat"
  | "part_type_compat"
  | "part_components"
  | "contract_kit_prices"
  | "installation_parts"
  | "installation_type_default_parts"
  | "model_default_parts"
  | "quote_installations"
  | "quote_tickets"
  | "app_settings"
  | "suppliers"
  | "supplier_parts"
  | "contracts"
  | "interventions"
  | "quotes"
  | "quote_items"
  | "tickets"
  | "ticket_groups"
  | "ticket_group_tickets"
  | "history_events"
  | "intervention_reports"
  | "purchase_orders"
  | "part_orders"
  | "part_order_items";

export function useList<T = any>(
  table: TableName,
  options?: {
    filter?: (q: any) => any;
    orderBy?: string;
    ascending?: boolean;
    enabled?: boolean;
    key?: QueryKey;
  },
) {
  return useQuery({
    queryKey: options?.key ?? [table, options?.filter?.toString(), options?.orderBy],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      let q: any = supabase.from(table).select("*");
      if (options?.filter) q = options.filter(q);
      q = q.order(options?.orderBy ?? "created_at", { ascending: options?.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useOne<T = any>(table: TableName, id: string | undefined) {
  return useQuery({
    queryKey: [table, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(table) as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as T | null;
    },
  });
}

async function getOwnerId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

export function useUpsert(table: TableName, invalidate: QueryKey[] = [[table]]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const owner_id = await getOwnerId();
      const payload = { ...row, owner_id };
      const client = supabase.from(table) as any;
      if (row.id) {
        const { data, error } = await client.update(payload).eq("id", row.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await client.insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      toast.success("Enregistré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur d'enregistrement"),
  });
}

export function useRemove(table: TableName, invalidate: QueryKey[] = [[table]]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      toast.success("Supprimé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}
