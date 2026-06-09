'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileText,
  Coins,
  Bookmark,
  LogOut,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { TIMEZONES } from '@/lib/timezone'

interface NavigationProps {
  userEmail?: string
}

export function Navigation({ userEmail }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [timezone, setTimezone] = useState<string>('auto')
  const [telegramChatId, setTelegramChatId] = useState<string>('')
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone_setting, telegram_chat_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!error && data) {
        if (data.timezone_setting) setTimezone(data.timezone_setting)
        if (data.telegram_chat_id) setTelegramChatId(data.telegram_chat_id)
      }
    }
    fetchProfile()
  }, [supabase])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const connectTelegramId = params.get('connect_telegram')
    if (connectTelegramId) {
      const linkAccount = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ telegram_chat_id: connectTelegramId })
            .eq('user_id', session.user.id)
          if (error) throw error
          
          setTelegramChatId(connectTelegramId)
          toast.success('Successfully linked Telegram Bot!')
          
          await fetch('/api/telegram-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true }),
          })

          const url = new URL(window.location.href)
          url.searchParams.delete('connect_telegram')
          window.history.replaceState({}, '', url.pathname + url.search)
        } catch {
          toast.error('Failed to link Telegram Bot')
        }
      }
      linkAccount()
    }
  }, [supabase])

  const handleTelegramSave = async () => {
    setSavingTelegram(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error('You must be logged in')
      setSavingTelegram(false)
      return
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: telegramChatId.trim() || null })
        .eq('user_id', session.user.id)
      if (error) throw error
      toast.success('Telegram configuration saved!')
    } catch {
      toast.error('Failed to save Telegram Chat ID')
    } finally {
      setSavingTelegram(false)
    }
  }

  const handleTelegramTest = async () => {
    setTestingTelegram(true)
    try {
      const res = await fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Test message sent to Telegram!')
      } else {
        throw new Error(data.error || 'Failed to send test message')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleTimezoneChange = async (val: string) => {
    setTimezone(val)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone_setting: val })
        .eq('user_id', session.user.id)
      if (error) throw error
      toast.success('Timezone updated!')
      router.refresh()
    } catch {
      toast.error('Failed to save timezone')
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Logged out successfully')
      router.refresh()
      router.push('/auth')
    }
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'Todo', href: '/todo', icon: CheckSquare },
    { name: 'Notes', href: '/notes', icon: FileText },
    { name: 'Money', href: '/money', icon: Coins },
  ]

  const extraItems = [
    { name: 'Resource Vault', href: '/resources', icon: Bookmark },
  ]

  const isActive = (href: string) => {
    return pathname === href
  }

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:flex flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-stone-100 px-6 dark:border-stone-800">
          <Image src="/lg_pranata.png" width={20} height={20} className="size-5 dark:invert invert-0" alt="Pranata Logo" />
          <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Pranata
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/40 dark:hover:text-stone-100'
                  }`}
                >
                  <Icon className={`size-4 ${active ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'}`} />
                  {item.name}
                </Link>
              )
            })}
          </div>

          <div className="pt-6 border-t border-stone-100 dark:border-stone-800 mt-6">
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Utilities
            </span>
            <div className="space-y-1 mt-2">
              {extraItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50 font-semibold'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/40 dark:hover:text-stone-100'
                    }`}
                  >
                    <Icon className={`size-4 ${active ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-stone-100 p-4 dark:border-stone-800 space-y-4">
          <div className="px-2 py-1 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500">
              <Globe className="size-3" />
              <span>Timezone</span>
            </div>
            <select
              id="nav-timezone"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-stone-50 border border-stone-200 text-stone-800 rounded-lg dark:bg-stone-950 dark:border-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-stone-400 transition-colors"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="px-2 py-1 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500">
              <span>Telegram Bot</span>
            </div>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Enter Chat ID"
              className="w-full text-xs py-1.5 px-2 bg-stone-50 border border-stone-200 text-stone-800 rounded-lg dark:bg-stone-950 dark:border-stone-800 dark:text-stone-200 outline-none hover:border-stone-400 transition-colors"
            />
            <div className="flex gap-1.5 mt-1">
              <button
                type="button"
                onClick={handleTelegramSave}
                disabled={savingTelegram}
                className="flex-1 text-[10px] font-semibold py-1.5 bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200 rounded-lg transition-colors cursor-pointer text-center"
              >
                {savingTelegram ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleTelegramTest}
                disabled={testingTelegram || !telegramChatId.trim()}
                className="flex-1 text-[10px] font-semibold py-1.5 bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-850 dark:text-stone-200 dark:hover:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-800 transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingTelegram ? 'Testing...' : 'Test Bot'}
              </button>
            </div>
            <p className="text-[9px] text-stone-400 dark:text-stone-500 leading-normal pt-0.5">
              Message <a href="https://t.me/rogaq_bot" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600 dark:hover:text-stone-300">@rogaq_bot</a> to find your Chat ID.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {userEmail && (
              <div className="px-2 py-1 text-xs text-stone-500 dark:text-stone-400 truncate" title={userEmail}>
                Logged in as:<br />
                <span className="font-semibold text-stone-700 dark:text-stone-300">{userEmail.split('@')[0]}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>

            <div className="px-2 pt-2 text-[10px] text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800 mt-2 flex flex-col gap-0.5 font-sans leading-normal">
              <span>Open Source & Free</span>
              <span>
                By{' '}
                <a
                  href="https://github.com/putraaxzy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:text-stone-800 dark:hover:text-stone-300 transition-colors"
                >
                  @putraaxzy
                </a>
              </span>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-stone-200 bg-white/80 backdrop-blur-md pb-safe-bottom dark:border-stone-800 dark:bg-stone-900/80 flex items-center justify-around md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                active
                  ? 'text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

export function LogoutButton() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Logged out successfully')
      router.refresh()
      router.push('/auth')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      className="size-8 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-850"
      title="Sign Out"
    >
      <LogOut className="size-5" />
    </Button>
  )
}
