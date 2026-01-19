'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useCartStore } from '@/lib/store'
import { supabase, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Loader2, Heart, ShoppingBag, Trash2, Store, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface WishlistItem {
  id: string
  product_id: string
  created_at: string
  product: Product & {
    seller: {
      id: string
      full_name: string
      store_name: string | null
    }
  }
}

export default function WishlistPage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const { loadCart } = useCartStore()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'buyer')) {
      router.push('/')
      return
    }
    if (user) {
      fetchWishlist()
    }
  }, [user, isLoading])

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          created_at,
          product:products(
            *,
            seller:profiles(id, full_name, store_name)
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems((data || []) as WishlistItem[])
    } catch (error) {
      console.error('Error fetching wishlist:', error)
      toast.error('Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  const removeFromWishlist = async (itemId: string) => {
    setRemovingId(itemId)
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      
      setItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Removed from wishlist')
    } catch (error) {
      toast.error('Failed to remove item')
    } finally {
      setRemovingId(null)
    }
  }

  const addToCart = async (item: WishlistItem) => {
    if (!item.product.is_available) {
      toast.error('This item is sold out')
      return
    }

    setAddingToCartId(item.product_id)
    try {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user!.id,
          product_id: item.product_id,
          quantity: 1,
        })

      if (error) throw error
      
      await loadCart(user!.id)
      toast.success('Added to cart!')
      router.push('/buyer/cart')
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Item already in cart')
        router.push('/buyer/cart')
      } else {
        toast.error('Failed to add to cart')
      }
    } finally {
      setAddingToCartId(null)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          <h1 className="text-3xl sm:text-4xl font-bold text-thrift-dark">My Wishlist</h1>
          {items.length > 0 && (
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-thrift-gray" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-24 h-24 text-thrift-light mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-thrift-dark mb-2">Your wishlist is empty</h2>
            <p className="text-thrift-gray mb-6">Save items you love by clicking the heart icon</p>
            <Link href="/shop">
              <button className="btn-primary">
                Browse Shop
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="glass rounded-2xl overflow-hidden card-hover group">
                <Link href={`/product/${item.product_id}`}>
                  <div className="relative aspect-square bg-gray-100">
                    {item.product.images && item.product.images.length > 0 ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${item.product.images[0]}`}
                        alt={item.product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-thrift-gray" />
                      </div>
                    )}
                    {!item.product.is_available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-600 text-white text-lg px-4 py-2 rounded-full font-bold transform -rotate-12">
                          SOLD
                        </span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeFromWishlist(item.id)
                      }}
                      disabled={removingId === item.id}
                      className="absolute top-3 right-3 bg-white/90 p-2 rounded-full hover:bg-red-50 transition-colors shadow-md"
                    >
                      {removingId === item.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-red-500" />
                      )}
                    </button>
                  </div>
                </Link>
                
                <div className="p-4">
                  <Link href={`/product/${item.product_id}`}>
                    <h3 className="font-semibold text-thrift-dark mb-1 truncate hover:text-thrift-gray transition-colors">
                      {item.product.title}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center gap-1 text-thrift-gray text-sm mb-2">
                    <Store className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {item.product.seller?.store_name || item.product.seller?.full_name}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-thrift-dark">
                      ₱{item.product.price.toFixed(2)}
                    </span>
                    {item.product.size && (
                      <span className="text-xs text-thrift-gray bg-thrift-light px-2 py-1 rounded">
                        {item.product.size}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.product.is_available || addingToCartId === item.product_id}
                    className="w-full bg-thrift-dark text-white py-2.5 rounded-xl font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToCartId === item.product_id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        {item.product.is_available ? 'Add to Cart' : 'Sold Out'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
