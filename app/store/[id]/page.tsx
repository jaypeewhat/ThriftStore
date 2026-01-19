'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Product, Profile } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import { Loader2, Store, Star, Package, MapPin, Calendar, ShoppingBag, MessageSquare } from 'lucide-react'
import Image from 'next/image'

interface SellerProfile extends Profile {
  store_name?: string
  store_description?: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  buyer: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  order: {
    product: {
      title: string
    }
  }
}

export default function StorePage() {
  const params = useParams()
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null)
  const [stats, setStats] = useState({ totalProducts: 0, soldProducts: 0 })
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products')

  useEffect(() => {
    if (params.id) {
      fetchStoreData()
    }
  }, [params.id])

  const fetchStoreData = async () => {
    try {
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .eq('role', 'seller')
        .single()

      if (sellerError) throw sellerError
      setSeller(sellerData)

      // Fetch seller's products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, seller:profiles(id, full_name, store_name)')
        .eq('seller_id', params.id)
        .order('created_at', { ascending: false })

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Calculate stats
      const available = productsData?.filter(p => p.is_available).length || 0
      const sold = productsData?.filter(p => !p.is_available).length || 0
      setStats({ totalProducts: productsData?.length || 0, soldProducts: sold })

      // Fetch seller rating
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('seller_id', params.id)

      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        setRating({ average: Math.round(avg * 10) / 10, count: ratingsData.length })
      }

      // Fetch reviews with comments
      const { data: reviewsData } = await supabase
        .from('ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          buyer:profiles!ratings_buyer_id_fkey(id, full_name, avatar_url),
          order:orders(
            product:products(title)
          )
        `)
        .eq('seller_id', params.id)
        .order('created_at', { ascending: false })

      if (reviewsData) {
        setReviews(reviewsData as unknown as Review[])
      }
    } catch (error) {
      console.error('Error fetching store data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-thrift-white">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-thrift-gray" />
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-thrift-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <Store className="w-24 h-24 text-thrift-light mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-thrift-dark mb-2">Store Not Found</h1>
          <p className="text-thrift-gray">This store doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const availableProducts = products.filter(p => p.is_available)
  const soldProducts = products.filter(p => !p.is_available)

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />

      {/* Store Header */}
      <div className="bg-gradient-to-br from-thrift-dark to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
            {/* Store Avatar */}
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-2xl bg-white/10 overflow-hidden flex-shrink-0 border-4 border-white/20">
              {seller.avatar_url ? (
                <Image
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${seller.avatar_url}`}
                  alt={seller.store_name || seller.full_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="w-10 h-10 sm:w-16 sm:h-16 text-white/60" />
                </div>
              )}
            </div>

            {/* Store Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                {seller.store_name || seller.full_name}
              </h1>
              {seller.store_description && (
                <p className="text-white/80 mb-4 max-w-2xl text-sm sm:text-base line-clamp-2 sm:line-clamp-none">
                  {seller.store_description}
                </p>
              )}
              
              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4 mt-4">
                {rating && (
                  <button 
                    onClick={() => setActiveTab('reviews')}
                    className="flex items-center justify-center gap-1 sm:gap-2 bg-white/10 px-3 sm:px-4 py-2 rounded-xl hover:bg-white/20 transition-colors text-sm sm:text-base"
                  >
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">{rating.average}</span>
                    <span className="text-white/60 hidden sm:inline">({rating.count})</span>
                  </button>
                )}
                <div className="flex items-center justify-center gap-1 sm:gap-2 bg-white/10 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
                  <span className="font-bold">{stats.totalProducts}</span>
                  <span className="text-white/60 hidden sm:inline">Products</span>
                </div>
                <div className="flex items-center justify-center gap-1 sm:gap-2 bg-white/10 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
                  <span className="font-bold">{stats.soldProducts}</span>
                  <span className="text-white/60 hidden sm:inline">Sold</span>
                </div>
                <div className="flex items-center justify-center gap-1 sm:gap-2 bg-white/10 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base col-span-2 sm:col-span-1">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
                  <span className="text-white/60 text-xs sm:text-base">Joined {new Date(seller.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex gap-2 sm:gap-4 border-b border-thrift-light overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'products' 
                ? 'text-thrift-dark' 
                : 'text-thrift-gray hover:text-thrift-dark'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              Products
              <span className="text-xs sm:text-sm bg-thrift-light px-2 py-0.5 rounded-full">
                {products.length}
              </span>
            </div>
            {activeTab === 'products' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-thrift-dark" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 sm:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'reviews' 
                ? 'text-thrift-dark' 
                : 'text-thrift-gray hover:text-thrift-dark'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
              <Star className="w-4 h-4 sm:w-5 sm:h-5" />
              Reviews
              <span className="text-xs sm:text-sm bg-thrift-light px-2 py-0.5 rounded-full">
                {reviews.length}
              </span>
            </div>
            {activeTab === 'reviews' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-thrift-dark" />
            )}
          </button>
        </div>
      </div>

      {/* Products Section */}
      {activeTab === 'products' && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Available Products */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-thrift-dark">
              Available Products
              <span className="ml-2 text-base sm:text-lg font-normal text-thrift-gray">({availableProducts.length})</span>
            </h2>
          </div>

          {availableProducts.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <Package className="w-16 h-16 text-thrift-light mx-auto mb-4" />
              <p className="text-thrift-gray">No available products at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {availableProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Sold Products */}
        {soldProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-thrift-gray">
                Sold Items
                <span className="ml-2 text-base sm:text-lg font-normal text-thrift-gray">({soldProducts.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 opacity-60">
              {soldProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Reviews Section */}
      {activeTab === 'reviews' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Rating Summary */}
          {rating && (
            <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold text-thrift-dark mb-2">{rating.average}</div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(rating.average)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-thrift-gray text-sm">{rating.count} reviews</p>
                </div>
                <div className="flex-1 w-full">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviews.filter(r => r.rating === stars).length
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                    return (
                      <div key={stars} className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-thrift-gray w-3">{stars}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <div className="flex-1 h-2 bg-thrift-light rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-thrift-gray w-8">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-12 sm:py-16 glass rounded-2xl">
              <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-thrift-light mx-auto mb-4" />
              <p className="text-thrift-gray">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="glass rounded-2xl p-4 sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Reviewer Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-thrift-light overflow-hidden flex-shrink-0">
                      {review.buyer?.avatar_url ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${review.buyer.avatar_url}`}
                          alt={review.buyer.full_name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-thrift-gray font-semibold text-sm sm:text-base">
                          {review.buyer?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Review Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-thrift-dark text-sm sm:text-base">{review.buyer?.full_name || 'Anonymous'}</p>
                          <p className="text-xs text-thrift-gray truncate">
                            Purchased: {review.order?.product?.title || 'Unknown product'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                  star <= review.rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-thrift-gray whitespace-nowrap">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-thrift-gray leading-relaxed text-sm sm:text-base">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
