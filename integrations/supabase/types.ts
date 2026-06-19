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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          commission_percent: number
          created_at: string
          email: string | null
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          job_role: Database["public"]["Enums"]["job_role"]
          job_title: string
          monthly_salary: number
          notes: string | null
          phone: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          station: Database["public"]["Enums"]["station_type"] | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string
          id?: string
          is_active?: boolean
          job_role?: Database["public"]["Enums"]["job_role"]
          job_title: string
          monthly_salary?: number
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          station?: Database["public"]["Enums"]["station_type"] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          job_role?: Database["public"]["Enums"]["job_role"]
          job_title?: string
          monthly_salary?: number
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          station?: Database["public"]["Enums"]["station_type"] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
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
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          monthly_percentage: number | null
          spent_at: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          monthly_percentage?: number | null
          spent_at?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          monthly_percentage?: number | null
          spent_at?: string
          tenant_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_chosen_delivery_at: string | null
          customer_id: string
          delivery_address: string | null
          delivery_fee: number
          discount_amount: number
          discount_percent: number
          id: string
          is_test: boolean
          is_urgent: boolean
          notes: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_at: string | null
          promised_delivery_at: string | null
          public_token: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          tenant_id: string | null
          total: number
          updated_at: string
          urgent_fee: number
          urgent_fee_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_chosen_delivery_at?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_fee?: number
          discount_amount?: number
          discount_percent?: number
          id?: string
          is_test?: boolean
          is_urgent?: boolean
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          pickup_at?: string | null
          promised_delivery_at?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
          urgent_fee?: number
          urgent_fee_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_chosen_delivery_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_fee?: number
          discount_amount?: number
          discount_percent?: number
          id?: string
          is_test?: boolean
          is_urgent?: boolean
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          pickup_at?: string | null
          promised_delivery_at?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
          urgent_fee?: number
          urgent_fee_amount?: number
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
            foreignKeyName: "orders_tenant_id_fkey"
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
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          driver_employee_id: string | null
          id: string
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
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          driver_employee_id?: string | null
          id?: string
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
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          driver_employee_id?: string | null
          id?: string
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
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
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          notes: string | null
          owner_user_id: string | null
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
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
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
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
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
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      current_tenant_id: { Args: never; Returns: string }
      get_order_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          customer_chosen_delivery_at: string
          customer_name: string
          is_urgent: boolean
          order_number: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_at: string
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
      set_customer_delivery_choice: {
        Args: { _chosen: string; _token: string }
        Returns: undefined
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
      workstation: "reception" | "cleaning" | "ironing" | "packing" | "delivery"
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
      workstation: ["reception", "cleaning", "ironing", "packing", "delivery"],
    },
  },
} as const
