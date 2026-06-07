'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import logger from './logger'
import { toLab, Lab } from './labs'
import { api } from './api'

interface LabContextType {
  labs: Lab[]
  isLoading: boolean
  error: string | null
  refreshLabs: () => Promise<void>
  getLabById: (id: string) => Lab | undefined
}

const LabContext = createContext<LabContextType | undefined>(undefined)

export function LabProvider({ children }: { children: ReactNode }) {
  const [labs, setLabs] = useState<Lab[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshLabs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Do not call protected backend endpoints before login.
      const token = typeof window !== 'undefined' ? localStorage.getItem('cystar_token') : null
      if (!token) {
        setLabs([])
        setIsLoading(false)
        return
      }
      const catalog = await api.catalogLabs()
      const labsData = catalog.map(toLab)
      setLabs(labsData)
    } catch (err) {
      logger.error('Error fetching labs:', err)
      setError('Failed to fetch labs')
    } finally {
      setIsLoading(false)
    }
  }

  const getLabById = (id: string): Lab | undefined => {
    return labs.find(lab => lab.id === id)
  }

  useEffect(() => {
    refreshLabs()
  }, [])

  return (
    <LabContext.Provider value={{
      labs,
      isLoading,
      error,
      refreshLabs,
      getLabById
    }}>
      {children}
    </LabContext.Provider>
  )
}

export function useLabs() {
  const context = useContext(LabContext)
  if (context === undefined) {
    throw new Error('useLabs must be used within a LabProvider')
  }
  return context
}
