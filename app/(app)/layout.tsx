import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation, LogoutButton } from '@/components/nav'
import { QuickAddFab } from '@/components/quick-add-fab'
import { NotificationListener } from '@/components/notification-listener'
import { Bookmark } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50 dark:bg-stone-950">
      <Navigation userEmail={user.email} />

      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-stone-200 bg-white/80 backdrop-blur-md px-4 dark:border-stone-800 dark:bg-stone-900/80 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/lg_pranata.png" width={20} height={20} className="size-5 dark:invert invert-0" alt="Pranata Logo" />
            <span className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Pranata
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/resources"
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 p-1 flex items-center justify-center size-8"
              title="Resource Vault"
            >
              <Bookmark className="size-5" />
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-8 p-4 md:p-8 overflow-y-auto max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      <QuickAddFab />

      <NotificationListener />
    </div>
  )
}
