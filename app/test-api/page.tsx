'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testBackend = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Get current hostname
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
      const apiUrl = hostname !== 'localhost' && hostname !== '127.0.0.1' 
        ? `${protocol}//${hostname}:5000/api/health`
        : 'http://localhost:5000/api/health'

      console.log('🔍 Testing backend connection...')
      console.log('📍 Current hostname:', hostname)
      console.log('🔗 API URL:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      
      setResult({
        success: true,
        status: response.status,
        data,
        apiUrl,
        hostname,
      })
    } catch (error: any) {
      console.error('❌ Test failed:', error)
      setResult({
        success: false,
        error: error.message,
        apiUrl: typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.hostname}:5000/api/health`
          : 'unknown',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Backend Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testBackend} disabled={loading}>
            {loading ? 'Testing...' : 'Test Backend Connection'}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">{result.success ? '✅ Success' : '❌ Failed'}</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold mb-2">Debug Info:</h4>
            <ul className="text-sm space-y-1">
              <li>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</li>
              <li>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</li>
              <li>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</li>
              <li>Expected API URL: {typeof window !== 'undefined' 
                ? (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
                  : 'http://localhost:5000/api')
                : 'N/A'}
              </li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold mb-2">Troubleshooting:</h4>
            <ol className="text-sm list-decimal list-inside space-y-1">
              <li>Make sure backend is running: <code>cd Backend && yarn dev</code></li>
              <li>Backend should listen on <code>0.0.0.0:5000</code> (not localhost)</li>
              <li>Check Windows Firewall - port 5000 might be blocked</li>
              <li>Verify backend is accessible: Open <code>http://YOUR_IP:5000/api/health</code> in browser</li>
              <li>Check backend logs for CORS errors</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}








