'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import RatingModal from '@/components/RatingModal'
import { Loader2, Package, MapPin, Phone, User, Calendar, CreditCard, Truck, Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'buyer')) {
      router.push('/')
      return
    }
    if (user) {
      fetchOrder()
    }
  }, [user, isLoading, params.id])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          seller:profiles!orders_seller_id_fkey(id, full_name, avatar_url, email)
        `)
        .eq('id', params.id)
        .eq('buyer_id', user!.id)
        .single()

      if (error) throw error
      setOrder(data)
      
      // Check if user has already rated
      if (data.status === 'delivered') {
        const { data: ratingData } = await supabase
          .from('ratings')
          .select('id')
          .eq('order_id', params.id)
          .single()
        
        setHasRated(!!ratingData)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      router.push('/buyer/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to request cancellation for this order?')) return
    
    setCancelling(true)
    try {
      // Request cancel using RPC function
      const { error: orderError } = await supabase
        .rpc('request_cancel_order', { 
          p_order_id: order!.id,
          p_buyer_id: user!.id
        })

      if (orderError) throw orderError

      // Send notification to seller
      await supabase.from('notifications').insert({
        user_id: order!.seller_id,
        type: 'cancel_request',
        title: 'Cancellation Requested',
        message: `Buyer requested to cancel the order for "${order!.product?.title}"`,
        link: `/seller/dashboard`
      })

      toast.success('Cancellation request sent to seller')
      fetchOrder()
    } catch (error: any) {
      console.error('Error requesting cancellation:', error)
      toast.error(error.message || 'Failed to request cancellation')
    } finally {
      setCancelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImageUrl = (imagePath: string) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${imagePath}`
    return url
  }

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

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/buyer/orders')}
          className="text-thrift-gray hover:text-thrift-dark mb-6 flex items-center gap-2"
        >
          ← Back to Orders
        </button>

        <div className="glass rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-thrift-dark mb-2">Order Details</h1>
              <p className="text-thrift-gray">Order ID: {order.id}</p>
            </div>
            <div className="flex gap-3 items-center">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status === 'cancel_requested' ? 'Cancel Requested' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              {(order.status === 'pending' || order.status === 'confirmed') && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-semibold"
                >
                  {cancelling ? 'Requesting...' : 'Request Cancel'}
                </button>
              )}
              {order.status === 'cancel_requested' && (
                <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold">
                  Awaiting Seller Approval
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-thrift-gray mt-1" />
              <div>
                <p className="text-sm text-thrift-gray">Order Date</p>
                <p className="font-semibold text-thrift-dark">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-thrift-gray mt-1" />
              <div>
                <p className="text-sm text-thrift-gray">Payment Method</p>
                <p className="font-semibold text-thrift-dark">
                  {order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : 'Cash on Pickup (COP)'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-thrift-gray mt-1" />
              <div>
                <p className="text-sm text-thrift-gray">Delivery Method</p>
                <p className="font-semibold text-thrift-dark">
                  {order.delivery_method === 'delivery' ? 'Delivery' : 'Pickup'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-thrift-gray mt-1" />
              <div>
                <p className="text-sm text-thrift-gray">Total Amount</p>
                <p className="text-2xl font-bold text-thrift-dark">₱{order.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {order.delivery_method === 'delivery' && order.shipping_address && order.shipping_address !== 'For Pickup' && (
            <div className="border-t pt-6 mb-6">
              <h3 className="font-semibold text-thrift-dark mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h3>
              <p className="text-thrift-gray">{order.shipping_address}</p>
              {order.phone && (
                <p className="text-thrift-gray mt-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {order.phone}
                </p>
              )}
            </div>
          )}

          {order.delivery_method === 'pickup' && (
            <div className="border-t pt-6 mb-6">
              <h3 className="font-semibold text-thrift-dark mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Pickup Information
              </h3>
              <p className="text-thrift-gray">The seller will contact you to arrange pickup.</p>
              {order.phone && (
                <p className="text-thrift-gray mt-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Your contact: {order.phone}
                </p>
              )}
            </div>
          )}

          {order.notes && (
            <div className="border-t pt-6 mb-6">
              <h3 className="font-semibold text-thrift-dark mb-2">Order Notes</h3>
              <p className="text-thrift-gray">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-thrift-dark mb-6">Product Details</h2>
          
          <div className="flex gap-6">
            <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {order.product?.images && order.product.images.length > 0 && (
                <img
                  src={getImageUrl(order.product.images[0])}
                  alt={order.product.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-thrift-dark mb-2">
                {order.product?.title}
              </h3>
              <p className="text-thrift-gray mb-4">{order.product?.description}</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-thrift-gray">Category</p>
                  <p className="font-semibold text-thrift-dark">{order.product?.category}</p>
                </div>
                <div>
                  <p className="text-sm text-thrift-gray">Size</p>
                  <p className="font-semibold text-thrift-dark">{order.product?.size}</p>
                </div>
                <div>
                  <p className="text-sm text-thrift-gray">Condition</p>
                  <p className="font-semibold text-thrift-dark">{order.product?.condition}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-thrift-dark mb-4">Seller Information</h2>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-thrift-light rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-thrift-gray" />
            </div>
            <div>
              <p className="font-semibold text-thrift-dark text-lg">
                {order.seller?.full_name || 'Unknown Seller'}
              </p>
              {order.seller?.email && (
                <p className="text-thrift-gray">{order.seller.email}</p>
              )}
            </div>
          </div>

          {/* Rating Section */}
          {order.status === 'delivered' && (
            <div className="mt-6 pt-6 border-t border-thrift-light">
              {hasRated ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-medium">You have rated this seller</span>
                </div>
              ) : (
                <div>
                  <p className="text-thrift-gray mb-3">How was your experience with this seller?</p>
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="px-6 py-3 bg-thrift-dark text-white rounded-xl font-semibold hover:bg-black flex items-center gap-2 transition-colors"
                  >
                    <Star className="w-5 h-5" />
                    Rate This Seller
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {order && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          orderId={order.id}
          sellerId={order.seller_id}
          buyerId={user!.id}
          sellerName={order.seller?.full_name || 'Seller'}
          onRated={() => setHasRated(true)}
        />
      )}
    </div>
  )
}
