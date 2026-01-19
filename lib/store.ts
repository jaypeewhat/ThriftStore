import { create } from 'zustand'
import { Profile, Product, supabase } from './supabase'

interface AuthState {
  user: Profile | null
  setUser: (user: Profile | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

interface CartState {
  items: Product[]
  itemCount: number
  setItems: (items: Product[]) => void
  addItem: (product: Product) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  clearCart: () => void
  loadCart: (userId: string) => Promise<void>
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  itemCount: 0,
  setItems: (items) => set({ items, itemCount: items.length }),
  
  addItem: async (product: Product) => {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error('User not logged in')
    
    // Check if already in cart locally
    const existingItem = get().items.find(item => item.id === product.id)
    if (existingItem) {
      throw new Error('Item already in cart')
    }
    
    // Add to database
    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
      })
    
    if (error) {
      // If already exists in database, just throw the error
      if (error.code === '23505') {
        throw new Error('Item already in cart')
      }
      throw error
    }
    
    // Update local state
    const newItems = [...get().items, product]
    set({ items: newItems, itemCount: newItems.length })
  },
  
  removeItem: async (productId: string) => {
    const { user } = useAuthStore.getState()
    if (!user) return
    
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)
    
    const newItems = get().items.filter(item => item.id !== productId)
    set({ items: newItems, itemCount: newItems.length })
  },
  
  clearCart: () => set({ items: [], itemCount: 0 }),
  
  loadCart: async (userId: string) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('user_id', userId)
    
    if (!error && data) {
      const items = data.map(item => item.product).filter(Boolean) as Product[]
      set({ items, itemCount: items.length })
    }
  },
}))
