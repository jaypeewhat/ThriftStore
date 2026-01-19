'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Send, Loader2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Message {
  id: string
  order_id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  is_read: boolean
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  currentUserId: string
  otherUserId: string
  otherUserName: string
}

export default function ChatModal({ isOpen, onClose, orderId, currentUserId, otherUserId, otherUserName }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true)
      fetchMessages()
      markMessagesAsRead()
      
      // Subscribe to new messages using simpler channel approach
      const channel = supabase
        .channel(`chat-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `order_id=eq.${orderId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Message
              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                if (prev.some(m => m.id === newMsg.id)) {
                  return prev
                }
                return [...prev, newMsg]
              })
              if (newMsg.sender_id !== currentUserId) {
                markMessagesAsRead()
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, orderId, currentUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setSending(true)
    
    // Optimistic update - add message immediately to UI
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      order_id: orderId,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: messageContent,
      is_read: false,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimisticMessage])
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: messageContent
        })
        .select()
        .single()

      if (error) throw error
      
      // Replace optimistic message with real one
      if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      }

      // Send notification to the other user
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'message',
        title: 'New Message',
        message: `${otherUserName === 'Seller' ? 'Buyer' : otherUserName} sent you a message: "${messageContent.slice(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
        link: null // They can click to see their messages
      })
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(messageContent) // Restore message
      toast.error('Failed to send message')
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md h-[85vh] sm:h-[500px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-thrift-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-thrift-dark rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {otherUserName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-thrift-dark">{otherUserName}</h3>
              <p className="text-xs text-thrift-gray">Order #{orderId.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-thrift-light rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-thrift-gray" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-thrift-gray" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-thrift-gray">
              <MessageCircle className="w-12 h-12 mb-2" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      message.sender_id === currentUserId
                        ? 'bg-thrift-dark text-white rounded-br-sm'
                        : 'bg-thrift-light text-thrift-dark rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      message.sender_id === currentUserId ? 'text-gray-300' : 'text-thrift-gray'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-thrift-light">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-thrift-light rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-thrift-dark"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-thrift-dark text-white rounded-full hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
