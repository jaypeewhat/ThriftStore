import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type UserRole = 'buyer' | 'seller'

export interface Profile {
  id: string
  email: string
  role: UserRole
  full_name: string
  avatar_url?: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  store_name?: string
  store_description?: string
  created_at: string
}

export interface Product {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  category: string
  size: string
  condition: string
  images: string[]
  is_available: boolean
  created_at: string
  seller?: Profile
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  product?: Product
}

export interface Order {
  id: string
  buyer_id: string
  seller_id: string
  product_id: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address?: string
  phone?: string
  notes?: string
  delivery_method?: 'delivery' | 'pickup'
  payment_method?: 'cod' | 'cop'
  delivery_date?: string
  created_at: string
  product?: Product
  buyer?: Profile
  seller?: Profile
}

export interface Message {
  id: string
  order_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'order' | 'message' | 'status_change'
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface Rating {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  rating: number
  review?: string
  created_at: string
  buyer?: Profile
}
