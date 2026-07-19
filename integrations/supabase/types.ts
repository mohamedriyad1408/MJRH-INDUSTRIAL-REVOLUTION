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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "app_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "app_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      approval_chains: {
        Row: {
          amount_threshold: number
          approval_order: number
          created_at: string
          enterprise_id: string | null
          entity_type: string
          id: string
          required_role: string
          tenant_id: string | null
        }
        Insert: {
          amount_threshold: number
          approval_order: number
          created_at?: string
          enterprise_id?: string | null
          entity_type: string
          id?: string
          required_role: string
          tenant_id?: string | null
        }
        Update: {
          amount_threshold?: number
          approval_order?: number
          created_at?: string
          enterprise_id?: string | null
          entity_type?: string
          id?: string
          required_role?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_chains_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "approval_chains_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "approval_chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "approval_chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_immutable: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_immutable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_immutable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_immutable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          branch_code: string | null
          created_at: string
          custom_config: Json | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          region: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_code?: string | null
          created_at?: string
          custom_config?: Json | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          region?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_code?: string | null
          created_at?: string
          custom_config?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          region?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            foreignKeyName: "cash_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          work_order_id: string | null
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
          work_order_id?: string | null
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
          work_order_id?: string | null
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          {
            foreignKeyName: "cash_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      core_api_audit_log: {
        Row: {
          action: string
          api_key_id: string | null
          created_at: string
          id: string
          integration_key: string | null
          metadata: Json
          resource: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          api_key_id?: string | null
          created_at?: string
          id?: string
          integration_key?: string | null
          metadata?: Json
          resource?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          api_key_id?: string | null
          created_at?: string
          id?: string
          integration_key?: string | null
          metadata?: Json
          resource?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_api_audit_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "core_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_api_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_api_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_api_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at: string | null
          scopes: string[]
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_name: string
          key_prefix?: string
          last_used_at?: string | null
          scopes?: string[]
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_name?: string
          key_prefix?: string
          last_used_at?: string | null
          scopes?: string[]
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_asset_type_registry: {
        Row: {
          asset_type: string
          created_at: string
          description: string | null
          installer_function: string | null
          metadata: Json
          name_en: string
          status: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          description?: string | null
          installer_function?: string | null
          metadata?: Json
          name_en: string
          status?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          description?: string | null
          installer_function?: string | null
          metadata?: Json
          name_en?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_authorization_denials: {
        Row: {
          action_key: string
          actor_user_id: string | null
          capability_key: string
          created_at: string
          id: string
          metadata: Json
          permission_key: string
          reason: string
          resource_id: string | null
          resource_key: string
          tenant_id: string | null
        }
        Insert: {
          action_key: string
          actor_user_id?: string | null
          capability_key: string
          created_at?: string
          id?: string
          metadata?: Json
          permission_key: string
          reason?: string
          resource_id?: string | null
          resource_key: string
          tenant_id?: string | null
        }
        Update: {
          action_key?: string
          actor_user_id?: string | null
          capability_key?: string
          created_at?: string
          id?: string
          metadata?: Json
          permission_key?: string
          reason?: string
          resource_id?: string | null
          resource_key?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_authorization_denials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_authorization_denials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_authorization_denials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_automation_rules: {
        Row: {
          actions: Json
          capability_key: string | null
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name_ar: string
          name_en: string
          ownership_level: string
          retry_policy: Json
          rule_key: string
          tenant_id: string | null
          trigger_event_key: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          capability_key?: string | null
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_ar: string
          name_en: string
          ownership_level?: string
          retry_policy?: Json
          rule_key: string
          tenant_id?: string | null
          trigger_event_key: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          capability_key?: string | null
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_ar?: string
          name_en?: string
          ownership_level?: string
          retry_policy?: Json
          rule_key?: string
          tenant_id?: string | null
          trigger_event_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_automation_rules_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_automation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          event_id: string | null
          id: string
          result: Json
          rule_id: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          result?: Json
          rule_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          result?: Json
          rule_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_automation_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "core_domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "core_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_backup_registry: {
        Row: {
          backup_key: string
          backup_type: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          storage_ref: string | null
          tenant_id: string | null
          verification_result: Json
          verified_at: string | null
        }
        Insert: {
          backup_key: string
          backup_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          storage_ref?: string | null
          tenant_id?: string | null
          verification_result?: Json
          verified_at?: string | null
        }
        Update: {
          backup_key?: string
          backup_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          storage_ref?: string | null
          tenant_id?: string | null
          verification_result?: Json
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_backup_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_backup_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_backup_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_billing_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          line_items: Json
          metadata: Json
          paid_at: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          line_items?: Json
          metadata?: Json
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          line_items?: Json
          metadata?: Json
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "core_organization_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_billing_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          currency: string
          included_capabilities: string[]
          is_active: boolean
          limits: Json
          metadata: Json
          name_ar: string
          name_en: string
          plan_key: string
          price_amount: number
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          included_capabilities?: string[]
          is_active?: boolean
          limits?: Json
          metadata?: Json
          name_ar: string
          name_en: string
          plan_key: string
          price_amount?: number
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          included_capabilities?: string[]
          is_active?: boolean
          limits?: Json
          metadata?: Json
          name_ar?: string
          name_en?: string
          plan_key?: string
          price_amount?: number
        }
        Relationships: []
      }
      core_capability_asset_definitions: {
        Row: {
          asset_key: string
          asset_type: string
          capability_key: string
          created_at: string
          id: string
          metadata: Json
          ownership_level: string
          payload: Json
          source_id: string | null
          source_table: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          asset_key: string
          asset_type: string
          capability_key: string
          created_at?: string
          id?: string
          metadata?: Json
          ownership_level: string
          payload?: Json
          source_id?: string | null
          source_table?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          asset_key?: string
          asset_type?: string
          capability_key?: string
          created_at?: string
          id?: string
          metadata?: Json
          ownership_level?: string
          payload?: Json
          source_id?: string | null
          source_table?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_capability_asset_definitions_asset_type_fkey"
            columns: ["asset_type"]
            isOneToOne: false
            referencedRelation: "core_asset_type_registry"
            referencedColumns: ["asset_type"]
          },
          {
            foreignKeyName: "core_capability_asset_definitions_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
        ]
      }
      core_capability_dependencies: {
        Row: {
          capability_key: string
          created_at: string
          dependency_key: string
          dependency_type: string
          id: string
          metadata: Json
          required: boolean
        }
        Insert: {
          capability_key: string
          created_at?: string
          dependency_key: string
          dependency_type?: string
          id?: string
          metadata?: Json
          required?: boolean
        }
        Update: {
          capability_key?: string
          created_at?: string
          dependency_key?: string
          dependency_type?: string
          id?: string
          metadata?: Json
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "core_capability_dependencies_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
        ]
      }
      core_capability_registry: {
        Row: {
          capability_key: string
          category: string
          created_at: string
          description: string | null
          display_order: number
          enabled: boolean
          icon: string
          id: string
          installable: boolean
          manifest_json: Json
          manifest_schema_version: number
          metadata: Json
          name_ar: string
          name_en: string
          owner: string
          ownership_level: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          capability_key: string
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          enabled?: boolean
          icon?: string
          id?: string
          installable?: boolean
          manifest_json?: Json
          manifest_schema_version?: number
          metadata?: Json
          name_ar: string
          name_en: string
          owner?: string
          ownership_level?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          capability_key?: string
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          enabled?: boolean
          icon?: string
          id?: string
          installable?: boolean
          manifest_json?: Json
          manifest_schema_version?: number
          metadata?: Json
          name_ar?: string
          name_en?: string
          owner?: string
          ownership_level?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      core_dashboard_definitions: {
        Row: {
          audience_roles: string[]
          created_at: string
          dashboard_key: string
          id: string
          layout: Json
          metadata: Json
          name_ar: string
          name_en: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          audience_roles?: string[]
          created_at?: string
          dashboard_key: string
          id?: string
          layout?: Json
          metadata?: Json
          name_ar: string
          name_en: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          audience_roles?: string[]
          created_at?: string
          dashboard_key?: string
          id?: string
          layout?: Json
          metadata?: Json
          name_ar?: string
          name_en?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_dashboard_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_dashboard_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_dashboard_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_dashboard_widgets: {
        Row: {
          config: Json
          dashboard_id: string | null
          id: string
          is_active: boolean
          report_key: string | null
          sort_order: number
          tenant_id: string | null
          title_ar: string
          title_en: string
          widget_key: string
          widget_type: string
        }
        Insert: {
          config?: Json
          dashboard_id?: string | null
          id?: string
          is_active?: boolean
          report_key?: string | null
          sort_order?: number
          tenant_id?: string | null
          title_ar: string
          title_en: string
          widget_key: string
          widget_type?: string
        }
        Update: {
          config?: Json
          dashboard_id?: string | null
          id?: string
          is_active?: boolean
          report_key?: string | null
          sort_order?: number
          tenant_id?: string | null
          title_ar?: string
          title_en?: string
          widget_key?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "core_dashboard_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_dashboard_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_dashboard_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_dashboard_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_departments: {
        Row: {
          config: Json
          created_at: string
          department_key: string
          id: string
          is_active: boolean
          is_default: boolean
          name_ar: string
          name_en: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          department_key: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          department_key?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_document_outputs: {
        Row: {
          generated_at: string
          generated_by: string | null
          id: string
          metadata: Json
          output_type: string
          rendered_payload: Json
          rendered_text: string | null
          source_entity: string | null
          source_id: string | null
          status: string
          template_id: string | null
          template_key: string
          tenant_id: string
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json
          output_type?: string
          rendered_payload?: Json
          rendered_text?: string | null
          source_entity?: string | null
          source_id?: string | null
          status?: string
          template_id?: string | null
          template_key: string
          tenant_id: string
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json
          output_type?: string
          rendered_payload?: Json
          rendered_text?: string | null
          source_entity?: string | null
          source_id?: string | null
          status?: string
          template_id?: string | null
          template_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_document_outputs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "core_document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_document_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_document_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_document_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_document_templates: {
        Row: {
          capability_key: string | null
          created_at: string
          document_type: string
          id: string
          layout: Json
          locale: string
          metadata: Json
          name_ar: string
          name_en: string
          output_channels: string[]
          ownership_level: string
          status: string
          template_key: string
          tenant_id: string | null
          updated_at: string
          variables: Json
          version: number
        }
        Insert: {
          capability_key?: string | null
          created_at?: string
          document_type?: string
          id?: string
          layout?: Json
          locale?: string
          metadata?: Json
          name_ar: string
          name_en: string
          output_channels?: string[]
          ownership_level?: string
          status?: string
          template_key: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json
          version?: number
        }
        Update: {
          capability_key?: string | null
          created_at?: string
          document_type?: string
          id?: string
          layout?: Json
          locale?: string
          metadata?: Json
          name_ar?: string
          name_en?: string
          output_channels?: string[]
          ownership_level?: string
          status?: string
          template_key?: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "core_document_templates_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_documents: {
        Row: {
          created_at: string
          document_key: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          numbering: Json
          schema: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          document_key: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          numbering?: Json
          schema?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          document_key?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          numbering?: Json
          schema?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_domain_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          metadata: Json
          payload: Json
          producer: string
          source_entity: string | null
          source_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          metadata?: Json
          payload?: Json
          producer?: string
          source_entity?: string | null
          source_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          metadata?: Json
          payload?: Json
          producer?: string
          source_entity?: string | null
          source_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_financial_event_types: {
        Row: {
          accounting_rule: Json
          approval_required: boolean
          created_at: string
          event_key: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          tenant_id: string
        }
        Insert: {
          accounting_rule?: Json
          approval_required?: boolean
          created_at?: string
          event_key: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          tenant_id: string
        }
        Update: {
          accounting_rule?: Json
          approval_required?: boolean
          created_at?: string
          event_key?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_financial_event_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_financial_event_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_financial_event_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_form_fields: {
        Row: {
          created_at: string
          default_value: Json | null
          field_key: string
          field_type: string
          form_id: string
          help_text: string | null
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          metadata: Json
          options: Json
          placeholder: string | null
          required: boolean
          section_id: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
          validation_rules: Json
          visibility_rules: Json
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_key: string
          field_type: string
          form_id: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          label_ar: string
          label_en: string
          metadata?: Json
          options?: Json
          placeholder?: string | null
          required?: boolean
          section_id?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
          validation_rules?: Json
          visibility_rules?: Json
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_key?: string
          field_type?: string
          form_id?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          metadata?: Json
          options?: Json
          placeholder?: string | null
          required?: boolean
          section_id?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          validation_rules?: Json
          visibility_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "core_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "core_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_form_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "core_form_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_form_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_form_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_form_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_form_sections: {
        Row: {
          created_at: string
          description: string | null
          form_id: string
          id: string
          is_active: boolean
          metadata: Json
          section_key: string
          sort_order: number
          tenant_id: string
          title_ar: string
          title_en: string
          updated_at: string
          visibility_rules: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_id: string
          id?: string
          is_active?: boolean
          metadata?: Json
          section_key: string
          sort_order?: number
          tenant_id: string
          title_ar: string
          title_en: string
          updated_at?: string
          visibility_rules?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          form_id?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          section_key?: string
          sort_order?: number
          tenant_id?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
          visibility_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "core_form_sections_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "core_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_form_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_form_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_form_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          form_key: string
          form_version: number
          id: string
          metadata: Json
          source_entity: string | null
          source_id: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          tenant_id: string
          updated_at: string
          validation_result: Json
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          form_key: string
          form_version: number
          id?: string
          metadata?: Json
          source_entity?: string | null
          source_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          tenant_id: string
          updated_at?: string
          validation_result?: Json
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          form_key?: string
          form_version?: number
          id?: string
          metadata?: Json
          source_entity?: string | null
          source_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          tenant_id?: string
          updated_at?: string
          validation_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "core_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "core_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_forms: {
        Row: {
          capability_key: string | null
          created_at: string
          form_key: string
          id: string
          is_active: boolean
          metadata: Json
          name_ar: string
          name_en: string
          ownership_level: string
          schema: Json
          source_template_slug: string | null
          status: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          capability_key?: string | null
          created_at?: string
          form_key: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_ar: string
          name_en: string
          ownership_level?: string
          schema?: Json
          source_template_slug?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          capability_key?: string | null
          created_at?: string
          form_key?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_ar?: string
          name_en?: string
          ownership_level?: string
          schema?: Json
          source_template_slug?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "core_forms_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_governance_policies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name_en: string
          policy_key: string
          rule_definition: Json
          scope: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_en: string
          policy_key: string
          rule_definition?: Json
          scope?: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_en?: string
          policy_key?: string
          rule_definition?: Json
          scope?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_health_checks: {
        Row: {
          check_key: string
          created_at: string
          id: string
          last_checked_at: string | null
          last_result: Json
          metadata: Json
          name_en: string
          status: string
          updated_at: string
        }
        Insert: {
          check_key: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_result?: Json
          metadata?: Json
          name_en: string
          status?: string
          updated_at?: string
        }
        Update: {
          check_key?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_result?: Json
          metadata?: Json
          name_en?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_integration_registry: {
        Row: {
          auth_type: string
          category: string
          created_at: string
          id: string
          integration_key: string
          metadata: Json
          name_en: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_type?: string
          category?: string
          created_at?: string
          id?: string
          integration_key: string
          metadata?: Json
          name_en: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          category?: string
          created_at?: string
          id?: string
          integration_key?: string
          metadata?: Json
          name_en?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_legacy_record_links: {
        Row: {
          canonical_entity: string
          canonical_id: string | null
          created_at: string
          id: string
          legacy_entity: string
          legacy_id: string
          link_type: string
          metadata: Json
          tenant_id: string
          virtual_key: string | null
        }
        Insert: {
          canonical_entity: string
          canonical_id?: string | null
          created_at?: string
          id?: string
          legacy_entity: string
          legacy_id: string
          link_type?: string
          metadata?: Json
          tenant_id: string
          virtual_key?: string | null
        }
        Update: {
          canonical_entity?: string
          canonical_id?: string | null
          created_at?: string
          id?: string
          legacy_entity?: string
          legacy_id?: string
          link_type?: string
          metadata?: Json
          tenant_id?: string
          virtual_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_legacy_record_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_legacy_record_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_legacy_record_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_marketplace_package_versions: {
        Row: {
          checksum: string | null
          created_at: string
          dependencies: Json
          id: string
          manifest: Json
          package_key: string
          published_at: string | null
          release_notes: string | null
          status: string
          version: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          dependencies?: Json
          id?: string
          manifest?: Json
          package_key: string
          published_at?: string | null
          release_notes?: string | null
          status?: string
          version: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          dependencies?: Json
          id?: string
          manifest?: Json
          package_key?: string
          published_at?: string | null
          release_notes?: string | null
          status?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_marketplace_package_versions_package_key_fkey"
            columns: ["package_key"]
            isOneToOne: false
            referencedRelation: "core_marketplace_packages"
            referencedColumns: ["package_key"]
          },
        ]
      }
      core_marketplace_packages: {
        Row: {
          created_at: string
          current_version: string
          id: string
          metadata: Json
          name_ar: string
          name_en: string
          package_key: string
          package_type: string
          publisher: string
          rating: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version?: string
          id?: string
          metadata?: Json
          name_ar: string
          name_en: string
          package_key: string
          package_type: string
          publisher?: string
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version?: string
          id?: string
          metadata?: Json
          name_ar?: string
          name_en?: string
          package_key?: string
          package_type?: string
          publisher?: string
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_navigation_assets: {
        Row: {
          asset_key: string
          capability_key: string | null
          created_at: string
          group_key: string
          icon: string
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          metadata: Json
          owner_key: string
          ownership_level: string
          parent_asset_key: string | null
          required_permissions: string[]
          required_roles: string[]
          route: string
          sort_order: number
          updated_at: string
          visibility_rules: Json
        }
        Insert: {
          asset_key: string
          capability_key?: string | null
          created_at?: string
          group_key?: string
          icon?: string
          id?: string
          is_active?: boolean
          label_ar: string
          label_en: string
          metadata?: Json
          owner_key: string
          ownership_level: string
          parent_asset_key?: string | null
          required_permissions?: string[]
          required_roles?: string[]
          route: string
          sort_order?: number
          updated_at?: string
          visibility_rules?: Json
        }
        Update: {
          asset_key?: string
          capability_key?: string | null
          created_at?: string
          group_key?: string
          icon?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          metadata?: Json
          owner_key?: string
          ownership_level?: string
          parent_asset_key?: string | null
          required_permissions?: string[]
          required_roles?: string[]
          route?: string
          sort_order?: number
          updated_at?: string
          visibility_rules?: Json
        }
        Relationships: []
      }
      core_navigation_items: {
        Row: {
          config: Json
          created_at: string
          department_key: string
          icon: string
          id: string
          is_active: boolean
          item_key: string
          label_ar: string
          label_en: string
          ownership_level: string
          required_permissions: string[]
          required_roles: string[]
          route: string
          sort_order: number
          source_asset_id: string | null
          source_owner_key: string | null
          source_ownership_level: string | null
          tenant_id: string
          visibility_rules: Json
        }
        Insert: {
          config?: Json
          created_at?: string
          department_key: string
          icon?: string
          id?: string
          is_active?: boolean
          item_key: string
          label_ar: string
          label_en: string
          ownership_level?: string
          required_permissions?: string[]
          required_roles?: string[]
          route: string
          sort_order?: number
          source_asset_id?: string | null
          source_owner_key?: string | null
          source_ownership_level?: string | null
          tenant_id: string
          visibility_rules?: Json
        }
        Update: {
          config?: Json
          created_at?: string
          department_key?: string
          icon?: string
          id?: string
          is_active?: boolean
          item_key?: string
          label_ar?: string
          label_en?: string
          ownership_level?: string
          required_permissions?: string[]
          required_roles?: string[]
          route?: string
          sort_order?: number
          source_asset_id?: string | null
          source_owner_key?: string | null
          source_ownership_level?: string | null
          tenant_id?: string
          visibility_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "core_navigation_items_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "core_navigation_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_navigation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_navigation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_navigation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_observability_logs: {
        Row: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          source: string
          tenant_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message: string
          source?: string
          tenant_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_observability_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_observability_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_observability_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_observability_metrics: {
        Row: {
          dimensions: Json
          id: string
          metric_key: string
          metric_value: number
          recorded_at: string
          tenant_id: string | null
        }
        Insert: {
          dimensions?: Json
          id?: string
          metric_key: string
          metric_value?: number
          recorded_at?: string
          tenant_id?: string | null
        }
        Update: {
          dimensions?: Json
          id?: string
          metric_key?: string
          metric_value?: number
          recorded_at?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_observability_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_observability_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_observability_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organization_asset_installs: {
        Row: {
          asset_definition_id: string | null
          asset_key: string
          asset_type: string
          capability_key: string
          id: string
          install_result: Json
          installed_at: string
          installed_version: string
          ownership_level: string
          source_template_slug: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          asset_definition_id?: string | null
          asset_key: string
          asset_type: string
          capability_key: string
          id?: string
          install_result?: Json
          installed_at?: string
          installed_version?: string
          ownership_level?: string
          source_template_slug?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          asset_definition_id?: string | null
          asset_key?: string
          asset_type?: string
          capability_key?: string
          id?: string
          install_result?: Json
          installed_at?: string
          installed_version?: string
          ownership_level?: string
          source_template_slug?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_organization_asset_installs_asset_definition_id_fkey"
            columns: ["asset_definition_id"]
            isOneToOne: false
            referencedRelation: "core_capability_asset_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_organization_asset_installs_asset_type_fkey"
            columns: ["asset_type"]
            isOneToOne: false
            referencedRelation: "core_asset_type_registry"
            referencedColumns: ["asset_type"]
          },
          {
            foreignKeyName: "core_organization_asset_installs_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_organization_asset_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_asset_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_asset_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organization_capabilities: {
        Row: {
          capability_key: string
          config: Json
          id: string
          installed_at: string
          installed_version: string
          ownership_level: string
          source: string
          source_template_slug: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capability_key: string
          config?: Json
          id?: string
          installed_at?: string
          installed_version?: string
          ownership_level?: string
          source?: string
          source_template_slug?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capability_key?: string
          config?: Json
          id?: string
          installed_at?: string
          installed_version?: string
          ownership_level?: string
          source?: string
          source_template_slug?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_organization_capabilities_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_organization_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organization_lifecycle: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          configuration: Json
          created_at: string
          feature_flags: Json
          lifecycle_status: string
          plan_key: string | null
          suspended_at: string | null
          suspension_reason: string | null
          tenant_id: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          configuration?: Json
          created_at?: string
          feature_flags?: Json
          lifecycle_status?: string
          plan_key?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          configuration?: Json
          created_at?: string
          feature_flags?: Json
          lifecycle_status?: string
          plan_key?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_organization_lifecycle_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_lifecycle_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_lifecycle_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organization_lifecycle_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          metadata: Json
          reason: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_organization_lifecycle_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_lifecycle_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_lifecycle_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organization_package_installs: {
        Row: {
          id: string
          installed_at: string
          installed_by: string | null
          metadata: Json
          package_key: string
          status: string
          tenant_id: string
          version: string
        }
        Insert: {
          id?: string
          installed_at?: string
          installed_by?: string | null
          metadata?: Json
          package_key: string
          status?: string
          tenant_id: string
          version: string
        }
        Update: {
          id?: string
          installed_at?: string
          installed_by?: string | null
          metadata?: Json
          package_key?: string
          status?: string
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_organization_package_installs_package_key_fkey"
            columns: ["package_key"]
            isOneToOne: false
            referencedRelation: "core_marketplace_packages"
            referencedColumns: ["package_key"]
          },
          {
            foreignKeyName: "core_organization_package_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_package_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_package_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_organization_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_key: string | null
          starts_at: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_key?: string | null
          starts_at?: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_key?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_organization_subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "core_billing_plans"
            referencedColumns: ["plan_key"]
          },
          {
            foreignKeyName: "core_organization_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_organization_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_permission_assets: {
        Row: {
          action_key: string
          capability_key: string
          capability_registry_key: string | null
          conditions: Json
          created_at: string
          default_roles: string[]
          description: string | null
          id: string
          is_active: boolean
          metadata: Json
          owner_key: string
          ownership_level: string
          permission_key: string
          resource_key: string
          updated_at: string
        }
        Insert: {
          action_key: string
          capability_key: string
          capability_registry_key?: string | null
          conditions?: Json
          created_at?: string
          default_roles?: string[]
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          owner_key: string
          ownership_level: string
          permission_key: string
          resource_key: string
          updated_at?: string
        }
        Update: {
          action_key?: string
          capability_key?: string
          capability_registry_key?: string | null
          conditions?: Json
          created_at?: string
          default_roles?: string[]
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          owner_key?: string
          ownership_level?: string
          permission_key?: string
          resource_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_permission_bindings: {
        Row: {
          conditions: Json
          created_at: string
          effect: string
          id: string
          is_active: boolean
          metadata: Json
          ownership_level: string
          permission_asset_id: string | null
          permission_key: string
          role_key: string
          source_owner_key: string | null
          source_ownership_level: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          effect?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          ownership_level?: string
          permission_asset_id?: string | null
          permission_key: string
          role_key: string
          source_owner_key?: string | null
          source_ownership_level?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          effect?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          ownership_level?: string
          permission_asset_id?: string | null
          permission_key?: string
          role_key?: string
          source_owner_key?: string | null
          source_ownership_level?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_permission_bindings_permission_asset_id_fkey"
            columns: ["permission_asset_id"]
            isOneToOne: false
            referencedRelation: "core_permission_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_permission_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_permission_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_permission_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_platform_admin_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_platform_admin_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_platform_admin_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_platform_admin_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_report_definitions: {
        Row: {
          capability_key: string | null
          columns: Json
          created_at: string
          default_visualization: string
          export_formats: string[]
          filters: Json
          id: string
          metadata: Json
          metrics: Json
          name_ar: string
          name_en: string
          ownership_level: string
          report_key: string
          source_entity: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          capability_key?: string | null
          columns?: Json
          created_at?: string
          default_visualization?: string
          export_formats?: string[]
          filters?: Json
          id?: string
          metadata?: Json
          metrics?: Json
          name_ar: string
          name_en: string
          ownership_level?: string
          report_key: string
          source_entity?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          capability_key?: string | null
          columns?: Json
          created_at?: string
          default_visualization?: string
          export_formats?: string[]
          filters?: Json
          id?: string
          metadata?: Json
          metrics?: Json
          name_ar?: string
          name_en?: string
          ownership_level?: string
          report_key?: string
          source_entity?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_report_definitions_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_roles: {
        Row: {
          approval_level: number
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          permissions: Json
          role_key: string
          tenant_id: string
        }
        Insert: {
          approval_level?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          permissions?: Json
          role_key: string
          tenant_id: string
        }
        Update: {
          approval_level?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          permissions?: Json
          role_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_setup_profiles: {
        Row: {
          accounting: Json
          approvals: Json
          branches: Json
          branding: Json
          completed_at: string | null
          completed_by: string | null
          created_at: string
          document_numbering: Json
          notifications: Json
          operational_model: string | null
          organization: Json
          raw_setup: Json
          setup_version: number
          status: string
          tax: Json
          template_id: string | null
          template_slug: string | null
          tenant_id: string
          updated_at: string
          workflow_style: string | null
          working_hours: Json
        }
        Insert: {
          accounting?: Json
          approvals?: Json
          branches?: Json
          branding?: Json
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          document_numbering?: Json
          notifications?: Json
          operational_model?: string | null
          organization?: Json
          raw_setup?: Json
          setup_version?: number
          status?: string
          tax?: Json
          template_id?: string | null
          template_slug?: string | null
          tenant_id: string
          updated_at?: string
          workflow_style?: string | null
          working_hours?: Json
        }
        Update: {
          accounting?: Json
          approvals?: Json
          branches?: Json
          branding?: Json
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          document_numbering?: Json
          notifications?: Json
          operational_model?: string | null
          organization?: Json
          raw_setup?: Json
          setup_version?: number
          status?: string
          tax?: Json
          template_id?: string | null
          template_slug?: string | null
          tenant_id?: string
          updated_at?: string
          workflow_style?: string | null
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "core_setup_profiles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "core_template_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_setup_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_setup_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_setup_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_task_activity: {
        Row: {
          activity_type: string
          actor_user_id: string | null
          comment: string | null
          created_at: string
          from_status: string | null
          id: string
          metadata: Json
          task_id: string
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          activity_type: string
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          task_id: string
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          activity_type?: string
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          task_id?: string
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "core_task_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_task_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_task_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_task_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_task_id: string
          id: string
          metadata: Json
          task_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          metadata?: Json
          task_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          metadata?: Json
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "v_core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "core_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "core_task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_tasks: {
        Row: {
          assigned_actor_id: string | null
          assigned_actor_type: string
          assigned_at: string | null
          assigned_by: string | null
          assigned_employee_id: string | null
          attachment_refs: Json
          cancelled_at: string | null
          cancelled_by: string | null
          canonical_status: string
          capability_key: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          priority: string
          sla_breached: boolean
          sla_due_at: string | null
          source_entity: string | null
          source_id: string | null
          started_at: string | null
          task_key: string | null
          tenant_id: string
          title: string
          updated_at: string
          waiting_reason: string | null
          work_area_id: string | null
          work_order_id: string | null
        }
        Insert: {
          assigned_actor_id?: string | null
          assigned_actor_type?: string
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_employee_id?: string | null
          attachment_refs?: Json
          cancelled_at?: string | null
          cancelled_by?: string | null
          canonical_status?: string
          capability_key?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          priority?: string
          sla_breached?: boolean
          sla_due_at?: string | null
          source_entity?: string | null
          source_id?: string | null
          started_at?: string | null
          task_key?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          waiting_reason?: string | null
          work_area_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          assigned_actor_id?: string | null
          assigned_actor_type?: string
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_employee_id?: string | null
          attachment_refs?: Json
          cancelled_at?: string | null
          cancelled_by?: string | null
          canonical_status?: string
          capability_key?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          priority?: string
          sla_breached?: boolean
          sla_due_at?: string | null
          source_entity?: string | null
          source_id?: string | null
          started_at?: string | null
          task_key?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          waiting_reason?: string | null
          work_area_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_tasks_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "core_work_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["work_area_id"]
          },
          {
            foreignKeyName: "core_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      core_template_assets: {
        Row: {
          asset_key: string
          asset_type: string
          created_at: string
          definition: Json
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          asset_key: string
          asset_type: string
          created_at?: string
          definition?: Json
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          asset_key?: string
          asset_type?: string
          created_at?: string
          definition?: Json
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_template_assets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "core_template_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      core_template_capabilities: {
        Row: {
          capability_key: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          install_order: number
          ownership_level: string
          required: boolean
          template_slug: string
          updated_at: string
        }
        Insert: {
          capability_key: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          install_order?: number
          ownership_level?: string
          required?: boolean
          template_slug: string
          updated_at?: string
        }
        Update: {
          capability_key?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          install_order?: number
          ownership_level?: string
          required?: boolean
          template_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_template_capabilities_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_template_capabilities_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "core_template_registry"
            referencedColumns: ["slug"]
          },
        ]
      }
      core_template_registry: {
        Row: {
          category: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          metadata: Json
          name_ar: string
          name_en: string
          slug: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          metadata?: Json
          name_ar: string
          name_en: string
          slug: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          metadata?: Json
          name_ar?: string
          name_en?: string
          slug?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_template_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_template_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_template_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_webhook_endpoints: {
        Row: {
          created_at: string
          id: string
          integration_key: string | null
          metadata: Json
          secret_hash: string | null
          status: string
          subscribed_events: string[]
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_key?: string | null
          metadata?: Json
          secret_hash?: string | null
          status?: string
          subscribed_events?: string[]
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_key?: string | null
          metadata?: Json
          secret_hash?: string | null
          status?: string
          subscribed_events?: string[]
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_webhook_endpoints_integration_key_fkey"
            columns: ["integration_key"]
            isOneToOne: false
            referencedRelation: "core_integration_registry"
            referencedColumns: ["integration_key"]
          },
          {
            foreignKeyName: "core_webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_work_areas: {
        Row: {
          capability_key: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name_ar: string
          name_en: string | null
          required_permissions: string[]
          resource_type: string
          sort_order: number
          tenant_id: string
          updated_at: string
          work_area_key: string
        }
        Insert: {
          capability_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_ar: string
          name_en?: string | null
          required_permissions?: string[]
          resource_type?: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          work_area_key: string
        }
        Update: {
          capability_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name_ar?: string
          name_en?: string | null
          required_permissions?: string[]
          resource_type?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          work_area_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_work_areas_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_workflow_blueprints: {
        Row: {
          blueprint_key: string
          created_at: string
          definition: Json
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          style: string
          tenant_id: string
        }
        Insert: {
          blueprint_key: string
          created_at?: string
          definition?: Json
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          style?: string
          tenant_id: string
        }
        Update: {
          blueprint_key?: string
          created_at?: string
          definition?: Json
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          style?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_workflow_blueprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_workflow_blueprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_workflow_blueprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_workflow_events: {
        Row: {
          actor_user_id: string | null
          comment: string | null
          created_at: string
          event_type: string
          from_stage_id: string | null
          id: string
          metadata: Json
          task_id: string | null
          tenant_id: string
          to_stage_id: string | null
          work_area_id: string | null
          work_order_id: string | null
          workflow_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          event_type: string
          from_stage_id?: string | null
          id?: string
          metadata?: Json
          task_id?: string | null
          tenant_id: string
          to_stage_id?: string | null
          work_area_id?: string | null
          work_order_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          event_type?: string
          from_stage_id?: string | null
          id?: string
          metadata?: Json
          task_id?: string | null
          tenant_id?: string
          to_stage_id?: string | null
          work_area_id?: string | null
          work_order_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_workflow_events_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_core_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "core_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "core_work_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["work_area_id"]
          },
          {
            foreignKeyName: "core_workflow_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_events_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      core_workflow_stage_bindings: {
        Row: {
          assignment_rule: Json
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          stage_id: string
          tenant_id: string
          updated_at: string
          work_area_id: string
          workflow_id: string
        }
        Insert: {
          assignment_rule?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          stage_id: string
          tenant_id: string
          updated_at?: string
          work_area_id: string
          workflow_id: string
        }
        Update: {
          assignment_rule?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          stage_id?: string
          tenant_id?: string
          updated_at?: string
          work_area_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_workflow_stage_bindings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_stage_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_workflow_stage_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_workflow_stage_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_stage_bindings_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "core_work_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_workflow_stage_bindings_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "v_work_area_queue"
            referencedColumns: ["work_area_id"]
          },
          {
            foreignKeyName: "core_workflow_stage_bindings_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string | null
          entity_type: string
          field_key: string
          field_label: string
          field_label_en: string | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          field_key: string
          field_label: string
          field_label_en?: string | null
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          field_key?: string
          field_label?: string
          field_label_en?: string | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_en: string | null
          permissions: Json
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_en?: string | null
          permissions?: Json
          slug: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_en?: string | null
          permissions?: Json
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
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
          work_order_id: string | null
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
          work_order_id?: string | null
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
          work_order_id?: string | null
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
            foreignKeyName: "customer_financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          {
            foreignKeyName: "customer_financial_ledger_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_financial_ledger_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "customer_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "customer_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "customer_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "customer_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "customer_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "customer_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      customer_subscriptions: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          item_quota: number
          notes: string | null
          plan_name: string
          price: number
          remaining_quota: number
          renewal_date: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          item_quota?: number
          notes?: string | null
          plan_name?: string
          price?: number
          remaining_quota?: number
          renewal_date?: string
          start_date?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          item_quota?: number
          notes?: string | null
          plan_name?: string
          price?: number
          remaining_quota?: number
          renewal_date?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
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
          vip_preferences: Json | null
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
          vip_preferences?: Json | null
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
          vip_preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            foreignKeyName: "daily_cash_closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      demo_sandboxes: {
        Row: {
          created_at: string
          created_by: string | null
          demo_email: string
          demo_user_id: string | null
          demo_username: string
          id: string
          is_public: boolean
          last_reset_at: string | null
          notes: string | null
          reset_count: number
          status: string
          template_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demo_email: string
          demo_user_id?: string | null
          demo_username: string
          id?: string
          is_public?: boolean
          last_reset_at?: string | null
          notes?: string | null
          reset_count?: number
          status?: string
          template_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demo_email?: string
          demo_user_id?: string | null
          demo_username?: string
          id?: string
          is_public?: boolean
          last_reset_at?: string | null
          notes?: string | null
          reset_count?: number
          status?: string
          template_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_sandboxes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "demo_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_sandboxes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "demo_sandboxes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "demo_sandboxes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_templates: {
        Row: {
          branding_config: Json
          color: string | null
          created_at: string
          created_by: string | null
          custom_config: Json
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          industry: string
          is_active: boolean
          is_public: boolean
          name_ar: string
          name_en: string | null
          slug: string
          workflow_definition_id: string | null
        }
        Insert: {
          branding_config?: Json
          color?: string | null
          created_at?: string
          created_by?: string | null
          custom_config?: Json
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          industry: string
          is_active?: boolean
          is_public?: boolean
          name_ar: string
          name_en?: string | null
          slug: string
          workflow_definition_id?: string | null
        }
        Update: {
          branding_config?: Json
          color?: string | null
          created_at?: string
          created_by?: string | null
          custom_config?: Json
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          is_public?: boolean
          name_ar?: string
          name_en?: string | null
          slug?: string
          workflow_definition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_templates_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          assigned_stations: string[] | null
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
          assigned_stations?: string[] | null
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
          assigned_stations?: string[] | null
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
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      enterprise_deals: {
        Row: {
          account_name: string
          acv_value: number | null
          created_at: string | null
          document_url: string | null
          expected_close_date: string | null
          facility_type: string
          id: string
          notes: string | null
          package_tier: string
          stage: string
          tenant_id: string | null
        }
        Insert: {
          account_name: string
          acv_value?: number | null
          created_at?: string | null
          document_url?: string | null
          expected_close_date?: string | null
          facility_type: string
          id?: string
          notes?: string | null
          package_tier?: string
          stage?: string
          tenant_id?: string | null
        }
        Update: {
          account_name?: string
          acv_value?: number | null
          created_at?: string | null
          document_url?: string | null
          expected_close_date?: string | null
          facility_type?: string
          id?: string
          notes?: string | null
          package_tier?: string
          stage?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      enterprises: {
        Row: {
          created_at: string | null
          id: string
          industry_type: string | null
          is_active: boolean | null
          name: string
          owner_user_id: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          name: string
          owner_user_id?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          name?: string
          owner_user_id?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "equipment_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "equipment_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      field_definitions_v2: {
        Row: {
          applies_to_stage_id: string | null
          created_at: string
          display_order: number
          field_key: string
          field_type: string
          id: string
          input_method: string
          is_active: boolean
          is_required: boolean
          label_ar: string
          label_en: string | null
          tenant_id: string | null
          updated_at: string
          validation_rules: Json
          visibility_condition: Json
          workflow_id: string | null
        }
        Insert: {
          applies_to_stage_id?: string | null
          created_at?: string
          display_order?: number
          field_key: string
          field_type: string
          id?: string
          input_method?: string
          is_active?: boolean
          is_required?: boolean
          label_ar: string
          label_en?: string | null
          tenant_id?: string | null
          updated_at?: string
          validation_rules?: Json
          visibility_condition?: Json
          workflow_id?: string | null
        }
        Update: {
          applies_to_stage_id?: string | null
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: string
          id?: string
          input_method?: string
          is_active?: boolean
          is_required?: boolean
          label_ar?: string
          label_en?: string | null
          tenant_id?: string | null
          updated_at?: string
          validation_rules?: Json
          visibility_condition?: Json
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_definitions_v2_applies_to_stage_id_fkey"
            columns: ["applies_to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_definitions_v2_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "field_definitions_v2_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "field_definitions_v2_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_definitions_v2_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      field_values: {
        Row: {
          created_at: string
          entered_at: string
          entered_by: string | null
          field_definition_id: string
          id: string
          input_method_used: string
          value: Json
          work_order_id: string
        }
        Insert: {
          created_at?: string
          entered_at?: string
          entered_by?: string | null
          field_definition_id: string
          id?: string
          input_method_used?: string
          value: Json
          work_order_id: string
        }
        Update: {
          created_at?: string
          entered_at?: string
          entered_by?: string | null
          field_definition_id?: string
          id?: string
          input_method_used?: string
          value?: Json
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "field_definitions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_values_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_values_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      intercompany_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          eliminated: boolean
          enterprise_id: string | null
          from_tenant_id: string | null
          id: string
          to_tenant_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          eliminated?: boolean
          enterprise_id?: string | null
          from_tenant_id?: string | null
          id?: string
          to_tenant_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          eliminated?: boolean
          enterprise_id?: string | null
          from_tenant_id?: string | null
          id?: string
          to_tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercompany_transactions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "intercompany_transactions_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "intercompany_transactions_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "intercompany_transactions_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "intercompany_transactions_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "intercompany_transactions_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
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
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          work_order_id: string | null
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
          work_order_id?: string | null
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
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
          {
            foreignKeyName: "journal_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      legal_contracts: {
        Row: {
          contract_type: string
          contract_value: number | null
          counterparty: string
          created_at: string | null
          document_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          contract_type: string
          contract_value?: number | null
          counterparty: string
          created_at?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          contract_type?: string
          contract_value?: number | null
          counterparty?: string
          created_at?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "legal_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "legal_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          allocated_budget: number | null
          campaign_name: string
          channel: string
          conversions: number | null
          created_at: string | null
          document_url: string | null
          id: string
          leads_generated: number | null
          notes: string | null
          spent_budget: number | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          allocated_budget?: number | null
          campaign_name: string
          channel?: string
          conversions?: number | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          leads_generated?: number | null
          notes?: string | null
          spent_budget?: number | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          allocated_budget?: number | null
          campaign_name?: string
          channel?: string
          conversions?: number | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          leads_generated?: number | null
          notes?: string | null
          spent_budget?: number | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      operating_budgets: {
        Row: {
          actual_expenses: number | null
          actual_revenue: number | null
          created_at: string
          expected_expenses: number
          expected_revenue: number
          expense_details: Json | null
          id: string
          period_label: string
          period_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_expenses?: number | null
          actual_revenue?: number | null
          created_at?: string
          expected_expenses?: number
          expected_revenue?: number
          expense_details?: Json | null
          id?: string
          period_label: string
          period_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_expenses?: number | null
          actual_revenue?: number | null
          created_at?: string
          expected_expenses?: number
          expected_revenue?: number
          expense_details?: Json | null
          id?: string
          period_label?: string
          period_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "operating_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "operating_budgets_tenant_id_fkey"
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
            foreignKeyName: "operation_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          custom_fields: Json | null
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
          delivery_slot: string | null
          discount_amount: number
          discount_percent: number
          enterprise_id: string | null
          estimated_arrival_time: string | null
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
          pickup_slot: string | null
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
          vip_preferences: Json | null
        }
        Insert: {
          assigned_driver_employee_id?: string | null
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
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
          delivery_slot?: string | null
          discount_amount?: number
          discount_percent?: number
          enterprise_id?: string | null
          estimated_arrival_time?: string | null
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
          pickup_slot?: string | null
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
          vip_preferences?: Json | null
        }
        Update: {
          assigned_driver_employee_id?: string | null
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
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
          delivery_slot?: string | null
          discount_amount?: number
          discount_percent?: number
          enterprise_id?: string | null
          estimated_arrival_time?: string | null
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
          pickup_slot?: string | null
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
          vip_preferences?: Json | null
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
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "orders_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "orders_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            foreignKeyName: "pickup_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "pickup_requests_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "pickup_requests_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "pickup_requests_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            foreignKeyName: "qc_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "qc_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "qc_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      report_definitions: {
        Row: {
          chart_type: string
          created_at: string
          created_by: string | null
          description: string | null
          export_formats: string[]
          filters: Json
          group_by: Json
          id: string
          is_active: boolean
          is_template: boolean
          name_ar: string
          name_en: string | null
          selected_fields: Json
          sort_by: Json
          source_entity: string
          tenant_id: string
          updated_at: string
          visible_to_roles: string[]
        }
        Insert: {
          chart_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          export_formats?: string[]
          filters?: Json
          group_by?: Json
          id?: string
          is_active?: boolean
          is_template?: boolean
          name_ar: string
          name_en?: string | null
          selected_fields?: Json
          sort_by?: Json
          source_entity: string
          tenant_id: string
          updated_at?: string
          visible_to_roles?: string[]
        }
        Update: {
          chart_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          export_formats?: string[]
          filters?: Json
          group_by?: Json
          id?: string
          is_active?: boolean
          is_template?: boolean
          name_ar?: string
          name_en?: string | null
          selected_fields?: Json
          sort_by?: Json
          source_entity?: string
          tenant_id?: string
          updated_at?: string
          visible_to_roles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string
          cron_expression: string | null
          delivery_method: string
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          recipients: Json
          report_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string | null
          delivery_method?: string
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json
          report_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          cron_expression?: string | null
          delivery_method?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json
          report_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          slug: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          slug?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          slug?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
          category: string | null
          category_id: string | null
          created_at: string
          custom_fields: Json | null
          id: string
          is_active: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          id?: string
          is_active?: boolean
          name: string
          service_type?: Database["public"]["Enums"]["service_type"]
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          custom_fields?: Json | null
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
          branch_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          complexity_factor: number
          created_at: string
          current_stage: string
          customer_notes: string | null
          delivery_photo_url: string | null
          garment_type: string
          id: string
          intake_photo_url: string | null
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
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          complexity_factor?: number
          created_at?: string
          current_stage?: string
          customer_notes?: string | null
          delivery_photo_url?: string | null
          garment_type?: string
          id?: string
          intake_photo_url?: string | null
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
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          complexity_factor?: number
          created_at?: string
          current_stage?: string
          customer_notes?: string | null
          delivery_photo_url?: string | null
          garment_type?: string
          id?: string
          intake_photo_url?: string | null
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
            foreignKeyName: "service_units_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_units_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "task_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "task_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "task_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "task_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "task_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      tenant_health_scores: {
        Row: {
          account_manager: string
          account_name: string
          created_at: string | null
          health_score: number | null
          id: string
          last_qbr_date: string | null
          next_check_date: string | null
          notes: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          account_manager: string
          account_name: string
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_qbr_date?: string | null
          next_check_date?: string | null
          notes?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          account_manager?: string
          account_name?: string
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_qbr_date?: string | null
          next_check_date?: string | null
          notes?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      tenant_onboarding: {
        Row: {
          branch_data: Json
          catalog_choice: string
          completed_at: string | null
          completed_steps: Json
          created_at: string
          current_step: number
          is_completed: boolean
          payment_method: string | null
          staff_data: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_data?: Json
          catalog_choice?: string
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          current_step?: number
          is_completed?: boolean
          payment_method?: string | null
          staff_data?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_data?: Json
          catalog_choice?: string
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          current_step?: number
          is_completed?: boolean
          payment_method?: string | null
          staff_data?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_projects: {
        Row: {
          account_name: string
          assigned_engineer: string
          created_at: string | null
          id: string
          notes: string | null
          progress_pct: number | null
          stage: string
          target_live_date: string | null
          tenant_id: string | null
        }
        Insert: {
          account_name: string
          assigned_engineer: string
          created_at?: string | null
          id?: string
          notes?: string | null
          progress_pct?: number | null
          stage?: string
          target_live_date?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_name?: string
          assigned_engineer?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          progress_pct?: number | null
          stage?: string
          target_live_date?: string | null
          tenant_id?: string | null
        }
        Relationships: []
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
          branding_config: Json
          business_address: string | null
          business_phone: string | null
          business_type: string
          created_at: string
          custom_config: Json | null
          enterprise_id: string | null
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
          parent_tenant_id: string | null
          public_url: string | null
          secondary_color: string | null
          slug: string
          subscription_fee: number
          tax_number: string | null
          updated_at: string
          workflow_engine_version: string
        }
        Insert: {
          brand_color?: string | null
          branding_config?: Json
          business_address?: string | null
          business_phone?: string | null
          business_type?: string
          created_at?: string
          custom_config?: Json | null
          enterprise_id?: string | null
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
          parent_tenant_id?: string | null
          public_url?: string | null
          secondary_color?: string | null
          slug: string
          subscription_fee?: number
          tax_number?: string | null
          updated_at?: string
          workflow_engine_version?: string
        }
        Update: {
          brand_color?: string | null
          branding_config?: Json
          business_address?: string | null
          business_phone?: string | null
          business_type?: string
          created_at?: string
          custom_config?: Json | null
          enterprise_id?: string | null
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
          parent_tenant_id?: string | null
          public_url?: string | null
          secondary_color?: string | null
          slug?: string
          subscription_fee?: number
          tax_number?: string | null
          updated_at?: string
          workflow_engine_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "tenants_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      vendor_contracts: {
        Row: {
          amount: number | null
          created_at: string
          end_date: string | null
          enterprise_id: string | null
          id: string
          is_active: boolean
          start_date: string | null
          title: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          end_date?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          title: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          end_date?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          title?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contracts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "vendor_contracts_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          enterprise_id: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          enterprise_id?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          enterprise_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "vendors_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to_employee_id: string | null
          attachment_refs: Json
          blocked_reason: string | null
          branch_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          canonical_status: string
          capability_key: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          custom_fields: Json
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          parent_work_order_id: string | null
          payment_status: string
          priority: string
          resource_type: string
          sla_breached: boolean
          sla_due_at: string | null
          source_entity: string | null
          source_id: string | null
          status: string
          tenant_id: string
          title: string
          total_amount: number
          updated_at: string
          workflow_id: string
          workflow_version_snapshot: Json
        }
        Insert: {
          assigned_to_employee_id?: string | null
          attachment_refs?: Json
          blocked_reason?: string | null
          branch_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          canonical_status?: string
          capability_key?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          custom_fields?: Json
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          parent_work_order_id?: string | null
          payment_status?: string
          priority?: string
          resource_type?: string
          sla_breached?: boolean
          sla_due_at?: string | null
          source_entity?: string | null
          source_id?: string | null
          status?: string
          tenant_id: string
          title: string
          total_amount?: number
          updated_at?: string
          workflow_id: string
          workflow_version_snapshot: Json
        }
        Update: {
          assigned_to_employee_id?: string | null
          attachment_refs?: Json
          blocked_reason?: string | null
          branch_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          canonical_status?: string
          capability_key?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          custom_fields?: Json
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          parent_work_order_id?: string | null
          payment_status?: string
          priority?: string
          resource_type?: string
          sla_breached?: boolean
          sla_due_at?: string | null
          source_entity?: string | null
          source_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          total_amount?: number
          updated_at?: string
          workflow_id?: string
          workflow_version_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "work_orders_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "work_orders_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "work_orders_parent_work_order_id_fkey"
            columns: ["parent_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_parent_work_order_id_fkey"
            columns: ["parent_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      workflow_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          industry: string
          is_active: boolean
          is_template: boolean
          name: string
          name_en: string | null
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          is_template?: boolean
          name: string
          name_en?: string | null
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          is_template?: boolean
          name?: string
          name_en?: string | null
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          allowed_next_slugs: string[] | null
          auto_move_on_complete: boolean | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_final: boolean | null
          is_initial: boolean | null
          name: string
          name_en: string | null
          requires_assignment: boolean | null
          slug: string
          stage_order: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_next_slugs?: string[] | null
          auto_move_on_complete?: boolean | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          is_initial?: boolean | null
          name: string
          name_en?: string | null
          requires_assignment?: boolean | null
          slug: string
          stage_order?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_next_slugs?: string[] | null
          auto_move_on_complete?: boolean | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          is_initial?: boolean | null
          name?: string
          name_en?: string | null
          requires_assignment?: boolean | null
          slug?: string
          stage_order?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workflow_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workflow_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages_v2: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_final: boolean
          is_financial_trigger: boolean
          is_initial: boolean
          name_ar: string
          name_en: string | null
          required_fields: Json
          required_role: string | null
          sla_max_mins: number
          sla_target_mins: number
          slug: string
          stage_order: number
          workflow_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_final?: boolean
          is_financial_trigger?: boolean
          is_initial?: boolean
          name_ar: string
          name_en?: string | null
          required_fields?: Json
          required_role?: string | null
          sla_max_mins?: number
          sla_target_mins?: number
          slug: string
          stage_order: number
          workflow_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_final?: boolean
          is_financial_trigger?: boolean
          is_initial?: boolean
          name_ar?: string
          name_en?: string | null
          required_fields?: Json
          required_role?: string | null
          sla_max_mins?: number
          sla_target_mins?: number
          slug?: string
          stage_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_v2_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          downloads: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          name_en: string
          preview_image_url: string | null
          price: number | null
          slug: string
          stages: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          downloads?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          name_en: string
          preview_image_url?: string | null
          price?: number | null
          slug: string
          stages: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          downloads?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_en?: string
          preview_image_url?: string | null
          price?: number | null
          slug?: string
          stages?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_transitions: {
        Row: {
          auto_escalate_after_mins: number | null
          condition_json: Json
          created_at: string
          from_stage_id: string | null
          id: string
          priority: number
          required_role: string | null
          to_stage_id: string
          workflow_id: string
        }
        Insert: {
          auto_escalate_after_mins?: number | null
          condition_json?: Json
          created_at?: string
          from_stage_id?: string | null
          id?: string
          priority?: number
          required_role?: string | null
          to_stage_id: string
          workflow_id: string
        }
        Update: {
          auto_escalate_after_mins?: number | null
          condition_json?: Json
          created_at?: string
          from_stage_id?: string | null
          id?: string
          priority?: number
          required_role?: string | null
          to_stage_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_transitions_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
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
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_driver_route_tasks"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["legacy_order_id"]
          },
          {
            foreignKeyName: "service_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_work_order_bridge"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "service_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      enterprise_branch_summary: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          delivered_orders: number | null
          enterprise_id: string | null
          enterprise_name: string | null
          region: string | null
          tenant_id: string | null
          tenant_name: string | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
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
      marketplace_stats: {
        Row: {
          active_templates: number | null
          categories_count: number | null
          featured_templates: number | null
          total_downloads: number | null
          total_templates: number | null
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
            foreignKeyName: "operation_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      table_row_counts: {
        Row: {
          row_count: number | null
          table_name: string | null
        }
        Relationships: []
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_burnout_risk: {
        Row: {
          avg_wli: number | null
          branch_id: string | null
          consecutive_days: number | null
          employee_id: string | null
          end_date: string | null
          start_date: string | null
          station: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      v_busiest_day: {
        Row: {
          avg_cnt: number | null
          cnt: number | null
          day_name: string | null
          dow: number | null
          pct_above_avg: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_canonical_work_orders: {
        Row: {
          attachment_refs: Json | null
          branch_id: string | null
          cancelled_at: string | null
          canonical_status: string | null
          capability_key: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_stage_id: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string | null
          legacy_status: string | null
          metadata: Json | null
          parent_work_order_id: string | null
          priority: string | null
          sla_breached: boolean | null
          sla_due_at: string | null
          source_entity: string | null
          source_id: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          attachment_refs?: Json | null
          branch_id?: string | null
          cancelled_at?: string | null
          canonical_status?: string | null
          capability_key?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string | null
          legacy_status?: string | null
          metadata?: Json | null
          parent_work_order_id?: string | null
          priority?: string | null
          sla_breached?: boolean | null
          sla_due_at?: string | null
          source_entity?: string | null
          source_id?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          attachment_refs?: Json | null
          branch_id?: string | null
          cancelled_at?: string | null
          canonical_status?: string | null
          capability_key?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string | null
          legacy_status?: string | null
          metadata?: Json | null
          parent_work_order_id?: string | null
          priority?: string | null
          sla_breached?: boolean | null
          sla_due_at?: string | null
          source_entity?: string | null
          source_id?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "work_orders_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "work_orders_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "work_orders_parent_work_order_id_fkey"
            columns: ["parent_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_parent_work_order_id_fkey"
            columns: ["parent_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_consolidated_pnl: {
        Row: {
          company_count: number | null
          consolidated_profit: number | null
          enterprise_id: string | null
          enterprise_name: string | null
          intercompany_to_eliminate: number | null
          net_profit: number | null
          total_expenses: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["enterprise_id"]
          },
          {
            foreignKeyName: "tenants_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      v_core_tasks: {
        Row: {
          assigned_actor_id: string | null
          assigned_actor_type: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_employee_id: string | null
          attachment_refs: Json | null
          cancelled_at: string | null
          cancelled_by: string | null
          canonical_status: string | null
          capability_key: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string | null
          metadata: Json | null
          priority: string | null
          sla_breached: boolean | null
          sla_due_at: string | null
          source_entity: string | null
          source_id: string | null
          started_at: string | null
          task_key: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          waiting_reason: string | null
          work_order_id: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_tasks_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "core_capability_registry"
            referencedColumns: ["capability_key"]
          },
          {
            foreignKeyName: "core_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
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
      v_driver_route_tasks: {
        Row: {
          branch_id: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          is_urgent: boolean | null
          order_id: string | null
          phone: string | null
          pieces: number | null
          promised_delivery_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          tenant_id: string | null
          total: number | null
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
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_late_payers: {
        Row: {
          cust_avg_days: number | null
          customer_id: string | null
          customer_name: string | null
          delay_vs_avg: number | null
          order_count: number | null
          phone: string | null
          tenant_avg_days: number | null
          tenant_id: string | null
        }
        Relationships: [
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_operating_budgets: {
        Row: {
          actual_electricity: number | null
          actual_expenses: number | null
          actual_maintenance: number | null
          actual_marketing: number | null
          actual_other: number | null
          actual_rent: number | null
          actual_revenue: number | null
          actual_salaries: number | null
          actual_supplies: number | null
          actual_water: number | null
          created_at: string | null
          expected_expenses: number | null
          expected_revenue: number | null
          expense_details: Json | null
          id: string | null
          period_label: string | null
          period_type: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_electricity?: never
          actual_expenses?: never
          actual_maintenance?: never
          actual_marketing?: never
          actual_other?: never
          actual_rent?: never
          actual_revenue?: never
          actual_salaries?: never
          actual_supplies?: never
          actual_water?: never
          created_at?: string | null
          expected_expenses?: number | null
          expected_revenue?: number | null
          expense_details?: Json | null
          id?: string | null
          period_label?: string | null
          period_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_electricity?: never
          actual_expenses?: never
          actual_maintenance?: never
          actual_marketing?: never
          actual_other?: never
          actual_rent?: never
          actual_revenue?: never
          actual_salaries?: never
          actual_supplies?: never
          actual_water?: never
          created_at?: string | null
          expected_expenses?: number | null
          expected_revenue?: number | null
          expense_details?: Json | null
          id?: string | null
          period_label?: string | null
          period_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "operating_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "operating_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_order_task_bridge: {
        Row: {
          assigned_at: string | null
          assigned_employee_id: string | null
          canonical_status: string | null
          canonical_task_id: string | null
          capability_key: string | null
          completed_at: string | null
          legacy_entity: string | null
          legacy_id: string | null
          legacy_order_id: string | null
          legacy_service_unit_id: string | null
          legacy_status: string | null
          line_value: number | null
          metadata: Json | null
          order_item_id: string | null
          priority: string | null
          tenant_id: string | null
          title: string | null
          unit_price: number | null
          virtual_task_key: string | null
          virtual_work_order_key: string | null
          work_area_key: string | null
        }
        Relationships: []
      }
      v_order_work_order_bridge: {
        Row: {
          branch_id: string | null
          canonical_status: string | null
          canonical_work_order_id: string | null
          capability_key: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          due_at: string | null
          legacy_entity: string | null
          legacy_number: string | null
          legacy_order_id: string | null
          legacy_status: string | null
          metadata: Json | null
          payment_status: string | null
          priority: string | null
          source_entity: string | null
          source_id: string | null
          tenant_id: string | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
          virtual_work_order_key: string | null
        }
        Insert: {
          branch_id?: string | null
          canonical_status?: never
          canonical_work_order_id?: never
          capability_key?: never
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_at?: string | null
          legacy_entity?: never
          legacy_number?: never
          legacy_order_id?: string | null
          legacy_status?: never
          metadata?: never
          payment_status?: never
          priority?: never
          source_entity?: never
          source_id?: string | null
          tenant_id?: string | null
          title?: never
          total_amount?: number | null
          updated_at?: string | null
          virtual_work_order_key?: never
        }
        Update: {
          branch_id?: string | null
          canonical_status?: never
          canonical_work_order_id?: never
          capability_key?: never
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_at?: string | null
          legacy_entity?: never
          legacy_number?: never
          legacy_order_id?: string | null
          legacy_status?: never
          metadata?: never
          payment_status?: never
          priority?: never
          source_entity?: never
          source_id?: string | null
          tenant_id?: string | null
          title?: never
          total_amount?: number | null
          updated_at?: string | null
          virtual_work_order_key?: never
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
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_subscription_balances: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string | null
          item_quota: number | null
          notes: string | null
          plan_name: string | null
          price: number | null
          remaining_quota: number | null
          renewal_date: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
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
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
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
      v_work_area_queue: {
        Row: {
          assigned_actor_id: string | null
          assigned_actor_type: string | null
          assigned_employee_id: string | null
          created_at: string | null
          due_at: string | null
          priority: string | null
          task_id: string | null
          task_status: string | null
          task_title: string | null
          tenant_id: string | null
          work_area_id: string | null
          work_area_key: string | null
          work_area_name_ar: string | null
          work_area_name_en: string | null
          work_order_id: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_tasks_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_canonical_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "core_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_orders_pnl: {
        Row: {
          completed_amount: number | null
          completed_orders: number | null
          paid_amount: number | null
          paid_orders: number | null
          tenant_id: string | null
          total_amount: number | null
          total_work_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "enterprise_branch_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_bootstrap_health"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_workload_index_daily: {
        Row: {
          avg_units: number | null
          branch_id: string | null
          employee_count: number | null
          employee_id: string | null
          station: string | null
          tenant_id: string | null
          units_count: number | null
          wli: number | null
          work_date: string | null
        }
        Relationships: []
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
      actor_has_permission: {
        Args: {
          _action_key: string
          _actor_user_id: string
          _capability_key: string
          _resource_key: string
          _tenant_id: string
        }
        Returns: boolean
      }
      add_core_task_dependency: {
        Args: {
          _dependency_type?: string
          _depends_on_task_id: string
          _metadata?: Json
          _task_id: string
          _tenant_id: string
        }
        Returns: string
      }
      apdo_event_href: {
        Args: { _data?: Json; _source_id: string; _source_type: string }
        Returns: string
      }
      apply_capabilities_for_tenant: {
        Args: { _template_slug?: string; _tenant_id: string }
        Returns: Json
      }
      apply_capability_assets_for_tenant: {
        Args: { _template_slug?: string; _tenant_id: string }
        Returns: Json
      }
      apply_navigation_assets_for_tenant: {
        Args: { _template_slug?: string; _tenant_id: string }
        Returns: Json
      }
      apply_permission_assets_for_tenant: {
        Args: { _template_slug?: string; _tenant_id: string }
        Returns: Json
      }
      apply_workflow_template: {
        Args: { _template_slug: string; _tenant_id: string }
        Returns: number
      }
      assert_actor_permission: {
        Args: {
          _action_key: string
          _actor_user_id: string
          _capability_key: string
          _metadata?: Json
          _resource_id?: string
          _resource_key: string
          _tenant_id: string
        }
        Returns: boolean
      }
      assert_current_actor_permission: {
        Args: {
          _action_key: string
          _capability_key: string
          _metadata?: Json
          _resource_id?: string
          _resource_key: string
          _tenant_id: string
        }
        Returns: boolean
      }
      bind_workflow_stage_to_work_area: {
        Args: {
          _assignment_rule?: Json
          _metadata?: Json
          _stage_id: string
          _tenant_id: string
          _work_area_id: string
          _workflow_id: string
        }
        Returns: string
      }
      build_capability_manifest: {
        Args: { _capability_key: string }
        Returns: Json
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
      can_enter_platform: { Args: { _tenant_id: string }; Returns: boolean }
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
      check_sla_breaches: { Args: never; Returns: number }
      clone_demo_template: {
        Args: {
          _new_tenant_name: string
          _new_tenant_slug: string
          _owner_email: string
          _template_slug: string
        }
        Returns: Json
      }
      close_order_stale_notifications: {
        Args: { _order_id: string }
        Returns: number
      }
      complete_customer_return: {
        Args: { _notes?: string; _return_id: string }
        Returns: undefined
      }
      complete_mjrh_core_setup: {
        Args: { _setup: Json; _tenant_id: string }
        Returns: Json
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
      create_canonical_work_order: {
        Args: {
          _attachment_refs?: Json
          _branch_id?: string
          _capability_key?: string
          _customer_id?: string
          _description?: string
          _due_at?: string
          _metadata?: Json
          _parent_work_order_id?: string
          _priority?: string
          _source_entity?: string
          _source_id?: string
          _tenant_id: string
          _title: string
          _workflow_id: string
        }
        Returns: string
      }
      create_cash_account_with_opening: {
        Args: {
          _account_type?: string
          _name: string
          _opening_balance?: number
        }
        Returns: string
      }
      create_core_task: {
        Args: {
          _assigned_actor_id?: string
          _assigned_actor_type?: string
          _assigned_employee_id?: string
          _attachment_refs?: Json
          _capability_key?: string
          _description?: string
          _due_at?: string
          _metadata?: Json
          _priority?: string
          _source_entity?: string
          _source_id?: string
          _tenant_id: string
          _title: string
          _work_order_id?: string
        }
        Returns: string
      }
      create_core_work_area: {
        Args: {
          _capability_key?: string
          _metadata?: Json
          _name_ar: string
          _name_en?: string
          _required_permissions?: string[]
          _resource_type?: string
          _sort_order?: number
          _tenant_id: string
          _work_area_key: string
        }
        Returns: string
      }
      create_enterprise_with_tenant: {
        Args: {
          _enterprise_name: string
          _enterprise_slug: string
          _industry_type?: string
          _owner_user_id?: string
          _tenant_name?: string
          _tenant_slug?: string
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
      create_workflow_snapshot: {
        Args: { _workflow_id: string }
        Returns: Json
      }
      current_actor_has_permission: {
        Args: {
          _action_key: string
          _capability_key: string
          _resource_key: string
          _tenant_id: string
        }
        Returns: boolean
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
      deduct_subscription_quota: {
        Args: {
          _customer_id: string
          _items_count: number
          _order_id?: string
          _tenant_id: string
        }
        Returns: boolean
      }
      default_branch_id_for: { Args: { _tenant_id: string }; Returns: string }
      delete_demo_sandbox: { Args: { _sandbox_id: string }; Returns: boolean }
      emit_core_domain_event: {
        Args: {
          _event_key: string
          _payload?: Json
          _producer?: string
          _source_entity?: string
          _source_id?: string
          _tenant_id: string
        }
        Returns: string
      }
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
      ensure_default_workflow_for: {
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
      export_audit_logs: {
        Args: { _from?: string; _tenant_id: string; _to?: string }
        Returns: Json
      }
      export_workflow_template: { Args: { _tenant_id: string }; Returns: Json }
      financial_audit_summary: { Args: { _tenant_id?: string }; Returns: Json }
      generate_burnout_alerts: {
        Args: { _tenant_id?: string }
        Returns: number
      }
      generate_core_document: {
        Args: {
          _output_type?: string
          _source_entity?: string
          _source_id?: string
          _template_key: string
          _tenant_id: string
          _variables?: Json
        }
        Returns: string
      }
      generate_smart_operational_alerts: {
        Args: { _tenant_id?: string }
        Returns: number
      }
      generate_winback_campaigns: {
        Args: { _days_threshold?: number; _tenant_id?: string }
        Returns: number
      }
      geo_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      get_actor_permissions: {
        Args: { _actor_user_id?: string; _tenant_id: string }
        Returns: {
          permission_key: string
        }[]
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
      get_workflow_stages: {
        Args: { _tenant_id: string }
        Returns: {
          color: string
          icon: string
          id: string
          is_final: boolean
          is_initial: boolean
          name: string
          name_en: string
          requires_assignment: boolean
          slug: string
          stage_order: number
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
      import_workflow_template: {
        Args: { _payload: Json; _tenant_id: string }
        Returns: number
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
      list_active_tenants_public: {
        Args: never
        Returns: {
          brand_color: string
          business_type: string
          logo_url: string
          name: string
          public_url: string
          slug: string
        }[]
      }
      map_canonical_work_order_status: {
        Args: { _canonical_status: string }
        Returns: string
      }
      map_order_status_to_canonical_work_order: {
        Args: { _status: string }
        Returns: string
      }
      map_unit_stage_to_canonical_task: {
        Args: { _stage: string; _status?: string }
        Returns: string
      }
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
      record_observability_metric: {
        Args: {
          _dimensions?: Json
          _metric_key: string
          _tenant_id: string
          _value: number
        }
        Returns: string
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
      refresh_all_capability_manifests: { Args: never; Returns: Json }
      refresh_capability_manifest: {
        Args: { _capability_key: string }
        Returns: Json
      }
      refresh_generic_capability_asset_definitions: {
        Args: never
        Returns: Json
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
      render_core_form_schema: {
        Args: { _form_key: string; _tenant_id: string }
        Returns: Json
      }
      renew_monthly_subscriptions: { Args: never; Returns: number }
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
      reset_demo_sandbox: { Args: { _sandbox_id: string }; Returns: Json }
      resolve_client_error_log: {
        Args: { _id: string; _notes?: string }
        Returns: undefined
      }
      resolve_reclean_return: { Args: { _unit_id: string }; Returns: undefined }
      schedule_report_delivery: { Args: never; Returns: number }
      seed_laundry_service_catalog: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      seed_tenant_defaults: {
        Args: { _tenant_id: string; _tenant_name: string }
        Returns: undefined
      }
      self_service_create_tenant: {
        Args: {
          _business_type?: string
          _currency?: string
          _name: string
          _owner_full_name?: string
          _slug: string
          _user_id: string
        }
        Returns: string
      }
      set_customer_delivery_choice: {
        Args: { _chosen: string; _token: string }
        Returns: undefined
      }
      set_organization_lifecycle_status: {
        Args: {
          _metadata?: Json
          _reason?: string
          _status: string
          _tenant_id: string
        }
        Returns: Json
      }
      submit_core_form: {
        Args: {
          _data: Json
          _form_key: string
          _metadata?: Json
          _source_entity?: string
          _source_id?: string
          _tenant_id: string
        }
        Returns: string
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
      sync_work_order_financials: {
        Args: { _work_order_id: string }
        Returns: undefined
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
      transition_canonical_work_order: {
        Args: {
          _metadata_patch?: Json
          _next_status: string
          _reason?: string
          _tenant_id: string
          _work_order_id: string
        }
        Returns: Json
      }
      transition_core_task: {
        Args: {
          _comment?: string
          _metadata_patch?: Json
          _next_status: string
          _task_id: string
          _tenant_id: string
        }
        Returns: Json
      }
      transition_work_order_stage: {
        Args: {
          _comment?: string
          _create_stage_task?: boolean
          _metadata?: Json
          _tenant_id: string
          _to_stage_id: string
          _work_order_id: string
        }
        Returns: Json
      }
      validate_capability_dependencies: {
        Args: { _capability_key: string }
        Returns: Json
      }
      validate_capability_manifest: {
        Args: { _capability_key: string }
        Returns: Json
      }
      validate_core_form_submission: {
        Args: { _data: Json; _form_key: string; _tenant_id: string }
        Returns: Json
      }
      validate_field_definition_rules: {
        Args: { _rules: Json; _visibility: Json }
        Returns: boolean
      }
      validate_legacy_order_bridge: {
        Args: { _tenant_id: string }
        Returns: Json
      }
      validate_report_definition: { Args: { _def: Json }; Returns: boolean }
      validate_transition_condition: {
        Args: { _condition: Json }
        Returns: boolean
      }
      validate_transition_v2: {
        Args: {
          _tenant_id: string
          _to_stage_id: string
          _work_order_id: string
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
        | "cs_rep"
        | "intake_rep"
        | "receptionist"
        | "sorter"
        | "cleaning_tech"
        | "assembly_tech"
        | "ironing_tech"
        | "packer"
        | "qc_tech"
        | "supervisor"
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
        | "cs_rep"
        | "intake_rep"
        | "sorter"
        | "assembly_tech"
        | "packer"
        | "qc_tech"
        | "courier"
        | "supervisor"
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
        | "cs"
        | "intake"
        | "sorting"
        | "drying-assembly"
        | "qc"
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
        "cs_rep",
        "intake_rep",
        "receptionist",
        "sorter",
        "cleaning_tech",
        "assembly_tech",
        "ironing_tech",
        "packer",
        "qc_tech",
        "supervisor",
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
        "cs_rep",
        "intake_rep",
        "sorter",
        "assembly_tech",
        "packer",
        "qc_tech",
        "courier",
        "supervisor",
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
      station_type: [
        "reception",
        "cleaning",
        "ironing",
        "packing",
        "delivery",
        "cs",
        "intake",
        "sorting",
        "drying-assembly",
        "qc",
      ],
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
