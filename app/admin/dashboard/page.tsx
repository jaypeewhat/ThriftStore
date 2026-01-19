'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase, Profile, Product, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { 
  Loader2, Users, Package, ShoppingBag, DollarSign, 
  Trash2, Ban, CheckCircle, Eye, Search, Filter,
  UserX, UserCheck, AlertTriangle, BarChart3
} from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

type TabType = 'overview' | 'users' | 'products' | 'orders'

interface Stats {
  totalUsers: number
  totalBuyers: number
  totalSellers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  suspendedUsers: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBuyers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    suspendedUsers: 0,
  })
  const [users, setUsers] = useState<Profile[]>([])
  const [products, setProducts] = useState<(Product & { seller?: Profile })[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'buyer' | 'seller'>('all')

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/')
      toast.error('Unauthorized access')
      return
    }
    if (user && user.role === 'admin') {
      fetchAllData()
    }
  }, [user, isLoading])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchProducts(),
        fetchOrders(),
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id, role, is_suspended'),
        supabase.from('products').select('id'),
        supabase.from('orders').select('id, status, total_amount'),
      ])

      const usersData = usersRes.data || []
      const ordersData = ordersRes.data || []

      setStats({
        totalUsers: usersData.filter(u => u.role !== 'admin').length,
        totalBuyers: usersData.filter(u => u.role === 'buyer').length,
        totalSellers: usersData.filter(u => u.role === 'seller').length,
        totalProducts: productsRes.data?.length || 0,
        totalOrders: ordersData.length,
        totalRevenue: ordersData
          .filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + o.total_amount, 0),
        pendingOrders: ordersData.filter(o => o.status === 'pending').length,
        suspendedUsers: usersData.filter(u => u.is_suspended).length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, email, store_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(id, title, images),
          buyer:profiles!orders_buyer_id_fkey(id, full_name, email),
          seller:profiles!orders_seller_id_fkey(id, full_name, email, store_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const toggleUserSuspension = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_suspended: !currentStatus } : u
      ))
      toast.success(currentStatus ? 'User unsuspended' : 'User suspended')
      fetchStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      setProducts(products.filter(p => p.id !== productId))
      toast.success('Product deleted')
      fetchStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product')
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      cancel_requested: 'bg-orange-100 text-orange-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-thrift-gray" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your platform</p>
        </div>

        {/* Tabs - Mobile: Grid, Desktop: Flex */}
        <div className="grid grid-cols-4 sm:flex gap-1 sm:gap-2 mb-4 sm:mb-6">
          {[
            { key: 'overview', label: 'Overview', shortLabel: 'Home', icon: BarChart3 },
            { key: 'users', label: 'Users', shortLabel: 'Users', icon: Users },
            { key: 'products', label: 'Products', shortLabel: 'Items', icon: Package },
            { key: 'orders', label: 'Orders', shortLabel: 'Orders', icon: ShoppingBag },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-thrift-dark text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] sm:text-sm">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Grid - 2x2 on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm">Total Users</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-6 h-6 sm:w-10 sm:h-10 text-blue-500" />
                </div>
                <p className="text-[10px] sm:text-sm text-gray-500 mt-1 sm:mt-2">
                  {stats.totalBuyers} buyers • {stats.totalSellers} sellers
                </p>
              </div>

              <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm">Products</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                  </div>
                  <Package className="w-6 h-6 sm:w-10 sm:h-10 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm">Orders</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="w-6 h-6 sm:w-10 sm:h-10 text-purple-500" />
                </div>
                <p className="text-[10px] sm:text-sm text-yellow-600 mt-1 sm:mt-2">
                  {stats.pendingOrders} pending
                </p>
              </div>

              <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm">Revenue</p>
                    <p className="text-lg sm:text-3xl font-bold text-gray-900">₱{stats.totalRevenue.toFixed(0)}</p>
                  </div>
                  <DollarSign className="w-6 h-6 sm:w-10 sm:h-10 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Alerts */}
            {stats.suspendedUsers > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm sm:text-base">
                  <span className="font-semibold">{stats.suspendedUsers} users</span> suspended
                </p>
              </div>
            )}

            {/* Recent Activity - Stack on mobile */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent Users */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Recent Users</h3>
                <div className="space-y-2 sm:space-y-3">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {u.avatar_url ? (
                          <Image
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_url}`}
                            alt={u.full_name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium text-xs sm:text-sm">
                            {u.full_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${
                        u.role === 'buyer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Recent Orders</h3>
                <div className="space-y-2 sm:space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{order.product?.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {order.buyer?.full_name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-gray-900 text-sm">₱{order.total_amount.toFixed(0)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm">
            {/* Filters */}
            <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-thrift-gray"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as 'all' | 'buyer' | 'seller')}
                className="px-3 sm:px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-thrift-gray"
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
              </select>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden divide-y">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar_url ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_url}`}
                          alt={u.full_name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-medium text-sm">
                          {u.full_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{u.full_name}</p>
                        <button
                          onClick={() => toggleUserSuspension(u.id, u.is_suspended || false)}
                          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                            u.is_suspended
                              ? 'text-green-600 bg-green-50'
                              : 'text-red-600 bg-red-50'
                          }`}
                        >
                          {u.is_suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          u.role === 'buyer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {u.avatar_url ? (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_url}`}
                                alt={u.full_name}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 font-medium">
                                {u.full_name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.full_name}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'buyer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleUserSuspension(u.id, u.is_suspended || false)}
                          className={`p-2 rounded-lg transition-colors ${
                            u.is_suspended
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {u.is_suspended ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleUserSuspension(u.id, u.is_suspended || false)}
                          className={`p-2 rounded-lg transition-colors ${
                            u.is_suspended
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {u.is_suspended ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-3 sm:p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-thrift-gray"
                />
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden divide-y">
              {products
                .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(product => (
                <div key={product.id} className="p-3">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      {product.images?.[0] && (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.images[0]}`}
                          alt={product.title}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{product.title}</p>
                          <p className="text-xs text-gray-500 truncate">{product.seller?.store_name || product.seller?.full_name}</p>
                        </div>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-1.5 text-red-600 bg-red-50 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-semibold text-sm text-gray-900">₱{product.price.toFixed(0)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          product.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.is_available ? 'Available' : 'Sold'}
                        </span>
                        <span className="text-[10px] text-gray-400">{product.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Seller</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products
                    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden">
                            {product.images?.[0] && (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.images[0]}`}
                                alt={product.title}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.title}</p>
                            <p className="text-sm text-gray-500">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{product.seller?.store_name || product.seller?.full_name}</p>
                        <p className="text-xs text-gray-500">{product.seller?.email}</p>
                      </td>
                      <td className="px-6 py-4 font-medium">₱{product.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.is_available ? 'Available' : 'Sold'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Mobile Card View */}
            <div className="sm:hidden divide-y">
              {orders.map(order => (
                <div key={order.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{order.product?.title}</p>
                      <p className="text-[10px] text-gray-400">#{order.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">₱{order.total_amount.toFixed(0)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{order.buyer?.full_name}</span>
                      <span>→</span>
                      <span>{order.seller?.store_name || order.seller?.full_name}</span>
                    </div>
                    <span className="text-[10px]">{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Buyer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Seller</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.product?.title}</p>
                        <p className="text-xs text-gray-500">#{order.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{order.buyer?.full_name}</p>
                        <p className="text-xs text-gray-500">{order.buyer?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{order.seller?.store_name || order.seller?.full_name}</p>
                        <p className="text-xs text-gray-500">{order.seller?.email}</p>
                      </td>
                      <td className="px-6 py-4 font-medium">₱{order.total_amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
