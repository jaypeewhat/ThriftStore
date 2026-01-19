'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase, Product, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ChatModal from '@/components/ChatModal'
import { Plus, Package, DollarSign, TrendingUp, Loader2, Edit, Trash2, ShoppingBag, MapPin, Phone, MessageSquare, Truck, CheckCircle, XCircle, Clock, Calendar, Send } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function SellerDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deliveryDateModal, setDeliveryDateModal] = useState<string | null>(null)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    activeListings: 0,
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'seller')) {
      router.push('/')
      return
    }
    if (user) {
      fetchProducts()
      fetchStats()
      fetchOrders()

      // Poll for order updates every 5 seconds as backup
      const pollInterval = setInterval(() => {
        fetchOrders()
        fetchStats()
      }, 5000)

      // Subscribe to order changes in realtime
      const ordersChannel = supabase
        .channel(`seller-orders-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order update received:', payload)
            fetchOrders()
            fetchStats()
          }
        )
        .subscribe()

      return () => {
        clearInterval(pollInterval)
        supabase.removeChannel(ordersChannel)
      }
    }
  }, [user, isLoading])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('seller_id', user!.id)
        .eq('status', 'delivered')

      if (error) throw error

      const revenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
      const activeCount = products.filter(p => p.is_available).length

      setStats({
        totalProducts: products.length,
        totalRevenue: revenue,
        activeListings: activeCount,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          buyer:profiles!orders_buyer_id_fkey(id, full_name, email)
        `)
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      // Get order details for notification
      const order = orders.find(o => o.id === orderId)
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      // If cancelled, restore product availability
      if (newStatus === 'cancelled' && order) {
        await supabase
          .from('products')
          .update({ is_available: true })
          .eq('id', order.product_id)
      }

      // Send notification to buyer about status change
      if (order) {
        const statusMessages: { [key: string]: string } = {
          confirmed: `Your order for "${order.product?.title}" has been confirmed by the seller!`,
          shipped: `Great news! Your order for "${order.product?.title}" has been shipped!`,
          delivered: `Your order for "${order.product?.title}" has been marked as delivered. Enjoy!`,
          cancelled: `Your order for "${order.product?.title}" has been cancelled by the seller.`,
        }

        if (statusMessages[newStatus]) {
          await supabase.from('notifications').insert({
            user_id: order.buyer_id,
            type: 'status_change',
            title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
            message: statusMessages[newStatus],
            link: `/buyer/orders/${orderId}`
          })
        }
      }

      toast.success(`Order ${newStatus}`)
      await fetchOrders()
      await fetchStats()
    } catch (error) {
      toast.error('Failed to update order')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const setOrderDeliveryDate = async (orderId: string) => {
    if (!deliveryDate) {
      toast.error('Please select a delivery date')
      return
    }
    setUpdatingOrderId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_date: deliveryDate })
        .eq('id', orderId)

      if (error) throw error
      toast.success('Delivery date set')
      setDeliveryDateModal(null)
      setDeliveryDate('')
      await fetchOrders()
    } catch (error) {
      toast.error('Failed to set delivery date')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const openChat = (order: Order) => {
    setSelectedOrder(order)
    setChatOpen(true)
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This will also delete all related orders and cart items.')) return

    try {
      // Delete related messages first (from orders)
      const { data: relatedOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', productId)

      if (relatedOrders && relatedOrders.length > 0) {
        const orderIds = relatedOrders.map(o => o.id)
        
        // Delete messages for these orders
        await supabase
          .from('messages')
          .delete()
          .in('order_id', orderIds)

        // Delete ratings for these orders
        await supabase
          .from('ratings')
          .delete()
          .in('order_id', orderIds)

        // Delete notifications related to these orders
        for (const orderId of orderIds) {
          await supabase
            .from('notifications')
            .delete()
            .like('link', `%${orderId}%`)
        }
      }

      // Delete orders for this product
      await supabase
        .from('orders')
        .delete()
        .eq('product_id', productId)

      // Delete cart items for this product
      await supabase
        .from('cart_items')
        .delete()
        .eq('product_id', productId)

      // Now delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      toast.success('Product deleted successfully')
      fetchProducts()
      fetchOrders()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete product')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'cancel_requested': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCancelRequest = async (orderId: string, approve: boolean) => {
    setUpdatingOrderId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found')

      if (approve) {
        // Approve cancellation - set status to cancelled and restore product
        const { error } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', orderId)

        if (error) throw error

        // Restore product availability
        await supabase
          .from('products')
          .update({ is_available: true })
          .eq('id', order.product_id)

        // Notify buyer
        await supabase.from('notifications').insert({
          user_id: order.buyer_id,
          type: 'status_change',
          title: 'Cancellation Approved',
          message: `Your cancellation request for "${order.product?.title}" has been approved.`,
          link: `/buyer/orders/${orderId}`
        })

        toast.success('Cancellation approved')
      } else {
        // Reject cancellation - revert to confirmed status
        const { error } = await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId)

        if (error) throw error

        // Notify buyer
        await supabase.from('notifications').insert({
          user_id: order.buyer_id,
          type: 'status_change',
          title: 'Cancellation Rejected',
          message: `Your cancellation request for "${order.product?.title}" has been rejected by the seller.`,
          link: `/buyer/orders/${orderId}`
        })

        toast.success('Cancellation rejected - order continues')
      }

      await fetchOrders()
      await fetchStats()
    } catch (error) {
      toast.error('Failed to process cancel request')
    } finally {
      setUpdatingOrderId(null)
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-thrift-dark mb-2">My Store</h1>
            <p className="text-thrift-gray text-sm sm:text-base">Manage your products and sales</p>
          </div>
          <Link href="/seller/products/new" className="w-full sm:w-auto">
            <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="glass rounded-3xl p-6 card-hover transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrift-gray text-sm mb-1">Total Products</p>
                <p className="text-3xl font-bold text-thrift-dark">{stats.totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-thrift-light rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-thrift-dark" />
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 card-hover transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrift-gray text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-thrift-dark">₱{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-thrift-light rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-thrift-dark" />
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 card-hover transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrift-gray text-sm mb-1">Active Listings</p>
                <p className="text-3xl font-bold text-thrift-dark">{stats.activeListings}</p>
              </div>
              <div className="w-12 h-12 bg-thrift-light rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-thrift-dark" />
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="glass rounded-3xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-thrift-dark mb-6">Your Products</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-4">No products yet</p>
              <Link href="/seller/products/new">
                <button className="btn-primary">Add Your First Product</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 border-2 border-thrift-light rounded-2xl hover:shadow-lg hover:border-thrift-gray transition-all hover:-translate-y-1">
                  <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.images[0]}`}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    <p className="text-sm text-gray-600">{product.category} • Size: {product.size}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-600">₱{product.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {product.is_available ? (
                        <span className="text-green-600">Available</span>
                      ) : (
                        <span className="text-red-600">Sold</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/seller/products/edit/${product.id}`}>
                      <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit className="w-5 h-5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="glass rounded-3xl shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-thrift-dark">Recent Orders</h2>
            <span className="bg-thrift-dark text-white px-3 py-1 rounded-full text-sm">
              {orders.length} orders
            </span>
          </div>
          
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-thrift-gray" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-thrift-gray mx-auto mb-4" />
              <p className="text-thrift-gray text-lg">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-thrift-light rounded-2xl overflow-hidden hover:shadow-xl hover:border-thrift-gray transition-all duration-300">
                  {/* Order Header */}
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${
                    order.status === 'pending' ? 'bg-thrift-light' :
                    order.status === 'confirmed' ? 'bg-thrift-light' :
                    order.status === 'shipped' ? 'bg-thrift-light' :
                    order.status === 'delivered' ? 'bg-thrift-light' :
                    'bg-thrift-light'
                  }`}>
                    <div className="flex items-center gap-2">
                      {order.status === 'pending' && <Clock className="w-4 h-4 text-thrift-gray" />}
                      {order.status === 'confirmed' && <CheckCircle className="w-4 h-4 text-thrift-dark" />}
                      {order.status === 'shipped' && <Truck className="w-4 h-4 text-thrift-dark" />}
                      {order.status === 'delivered' && <CheckCircle className="w-4 h-4 text-thrift-dark" />}
                      {order.status === 'cancelled' && <XCircle className="w-4 h-4 text-thrift-gray" />}
                      {order.status === 'cancel_requested' && <Clock className="w-4 h-4 text-orange-600" />}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status === 'cancel_requested' ? 'Cancel Requested' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-thrift-gray">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Order Content */}
                  <div className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 bg-thrift-light rounded-xl overflow-hidden flex-shrink-0">
                        {order.product?.images && order.product.images.length > 0 ? (
                          <Image
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${order.product.images[0]}`}
                            alt={order.product?.title || 'Product'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-thrift-gray absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-thrift-dark text-lg truncate">{order.product?.title}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-2xl font-bold text-thrift-dark">₱{order.total_amount.toFixed(2)}</span>
                          <span className="text-sm text-thrift-gray bg-thrift-light px-2 py-1 rounded flex items-center gap-1">
                            {order.delivery_method === 'delivery' ? (
                              <>
                                <Truck className="w-3 h-3" />
                                Delivery
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3 h-3" />
                                Pickup
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Buyer Info */}
                    <div className="mt-4 p-3 bg-thrift-light rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-thrift-dark rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {(order.buyer?.full_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-thrift-dark">{order.buyer?.full_name || 'Unknown Buyer'}</p>
                          {order.buyer?.email && <p className="text-xs text-thrift-gray">{order.buyer.email}</p>}
                        </div>
                      </div>
                      
                      {order.phone && (
                        <div className="flex items-center gap-2 text-sm text-thrift-gray">
                          <Phone className="w-4 h-4" />
                          <span>{order.phone}</span>
                        </div>
                      )}
                      
                      {order.delivery_method === 'delivery' && order.shipping_address && order.shipping_address !== 'For Pickup' && (
                        <div className="flex items-start gap-2 text-sm text-thrift-gray">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{order.shipping_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Notes */}
                    {order.notes && (
                      <div className="mt-3 p-3 bg-thrift-white border border-thrift-light rounded-xl">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-thrift-gray mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-thrift-dark mb-1">Customer Note:</p>
                            <p className="text-sm text-thrift-gray">{order.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Date Display */}
                    {(order as any).delivery_date && (
                      <div className="mt-3 p-3 bg-thrift-light rounded-xl">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-thrift-dark" />
                          <div>
                            <p className="text-xs font-semibold text-thrift-dark">Delivery Date:</p>
                            <p className="text-sm text-thrift-gray">
                              {new Date((order as any).delivery_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Date Modal */}
                    {deliveryDateModal === order.id && (
                      <div className="mt-3 p-3 bg-thrift-light rounded-xl">
                        <p className="text-sm font-semibold text-thrift-dark mb-2">Set Delivery Date</p>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="flex-1 px-3 py-2 border border-thrift-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-thrift-dark"
                          />
                          <button
                            onClick={() => setOrderDeliveryDate(order.id)}
                            disabled={updatingOrderId === order.id}
                            className="px-4 py-2 bg-thrift-dark text-white rounded-lg hover:bg-black text-sm font-semibold disabled:opacity-50"
                          >
                            {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </button>
                          <button
                            onClick={() => { setDeliveryDateModal(null); setDeliveryDate(''); }}
                            className="px-4 py-2 bg-white text-thrift-dark rounded-lg hover:bg-thrift-gray hover:text-white text-sm font-semibold border border-thrift-light"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message Button - Always visible */}
                    {order.status !== 'cancelled' && (
                      <button
                        onClick={() => openChat(order)}
                        className="w-full mt-3 px-4 py-2 bg-white border border-thrift-light text-thrift-dark rounded-xl hover:bg-thrift-light font-medium flex items-center justify-center gap-2 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Message Buyer
                      </button>
                    )}

                    {/* Action Buttons */}
                    {order.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          disabled={updatingOrderId === order.id}
                          className="flex-1 px-4 py-3 bg-thrift-dark text-white rounded-xl hover:bg-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                          {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Confirm Order
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          disabled={updatingOrderId === order.id}
                          className="px-4 py-3 bg-white border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                          {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Cancel
                        </button>
                      </div>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeliveryDateModal(order.id)}
                            className="flex-1 px-4 py-3 bg-white border border-thrift-light text-thrift-dark rounded-xl hover:bg-thrift-light font-semibold flex items-center justify-center gap-2 transition-all"
                          >
                            <Calendar className="w-4 h-4" />
                            Set Delivery Date
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'shipped')}
                            disabled={updatingOrderId === order.id}
                            className="flex-1 px-4 py-3 bg-thrift-dark text-white rounded-xl hover:bg-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                          >
                            {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            Mark as Shipped
                          </button>
                        </div>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          disabled={updatingOrderId === order.id}
                          className="w-full px-4 py-2 bg-white border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm"
                        >
                          {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Cancel Order
                        </button>
                      </div>
                    )}
                    
                    {order.status === 'shipped' && (
                      <div className="mt-3">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          disabled={updatingOrderId === order.id}
                          className="w-full px-4 py-3 bg-thrift-dark text-white rounded-xl hover:bg-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                          {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Mark as Delivered
                        </button>
                      </div>
                    )}

                    {order.status === 'cancel_requested' && (
                      <div className="mt-3">
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-3">
                          <p className="text-sm text-orange-800 font-medium">⚠️ Buyer has requested to cancel this order</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancelRequest(order.id, true)}
                            disabled={updatingOrderId === order.id}
                            className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                          >
                            {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Approve Cancel
                          </button>
                          <button
                            onClick={() => handleCancelRequest(order.id, false)}
                            disabled={updatingOrderId === order.id}
                            className="flex-1 px-4 py-3 bg-thrift-dark text-white rounded-xl hover:bg-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                          >
                            {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject & Continue
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {selectedOrder && (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => { setChatOpen(false); setSelectedOrder(null); }}
          orderId={selectedOrder.id}
          currentUserId={user!.id}
          otherUserId={selectedOrder.buyer_id}
          otherUserName={selectedOrder.buyer?.full_name || 'Buyer'}
        />
      )}
    </div>
  )
}
