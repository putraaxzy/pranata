'use client'

import React, { useEffect, useState } from 'react'
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
  const supabase = createClient()
  const [timezone, setTimezone] = useState<string>('auto')

  useEffect(() => {
    const fetchTz = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone_setting')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!error && data?.timezone_setting) {
        setTimezone(data.timezone_setting)
      }
    }
    fetchTz()
  }, [supabase])

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
    const { error } = await supabase.auth.signOut()
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
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
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
