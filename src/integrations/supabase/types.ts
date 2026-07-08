export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          owner_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          owner_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          owner_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bom_template_items: {
        Row: {
          bom_template_id: string
          constraints: Json
          created_at: string
          id: string
          owner_id: string
          part_family: string
          position: number
          quantity_formula_code: string | null
          required: boolean
          selection_strategy: string
        }
        Insert: {
          bom_template_id: string
          constraints?: Json
          created_at?: string
          id?: string
          owner_id?: string
          part_family: string
          position?: number
          quantity_formula_code?: string | null
          required?: boolean
          selection_strategy?: string
        }
        Update: {
          bom_template_id?: string
          constraints?: Json
          created_at?: string
          id?: string
          owner_id?: string
          part_family?: string
          position?: number
          quantity_formula_code?: string | null
          required?: boolean
          selection_strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_template_items_bom_template_id_fkey"
            columns: ["bom_template_id"]
            isOneToOne: false
            referencedRelation: "bom_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          installation_type_id: string | null
          is_active: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          installation_type_id?: string | null
          is_active?: boolean
          name: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          installation_type_id?: string | null
          is_active?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_templates_installation_type_id_fkey"
            columns: ["installation_type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      business_rules: {
        Row: {
          actions: Json
          code: string
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          code: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string
          priority?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          code?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      calculation_formulas: {
        Row: {
          code: string
          created_at: string
          description: string | null
          expression: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          position: number
          scope: Json
          target_key: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          expression: string
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string
          position?: number
          scope?: Json
          target_key: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          expression?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          position?: number
          scope?: Json
          target_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          client_number: string
          client_sequence: number
          contact_name: string | null
          created_at: string
          email: string | null
          grand_account_id: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_number: string
          client_sequence: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          grand_account_id?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_number?: string
          client_sequence?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          grand_account_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          siret?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_grand_account_id_fkey"
            columns: ["grand_account_id"]
            isOneToOne: false
            referencedRelation: "grand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_client_pricing: {
        Row: {
          adjustment_pct: number
          client_id: string
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          adjustment_pct?: number
          client_id: string
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          adjustment_pct?: number
          client_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_client_pricing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_client_pricing_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_kit_prices: {
        Row: {
          contract_id: string
          created_at: string | null
          id: string
          kit_part_id: string
          negotiated_price: number
          notes: string | null
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          id?: string
          kit_part_id: string
          negotiated_price?: number
          notes?: string | null
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          id?: string
          kit_part_id?: string
          negotiated_price?: number
          notes?: string | null
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_kit_prices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_kit_prices_kit_part_id_fkey"
            columns: ["kit_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_pricing_tiers: {
        Row: {
          base_annual_price: number
          contract_id: string
          created_at: string
          id: string
          installation_type_id: string
          min_installations: number | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          base_annual_price?: number
          contract_id: string
          created_at?: string
          id?: string
          installation_type_id: string
          min_installations?: number | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          base_annual_price?: number
          contract_id?: string
          created_at?: string
          id?: string
          installation_type_id?: string
          min_installations?: number | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_pricing_tiers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_pricing_tiers_installation_type_id_fkey"
            columns: ["installation_type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          created_at: string
          dump_evacuation_fee: number | null
          flat_fee: number | null
          hourly_rate: number | null
          id: string
          lifting_equipment_fee: number | null
          name: string
          notes: string | null
          on_call_hourly_rate: number | null
          on_call_included: boolean
          on_call_travel_fee: number | null
          out_of_contract_hourly_rate: number | null
          out_of_contract_travel_fee: number | null
          oversized_shipping_fee: number | null
          owner_id: string
          parts_discount_pct: number | null
          repairs_included: boolean
          shipping_fee: number | null
          travel_fee: number | null
          type: string
          updated_at: string
          waste_treatment_fee: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          dump_evacuation_fee?: number | null
          flat_fee?: number | null
          hourly_rate?: number | null
          id?: string
          lifting_equipment_fee?: number | null
          name: string
          notes?: string | null
          on_call_hourly_rate?: number | null
          on_call_included?: boolean
          on_call_travel_fee?: number | null
          out_of_contract_hourly_rate?: number | null
          out_of_contract_travel_fee?: number | null
          oversized_shipping_fee?: number | null
          owner_id: string
          parts_discount_pct?: number | null
          repairs_included?: boolean
          shipping_fee?: number | null
          travel_fee?: number | null
          type?: string
          updated_at?: string
          waste_treatment_fee?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          dump_evacuation_fee?: number | null
          flat_fee?: number | null
          hourly_rate?: number | null
          id?: string
          lifting_equipment_fee?: number | null
          name?: string
          notes?: string | null
          on_call_hourly_rate?: number | null
          on_call_included?: boolean
          on_call_travel_fee?: number | null
          out_of_contract_hourly_rate?: number | null
          out_of_contract_travel_fee?: number | null
          oversized_shipping_fee?: number | null
          owner_id?: string
          parts_discount_pct?: number | null
          repairs_included?: boolean
          shipping_fee?: number | null
          travel_fee?: number | null
          type?: string
          updated_at?: string
          waste_treatment_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_settings: {
        Row: {
          admin_hourly_cost: number
          agency_address: string | null
          average_shipping_cost: number
          cost_per_km: number
          created_at: string
          fuel_price: number
          id: string
          minimum_margin_pct: number
          owner_id: string
          technician_hourly_cost: number
          updated_at: string
          vehicle_consumption: number
          vehicle_cost_per_km: number
        }
        Insert: {
          admin_hourly_cost?: number
          agency_address?: string | null
          average_shipping_cost?: number
          cost_per_km?: number
          created_at?: string
          fuel_price?: number
          id?: string
          minimum_margin_pct?: number
          owner_id: string
          technician_hourly_cost?: number
          updated_at?: string
          vehicle_consumption?: number
          vehicle_cost_per_km?: number
        }
        Update: {
          admin_hourly_cost?: number
          agency_address?: string | null
          average_shipping_cost?: number
          cost_per_km?: number
          created_at?: string
          fuel_price?: number
          id?: string
          minimum_margin_pct?: number
          owner_id?: string
          technician_hourly_cost?: number
          updated_at?: string
          vehicle_consumption?: number
          vehicle_cost_per_km?: number
        }
        Relationships: []
      }
      grand_account_bpu_items: {
        Row: {
          created_at: string
          discount_pct: number | null
          grand_account_id: string
          id: string
          manual_sale_price: number | null
          notes: string | null
          owner_id: string
          part_id: string
          pricing_mode: string
          purchase_coef: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_pct?: number | null
          grand_account_id: string
          id?: string
          manual_sale_price?: number | null
          notes?: string | null
          owner_id?: string
          part_id: string
          pricing_mode?: string
          purchase_coef?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_pct?: number | null
          grand_account_id?: string
          id?: string
          manual_sale_price?: number | null
          notes?: string | null
          owner_id?: string
          part_id?: string
          pricing_mode?: string
          purchase_coef?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grand_account_bpu_items_grand_account_id_fkey"
            columns: ["grand_account_id"]
            isOneToOne: false
            referencedRelation: "grand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_account_bpu_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      grand_accounts: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          out_of_bpu_discount_pct: number | null
          out_of_bpu_purchase_coef: number | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          out_of_bpu_discount_pct?: number | null
          out_of_bpu_purchase_coef?: number | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          out_of_bpu_discount_pct?: number | null
          out_of_bpu_purchase_coef?: number | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      history_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          installation_id: string | null
          metadata: Json
          owner_id: string
          site_id: string | null
          ticket_group_id: string | null
          ticket_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          installation_id?: string | null
          metadata?: Json
          owner_id: string
          site_id?: string | null
          ticket_group_id?: string | null
          ticket_id?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          installation_id?: string | null
          metadata?: Json
          owner_id?: string
          site_id?: string | null
          ticket_group_id?: string | null
          ticket_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "history_events_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_events_ticket_group_id_fkey"
            columns: ["ticket_group_id"]
            isOneToOne: false
            referencedRelation: "ticket_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_parts: {
        Row: {
          color: string | null
          component_type: string | null
          configuration: Json
          created_at: string
          dimensions: string | null
          installation_id: string
          intervention_id: string | null
          length_meters: number | null
          notes: string | null
          owner_id: string
          part_id: string
          quantity: number
          reference_override: string | null
          replaced_at: string | null
          supplier_id: string | null
          technician_id: string | null
          ticket_id: string | null
          weight_kg: number | null
          width_meters: number | null
        }
        Insert: {
          color?: string | null
          component_type?: string | null
          configuration?: Json
          created_at?: string
          dimensions?: string | null
          installation_id: string
          intervention_id?: string | null
          length_meters?: number | null
          notes?: string | null
          owner_id?: string
          part_id: string
          quantity?: number
          reference_override?: string | null
          replaced_at?: string | null
          supplier_id?: string | null
          technician_id?: string | null
          ticket_id?: string | null
          weight_kg?: number | null
          width_meters?: number | null
        }
        Update: {
          color?: string | null
          component_type?: string | null
          configuration?: Json
          created_at?: string
          dimensions?: string | null
          installation_id?: string
          intervention_id?: string | null
          length_meters?: number | null
          notes?: string | null
          owner_id?: string
          part_id?: string
          quantity?: number
          reference_override?: string | null
          replaced_at?: string | null
          supplier_id?: string | null
          technician_id?: string | null
          ticket_id?: string | null
          weight_kg?: number | null
          width_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_parts_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_parts_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_parts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_requirements: {
        Row: {
          created_at: string
          id: string
          installation_id: string
          lifting_equipment_type: string | null
          multiple_technicians_count: number | null
          notes: string | null
          owner_id: string
          price_adjustment_pct: number | null
          requires_lifting_equipment: boolean | null
          requires_multiple_technicians: boolean | null
          requires_special_equipment: boolean | null
          special_equipment_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          installation_id: string
          lifting_equipment_type?: string | null
          multiple_technicians_count?: number | null
          notes?: string | null
          owner_id: string
          price_adjustment_pct?: number | null
          requires_lifting_equipment?: boolean | null
          requires_multiple_technicians?: boolean | null
          requires_special_equipment?: boolean | null
          special_equipment_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          installation_id?: string
          lifting_equipment_type?: string | null
          multiple_technicians_count?: number | null
          notes?: string | null
          owner_id?: string
          price_adjustment_pct?: number | null
          requires_lifting_equipment?: boolean | null
          requires_multiple_technicians?: boolean | null
          requires_special_equipment?: boolean | null
          special_equipment_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_requirements_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: true
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_type_default_parts: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          part_id: string
          quantity: number
          type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          part_id: string
          quantity?: number
          type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          part_id?: string
          quantity?: number
          type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_type_default_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_type_default_parts_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_types: {
        Row: {
          component_types: Json
          created_at: string
          custom_fields: Json
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          component_types?: Json
          created_at?: string
          custom_fields?: Json
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          component_types?: Json
          created_at?: string
          custom_fields?: Json
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      installations: {
        Row: {
          brand_id: string | null
          characteristics: Json
          contract_id: string | null
          created_at: string
          id: string
          installation_number: string
          installation_sequence: number
          location: string | null
          model_id: string | null
          name: string
          notes: string | null
          owner_id: string
          photo_url: string | null
          serial_number: string | null
          site_id: string
          type_id: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          brand_id?: string | null
          characteristics?: Json
          contract_id?: string | null
          created_at?: string
          id?: string
          installation_number: string
          installation_sequence: number
          location?: string | null
          model_id?: string | null
          name: string
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          serial_number?: string | null
          site_id: string
          type_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand_id?: string | null
          characteristics?: Json
          contract_id?: string | null
          created_at?: string
          id?: string
          installation_number?: string
          installation_sequence?: number
          location?: string | null
          model_id?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          serial_number?: string | null
          site_id?: string
          type_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "installations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_reports: {
        Row: {
          actions_realisees: string | null
          attachments: Json
          besoin_commande_pieces: boolean
          besoin_devis: boolean
          conclusion: string | null
          constat: string
          created_at: string
          id: string
          installation_id: string
          intervention_id: string
          owner_id: string
          pieces_defectueuses: Json
          pieces_remplacees: Json
          pieces_remplacees_succes: Json
          problem_part_type: string | null
          reparation_reussie: boolean | null
          signature_client: string | null
          site_id: string
          technician_id: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          actions_realisees?: string | null
          attachments?: Json
          besoin_commande_pieces?: boolean
          besoin_devis?: boolean
          conclusion?: string | null
          constat: string
          created_at?: string
          id?: string
          installation_id: string
          intervention_id: string
          owner_id: string
          pieces_defectueuses?: Json
          pieces_remplacees?: Json
          pieces_remplacees_succes?: Json
          problem_part_type?: string | null
          reparation_reussie?: boolean | null
          signature_client?: string | null
          site_id: string
          technician_id?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          actions_realisees?: string | null
          attachments?: Json
          besoin_commande_pieces?: boolean
          besoin_devis?: boolean
          conclusion?: string | null
          constat?: string
          created_at?: string
          id?: string
          installation_id?: string
          intervention_id?: string
          owner_id?: string
          pieces_defectueuses?: Json
          pieces_remplacees?: Json
          pieces_remplacees_succes?: Json
          problem_part_type?: string | null
          reparation_reussie?: boolean | null
          signature_client?: string | null
          site_id?: string
          technician_id?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_reports_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          admin_minutes: number | null
          completed_at: string | null
          created_at: string
          date: string
          description: string | null
          distance_km: number | null
          extra_cost: number | null
          extra_cost_reason: string | null
          fuel_cost: number | null
          id: string
          installation_id: string
          onsite_minutes: number | null
          owner_id: string
          scheduled_at: string | null
          site_id: string | null
          start_address: string | null
          started_at: string | null
          status: string
          subcontractor_cost: number | null
          technician_id: string | null
          ticket_id: string | null
          title: string
          toll_parking_cost: number | null
          travel_minutes: number | null
          type: string
          updated_at: string
        }
        Insert: {
          admin_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          date?: string
          description?: string | null
          distance_km?: number | null
          extra_cost?: number | null
          extra_cost_reason?: string | null
          fuel_cost?: number | null
          id?: string
          installation_id: string
          onsite_minutes?: number | null
          owner_id: string
          scheduled_at?: string | null
          site_id?: string | null
          start_address?: string | null
          started_at?: string | null
          status?: string
          subcontractor_cost?: number | null
          technician_id?: string | null
          ticket_id?: string | null
          title: string
          toll_parking_cost?: number | null
          travel_minutes?: number | null
          type?: string
          updated_at?: string
        }
        Update: {
          admin_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          date?: string
          description?: string | null
          distance_km?: number | null
          extra_cost?: number | null
          extra_cost_reason?: string | null
          fuel_cost?: number | null
          id?: string
          installation_id?: string
          onsite_minutes?: number | null
          owner_id?: string
          scheduled_at?: string | null
          site_id?: string | null
          start_address?: string | null
          started_at?: string | null
          status?: string
          subcontractor_cost?: number | null
          technician_id?: string | null
          ticket_id?: string | null
          title?: string
          toll_parking_cost?: number | null
          travel_minutes?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      model_default_parts: {
        Row: {
          created_at: string
          id: string
          model_id: string
          owner_id: string
          part_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          owner_id?: string
          part_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          owner_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_default_parts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_default_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          owner_id: string
          type_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          type_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      part_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      part_compatibilities: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          part_id: string
          target_id: string | null
          target_kind: string
          target_value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          part_id: string
          target_id?: string | null
          target_kind: string
          target_value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          part_id?: string
          target_id?: string | null
          target_kind?: string
          target_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_compatibilities_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_components: {
        Row: {
          component_part_id: string
          created_at: string
          negotiated_price: number | null
          notes: string | null
          owner_id: string
          parent_part_id: string
          position: number
          quantity: number
          relation_kind: string
        }
        Insert: {
          component_part_id: string
          created_at?: string
          negotiated_price?: number | null
          notes?: string | null
          owner_id: string
          parent_part_id: string
          position?: number
          quantity?: number
          relation_kind?: string
        }
        Update: {
          component_part_id?: string
          created_at?: string
          negotiated_price?: number | null
          notes?: string | null
          owner_id?: string
          parent_part_id?: string
          position?: number
          quantity?: number
          relation_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_components_component_part_id_fkey"
            columns: ["component_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_components_parent_part_id_fkey"
            columns: ["parent_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_equivalences: {
        Row: {
          created_at: string
          equivalent_part_id: string
          id: string
          notes: string | null
          owner_id: string
          source_part_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equivalent_part_id: string
          id?: string
          notes?: string | null
          owner_id?: string
          source_part_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equivalent_part_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          source_part_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_equivalences_equivalent_part_id_fkey"
            columns: ["equivalent_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_equivalences_source_part_id_fkey"
            columns: ["source_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_family_fields: {
        Row: {
          created_at: string
          family_name: string
          field_key: string
          field_type: string
          id: string
          label: string
          owner_id: string
          position: number
          required: boolean
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_name: string
          field_key: string
          field_type?: string
          id?: string
          label: string
          owner_id?: string
          position?: number
          required?: boolean
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_name?: string
          field_key?: string
          field_type?: string
          id?: string
          label?: string
          owner_id?: string
          position?: number
          required?: boolean
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      part_model_compat: {
        Row: {
          model_id: string
          owner_id: string
          part_id: string
        }
        Insert: {
          model_id: string
          owner_id: string
          part_id: string
        }
        Update: {
          model_id?: string
          owner_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_model_compat_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_model_compat_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_order_items: {
        Row: {
          brand: string | null
          created_at: string
          designation: string
          id: string
          owner_id: string
          part_id: string | null
          part_order_id: string
          quantity: number
          quantity_from_stock: number
          quantity_received: number
          quantity_recovered: number
          quantity_requested: number
          quantity_to_order: number
          received_quantity: number
          reference: string | null
          source_type: string | null
          status: string
          storage_location_id: string | null
          suggestion: Json
          supplier_id: string | null
          supplier_part_id: string | null
          unit_purchase_cost_actual: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          designation: string
          id?: string
          owner_id: string
          part_id?: string | null
          part_order_id: string
          quantity?: number
          quantity_from_stock?: number
          quantity_received?: number
          quantity_recovered?: number
          quantity_requested?: number
          quantity_to_order?: number
          received_quantity?: number
          reference?: string | null
          source_type?: string | null
          status?: string
          storage_location_id?: string | null
          suggestion?: Json
          supplier_id?: string | null
          supplier_part_id?: string | null
          unit_purchase_cost_actual?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          designation?: string
          id?: string
          owner_id?: string
          part_id?: string | null
          part_order_id?: string
          quantity?: number
          quantity_from_stock?: number
          quantity_received?: number
          quantity_recovered?: number
          quantity_requested?: number
          quantity_to_order?: number
          received_quantity?: number
          reference?: string | null
          source_type?: string | null
          status?: string
          storage_location_id?: string | null
          suggestion?: Json
          supplier_id?: string | null
          supplier_part_id?: string | null
          unit_purchase_cost_actual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "part_order_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_order_items_part_order_id_fkey"
            columns: ["part_order_id"]
            isOneToOne: false
            referencedRelation: "part_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_order_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_order_items_supplier_part_id_fkey"
            columns: ["supplier_part_id"]
            isOneToOne: false
            referencedRelation: "supplier_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_orders: {
        Row: {
          created_at: string
          id: string
          installation_id: string
          notes: string | null
          ordered_at: string | null
          owner_id: string
          pickup_cost: number | null
          quote_id: string | null
          received_at: string | null
          shipping_cost: number | null
          status: string
          stock_analysis: Json
          supplier_delivery_cost: number | null
          supplier_id: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          installation_id: string
          notes?: string | null
          ordered_at?: string | null
          owner_id: string
          pickup_cost?: number | null
          quote_id?: string | null
          received_at?: string | null
          shipping_cost?: number | null
          status?: string
          stock_analysis?: Json
          supplier_delivery_cost?: number | null
          supplier_id?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          installation_id?: string
          notes?: string | null
          ordered_at?: string | null
          owner_id?: string
          pickup_cost?: number | null
          quote_id?: string | null
          received_at?: string | null
          shipping_cost?: number | null
          status?: string
          stock_analysis?: Json
          supplier_delivery_cost?: number | null
          supplier_id?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_orders_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      part_type_compat: {
        Row: {
          owner_id: string
          part_id: string
          type_id: string
        }
        Insert: {
          owner_id?: string
          part_id: string
          type_id: string
        }
        Update: {
          owner_id?: string
          part_id?: string
          type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_type_compat_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_type_compat_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          brand_id: string | null
          category: string | null
          coefficient: number | null
          commercial_specs: Json
          created_at: string
          description: string | null
          documentation_url: string | null
          id: string
          is_kit: boolean
          is_obsolete: boolean
          is_oversized: boolean
          length_meters: number | null
          manufacturer: string | null
          margin_rate: number | null
          max_sale_price: number | null
          min_sale_price: number | null
          name: string
          owner_id: string
          photo_url: string | null
          pricing_unit: string
          purchase_price: number
          recommended_sale_price: number | null
          reference: string | null
          replacement_notes: string | null
          replacement_part_id: string | null
          sale_price: number
          subfamily: string | null
          technical_specs: Json
          updated_at: string
          vat_rate: number | null
          weight_kg: number | null
          width_meters: number | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          coefficient?: number | null
          commercial_specs?: Json
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_kit?: boolean
          is_obsolete?: boolean
          is_oversized?: boolean
          length_meters?: number | null
          manufacturer?: string | null
          margin_rate?: number | null
          max_sale_price?: number | null
          min_sale_price?: number | null
          name: string
          owner_id: string
          photo_url?: string | null
          pricing_unit?: string
          purchase_price?: number
          recommended_sale_price?: number | null
          reference?: string | null
          replacement_notes?: string | null
          replacement_part_id?: string | null
          sale_price?: number
          subfamily?: string | null
          technical_specs?: Json
          updated_at?: string
          vat_rate?: number | null
          weight_kg?: number | null
          width_meters?: number | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          coefficient?: number | null
          commercial_specs?: Json
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_kit?: boolean
          is_obsolete?: boolean
          is_oversized?: boolean
          length_meters?: number | null
          manufacturer?: string | null
          margin_rate?: number | null
          max_sale_price?: number | null
          min_sale_price?: number | null
          name?: string
          owner_id?: string
          photo_url?: string | null
          pricing_unit?: string
          purchase_price?: number
          recommended_sale_price?: number | null
          reference?: string | null
          replacement_notes?: string | null
          replacement_part_id?: string | null
          sale_price?: number
          subfamily?: string | null
          technical_specs?: Json
          updated_at?: string
          vat_rate?: number | null
          weight_kg?: number | null
          width_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_replacement_part_id_fkey"
            columns: ["replacement_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_number: string
          owner_id: string
          quote_id: string | null
          received_at: string
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_number: string
          owner_id: string
          quote_id?: string | null
          received_at?: string
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string
          owner_id?: string
          quote_id?: string | null
          received_at?: string
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_calculation_logs: {
        Row: {
          created_at: string
          details: Json
          id: string
          message: string
          owner_id: string
          quote_id: string | null
          session_key: string | null
          step: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          message: string
          owner_id?: string
          quote_id?: string | null
          session_key?: string | null
          step: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          message?: string
          owner_id?: string
          quote_id?: string | null
          session_key?: string | null
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_calculation_logs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_installations: {
        Row: {
          created_at: string
          id: string
          installation_id: string
          owner_id: string
          position: number
          quote_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installation_id: string
          owner_id: string
          position?: number
          quote_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installation_id?: string
          owner_id?: string
          position?: number
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_installations_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_installations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          installation_id: string | null
          length_meters: number | null
          owner_id: string
          parent_part_id: string | null
          part_id: string | null
          position: number
          quantity: number
          quote_id: string
          relation_kind: string | null
          stock_usage: string
          storage_location_id: string | null
          unit_cost: number
          unit_price: number
          weight_kg: number | null
          width_meters: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          installation_id?: string | null
          length_meters?: number | null
          owner_id: string
          parent_part_id?: string | null
          part_id?: string | null
          position?: number
          quantity?: number
          quote_id: string
          relation_kind?: string | null
          stock_usage?: string
          storage_location_id?: string | null
          unit_cost?: number
          unit_price?: number
          weight_kg?: number | null
          width_meters?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          installation_id?: string | null
          length_meters?: number | null
          owner_id?: string
          parent_part_id?: string | null
          part_id?: string | null
          position?: number
          quantity?: number
          quote_id?: string
          relation_kind?: string | null
          stock_usage?: string
          storage_location_id?: string | null
          unit_cost?: number
          unit_price?: number
          weight_kg?: number | null
          width_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_parent_part_id_fkey"
            columns: ["parent_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_tickets: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          quote_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          quote_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          quote_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_tickets_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          contract_id: string | null
          created_at: string
          dump_evacuation_fee: number
          id: string
          installation_id: string | null
          intervention_reason: string
          is_on_call: boolean
          issued_at: string
          labor_hours: number | null
          labor_rate: number | null
          lifting_equipment_fee: number
          notes: string | null
          oversized_shipping_fee: number
          owner_id: string
          quote_number: string
          report_id: string | null
          shipping_fee: number
          site_id: string | null
          status: string
          ticket_group_id: string | null
          ticket_id: string | null
          travel_count: number
          travel_fee: number | null
          updated_at: string
          vat_rate: number
          waste_treatment_fee: number
        }
        Insert: {
          client_id: string
          contract_id?: string | null
          created_at?: string
          dump_evacuation_fee?: number
          id?: string
          installation_id?: string | null
          intervention_reason?: string
          is_on_call?: boolean
          issued_at?: string
          labor_hours?: number | null
          labor_rate?: number | null
          lifting_equipment_fee?: number
          notes?: string | null
          oversized_shipping_fee?: number
          owner_id: string
          quote_number: string
          report_id?: string | null
          shipping_fee?: number
          site_id?: string | null
          status?: string
          ticket_group_id?: string | null
          ticket_id?: string | null
          travel_count?: number
          travel_fee?: number | null
          updated_at?: string
          vat_rate?: number
          waste_treatment_fee?: number
        }
        Update: {
          client_id?: string
          contract_id?: string | null
          created_at?: string
          dump_evacuation_fee?: number
          id?: string
          installation_id?: string | null
          intervention_reason?: string
          is_on_call?: boolean
          issued_at?: string
          labor_hours?: number | null
          labor_rate?: number | null
          lifting_equipment_fee?: number
          notes?: string | null
          oversized_shipping_fee?: number
          owner_id?: string
          quote_number?: string
          report_id?: string | null
          shipping_fee?: number
          site_id?: string | null
          status?: string
          ticket_group_id?: string | null
          ticket_id?: string | null
          travel_count?: number
          travel_fee?: number | null
          updated_at?: string
          vat_rate?: number
          waste_treatment_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "intervention_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_ticket_group_id_fkey"
            columns: ["ticket_group_id"]
            isOneToOne: false
            referencedRelation: "ticket_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          role: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          role?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          role?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          client_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          owner_id: string
          site_number: string
          site_sequence: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          owner_id: string
          site_number: string
          site_sequence: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          site_number?: string
          site_sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          command_ticket_id: string | null
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          owner_id: string
          part_id: string | null
          part_order_item_id: string | null
          quantity: number
          reason: string | null
          storage_location_id: string | null
        }
        Insert: {
          command_ticket_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          owner_id: string
          part_id?: string | null
          part_order_item_id?: string | null
          quantity: number
          reason?: string | null
          storage_location_id?: string | null
        }
        Update: {
          command_ticket_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          owner_id?: string
          part_id?: string | null
          part_order_item_id?: string | null
          quantity?: number
          reason?: string | null
          storage_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_command_ticket_id_fkey"
            columns: ["command_ticket_id"]
            isOneToOne: false
            referencedRelation: "part_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_order_item_id_fkey"
            columns: ["part_order_item_id"]
            isOneToOne: false
            referencedRelation: "part_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_tickets: {
        Row: {
          completed_at: string | null
          created_at: string
          destination_location_id: string
          id: string
          notes: string | null
          owner_id: string
          part_id: string
          quantity: number
          source_location_id: string | null
          status: string
          supplier_id: string | null
          ticket_number: string
          type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          destination_location_id: string
          id?: string
          notes?: string | null
          owner_id: string
          part_id: string
          quantity: number
          source_location_id?: string | null
          status?: string
          supplier_id?: string | null
          ticket_number?: string
          type: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          destination_location_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          part_id?: string
          quantity?: number
          source_location_id?: string | null
          status?: string
          supplier_id?: string | null
          ticket_number?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_tickets_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_tickets_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_tickets_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_tickets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_location_stocks: {
        Row: {
          id: string
          owner_id: string
          part_id: string | null
          quantity_available: number
          quantity_minimum: number
          quantity_reserved: number
          storage_location_id: string
          supplier_part_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          part_id?: string | null
          quantity_available?: number
          quantity_minimum?: number
          quantity_reserved?: number
          storage_location_id: string
          supplier_part_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          part_id?: string | null
          quantity_available?: number
          quantity_minimum?: number
          quantity_reserved?: number
          storage_location_id?: string
          supplier_part_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_location_stocks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_location_stocks_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_location_stocks_supplier_part_id_fkey"
            columns: ["supplier_part_id"]
            isOneToOne: false
            referencedRelation: "supplier_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          address: string
          city: string | null
          country: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          postal_code: string | null
          site_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          postal_code?: string | null
          site_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          postal_code?: string | null
          site_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_installation_types: {
        Row: {
          created_at: string
          id: string
          installation_type_id: string
          owner_id: string
          subcontractor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installation_type_id: string
          owner_id: string
          subcontractor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installation_type_id?: string
          owner_id?: string
          subcontractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_installation_types_installation_type_id_fkey"
            columns: ["installation_type_id"]
            isOneToOne: false
            referencedRelation: "installation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_installation_types_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          account_holder: string | null
          address: string | null
          bic: string | null
          created_at: string
          day_rate: number
          email: string | null
          extra_km_rate: number
          half_day_rate: number
          hourly_rate: number
          iban: string | null
          id: string
          included_km: number
          intervention_zone: Json
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          owner_id: string
          payment_terms: string | null
          phone: string | null
          relay_location_id: string | null
          stock_location_id: string | null
          travel_rate: number
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          address?: string | null
          bic?: string | null
          created_at?: string
          day_rate?: number
          email?: string | null
          extra_km_rate?: number
          half_day_rate?: number
          hourly_rate?: number
          iban?: string | null
          id?: string
          included_km?: number
          intervention_zone?: Json
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          owner_id: string
          payment_terms?: string | null
          phone?: string | null
          relay_location_id?: string | null
          stock_location_id?: string | null
          travel_rate?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          address?: string | null
          bic?: string | null
          created_at?: string
          day_rate?: number
          email?: string | null
          extra_km_rate?: number
          half_day_rate?: number
          hourly_rate?: number
          iban?: string | null
          id?: string
          included_km?: number
          intervention_zone?: Json
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          payment_terms?: string | null
          phone?: string | null
          relay_location_id?: string | null
          stock_location_id?: string | null
          travel_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_relay_location_id_fkey"
            columns: ["relay_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_parts: {
        Row: {
          created_at: string
          id: string
          lead_time_days: number | null
          owner_id: string
          part_id: string
          price_updated_at: string
          purchase_price: number
          shipping_cost: number
          supplier_id: string
          supplier_ref: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_time_days?: number | null
          owner_id: string
          part_id: string
          price_updated_at?: string
          purchase_price?: number
          shipping_cost?: number
          supplier_id: string
          supplier_ref?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_time_days?: number | null
          owner_id?: string
          part_id?: string
          price_updated_at?: string
          purchase_price?: number
          shipping_cost?: number
          supplier_id?: string
          supplier_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_holder: string | null
          bic: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          bic?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          bic?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_group_tickets: {
        Row: {
          created_at: string
          group_id: string
          id: string
          owner_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          owner_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          owner_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_group_tickets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ticket_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_group_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_groups: {
        Row: {
          client_id: string
          closed_at: string | null
          created_at: string
          id: string
          owner_id: string
          site_id: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          site_id: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          site_id?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_groups_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          client_id: string
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          installation_id: string
          owner_id: string
          priority: string
          site_id: string
          status: string
          storage_location_id: string | null
          ticket_number: string
          ticket_sequence: number
          ticket_type: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          installation_id: string
          owner_id: string
          priority?: string
          site_id: string
          status?: string
          storage_location_id?: string | null
          ticket_number: string
          ticket_sequence: number
          ticket_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          installation_id?: string
          owner_id?: string
          priority?: string
          site_id?: string
          status?: string
          storage_location_id?: string | null
          ticket_number?: string
          ticket_sequence?: number
          ticket_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_stock_ticket: {
        Args: { p_actor?: string; p_ticket_id: string }
        Returns: undefined
      }
      consume_site_stock_from_quote_item: {
        Args: { p_actor?: string; p_quote_item_id: string }
        Returns: undefined
      }
      create_ticket_with_diagnostic: {
        Args: {
          p_client_id: string
          p_description?: string
          p_installation_id: string
          p_site_id: string
          p_ticket_group_id?: string
          p_ticket_number: string
          p_title: string
        }
        Returns: {
          client_id: string
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          installation_id: string
          owner_id: string
          priority: string
          site_id: string
          status: string
          storage_location_id: string | null
          ticket_number: string
          ticket_sequence: number
          ticket_type: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_site_storage_location: {
        Args: { p_owner_id?: string; p_site_id: string }
        Returns: string
      }
      next_owner_sequence: {
        Args: {
          sequence_column: string
          table_name: string
          target_owner: string
        }
        Returns: number
      }
      receive_quote_item_to_site_stock: {
        Args: { p_actor?: string; p_quote_item_id: string }
        Returns: undefined
      }
      recover_stock_for_part_order_item: {
        Args: { p_actor?: string; p_item_id: string; p_quantity: number }
        Returns: undefined
      }
      refresh_part_order_status: {
        Args: { p_part_order_id: string }
        Returns: string
      }
      release_stock_for_part_order_item: {
        Args: { p_actor?: string; p_item_id: string }
        Returns: undefined
      }
      reserve_stock_for_part_order_item: {
        Args: {
          p_actor?: string
          p_item_id: string
          p_quantity: number
          p_storage_location_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
