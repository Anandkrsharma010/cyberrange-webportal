'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

let toastQueue: Toast[] = []
let setToasts: ((toasts: Toast[]) => void) | null = null

export function showToast(type: 'success' | 'error' | 'warning' | 'info', message: string) {
  const toast: Toast = {
    id: Math.random().toString(36).substr(2, 9),
    type,
    message
  }
  
  toastQueue.push(toast)
  if (setToasts) {
    setToasts([...toastQueue])
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== toast.id)
    if (setToasts) {
      setToasts([...toastQueue])
    }
  }, 5000)
}

export function ToastContainer() {
  const [toasts, setToastsState] = useState<Toast[]>([])
  
  useEffect(() => {
    setToasts = setToastsState
    return () => {
      setToasts = null
    }
  }, [])
  
  const removeToast = (id: string) => {
    toastQueue = toastQueue.filter(t => t.id !== id)
    setToastsState([...toastQueue])
  }
  
  if (toasts.length === 0) return null
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center p-4 rounded-lg shadow-lg max-w-sm ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' :
            toast.type === 'error' ? 'bg-red-50 border border-red-200' :
            toast.type === 'info' ? 'bg-blue-50 border border-blue-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mr-3" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600 mr-3" />}
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />}
          {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600 mr-3" />}
          
          <span className={`flex-1 text-sm ${
            toast.type === 'success' ? 'text-green-800' :
            toast.type === 'error' ? 'text-red-800' :
            toast.type === 'info' ? 'text-blue-800' :
            'text-yellow-800'
          }`}>
            {toast.message}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-2"
            onClick={() => removeToast(toast.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
