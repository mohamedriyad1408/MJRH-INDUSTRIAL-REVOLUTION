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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_requests: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          employee_id: string | null
          id: string
          reason: string | null
          request_type: Database["public"]["Enums"]["staff_request_type"] | null
          requested_by: string | null
          status: Database["public"]["Enums"]["advance_status"]
          technician_id: string | null
          technician_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          employee_id?: string | null
          id?: string
          reason?: string | null
          request_type?:
            | Database["public"]["Enums"]["staff_request_type"]
            | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["advance_status"]
          technician_id?: string | null
          technician_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          employee_id?: string | null
          id?: string
          reason?: string | null
          request_type?:
            | Database["public"]["Enums"]["staff_request_type"]
            | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["advance_status"]
          technician_id?: string | null
          technician_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "advance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          audience: string
          body: string | null
          branch_id: string | null
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          source_id: string | null
          source_type: string | null
          tenant_id: string
          title: string
          tone: string
        }
        Insert: {
          audience?: string
          body?: string | null
          branch_id?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
          title: string
          tone?: string
        }
        Update: {
          audience?: string
          body?: string | null
          branch_id?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
          title?: string
          tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          business_name: string
          currency: string
          default_delivery_fee: number
          tax_percent: number
          tenant_id: string
          updated_at: string
          urgent_service_fee: number
        }
        Insert: {
          business_name?: string
          currency?: string
          default_delivery_fee?: number
          tax_percent?: number
          tenant_id: string
          updated_at?: string
          urgent_service_fee?: number
        }
        Update: {
          business_name?: string
          currency?: string
          default_delivery_fee?: number
          tax_percent?: number
          tenant_id?: string
          updated_at?: string
          urgent_service_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          actual: number | null
          budget_id: string
          category: string
          created_at: string
          expected: number
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual?: number | null
          budget_id: string
          category: string
          created_at?: string
          expected?: number
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          actual?: number | null
          budget_id?: string
          category?: string
          created_at?: string
          expected?: number
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "budget_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          expected_expenses: number
          expected_revenue: number
          id: string
          month: number | null
          notes: string | null
          period_label: string
          period_type: string
          tenant_id: string
          updated_at: string
          week: number | null
          year: number
        }
        Insert: {
          created_at?: string
          expected_expenses?: number
          expected_revenue?: number
          id?: string
          month?: number | null
          notes?: string | null
          period_label: string
          period_type?: string
          tenant_id?: string
          updated_at?: string
          week?: number | null
          year: number
        }
        Update: {
          created_at?: string
          expected_expenses?: number
          expected_revenue?: number
          id?: string
          month?: number | null
          notes?: string | null
          period_label?: string
          period_type?: string
          tenant_id?: string
          updated_at?: string
          week?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_type: string
          branch_id: string | null
          created_at: string
          current_balance: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          branch_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          branch_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          cash_account_id: string
          created_at: string
          created_by: string | null
          description: string
          direction: string
          happened_at: string
          id: string
          source_id: string | null
          source_type: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          cash_account_id: string
          created_at?: string
          created_by?: string | null
          description: string
          direction: string
          happened_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          cash_account_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          direction?: string
          happened_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v_cash_account_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          normal_balance: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          normal_balance: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          normal_balance?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "chart_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          path: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          stack: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          path?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          path?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "client_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_financial_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          direction: string
          entry_at: string
          entry_type: string
          id: string
          order_id: string | null
          source_id: string | null
          source_type: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          direction: string
          entry_at?: string
          entry_type: string
          id?: string
          order_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          direction?: string
          entry_at?: string
          entry_type?: string
          id?: string
          order_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_financial_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty: {
        Row: {
          customer_id: string
          id: string
          last_order_at: string | null
          lifetime_spend: number
          points: number
          tenant_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          customer_id: string
          id?: string
          last_order_at?: string | null
          lifetime_spend?: number
          points?: number
          tenant_id?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string
          id?: string
          last_order_at?: string | null
          lifetime_spend?: number
          points?: number
          tenant_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_loyalty_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_loyalty_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_messages: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          message: string
          order_id: string | null
          phone: string | null
          sent_at: string | null
          status: string
          template_key: string | null
          tenant_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          message: string
          order_id?: string | null
          phone?: string | null
          sent_at?: string | null
          status?: string
          template_key?: string | null
          tenant_id?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          message?: string
          order_id?: string | null
          phone?: string | null
          sent_at?: string | null
          status?: string
          template_key?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_returns: {
        Row: {
          amount: number
          billable: boolean
          branch_id: string | null
          created_at: string
          created_by: string | null
          current_stage: string
          customer_id: string | null
          id: string
          notes: string | null
          order_id: string
          photo_url: string | null
          reason: string
          received_at: string
          resolved_at: string | null
          resolved_by: string | null
          return_type: string
          service_unit_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billable?: boolean
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          photo_url?: string | null
          reason: string
          received_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          return_type: string
          service_unit_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billable?: boolean
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          photo_url?: string | null
          reason?: string
          received_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          return_type?: string
          service_unit_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_returns_service_unit_id_fkey"
            columns: ["service_unit_id"]
            isOneToOne: false
            referencedRelation: "drying_assembly_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_returns_service_unit_id_fkey"
            columns: ["service_unit_id"]
            isOneToOne: false
            referencedRelation: "service_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          area: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          lat: number | null
          lng: number | null
          location_url: string | null
          notes: string | null
          phone: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_url?: string | null
          notes?: string | null
          phone: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_url?: string | null
          notes?: string | null
          phone?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cash_closings: {
        Row: {
          branch_id: string | null
          cash_account_id: string
          cash_in: number
          cash_out: number
          closed_at: string
          closed_by: string | null
          closing_date: string
          counted_balance: number
          created_at: string
          difference: number
          expected_balance: number
          id: string
          notes: string | null
          opening_balance: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cash_account_id: string
          cash_in?: number
          cash_out?: number
          closed_at?: string
          closed_by?: string | null
          closing_date?: string
          counted_balance?: number
          created_at?: string
          difference?: number
          expected_balance?: number
          id?: string
          notes?: string | null
          opening_balance?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cash_account_id?: string
          cash_in?: number
          cash_out?: number
          closed_at?: string
          closed_by?: string | null
          closing_date?: string
          counted_balance?: number
          created_at?: string
          difference?: number
          expected_balance?: number
          id?: string
          notes?: string | null
          opening_balance?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_cash_closings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_cash_closings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v_cash_account_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_cash_closings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "daily_cash_closings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_salaries: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          paid: boolean
          tenant_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          paid?: boolean
          tenant_id?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          paid?: boolean
          tenant_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_salaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "daily_salaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_log: {
        Row: {
          accuracy: number | null
          employee_id: string
          id: string
          lat: number
          lng: number
          recorded_at: string
          tenant_id: string | null
        }
        Insert: {
          accuracy?: number | null
          employee_id: string
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          tenant_id?: string | null
        }
        Update: {
          accuracy?: number | null
          employee_id?: string
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_location_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_location_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "driver_location_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_attendance: {
        Row: {
          check_in_at: string
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          tenant_id: string | null
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in_at?: string
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
          work_date?: string
        }
        Update: {
          check_in_at?: string
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employee_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_compensation_terms: {
        Row: {
          commission_percent: number
          created_at: string
          daily_rate: number
          effective_from: string
          employee_id: string
          id: string
          is_active: boolean
          monthly_salary: number
          notes: string | null
          pay_frequency: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          daily_rate?: number
          effective_from?: string
          employee_id: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          notes?: string | null
          pay_frequency?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          daily_rate?: number
          effective_from?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          notes?: string | null
          pay_frequency?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_compensation_terms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employee_compensation_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_financial_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          employee_id: string
          entry_at: string
          entry_type: string
          id: string
          source_id: string | null
          source_type: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          employee_id: string
          entry_at?: string
          entry_type: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          employee_id?: string
          entry_at?: string
          entry_type?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_financial_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_financial_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employee_financial_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_requests: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          employee_id: string
          end_at: string | null
          id: string
          reason: string | null
          start_at: string | null
          status: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["employee_request_type"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          employee_id: string
          end_at?: string | null
          id?: string
          reason?: string | null
          start_at?: string | null
          status?: string
          tenant_id?: string | null
          type: Database["public"]["Enums"]["employee_request_type"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          employee_id?: string
          end_at?: string | null
          id?: string
          reason?: string | null
          start_at?: string | null
          status?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["employee_request_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employee_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string | null
          commission_percent: number
          created_at: string
          current_lat: number | null
          current_lng: number | null
          email: string | null
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          job_role: Database["public"]["Enums"]["job_role"]
          job_title: string
          location_accuracy: number | null
          location_updated_at: string | null
          monthly_salary: number
          notes: string | null
          phone: string | null
          preferred_areas: string[] | null
          profile_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          station: Database["public"]["Enums"]["station_type"] | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          commission_percent?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          email?: string | null
          full_name: string
          hire_date?: string
          id?: string
          is_active?: boolean
          job_role?: Database["public"]["Enums"]["job_role"]
          job_title: string
          location_accuracy?: number | null
          location_updated_at?: string | null
          monthly_salary?: number
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          station?: Database["public"]["Enums"]["station_type"] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          commission_percent?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          email?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          job_role?: Database["public"]["Enums"]["job_role"]
          job_title?: string
          location_accuracy?: number | null
          location_updated_at?: string | null
          monthly_salary?: number
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          station?: Database["public"]["Enums"]["station_type"] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assets: {
        Row: {
          asset_type: string
          branch_id: string | null
          created_at: string
          id: string
          last_maintenance_at: string | null
          name: string
          next_maintenance_at: string | null
          notes: string | null
          purchase_cost: number
          purchase_date: string | null
          serial_no: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          asset_type?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          last_maintenance_at?: string | null
          name: string
          next_maintenance_at?: string | null
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          last_maintenance_at?: string | null
          name?: string
          next_maintenance_at?: string | null
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "equipment_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          cash_account_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          employee_id: string | null
          id: string
          monthly_percentage: number | null
          paid_at: string | null
          source_id: string | null
          source_type: string | null
          spent_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          cash_account_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          employee_id?: string | null
          id?: string
          monthly_percentage?: number | null
          paid_at?: string | null
          source_id?: string | null
          source_type?: string | null
          spent_at?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          cash_account_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          employee_id?: string | null
          id?: string
          monthly_percentage?: number | null
          paid_at?: string | null
          source_id?: string | null
          source_type?: string | null
          spent_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v_cash_account_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          is_paid: boolean
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          is_paid?: boolean
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          is_paid?: boolean
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          min_quantity: number | null
          name: string
          quantity: number | null
          tenant_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          min_quantity?: number | null
          name: string
          quantity?: number | null
          tenant_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          min_quantity?: number | null
          name?: string
          quantity?: number | null
          tenant_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          avg_unit_cost: number
          branch_id: string | null
          category: string
          created_at: string
          current_qty: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          reorder_level: number
          sku: string | null
          supplier: string | null
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          avg_unit_cost?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          current_qty?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          reorder_level?: number
          sku?: string | null
          supplier?: string | null
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          avg_unit_cost?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          current_qty?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          reorder_level?: number
          sku?: string | null
          supplier?: string | null
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string | null
          cash_account_id: string | null
          created_at: string
          created_by: string | null
          expense_id: string | null
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          order_id: string | null
          payment_status: string
          qty: number
          tenant_id: string
          unit_cost: number
        }
        Insert: {
          branch_id?: string | null
          cash_account_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          order_id?: string | null
          payment_status?: string
          qty: number
          tenant_id?: string
          unit_cost?: number
        }
        Update: {
          branch_id?: string | null
          cash_account_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          order_id?: string | null
          payment_status?: string
          qty?: number
          tenant_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v_cash_account_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "v_active_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ironing_daily_payouts: {
        Row: {
          amount: number
          cash_transaction_id: string | null
          created_at: string
          employee_id: string
          expense_id: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payout_date: string
          percentage: number
          pieces_count: number
          status: string
          tenant_id: string
          updated_at: string
          work_value: number
        }
        Insert: {
          amount?: number
          cash_transaction_id?: string | null
          created_at?: string
          employee_id: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_date?: string
          percentage?: number
          pieces_count?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          work_value?: number
        }
        Update: {
          amount?: number
          cash_transaction_id?: string | null
          created_at?: string
          employee_id?: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_date?: string
          percentage?: number
          pieces_count?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          work_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ironing_daily_payouts_cash_transaction_id_fkey"
            columns: ["cash_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ironing_daily_payouts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ironing_daily_payouts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ironing_daily_payouts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "v_active_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ironing_daily_payouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ironing_daily_payouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ironing_rates: {
        Row: {
          created_at: string
          effective_from: string
          employee_id: string
          id: string
          percentage: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          employee_id: string
          id?: string
          percentage?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          employee_id?: string
          id?: string
          percentage?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ironing_rates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ironing_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ironing_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          entry_no: number | null
          id: string
          posted_at: string
          posted_by: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          entry_date?: string
          entry_no?: number | null
          id?: string
          posted_at?: string
          posted_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          entry_no?: number | null
          id?: string
          posted_at?: string
          posted_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          id: string
          journal_entry_id: string
          memo: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id: string
          memo?: string | null
          tenant_id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id?: string
          memo?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          request_type: Database["public"]["Enums"]["staff_request_type"] | null
          requested_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          request_type?:
            | Database["public"]["Enums"]["staff_request_type"]
            | null
          requested_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          request_type?:
            | Database["public"]["Enums"]["staff_request_type"]
            | null
          requested_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          branch_id: string | null
          cash_account_id: string | null
          created_at: string
          data: Json
          id: string
          journal_entry_id: string | null
          notification_created: boolean
          notification_id: string | null
          output: Json
          process_key: string
          process_name: string
          report_bucket: string
          requires_notification: boolean
          source_id: string | null
          source_type: string
          tenant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          branch_id?: string | null
          cash_account_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          journal_entry_id?: string | null
          notification_created?: boolean
          notification_id?: string | null
          output?: Json
          process_key: string
          process_name: string
          report_bucket?: string
          requires_notification?: boolean
          source_id?: string | null
          source_type: string
          tenant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          branch_id?: string | null
          cash_account_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          journal_entry_id?: string | null
          notification_created?: boolean
          notification_id?: string | null
          output?: Json
          process_key?: string
          process_name?: string
          report_bucket?: string
          requires_notification?: boolean
          source_id?: string | null
          source_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v_cash_account_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "app_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "operation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_process_catalog: {
        Row: {
          actor_roles: string[]
          business_type: string
          created_at: string
          domain: string
          id: string
          is_active: boolean
          output_contract: Json
          process_key: string
          process_name: string
          required_data: string[]
        }
        Insert: {
          actor_roles?: string[]
          business_type?: string
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          output_contract?: Json
          process_key: string
          process_name: string
          required_data?: string[]
        }
        Update: {
          actor_roles?: string[]
          business_type?: string
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          output_contract?: Json
          process_key?: string
          process_name?: string
          required_data?: string[]
        }
        Relationships: []
      }
      order_attachments: {
        Row: {
          created_at: string
          id: string
          label: string | null
          order_id: string
          tenant_id: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          order_id: string
          tenant_id?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          order_id?: string
          tenant_id?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          amount_delta: number
          cancel_type: string
          cancelled_by: string | null
          created_at: string
          id: string
          order_id: string
          order_item_id: string | null
          reason: string
          service_unit_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_delta?: number
          cancel_type: string
          cancelled_by?: string | null
          created_at?: string
          id?: string
          order_id: string
          order_item_id?: string | null
          reason: string
          service_unit_id?: string | null
          tenant_id?: string
        }
        Update: {
          amount_delta?: number
          cancel_type?: string
          cancelled_by?: string | null
          created_at?: string
          id?: string
          order_id?: string
          order_item_id?: string | null
          reason?: string
          service_unit_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_service_unit_id_fkey"
            columns: ["service_unit_id"]
            isOneToOne: false
            referencedRelation: "drying_assembly_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_service_unit_id_fkey"
            columns: ["service_unit_id"]
            isOneToOne: false
            referencedRelation: "service_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "order_cancellations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          id: string
          line_total: number | null
          name: string
          notes: string | null
          order_id: string
          qty: number
          service_item_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          line_total?: number | null
          name: string
          notes?: string | null
          order_id: string
          qty?: number
          service_item_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          line_total?: number | null
          name?: string
          notes?: string | null
          order_id?: string
          qty?: number
          service_item_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string
          technician_id: string | null
          tenant_id: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id: string
          technician_id?: string | null
          tenant_id?: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string
          technician_id?: string | null
          tenant_id?: string | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "order_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_driver_employee_id: string | null
          branch_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          customer_chosen_delivery_at: string | null
          customer_id: string
          customer_notified_at: string | null
          customer_payment_amount: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_area: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          discount_amount: number
          discount_percent: number
          id: string
          invoice_finalized_at: string | null
          is_test: boolean
          is_urgent: boolean
          notes: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["order_type"]
          overpayment_amount: number
          payment_detected_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_ocr_checked_at: string | null
          payment_ocr_confidence: number | null
          payment_ocr_error: string | null
          payment_ocr_provider: string | null
          payment_ocr_text: string | null
          payment_proof_uploaded_at: string | null
          payment_proof_uploaded_by: string | null
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_verification_status: string
          payment_verified_at: string | null
          pickup_address: string | null
          pickup_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          promised_delivery_at: string | null
          public_token: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          tenant_id: string | null
          tip_employee_id: string | null
          total: number
          updated_at: string
          urgent_fee: number
          urgent_fee_amount: number
        }
        Insert: {
          assigned_driver_employee_id?: string | null
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_chosen_delivery_at?: string | null
          customer_id: string
          customer_notified_at?: string | null
          customer_payment_amount?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_area?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          invoice_finalized_at?: string | null
          is_test?: boolean
          is_urgent?: boolean
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          overpayment_amount?: number
          payment_detected_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_ocr_checked_at?: string | null
          payment_ocr_confidence?: number | null
          payment_ocr_error?: string | null
          payment_ocr_provider?: string | null
          payment_ocr_text?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_uploaded_by?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_verification_status?: string
          payment_verified_at?: string | null
          pickup_address?: string | null
          pickup_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          promised_delivery_at?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          tip_employee_id?: string | null
          total?: number
          updated_at?: string
          urgent_fee?: number
          urgent_fee_amount?: number
        }
        Update: {
          assigned_driver_employee_id?: string | null
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_chosen_delivery_at?: string | null
          customer_id?: string
          customer_notified_at?: string | null
          customer_payment_amount?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_area?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          invoice_finalized_at?: string | null
          is_test?: boolean
          is_urgent?: boolean
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          overpayment_amount?: number
          payment_detected_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_ocr_checked_at?: string | null
          payment_ocr_confidence?: number | null
          payment_ocr_error?: string | null
          payment_ocr_provider?: string | null
          payment_ocr_text?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_uploaded_by?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_verification_status?: string
          payment_verified_at?: string | null
          pickup_address?: string | null
          pickup_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          promised_delivery_at?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          tip_employee_id?: string | null
          total?: number
          updated_at?: string
          urgent_fee?: number
          urgent_fee_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_driver_employee_id_fkey"
            columns: ["assigned_driver_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tip_employee_id_fkey"
            columns: ["tip_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_lines: {
        Row: {
          advances_deducted: number
          base_salary: number
          cash_transaction_id: string | null
          commission_amount: number
          created_at: string
          daily_salary: number
          employee_id: string
          expense_id: string | null
          gross_pay: number
          id: string
          net_pay: number
          notes: string | null
          other_deductions: number
          overtime_amount: number
          payroll_period_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advances_deducted?: number
          base_salary?: number
          cash_transaction_id?: string | null
          commission_amount?: number
          created_at?: string
          daily_salary?: number
          employee_id: string
          expense_id?: string | null
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          other_deductions?: number
          overtime_amount?: number
          payroll_period_id: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          advances_deducted?: number
          base_salary?: number
          cash_transaction_id?: string | null
          commission_amount?: number
          created_at?: string
          daily_salary?: number
          employee_id?: string
          expense_id?: string | null
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          other_deductions?: number
          overtime_amount?: number
          payroll_period_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_cash_transaction_id_fkey"
            columns: ["cash_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "v_active_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payroll_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          advances_total: number
          created_at: string
          created_by: string | null
          gross_total: number
          id: string
          net_total: number
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          posted_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advances_total?: number
          created_at?: string
          created_by?: string | null
          gross_total?: number
          id?: string
          net_total?: number
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          posted_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          advances_total?: number
          created_at?: string
          created_by?: string | null
          gross_total?: number
          id?: string
          net_total?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          posted_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payroll_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_requests: {
        Row: {
          address: string
          area: string | null
          branch_id: string | null
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          driver_employee_id: string | null
          estimated_pieces: number | null
          id: string
          lat: number | null
          lng: number | null
          location_url: string | null
          notes: string | null
          phone: string
          picked_up_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["pickup_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          area?: string | null
          branch_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          driver_employee_id?: string | null
          estimated_pieces?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_url?: string | null
          notes?: string | null
          phone: string
          picked_up_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["pickup_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          area?: string | null
          branch_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          driver_employee_id?: string | null
          estimated_pieces?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_url?: string | null
          notes?: string | null
          phone?: string
          picked_up_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["pickup_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "pickup_requests_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pickup_requests_driver_employee_id_fkey"
            columns: ["driver_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pickup_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fees: {
        Row: {
          billing_day: number
          created_at: string
          id: string
          monthly_fee: number
          notes: string | null
          per_order_fee: number
          plan_name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_day?: number
          created_at?: string
          id?: string
          monthly_fee?: number
          notes?: string | null
          per_order_fee?: number
          plan_name?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_day?: number
          created_at?: string
          id?: string
          monthly_fee?: number
          notes?: string | null
          per_order_fee?: number
          plan_name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "platform_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qc_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          photo_url: string | null
          result: string
          service_unit_id: string | null
          severity: string
          tenant_id: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          photo_url?: string | null
          result: string
          service_unit_id?: string | null
          severity?: string
          tenant_id?: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          photo_url?: string | null
          result?: string
          service_unit_id?: string | null
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "qc_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_service_unit_id_fkey"
            columns: ["service_unit_id"]
            isOneToOne: false
            referencedRelation: "drying_assembly_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_service_unit_id_fkey"
            columns: ["service_unit_id"]
            isOneToOne: false
            referencedRelation: "service_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "qc_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          aliases: string[]
          area_type: string
          created_at: string
          default_delivery_fee: number
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          tenant_id: string | null
        }
        Insert: {
          aliases?: string[]
          area_type?: string
          created_at?: string
          default_delivery_fee?: number
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          tenant_id?: string | null
        }
        Update: {
          aliases?: string[]
          area_type?: string
          created_at?: string
          default_delivery_fee?: number
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_items: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          service_type?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_units: {
        Row: {
          assembly_checked_at: string | null
          assembly_checked_by: string | null
          assembly_notes: string | null
          assigned_ironing_employee_id: string | null
          attributes: Json
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          complexity_factor: number
          created_at: string
          current_stage: string
          customer_notes: string | null
          garment_type: string
          id: string
          ironing_assigned_at: string | null
          ironing_base_value: number
          ironing_completed_at: string | null
          is_shirt_like: boolean
          label_code: string
          label_status: string
          line_value: number
          name: string
          needs_reclean: boolean
          order_id: string
          order_item_id: string | null
          photo_url: string | null
          qr_code: string
          reclean_photo_url: string | null
          reclean_reason: string | null
          reclean_reported_at: string | null
          reclean_reported_by: string | null
          reclean_resolved_at: string | null
          reclean_return_to_employee_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          staff_notes: string | null
          status: string
          tenant_id: string | null
          unit_number: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          assembly_checked_at?: string | null
          assembly_checked_by?: string | null
          assembly_notes?: string | null
          assigned_ironing_employee_id?: string | null
          attributes?: Json
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          complexity_factor?: number
          created_at?: string
          current_stage?: string
          customer_notes?: string | null
          garment_type?: string
          id?: string
          ironing_assigned_at?: string | null
          ironing_base_value?: number
          ironing_completed_at?: string | null
          is_shirt_like?: boolean
          label_code: string
          label_status?: string
          line_value?: number
          name: string
          needs_reclean?: boolean
          order_id: string
          order_item_id?: string | null
          photo_url?: string | null
          qr_code: string
          reclean_photo_url?: string | null
          reclean_reason?: string | null
          reclean_reported_at?: string | null
          reclean_reported_by?: string | null
          reclean_resolved_at?: string | null
          reclean_return_to_employee_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          staff_notes?: string | null
          status?: string
          tenant_id?: string | null
          unit_number: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          assembly_checked_at?: string | null
          assembly_checked_by?: string | null
          assembly_notes?: string | null
          assigned_ironing_employee_id?: string | null
          attributes?: Json
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          complexity_factor?: number
          created_at?: string
          current_stage?: string
          customer_notes?: string | null
          garment_type?: string
          id?: string
          ironing_assigned_at?: string | null
          ironing_base_value?: number
          ironing_completed_at?: string | null
          is_shirt_like?: boolean
          label_code?: string
          label_status?: string
          line_value?: number
          name?: string
          needs_reclean?: boolean
          order_id?: string
          order_item_id?: string | null
          photo_url?: string | null
          qr_code?: string
          reclean_photo_url?: string | null
          reclean_reason?: string | null
          reclean_reported_at?: string | null
          reclean_reported_by?: string | null
          reclean_resolved_at?: string | null
          reclean_return_to_employee_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          staff_notes?: string | null
          status?: string
          tenant_id?: string | null
          unit_number?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_units_assigned_ironing_employee_id_fkey"
            columns: ["assigned_ironing_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_reclean_return_to_employee_id_fkey"
            columns: ["reclean_return_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          branch_id: string | null
          completed_at: string | null
          employee_id: string | null
          id: string
          notes: string | null
          order_id: string
          station: Database["public"]["Enums"]["workstation"]
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          branch_id?: string | null
          completed_at?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          station: Database["public"]["Enums"]["workstation"]
          tenant_id?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          branch_id?: string | null
          completed_at?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          station?: Database["public"]["Enums"]["workstation"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "task_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          commission_percent: number
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          station: Database["public"]["Enums"]["service_type"]
          tenant_id: string | null
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          station?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
        }
        Update: {
          commission_percent?: number
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          station?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_billing_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          is_enabled: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_operating_zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lat: number
          lng: number
          name: string
          radius_km: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lat: number
          lng: number
          name?: string
          radius_km?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number
          lng?: number
          name?: string
          radius_km?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_operating_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_operating_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_color: string | null
          business_address: string | null
          business_phone: string | null
          business_type: string
          created_at: string
          id: string
          industry_profile: Json
          is_active: boolean
          lat: number | null
          lng: number | null
          location_url: string | null
          logo_url: string | null
          name: string
          notes: string | null
          operating_radius_km: number | null
          owner_user_id: string | null
          public_url: string | null
          secondary_color: string | null
          slug: string
          subscription_fee: number
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_type?: string
          created_at?: string
          id?: string
          industry_profile?: Json
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          location_url?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          operating_radius_km?: number | null
          owner_user_id?: string | null
          public_url?: string | null
          secondary_color?: string | null
          slug: string
          subscription_fee?: number
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_type?: string
          created_at?: string
          id?: string
          industry_profile?: Json
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          location_url?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          operating_radius_km?: number | null
          owner_user_id?: string | null
          public_url?: string | null
          secondary_color?: string | null
          slug?: string
          subscription_fee?: number
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string | null
          id: string
          is_off: boolean
          start_time: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time?: string | null
          id?: string
          is_off?: boolean
          start_time?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string | null
          id?: string
          is_off?: boolean
          start_time?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      delivery_readiness_audit: {
        Row: {
          assigned_driver_employee_id: string | null
          branch_id: string | null
          deliverable: boolean | null
          issue_codes: string[] | null
          label_issue_count: number | null
          no_driver: number | null
          not_qc_count: number | null
          order_id: string | null
          order_number: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          reclean_count: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          tenant_id: string | null
          total_units: number | null
          unpaid: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_driver_employee_id_fkey"
            columns: ["assigned_driver_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drying_assembly_queue: {
        Row: {
          assembly_checked_at: string | null
          assembly_notes: string | null
          branch_id: string | null
          created_at: string | null
          current_stage: string | null
          customer_name: string | null
          customer_phone: string | null
          garment_type: string | null
          id: string | null
          label_code: string | null
          label_status: string | null
          name: string | null
          needs_reclean: boolean | null
          order_id: string | null
          order_number: number | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          photo_url: string | null
          reclean_reason: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_readiness_audit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_operation_audit: {
        Row: {
          branch_id: string | null
          created_at: string | null
          detail: string | null
          domain: string | null
          href: string | null
          issue_key: string | null
          severity: string | null
          source_id: string | null
          source_type: string | null
          tenant_id: string | null
          title: string | null
        }
        Relationships: []
      }
      operation_answer_matrix: {
        Row: {
          actor_id: string | null
          branch_answer: string | null
          branch_id: string | null
          branch_name: string | null
          cash_account_id: string | null
          cash_account_name: string | null
          cash_answer: string | null
          created_at: string | null
          data: Json | null
          id: string | null
          journal_answer: string | null
          journal_entry_id: string | null
          notification_answer: string | null
          notification_id: string | null
          output: Json | null
          process_key: string | null
          process_name: string | null
          report_answer: string | null
          report_bucket: string | null
          requires_notification: boolean | null
          source_id: string | null
          source_type: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v_cash_account_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "app_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "operation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_bootstrap_health: {
        Row: {
          business_type: string | null
          has_branch: boolean | null
          has_cash_account: boolean | null
          has_catalog: boolean | null
          has_chart_accounts: boolean | null
          has_customer_returns_feature: boolean | null
          has_employee: boolean | null
          has_ironing_distribution_feature: boolean | null
          has_settings: boolean | null
          is_ready: boolean | null
          name: string | null
          slug: string | null
          tenant_id: string | null
        }
        Insert: {
          business_type?: string | null
          has_branch?: never
          has_cash_account?: never
          has_catalog?: never
          has_chart_accounts?: never
          has_customer_returns_feature?: never
          has_employee?: never
          has_ironing_distribution_feature?: never
          has_settings?: never
          is_ready?: never
          name?: string | null
          slug?: string | null
          tenant_id?: string | null
        }
        Update: {
          business_type?: string | null
          has_branch?: never
          has_cash_account?: never
          has_catalog?: never
          has_chart_accounts?: never
          has_customer_returns_feature?: never
          has_employee?: never
          has_ironing_distribution_feature?: never
          has_settings?: never
          is_ready?: never
          name?: string | null
          slug?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      v_active_expenses: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          employee_id: string | null
          id: string | null
          monthly_percentage: number | null
          paid_at: string | null
          source_id: string | null
          source_type: string | null
          spent_at: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          employee_id?: string | null
          id?: string | null
          monthly_percentage?: number | null
          paid_at?: string | null
          source_id?: string | null
          source_type?: string | null
          spent_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          employee_id?: string | null
          id?: string | null
          monthly_percentage?: number | null
          paid_at?: string | null
          source_id?: string | null
          source_type?: string | null
          spent_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cash_account_health: {
        Row: {
          account_type: string | null
          balance_difference: number | null
          current_balance: number | null
          expected_balance: number | null
          id: string | null
          is_active: boolean | null
          last_transaction_at: string | null
          name: string | null
          opening_balance: number | null
          posted_in: number | null
          posted_out: number | null
          posted_transactions_count: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_balances: {
        Row: {
          balance: number | null
          customer_id: string | null
          full_name: string | null
          last_entry_at: string | null
          phone: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profit_loss: {
        Row: {
          account_type: string | null
          amount: number | null
          code: string | null
          name: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_balance: {
        Row: {
          account_id: string | null
          account_type: string | null
          balance: number | null
          code: string | null
          name: string | null
          normal_balance: string | null
          tenant_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accounting_account_id: { Args: { _code: string }; Returns: string }
      accounting_account_id_for: {
        Args: { _code: string; _tenant_id: string }
        Returns: string
      }
      accounting_period_is_closed: { Args: { _date: string }; Returns: boolean }
      active_customer_return_for_unit: {
        Args: { _unit_id: string }
        Returns: string
      }
      apdo_event_href: {
        Args: { _data?: Json; _source_id: string; _source_type: string }
        Returns: string
      }
      can_access_branch: {
        Args: { _branch_id: string; _tenant_id: string }
        Returns: boolean
      }
      can_access_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      can_admin_tenant_finance: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      can_manage_tenant_finance: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      cancel_order_with_reason: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      cash_account_expected_balance: {
        Args: { _cash_account_id: string }
        Returns: number
      }
      close_order_stale_notifications: {
        Args: { _order_id: string }
        Returns: number
      }
      complete_customer_return: {
        Args: { _notes?: string; _return_id: string }
        Returns: undefined
      }
      confirm_delivery_with_collection: {
        Args: {
          _collected_amount?: number
          _driver_employee_id?: string
          _order_id: string
        }
        Returns: {
          message: string
          overpayment: number
          status: string
        }[]
      }
      create_cash_account_with_opening: {
        Args: {
          _account_type?: string
          _name: string
          _opening_balance?: number
        }
        Returns: string
      }
      create_journal_entry: {
        Args: {
          _description: string
          _entry_date: string
          _lines: Json
          _source_id: string
          _source_type: string
        }
        Returns: string
      }
      create_journal_entry_for_tenant: {
        Args: {
          _description: string
          _entry_date: string
          _lines: Json
          _source_id: string
          _source_type: string
          _tenant_id: string
        }
        Returns: string
      }
      current_employee_branch_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      customer_portal_create_order:
        | {
            Args: {
              _image_urls?: string[]
              _items: Json
              _notes?: string
              _phone: string
            }
            Returns: {
              id: string
              order_number: number
            }[]
          }
        | {
            Args: {
              _image_urls?: string[]
              _items: Json
              _notes?: string
              _phone: string
              _slug?: string
            }
            Returns: {
              id: string
              order_number: number
            }[]
          }
      customer_portal_orders:
        | {
            Args: { _phone: string }
            Returns: {
              created_at: string
              id: string
              notes: string
              order_items: Json
              order_number: number
              promised_delivery_at: string
              status: Database["public"]["Enums"]["order_status"]
              total: number
            }[]
          }
        | {
            Args: { _phone: string; _slug?: string }
            Returns: {
              created_at: string
              customer_payment_amount: number
              id: string
              invoice_finalized_at: string
              notes: string
              order_items: Json
              order_number: number
              overpayment_amount: number
              payment_method: Database["public"]["Enums"]["payment_method"]
              payment_proof_url: string
              payment_status: Database["public"]["Enums"]["payment_status"]
              payment_verification_status: string
              picked_up_at: string
              pickup_driver_employee_id: string
              pickup_status: string
              promised_delivery_at: string
              status: Database["public"]["Enums"]["order_status"]
              total: number
            }[]
          }
      customer_portal_services:
        | {
            Args: { _phone: string }
            Returns: {
              id: string
              name: string
              price: number
              service_type: Database["public"]["Enums"]["service_type"]
            }[]
          }
        | {
            Args: { _phone: string; _slug?: string }
            Returns: {
              id: string
              name: string
              price: number
              service_type: Database["public"]["Enums"]["service_type"]
            }[]
          }
      customer_portal_submit_instapay_payment: {
        Args: {
          _amount: number
          _detected_amount?: number
          _order_id: string
          _phone: string
          _proof_url: string
          _slug: string
        }
        Returns: {
          message: string
          overpayment: number
          paid_amount: number
          required_amount: number
          status: string
        }[]
      }
      customer_portal_verify:
        | {
            Args: { _phone: string }
            Returns: {
              address: string
              full_name: string
              id: string
              lat: number
              lng: number
              phone: string
            }[]
          }
        | {
            Args: { _phone: string; _slug?: string }
            Returns: {
              address: string
              full_name: string
              id: string
              lat: number
              lng: number
              phone: string
            }[]
          }
      default_branch_id_for: { Args: { _tenant_id: string }; Returns: string }
      ensure_default_branch_for: {
        Args: { _tenant_id: string; _tenant_name?: string }
        Returns: string
      }
      ensure_default_cash_account: { Args: never; Returns: string }
      ensure_default_cash_account_for: {
        Args: { _tenant_id: string }
        Returns: string
      }
      ensure_default_chart_accounts: { Args: never; Returns: undefined }
      ensure_default_chart_accounts_for: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      ensure_tenant_owner_employee: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      estimate_ironing_base_value: {
        Args: {
          _fallback?: number
          _garment_type?: string
          _name: string
          _tenant_id: string
        }
        Returns: number
      }
      financial_audit_summary: { Args: { _tenant_id?: string }; Returns: Json }
      generate_smart_operational_alerts: {
        Args: { _tenant_id?: string }
        Returns: number
      }
      geo_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      get_order_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          customer_chosen_delivery_at: string
          customer_name: string
          invoice_finalized_at: string
          is_urgent: boolean
          order_number: number
          overpayment_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_verification_status: string
          picked_up_at: string
          pickup_at: string
          pickup_status: string
          promised_delivery_at: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }[]
      }
      get_order_items_by_token: {
        Args: { _token: string }
        Returns: {
          line_total: number
          name: string
          qty: number
          unit_price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_privileged_context: { Args: never; Returns: boolean }
      is_same_employee_identity: {
        Args: { _email: string; _profile_id: string }
        Returns: boolean
      }
      is_service_role: { Args: never; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_manager: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      jwt_role: { Args: never; Returns: string }
      normalize_laundry_item_name: { Args: { _name: string }; Returns: string }
      pass_qc_unit: {
        Args: { _notes?: string; _unit_id: string }
        Returns: undefined
      }
      pay_daily_ironing_workers: {
        Args: { _cash_account_id?: string; _work_date?: string }
        Returns: Json
      }
      pick_cash_account_for_expense: {
        Args: {
          _branch_id: string
          _cash_account_id?: string
          _tenant_id: string
        }
        Returns: string
      }
      portal_phone_key: { Args: { _phone: string }; Returns: string }
      present_ironing_employees: {
        Args: { _branch_id?: string; _tenant_id: string }
        Returns: {
          branch_id: string
          check_in_at: string
          employee_id: string
          full_name: string
        }[]
      }
      rebalance_ironing_assignments: {
        Args: { _branch_id?: string; _order_id?: string; _tenant_id?: string }
        Returns: Json
      }
      record_operation_event: {
        Args: {
          _branch_id?: string
          _cash_account_id?: string
          _data?: Json
          _journal_entry_id?: string
          _notification_id?: string
          _output?: Json
          _process_key: string
          _process_name: string
          _report_bucket?: string
          _requires_notification?: boolean
          _source_id?: string
          _source_type: string
        }
        Returns: string
      }
      refresh_tenant_service_areas: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      register_customer_return: {
        Args: {
          _amount?: number
          _billable?: boolean
          _order_id: string
          _photo_url?: string
          _reason: string
          _return_type: string
          _service_unit_id: string
        }
        Returns: string
      }
      register_qc_issue: {
        Args: { _reason: string; _result: string; _unit_id: string }
        Returns: undefined
      }
      register_reclean_return: {
        Args: { _photo_url?: string; _reason: string; _unit_id: string }
        Returns: undefined
      }
      repair_cash_account_balances: { Args: never; Returns: Json }
      repair_cash_closing_basics: { Args: never; Returns: Json }
      repair_financial_operation_audit: {
        Args: { _max_items?: number; _tenant_id?: string }
        Returns: Json
      }
      repair_ledger_basics: { Args: never; Returns: Json }
      repair_operation_event_apdo: {
        Args: { _event_id: string }
        Returns: Json
      }
      repair_operation_events_apdo: {
        Args: { _max_items?: number; _tenant_id?: string }
        Returns: Json
      }
      resolve_client_error_log: {
        Args: { _id: string; _notes?: string }
        Returns: undefined
      }
      resolve_reclean_return: { Args: { _unit_id: string }; Returns: undefined }
      seed_laundry_service_catalog: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      seed_tenant_defaults: {
        Args: { _tenant_id: string; _tenant_name: string }
        Returns: undefined
      }
      set_customer_delivery_choice: {
        Args: { _chosen: string; _token: string }
        Returns: undefined
      }
      sync_expense_financials: {
        Args: { _expense_id: string }
        Returns: undefined
      }
      sync_inventory_movement_accounting: {
        Args: { _movement_id: string }
        Returns: undefined
      }
      sync_manual_cash_transaction_journal: {
        Args: { _cash_transaction_id: string }
        Returns: string
      }
      sync_manual_cash_transactions_journals: { Args: never; Returns: Json }
      sync_monthly_payroll_payables: {
        Args: { _month?: string }
        Returns: Json
      }
      sync_order_financials: { Args: { _order_id: string }; Returns: undefined }
      sync_payroll_payment_journal: {
        Args: { _payroll_line_id: string }
        Returns: string
      }
      transfer_cash_between_accounts: {
        Args: {
          _amount: number
          _from_cash_account_id: string
          _notes?: string
          _to_cash_account_id: string
        }
        Returns: Json
      }
      transfer_cash_between_accounts_for: {
        Args: {
          _amount: number
          _from_cash_account_id: string
          _notes?: string
          _tenant_id: string
          _to_cash_account_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      advance_status: "pending" | "approved" | "rejected"
      app_role:
        | "super_admin"
        | "owner"
        | "cs_manager"
        | "ops_manager"
        | "employee"
        | "customer"
        | "courier"
      employee_request_type:
        | "overtime"
        | "prayer"
        | "lunch"
        | "break"
        | "advance"
        | "leave"
      expense_category: "salaries" | "rent" | "water" | "electricity" | "other"
      job_role:
        | "ops_manager"
        | "cs_manager"
        | "cleaning_tech"
        | "ironing_tech"
        | "packing_tech"
        | "driver"
        | "receptionist"
        | "other"
        | "assembly_clerk"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "annual" | "sick" | "unpaid" | "emergency"
      order_status:
        | "received"
        | "cleaning"
        | "ironing"
        | "packing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      order_type: "walk_in" | "delivery"
      payment_method: "cash" | "instapay" | "cod_cash" | "cod_instapay"
      payment_status: "unpaid" | "paid"
      pickup_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "converted"
        | "cancelled"
      service_type: "cleaning" | "ironing" | "both"
      staff_request_type:
        | "overtime"
        | "prayer"
        | "lunch"
        | "rest"
        | "advance"
        | "leave"
      station_type:
        | "reception"
        | "cleaning"
        | "ironing"
        | "packing"
        | "delivery"
      workstation:
        | "reception"
        | "cleaning"
        | "ironing"
        | "packing"
        | "delivery"
        | "drying_assembly"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      advance_status: ["pending", "approved", "rejected"],
      app_role: [
        "super_admin",
        "owner",
        "cs_manager",
        "ops_manager",
        "employee",
        "customer",
        "courier",
      ],
      employee_request_type: [
        "overtime",
        "prayer",
        "lunch",
        "break",
        "advance",
        "leave",
      ],
      expense_category: ["salaries", "rent", "water", "electricity", "other"],
      job_role: [
        "ops_manager",
        "cs_manager",
        "cleaning_tech",
        "ironing_tech",
        "packing_tech",
        "driver",
        "receptionist",
        "other",
        "assembly_clerk",
      ],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["annual", "sick", "unpaid", "emergency"],
      order_status: [
        "received",
        "cleaning",
        "ironing",
        "packing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      order_type: ["walk_in", "delivery"],
      payment_method: ["cash", "instapay", "cod_cash", "cod_instapay"],
      payment_status: ["unpaid", "paid"],
      pickup_status: [
        "pending",
        "assigned",
        "picked_up",
        "converted",
        "cancelled",
      ],
      service_type: ["cleaning", "ironing", "both"],
      staff_request_type: [
        "overtime",
        "prayer",
        "lunch",
        "rest",
        "advance",
        "leave",
      ],
      station_type: ["reception", "cleaning", "ironing", "packing", "delivery"],
      workstation: [
        "reception",
        "cleaning",
        "ironing",
        "packing",
        "delivery",
        "drying_assembly",
      ],
    },
  },
} as const
