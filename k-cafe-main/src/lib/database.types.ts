export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'manager' | 'waiter' | 'chef' | 'courier'
          avatar: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'admin' | 'manager' | 'waiter' | 'chef' | 'courier'
          avatar?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'manager' | 'waiter' | 'chef' | 'courier'
          avatar?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      restaurant_settings: {
        Row: {
          id: string
          restaurant_name: string
          currency: string
          tax_rate: number | null
          service_charge: number | null
          daily_reset_time: string | null
          address: string | null
          phone: string | null
          email: string | null
          owner_card_number: string | null
          owner_qr_url: string | null
          restaurant_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_name?: string
          currency?: string
          tax_rate?: number | null
          service_charge?: number | null
          daily_reset_time?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          owner_card_number?: string | null
          owner_qr_url?: string | null
          restaurant_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_name?: string
          currency?: string
          tax_rate?: number | null
          service_charge?: number | null
          daily_reset_time?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          owner_card_number?: string | null
          owner_qr_url?: string | null
          restaurant_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          category: string
          image: string | null
          ingredients: string[]
          is_available: boolean
          preparation_time: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          category: string
          image?: string | null
          ingredients?: string[]
          is_available?: boolean
          preparation_time?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          category?: string
          image?: string | null
          ingredients?: string[]
          is_available?: boolean
          preparation_time?: number
          created_at?: string
          updated_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          number: number
          seats: number
          status: 'available' | 'occupied' | 'reserved' | 'cleaning'
          current_order: string | null
          reserved_by: string | null
          reservation_time: string | null
          restaurant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: number
          seats: number
          status?: 'available' | 'occupied' | 'reserved' | 'cleaning'
          current_order?: string | null
          reserved_by?: string | null
          reservation_time?: string | null
          restaurant_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: number
          seats?: number
          status?: 'available' | 'occupied' | 'reserved' | 'cleaning'
          current_order?: string | null
          reserved_by?: string | null
          reservation_time?: string | null
          restaurant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          table_id: string | null
          waiter_id: string | null
          status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
          total_amount: number
          payment_method: 'cash' | 'card' | 'qr_code' | null
          payment_status: 'unpaid' | 'paid' | 'refunded'
          special_instructions: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          table_id?: string | null
          waiter_id?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
          total_amount?: number
          payment_method?: 'cash' | 'card' | 'qr_code' | null
          payment_status?: 'unpaid' | 'paid' | 'refunded'
          special_instructions?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          table_id?: string | null
          waiter_id?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
          total_amount?: number
          payment_method?: 'cash' | 'card' | 'qr_code' | null
          payment_status?: 'unpaid' | 'paid' | 'refunded'
          special_instructions?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          menu_item_name: string
          quantity: number
          unit_price: number
          subtotal: number
          special_requests: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          menu_item_name: string
          quantity?: number
          unit_price: number
          subtotal: number
          special_requests?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          menu_item_name?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          special_requests?: string | null
          created_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          login: string
          password: string
          role: 'waiter' | 'manager'
          daily_wage: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          login: string
          password: string
          role?: 'waiter' | 'manager'
          daily_wage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          login?: string
          password?: string
          role?: 'waiter' | 'manager'
          daily_wage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      wage_payments: {
        Row: {
          id: string
          staff_id: string
          amount: number
          paid_date: string
          note: string | null
          paid_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          amount: number
          paid_date?: string
          note?: string | null
          paid_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          amount?: number
          paid_date?: string
          note?: string | null
          paid_by?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          name: string
          amount: number
          expense_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          amount: number
          expense_date?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          amount?: number
          expense_date?: string
          created_by?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          type: string
          message: string
          created_by: string | null
          visible_to: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          message: string
          created_by?: string | null
          visible_to?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          message?: string
          created_by?: string | null
          visible_to?: string
          is_read?: boolean
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          name: string
          current_stock: number
          min_stock: number
          unit: string
          last_restocked: string
          supplier_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          current_stock?: number
          min_stock?: number
          unit?: string
          last_restocked?: string
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          current_stock?: number
          min_stock?: number
          unit?: string
          last_restocked?: string
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          loyalty_points: number
          preferences: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          loyalty_points?: number
          preferences?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          loyalty_points?: number
          preferences?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string | null
          amount: number
          method: 'cash' | 'card' | 'online'
          status: string
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          amount: number
          method: 'cash' | 'card' | 'online'
          status?: string
          transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          amount?: number
          method?: 'cash' | 'card' | 'online'
          status?: string
          transaction_id?: string | null
          created_at?: string
        }
      }
      debtors: {
        Row: {
          id: string
          name: string
          amount: number
          due_date: string | null
          paid: boolean
          paid_at: string | null
          phone: string | null
          restaurant_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          amount: number
          due_date?: string | null
          paid?: boolean
          paid_at?: string | null
          phone?: string | null
          restaurant_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          amount?: number
          due_date?: string | null
          paid?: boolean
          paid_at?: string | null
          phone?: string | null
          restaurant_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
  }
}