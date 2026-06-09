'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Compass, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface GreetingProps {
  displayName?: string
}

export function Greeting({ displayName }: GreetingProps) {
  const [greeting, setGreeting] = useState('Sugeng Enjang')
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 4 && hour < 11) {
      setGreeting('Sugeng Enjang')
    } else if (hour >= 11 && hour < 15) {
      setGreeting('Wilujeng Siang')
    } else if (hour >= 15 && hour < 18) {
      setGreeting('Sugeng Sonten')
    } else {
      setGreeting('Sugeng Dalu')
    }

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setShowNotificationPrompt(true)
      }
    }
  }, [])

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notification')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        toast.success('Notifications enabled! We will alert you at your work departure time.')
        setShowNotificationPrompt(false)
      } else {
        toast.warning('Notifications denied. You can manually enable them in your browser settings.')
        setShowNotificationPrompt(false)
      }
    } catch (err) {
      toast.error('Failed to request notification permission')
    }
  }

  const todayStr = format(new Date(), 'EEEE, d MMMM yyyy')

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-200/50 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {greeting}, {displayName || 'Kanca'} ^^
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider mt-0.5">
            Pranata Personal Dashboard
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-555 font-medium">
          <Calendar className="size-4 text-stone-400" />
          <span>{todayStr}</span>
        </div>
      </div>

      {showNotificationPrompt && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <Bell className="size-5 text-stone-900 dark:text-stone-100 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Enable Departure Reminders</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Grant permission so Pranata can alert you in real-time when it is time to depart for work.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleRequestPermission}
            className="bg-stone-900 hover:bg-stone-850 text-stone-50 text-xs py-1.5 px-4 h-auto shrink-0 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200 rounded-xl"
          >
            Allow Notifications
          </Button>
        </div>
      )}
    </div>
  )
}
