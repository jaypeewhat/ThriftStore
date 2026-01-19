'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useCartStore } from '@/lib/store'
import { supabase, CartItem } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Trash2, Loader2, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function CartPage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const { setItems } = useCartStore()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'buyer')) {
      router.push('/')
      return
    }
    if (user) {
      fetchCartItems()
    }
  }, [user, isLoading])

  const fetchCartItems = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user!.id)

      if (error) throw error
      setCartItems(data || [])
      setItems((data || []).map(item => item.product).filter(Boolean))
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFromCart = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      
      toast.success('Removed from cart')
      fetchCartItems()
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  const proceedToCheckout = () => {
    const unavailableItems = cartItems.filter(item => !item.product?.is_available)
    if (unavailableItems.length > 0) {
      toast.error('Please remove sold out items from your cart')
      return
    }
    router.push('/buyer/checkout')
  }

  const total = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)
  const hasUnavailableItems = cartItems.some(item => !item.product?.is_available)

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
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-thrift-dark mb-8">Shopping Cart</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="glass rounded-2xl shadow-lg p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-thrift-gray mx-auto mb-4" />
            <p className="text-xl text-thrift-gray mb-6">Your cart is empty</p>
            <button onClick={() => router.push('/')} className="btn-primary">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className={`glass rounded-2xl shadow-md p-4 flex gap-4 card-hover ${!item.product?.is_available ? 'opacity-60 bg-red-50' : ''}`}>
                  <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images && item.product.images.length > 0 ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${item.product.images[0]}`}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-thrift-dark">{item.product?.title}</h3>
                    <p className="text-sm text-thrift-gray mb-2">{item.product?.category} • Size: {item.product?.size}</p>
                    {!item.product?.is_available && (
                      <p className="text-sm font-semibold text-red-600 mb-1">SOLD OUT</p>
                    )}
                    <p className="text-xl font-bold text-thrift-dark">₱{item.product?.price.toFixed(2)}</p>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="glass rounded-3xl shadow-xl p-6 sticky top-24">
                <h2 className="text-2xl font-bold text-thrift-dark mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-thrift-gray">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-thrift-gray">
                    <span>Shipping</span>
                    <span className="text-thrift-gray text-sm">Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-xl font-bold text-thrift-dark">
                      <span>Estimated Total</span>
                      <span>₱{total.toFixed(2)}+</span>
                    </div>
                  </div>
                </div>

                {hasUnavailableItems && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-600 font-medium text-center">
                      Some items are sold out. Please remove them to proceed.
                    </p>
                  </div>
                )}
                <button
                  onClick={proceedToCheckout}
                  disabled={hasUnavailableItems}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Checkout
                </button>
                
                <button
                  onClick={() => router.push('/shop')}
                  className="w-full btn-outline mt-3"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
