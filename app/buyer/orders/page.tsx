'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ChatModal from '@/components/ChatModal'
import { Loader2, Package, Send, Calendar, XCircle } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'buyer')) {
      router.push('/')
      return
    }
    if (user) {
      fetchOrders()
    }
  }, [user, isLoading])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          seller:profiles!orders_seller_id_fkey(id, full_name, avatar_url)
        `)
        .eq('buyer_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const openChat = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedOrder(order)
    setChatOpen(true)
  }

  const requestCancelOrder = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to request cancellation for this order?')) return
    
    setCancellingOrderId(order.id)
    try {
      // Update order status to cancel_requested
      const { error: orderError } = await supabase
        .rpc('request_cancel_order', { 
          p_order_id: order.id,
          p_buyer_id: user!.id
        })

      if (orderError) throw orderError

      // Send notification to seller
      await supabase.from('notifications').insert({
        user_id: order.seller_id,
        type: 'cancel_request',
        title: 'Cancellation Requested',
        message: `Buyer requested to cancel the order for "${order.product?.title}"`,
        link: `/seller/dashboard`
      })

      toast.success('Cancellation request sent to seller')
      
      // Update the local state immediately
      setOrders(prev => prev.map(o => 
        o.id === order.id ? { ...o, status: 'cancel_requested' as const } : o
      ))
    } catch (error: any) {
      console.error('Cancel request error:', error)
      toast.error(error.message || 'Failed to request cancellation')
    } finally {
      setCancellingOrderId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-200 text-gray-800'
      case 'confirmed': return 'bg-thrift-light text-thrift-dark'
      case 'shipped': return 'bg-gray-300 text-gray-900'
      case 'delivered': return 'bg-thrift-dark text-thrift-white'
      case 'cancelled': return 'bg-gray-100 text-thrift-gray'
      default: return 'bg-thrift-light text-thrift-dark'
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
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-thrift-dark mb-6 sm:mb-8">My Orders</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="glass rounded-2xl shadow-lg p-8 sm:p-12 text-center">
            <Package className="w-12 sm:w-16 h-12 sm:h-16 text-thrift-gray mx-auto mb-4" />
            <p className="text-lg sm:text-xl text-thrift-gray mb-6">No orders yet</p>
            <button onClick={() => router.push('/')} className="btn-primary">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                onClick={() => router.push(`/buyer/orders/${order.id}`)}
                className="glass rounded-2xl shadow-md p-4 sm:p-6 card-hover cursor-pointer"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {order.product?.images && order.product.images.length > 0 ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${order.product.images[0]}`}
                        alt={order.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-thrift-dark truncate">{order.product?.title}</h3>
                        <p className="text-xs sm:text-sm text-thrift-gray">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold w-fit ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>

                    {/* Delivery Date */}
                    {(order as any).delivery_date && (
                      <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm text-thrift-dark bg-thrift-light px-2 sm:px-3 py-1 rounded-lg w-fit">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Delivery: {new Date((order as any).delivery_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs sm:text-sm text-thrift-gray">
                          #{order.id.slice(0, 8)}
                        </p>
                        {order.status !== 'cancelled' && (
                          <button
                            onClick={(e) => openChat(order, e)}
                            className="px-2 sm:px-3 py-1 bg-thrift-dark text-white rounded-full text-xs font-medium flex items-center gap-1 hover:bg-black transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span className="hidden sm:inline">Message Seller</span>
                            <span className="sm:hidden">Message</span>
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <button
                            onClick={(e) => requestCancelOrder(order, e)}
                            disabled={cancellingOrderId === order.id}
                            className="px-2 sm:px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium flex items-center gap-1 hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            {cancellingOrderId === order.id ? 'Requesting...' : 'Request Cancel'}
                          </button>
                        )}
                        {order.status === 'cancel_requested' && (
                          <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Awaiting Approval
                          </span>
                        )}
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-thrift-dark">
                        ₱{order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {selectedOrder && (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => { setChatOpen(false); setSelectedOrder(null); }}
          orderId={selectedOrder.id}
          currentUserId={user!.id}
          otherUserId={selectedOrder.seller_id}
          otherUserName={(selectedOrder as any).seller?.full_name || 'Seller'}
        />
      )}
    </div>
  )
}
