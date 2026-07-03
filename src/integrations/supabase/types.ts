export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          address: string | null;
          client_number: string;
          client_sequence: number;
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          client_number?: string;
          client_sequence?: number;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          client_number?: string;
          client_sequence?: number;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          client_id: string | null;
          created_at: string;
          flat_fee: number | null;
          hourly_rate: number | null;
          id: string;
          lifting_equipment_fee: number | null;
          name: string;
          notes: string | null;
          on_call_hourly_rate: number | null;
          on_call_included: boolean;
          on_call_travel_fee: number | null;
          owner_id: string;
          repairs_included: boolean;
          parts_discount_pct: number | null;
          shipping_fee: number | null;
          travel_fee: number | null;
          waste_treatment_fee: number | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string;
          flat_fee?: number | null;
          hourly_rate?: number | null;
          id?: string;
          lifting_equipment_fee?: number | null;
          name: string;
          notes?: string | null;
          on_call_hourly_rate?: number | null;
          on_call_included?: boolean;
          on_call_travel_fee?: number | null;
          owner_id: string;
          repairs_included?: boolean;
          parts_discount_pct?: number | null;
          shipping_fee?: number | null;
          travel_fee?: number | null;
          waste_treatment_fee?: number | null;
          type?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          flat_fee?: number | null;
          hourly_rate?: number | null;
          id?: string;
          lifting_equipment_fee?: number | null;
          name?: string;
          notes?: string | null;
          on_call_hourly_rate?: number | null;
          on_call_included?: boolean;
          on_call_travel_fee?: number | null;
          owner_id?: string;
          repairs_included?: boolean;
          parts_discount_pct?: number | null;
          shipping_fee?: number | null;
          travel_fee?: number | null;
          waste_treatment_fee?: number | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      installation_types: {
        Row: {
          component_types: Json;
          created_at: string;
          custom_fields: Json;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          component_types?: Json;
          created_at?: string;
          custom_fields?: Json;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          component_types?: Json;
          created_at?: string;
          custom_fields?: Json;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      installations: {
        Row: {
          brand_id: string | null;
          characteristics: Json;
          contract_id: string | null;
          created_at: string;
          id: string;
          installation_number: string;
          installation_sequence: number;
          location: string | null;
          model_id: string | null;
          name: string;
          notes: string | null;
          owner_id: string;
          photo_url: string | null;
          serial_number: string | null;
          site_id: string;
          type_id: string | null;
          updated_at: string;
          year: number | null;
        };
        Insert: {
          brand_id?: string | null;
          characteristics?: Json;
          contract_id?: string | null;
          created_at?: string;
          id?: string;
          installation_number?: string;
          installation_sequence?: number;
          location?: string | null;
          model_id?: string | null;
          name: string;
          notes?: string | null;
          owner_id: string;
          photo_url?: string | null;
          serial_number?: string | null;
          site_id: string;
          type_id?: string | null;
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          brand_id?: string | null;
          characteristics?: Json;
          contract_id?: string | null;
          created_at?: string;
          id?: string;
          installation_number?: string;
          installation_sequence?: number;
          location?: string | null;
          model_id?: string | null;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          photo_url?: string | null;
          serial_number?: string | null;
          site_id?: string;
          type_id?: string | null;
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "installations_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_type_id_fkey";
            columns: ["type_id"];
            isOneToOne: false;
            referencedRelation: "installation_types";
            referencedColumns: ["id"];
          },
        ];
      };
      interventions: {
        Row: {
          created_at: string;
          date: string;
          description: string | null;
          id: string;
          installation_id: string;
          owner_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          date?: string;
          description?: string | null;
          id?: string;
          installation_id: string;
          owner_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          description?: string | null;
          id?: string;
          installation_id?: string;
          owner_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interventions_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "installations";
            referencedColumns: ["id"];
          },
        ];
      };
      models: {
        Row: {
          brand_id: string;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      installation_parts: {
        Row: {
          color: string | null;
          component_type: string | null;
          configuration: Json;
          created_at: string;
          dimensions: string | null;
          installation_id: string;
          notes: string | null;
          owner_id: string;
          part_id: string;
          quantity: number;
          reference_override: string | null;
        };
        Insert: {
          color?: string | null;
          component_type?: string | null;
          configuration?: Json;
          created_at?: string;
          dimensions?: string | null;
          installation_id: string;
          notes?: string | null;
          owner_id?: string;
          part_id: string;
          quantity?: number;
          reference_override?: string | null;
        };
        Update: {
          color?: string | null;
          component_type?: string | null;
          configuration?: Json;
          created_at?: string;
          dimensions?: string | null;
          installation_id?: string;
          notes?: string | null;
          owner_id?: string;
          part_id?: string;
          quantity?: number;
          reference_override?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "installation_parts_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "installations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installation_parts_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
        ];
      };
      part_model_compat: {
        Row: {
          model_id: string;
          owner_id: string;
          part_id: string;
        };
        Insert: {
          model_id: string;
          owner_id: string;
          part_id: string;
        };
        Update: {
          model_id?: string;
          owner_id?: string;
          part_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "part_model_compat_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_model_compat_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
        ];
      };
      part_type_compat: {
        Row: {
          owner_id: string;
          part_id: string;
          type_id: string;
        };
        Insert: {
          owner_id?: string;
          part_id: string;
          type_id: string;
        };
        Update: {
          owner_id?: string;
          part_id?: string;
          type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "part_type_compat_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_type_compat_type_id_fkey";
            columns: ["type_id"];
            isOneToOne: false;
            referencedRelation: "installation_types";
            referencedColumns: ["id"];
          },
        ];
      };
      part_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      parts: {
        Row: {
          brand_id: string | null;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          photo_url: string | null;
          reference: string | null;
          sale_price: number;
          updated_at: string;
        };
        Insert: {
          brand_id?: string | null;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          photo_url?: string | null;
          reference?: string | null;
          sale_price?: number;
          updated_at?: string;
        };
        Update: {
          brand_id?: string | null;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          photo_url?: string | null;
          reference?: string | null;
          sale_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parts_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          owner_id: string;
          part_id: string | null;
          position: number;
          quantity: number;
          quote_id: string;
          unit_cost: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          owner_id: string;
          part_id?: string | null;
          position?: number;
          quantity?: number;
          quote_id: string;
          unit_cost?: number;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          owner_id?: string;
          part_id?: string | null;
          position?: number;
          quantity?: number;
          quote_id?: string;
          unit_cost?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          client_id: string;
          contract_id: string | null;
          created_at: string;
          id: string;
          installation_id: string | null;
          intervention_reason: string;
          is_on_call: boolean;
          issued_at: string;
          labor_hours: number | null;
          labor_rate: number | null;
          notes: string | null;
          owner_id: string;
          quote_number: string;
          shipping_fee: number;
          site_id: string | null;
          status: string;
          travel_fee: number | null;
          updated_at: string;
          vat_rate: number;
          waste_treatment_fee: number;
          lifting_equipment_fee: number;
        };
        Insert: {
          client_id: string;
          contract_id?: string | null;
          created_at?: string;
          id?: string;
          installation_id?: string | null;
          intervention_reason?: string;
          is_on_call?: boolean;
          issued_at?: string;
          labor_hours?: number | null;
          labor_rate?: number | null;
          notes?: string | null;
          owner_id: string;
          quote_number: string;
          shipping_fee?: number;
          site_id?: string | null;
          status?: string;
          travel_fee?: number | null;
          updated_at?: string;
          vat_rate?: number;
          waste_treatment_fee?: number;
          lifting_equipment_fee?: number;
        };
        Update: {
          client_id?: string;
          contract_id?: string | null;
          created_at?: string;
          id?: string;
          installation_id?: string | null;
          intervention_reason?: string;
          is_on_call?: boolean;
          issued_at?: string;
          labor_hours?: number | null;
          labor_rate?: number | null;
          notes?: string | null;
          owner_id?: string;
          quote_number?: string;
          shipping_fee?: number;
          site_id?: string | null;
          status?: string;
          travel_fee?: number | null;
          updated_at?: string;
          vat_rate?: number;
          waste_treatment_fee?: number;
          lifting_equipment_fee?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "installations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      site_contacts: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
          phone: string | null;
          role: string | null;
          site_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id?: string;
          phone?: string | null;
          role?: string | null;
          site_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          phone?: string | null;
          role?: string | null;
          site_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_contacts_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          address: string | null;
          client_id: string;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
          site_number: string;
          site_sequence: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          client_id: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id: string;
          site_number?: string;
          site_sequence?: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          client_id?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          site_number?: string;
          site_sequence?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_parts: {
        Row: {
          created_at: string;
          id: string;
          lead_time_days: number | null;
          owner_id: string;
          part_id: string;
          price_updated_at: string;
          purchase_price: number;
          shipping_cost: number;
          supplier_id: string;
          supplier_ref: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lead_time_days?: number | null;
          owner_id: string;
          part_id: string;
          price_updated_at?: string;
          purchase_price?: number;
          shipping_cost?: number;
          supplier_id: string;
          supplier_ref?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          lead_time_days?: number | null;
          owner_id?: string;
          part_id?: string;
          price_updated_at?: string;
          purchase_price?: number;
          shipping_cost?: number;
          supplier_id?: string;
          supplier_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_parts_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_parts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
