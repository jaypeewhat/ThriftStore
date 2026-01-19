'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useCartStore } from '@/lib/store'
import { supabase, CartItem } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Loader2, MapPin, Phone, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const { clearCart } = useCartStore()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saveAddress, setSaveAddress] = useState(true)
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    notes: '',
    delivery_method: 'delivery',
    payment_method: 'cod',
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'buyer')) {
      router.push('/')
      return
    }
    if (user) {
      fetchCartItems()
      fetchUserProfile()
    }
  }, [user, isLoading])

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, address, city, postal_code')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      if (data) {
        setFormData(prev => ({
          ...prev,
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
        }))
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchCartItems = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            *,
            seller:profiles(id, full_name)
          )
        `)
        .eq('user_id', user!.id)

      if (error) throw error
      
      if (!data || data.length === 0) {
        toast.error('Your cart is empty')
        router.push('/buyer/cart')
        return
      }
      
      setCartItems(data || [])
    } catch (error) {
      console.error('Error fetching cart:', error)
      toast.error('Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Save address to profile if checkbox is checked
      if (saveAddress) {
        await supabase
          .from('profiles')
          .update({
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
          })
          .eq('id', user!.id)
      }

      // Check if all products are still available
      const productIds = cartItems.map(item => item.product_id)
      const { data: productCheck, error: checkError } = await supabase
        .from('products')
        .select('id, is_available, title')
        .in('id', productIds)

      if (checkError) throw checkError

      const unavailableProducts = productCheck?.filter(p => !p.is_available) || []
      if (unavailableProducts.length > 0) {
        const productNames = unavailableProducts.map(p => p.title).join(', ')
        toast.error(`Some items are no longer available: ${productNames}`)
        
        // Remove unavailable items from cart
        await supabase
          .from('cart_items')
          .delete()
          .in('product_id', unavailableProducts.map(p => p.id))
          .eq('user_id', user!.id)
        
        // Refresh cart
        fetchCartItems()
        setSubmitting(false)
        return
      }

      const orders = cartItems.map(item => ({
        buyer_id: user!.id,
        seller_id: item.product!.seller_id,
        product_id: item.product_id,
        total_amount: item.product!.price * item.quantity,
        status: 'pending',
        shipping_address: formData.delivery_method === 'delivery' 
          ? `${formData.address}, ${formData.city}, ${formData.postal_code}` 
          : 'For Pickup',
        phone: formData.phone,
        notes: formData.notes,
        delivery_method: formData.delivery_method,
        payment_method: formData.payment_method,
      }))

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orders)
        .select()

      if (orderError) throw orderError

      // Send notifications to sellers
      const notifications = cartItems.map(item => ({
        user_id: item.product!.seller_id,
        type: 'order',
        title: 'New Order Received!',
        message: `You have a new order for "${item.product!.title}" - ₱${item.product!.price.toFixed(2)}`,
        link: '/seller/dashboard'
      }))

      await supabase.from('notifications').insert(notifications)

      const { error: cartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user!.id)

      if (cartError) throw cartError

      console.log('Marking products as unavailable:', productIds)
      const { error: productError } = await supabase.rpc('mark_products_sold', {
        product_ids: productIds
      })

      if (productError) {
        console.error('Error updating products:', productError)
        throw productError
      }
      
      console.log('Products successfully marked as sold')

      clearCart()
      toast.success('Order placed successfully!')
      router.push('/buyer/orders')
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)
  const shippingFee = formData.delivery_method === 'delivery' 
    ? cartItems.reduce((sum, item) => sum + (item.product?.shipping_fee || 0), 0)
    : 0
  const total = subtotal + shippingFee

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-thrift-white">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-thrift-gray" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-thrift-dark mb-6 sm:mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="glass rounded-2xl shadow-lg p-4 sm:p-6 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-thrift-dark mb-4">Order Details</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Delivery Method
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, delivery_method: 'delivery', payment_method: 'cod' })}
                      className={`p-3 sm:p-4 border-2 rounded-lg text-center transition-all ${
                        formData.delivery_method === 'delivery'
                          ? 'border-thrift-dark bg-thrift-light'
                          : 'border-gray-300 hover:border-thrift-gray'
                      }`}
                    >
                      <div className="font-semibold text-thrift-dark text-sm sm:text-base">Delivery</div>
                      <div className="text-xs sm:text-sm text-thrift-gray mt-1">We'll ship to you</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, delivery_method: 'pickup', payment_method: 'cop' })}
                      className={`p-3 sm:p-4 border-2 rounded-lg text-center transition-all ${
                        formData.delivery_method === 'pickup'
                          ? 'border-thrift-dark bg-thrift-light'
                          : 'border-gray-300 hover:border-thrift-gray'
                      }`}
                    >
                      <div className="font-semibold text-thrift-dark text-sm sm:text-base">Pickup</div>
                      <div className="text-xs sm:text-sm text-thrift-gray mt-1">Meet the seller</div>
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method
                  </label>
                  <div className={`p-4 border-2 rounded-lg ${
                    formData.delivery_method === 'delivery' 
                      ? 'border-thrift-dark bg-thrift-light' 
                      : 'border-gray-300'
                  }`}>
                    <div className="font-semibold text-thrift-dark">
                      {formData.delivery_method === 'delivery' ? 'Cash on Delivery (COD)' : 'Cash on Pickup (COP)'}
                    </div>
                    <div className="text-sm text-thrift-gray mt-1">
                      {formData.delivery_method === 'delivery' 
                        ? 'Pay when you receive your order' 
                        : 'Pay when you meet the seller'}
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-thrift-dark mb-4 mt-6">
                  {formData.delivery_method === 'delivery' ? 'Shipping Information' : 'Contact Information'}
                </h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-thrift-gray" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-thrift-gray" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                      placeholder="+63 XXX XXX XXXX"
                      required
                    />
                  </div>
                </div>

                {formData.delivery_method === 'delivery' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-thrift-gray" />
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          rows={2}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                          placeholder="House No., Street Name, Barangay"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {formData.delivery_method === 'pickup' && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The seller will contact you via phone to arrange a pickup location and time.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                    placeholder="Any special instructions for the seller..."
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="saveAddress"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="w-4 h-4 text-thrift-dark rounded focus:ring-thrift-gray"
                  />
                  <label htmlFor="saveAddress" className="text-sm text-thrift-gray">
                    Save my information for future orders
                  </label>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="glass rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-lg sm:text-xl font-semibold text-thrift-dark mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-thrift-gray truncate pr-2 flex-1">
                        {item.product?.title} (x{item.quantity})
                      </span>
                      <span className="font-medium text-thrift-dark whitespace-nowrap">
                        ₱{((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    {formData.delivery_method === 'delivery' && (item.product?.shipping_fee || 0) > 0 && (
                      <div className="flex justify-between text-xs text-thrift-gray mt-1">
                        <span className="pl-2">+ Shipping</span>
                        <span>₱{(item.product?.shipping_fee || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mb-4 sm:mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-thrift-gray">Subtotal</span>
                  <span className="text-thrift-dark">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-thrift-gray">Shipping</span>
                  <span className="text-thrift-dark">
                    {shippingFee === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `₱${shippingFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span className="text-thrift-dark">Total</span>
                  <span className="text-thrift-dark">₱{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full btn-primary disabled:opacity-50 text-sm sm:text-base py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
                    Placing Order...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>

              <button
                onClick={() => router.push('/buyer/cart')}
                className="w-full btn-outline mt-3 text-sm sm:text-base"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
