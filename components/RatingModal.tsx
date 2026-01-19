'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Star, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  sellerId: string
  buyerId: string
  sellerName: string
  onRated?: () => void
}

export default function RatingModal({ isOpen, onClose, orderId, sellerId, buyerId, sellerName, onRated }: RatingModalProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          order_id: orderId,
          buyer_id: buyerId,
          seller_id: sellerId,
          rating,
          review: review.trim() || null
        })

      if (error) throw error

      // Send notification to seller
      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'order',
        title: 'New Rating Received',
        message: `You received a ${rating}-star rating${review ? ` with review: "${review.slice(0, 50)}${review.length > 50 ? '...' : ''}"` : ''}`,
        link: '/seller/dashboard'
      })

      toast.success('Thank you for your rating!')
      onRated?.()
      onClose()
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('You have already rated this order')
      } else {
        toast.error('Failed to submit rating')
      }
      console.error('Error submitting rating:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-thrift-light">
          <h3 className="font-semibold text-lg text-thrift-dark">Rate Your Experience</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-thrift-light rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-thrift-gray" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-center text-thrift-gray mb-4">
            How was your experience with <span className="font-semibold text-thrift-dark">{sellerName}</span>?
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-sm text-thrift-gray mb-4">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}

          {/* Review */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-thrift-dark mb-2">
              Write a review (optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with this seller..."
              rows={3}
              className="w-full px-4 py-3 border border-thrift-light rounded-xl focus:outline-none focus:ring-2 focus:ring-thrift-dark resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full py-3 bg-thrift-dark text-white rounded-xl font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Rating'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
