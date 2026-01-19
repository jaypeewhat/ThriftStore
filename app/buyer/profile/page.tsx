'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase, Profile, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { User, Mail, Phone, MapPin, ShoppingBag, Calendar, Camera, Loader2, Save, Package, Star, Lock, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function BuyerProfile() {
  const router = useRouter()
  const { user, isLoading, setUser } = useAuthStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'buyer')) {
      router.push('/')
      return
    }
    if (user) {
      fetchProfile()
      fetchStats()
    }
  }, [user, isLoading])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, total_amount')
        .eq('buyer_id', user!.id)

      if (error) throw error

      const totalOrders = orders?.length || 0
      const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0
      const totalSpent = orders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_amount, 0) || 0

      setStats({ totalOrders, completedOrders, totalSpent })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${user!.id}-avatar.${fileExt}`

    setUploading(true)
    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        await supabase.storage.from('avatars').remove([profile.avatar_url])
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', user!.id)

      if (updateError) throw updateError

      toast.success('Avatar updated!')
      fetchProfile()
    } catch (error) {
      toast.error('Failed to upload avatar')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user!.id)

      if (error) throw error

      // Update local state
      setUser({ ...user!, ...formData })
      toast.success('Profile updated successfully!')
      fetchProfile()
    } catch (error) {
      toast.error('Failed to update profile')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-thrift-dark" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-thrift-dark mb-8">My Profile</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass rounded-3xl p-6 text-center">
              {/* Avatar */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-thrift-light border-4 border-white shadow-lg">
                  {profile?.avatar_url ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-thrift-dark text-white text-4xl font-bold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'B'}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-thrift-dark text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-black transition-colors shadow-lg">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              <h2 className="text-xl font-bold text-thrift-dark">{profile?.full_name || 'Buyer'}</h2>
              <p className="text-thrift-gray text-sm mb-4">{profile?.email}</p>

              <div className="flex items-center justify-center gap-2 text-thrift-gray text-sm">
                <ShoppingBag className="w-4 h-4" />
                <span>Buyer Account</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-thrift-gray text-sm mt-2">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="glass rounded-3xl p-6">
              <h3 className="text-lg font-bold text-thrift-dark mb-4">Shopping Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-thrift-gray">
                    <Package className="w-5 h-5" />
                    <span>Total Orders</span>
                  </div>
                  <span className="font-bold text-thrift-dark">{stats.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-thrift-gray">
                    <Star className="w-5 h-5" />
                    <span>Completed</span>
                  </div>
                  <span className="font-bold text-green-600">{stats.completedOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-thrift-gray">
                    <ShoppingBag className="w-5 h-5" />
                    <span>Total Spent</span>
                  </div>
                  <span className="font-bold text-thrift-dark">₱{stats.totalSpent.toFixed(2)}</span>
                </div>
              </div>
              <Link href="/buyer/orders">
                <button className="w-full btn-secondary mt-4">View All Orders</button>
              </Link>
            </div>
          </div>

          {/* Edit Form */}
          <div className="md:col-span-2">
            <div className="glass rounded-3xl p-6">
              <h3 className="text-xl font-bold text-thrift-dark mb-6">Edit Profile</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-thrift-dark mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-thrift-dark mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl bg-thrift-light/50 text-thrift-gray cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-thrift-dark mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors"
                    placeholder="Your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-thrift-dark mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors"
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-thrift-dark mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-thrift-dark mb-2">Postal Code</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors"
                      placeholder="Postal code"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* Change Password Section */}
            <div className="glass rounded-3xl p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-thrift-dark flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="text-sm text-thrift-gray hover:text-thrift-dark transition-colors"
                >
                  {showPasswordForm ? 'Cancel' : 'Change'}
                </button>
              </div>

              {showPasswordForm && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  if (passwordData.newPassword !== passwordData.confirmPassword) {
                    toast.error('New passwords do not match')
                    return
                  }
                  if (passwordData.newPassword.length < 6) {
                    toast.error('Password must be at least 6 characters')
                    return
                  }
                  setChangingPassword(true)
                  try {
                    const { error } = await supabase.auth.updateUser({
                      password: passwordData.newPassword
                    })
                    if (error) throw error
                    toast.success('Password changed successfully!')
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                    setShowPasswordForm(false)
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to change password')
                  } finally {
                    setChangingPassword(false)
                  }
                }} className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-thrift-dark mb-2">New Password</label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors pr-12"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-10 text-thrift-gray hover:text-thrift-dark"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-thrift-dark mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-thrift-light rounded-xl focus:outline-none focus:border-thrift-dark transition-colors"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {changingPassword ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              )}

              {!showPasswordForm && (
                <p className="text-sm text-thrift-gray">Click "Change" to update your password</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
