'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Upload, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Others']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']
const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair']

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: CATEGORIES[0],
    size: SIZES[2],
    condition: CONDITIONS[0],
    is_available: true,
  })

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (data.seller_id !== user?.id) {
        toast.error('Unauthorized')
        router.push('/seller/dashboard')
        return
      }

      setFormData({
        title: data.title,
        description: data.description,
        price: data.price.toString(),
        category: data.category,
        size: data.size,
        condition: data.condition,
        is_available: data.is_available,
      })

      setExistingImages(data.images || [])
      
      // Load existing image previews
      const previews = await Promise.all(
        (data.images || []).map(async (imagePath: string) => {
          const { data: publicData } = supabase.storage
            .from('products')
            .getPublicUrl(imagePath)
          return publicData.publicUrl
        })
      )
      setImagePreviews(previews)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load product')
      router.push('/seller/dashboard')
    } finally {
      setFetching(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalImages = existingImages.length + images.length + files.length
    
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }
    
    setImages([...images, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeExistingImage = async (index: number) => {
    const imagePath = existingImages[index]
    
    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('products')
        .remove([imagePath])
      
      if (error) throw error
      
      setExistingImages(existingImages.filter((_, i) => i !== index))
      setImagePreviews(imagePreviews.filter((_, i) => i !== index))
      toast.success('Image removed')
    } catch (error: any) {
      toast.error('Failed to remove image')
    }
  }

  const removeNewImage = (index: number) => {
    const newImageIndex = index - existingImages.length
    setImages(images.filter((_, i) => i !== newImageIndex))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const uploadNewImages = async () => {
    const uploadedPaths: string[] = []
    
    for (const image of images) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${user!.id}-${Date.now()}-${Math.random()}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('products')
        .upload(fileName, image)
      
      if (error) throw error
      uploadedPaths.push(fileName)
    }
    
    return uploadedPaths
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (existingImages.length === 0 && images.length === 0) {
      toast.error('Please add at least one image')
      return
    }
    
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('You must be logged in')
        router.push('/auth/login')
        return
      }
      
      // Upload new images
      const newImagePaths = await uploadNewImages()
      const allImages = [...existingImages, ...newImagePaths]
      
      // Update product
      const { error } = await supabase
        .from('products')
        .update({
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          size: formData.size,
          condition: formData.condition,
          images: allImages,
          is_available: formData.is_available,
        })
        .eq('id', params.id)
      
      if (error) throw error
      
      toast.success('Product updated successfully!')
      router.push('/seller/dashboard')
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update product')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-thrift-white">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-thrift-gray" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-thrift-dark mb-6">Edit Product</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-thrift-dark mb-2">
                Product Images (Max 5)
              </label>
              <div className="grid grid-cols-5 gap-4 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => index < existingImages.length ? removeExistingImage(index) : removeNewImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(existingImages.length + images.length) < 5 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-thrift-gray transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-gray-400" />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                placeholder="e.g., Vintage Denim Jacket"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                placeholder="Describe your item..."
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                required
              >
                {SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                required
              >
                {CONDITIONS.map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            {/* Availability */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_available"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="w-4 h-4 text-thrift-gray border-gray-300 rounded focus:ring-thrift-gray"
              />
              <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                Available for sale
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/seller/dashboard')}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
