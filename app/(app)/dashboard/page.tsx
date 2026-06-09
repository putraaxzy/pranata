import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Greeting } from '@/components/dashboard/greeting'
import { DepartureWidget } from '@/components/dashboard/departure-widget'
import { ScheduleList } from '@/components/dashboard/schedule-list'
import { TaskList } from '@/components/dashboard/task-list'
import { NotesList } from '@/components/dashboard/notes-list'
import { FinanceSummary } from '@/components/dashboard/finance-summary'
import { Compass, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { getNow, getTodayStr } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let profile, schedules, tasks, transactions, notes
  let totalIncome = 0
  let totalExpense = 0
  let netBalance = 0
  let departureSchedule
  let tz = 'auto'

  try {
    const tempProfile = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
    profile = tempProfile.data
    tz = profile?.timezone_setting || 'auto'

    const todayStr = getTodayStr(tz)
    const todayDow = getNow(tz).getDay()
    const currentMonthStr = todayStr.substring(0, 8) + '01'

    const [
      schedulesResult,
      recurringSchedulesResult,
      tasksResult,
      transactionsResult,
      notesResult,
    ] = await Promise.all([
      supabase.from('schedules').select('*').eq('user_id', user.id).eq('date', todayStr).order('time', { ascending: true }),
      supabase.from('schedules').select('*').eq('user_id', user.id).eq('is_recurring', true).order('time', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false }).limit(5),
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', currentMonthStr),
      supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3)
    ])

    const { data: s, error: schedErr } = schedulesResult
    const { data: sr, error: recurSchedErr } = recurringSchedulesResult
    const { data: t, error: taskErr } = tasksResult
    const { data: tx, error: txErr } = transactionsResult
    const { data: n, error: noteErr } = notesResult

    if (schedErr) throw schedErr
    if (recurSchedErr) throw recurSchedErr
    if (taskErr) throw taskErr
    if (txErr) throw txErr
    if (noteErr) throw noteErr

    const todayRecurring = (sr || []).filter((item) => {
      const isDayMatched = item.recurring_days && item.recurring_days.includes(todayDow)
      const isStarted = !item.start_date || item.start_date <= todayStr
      const isNotEnded = !item.end_date || item.end_date >= todayStr
      const isNotExcluded = !item.exception_dates || !item.exception_dates.includes(todayStr)
      return isDayMatched && isStarted && isNotEnded && isNotExcluded
    })

    const datedIds = new Set((s || []).map((item) => item.id))
    const uniqueRecurring = todayRecurring.filter((item) => !datedIds.has(item.id))
    schedules = [...(s || []), ...uniqueRecurring]

    tasks = t
    transactions = tx
    notes = n

    departureSchedule = schedules?.find((item) => {
      if (item.type !== 'work_departure') return false
      if (item.is_recurring) {
        return !item.completed_dates || !item.completed_dates.includes(todayStr)
      }
      return !item.is_done
    })

    transactions?.forEach((item) => {
      if (item.type === 'income') {
        totalIncome += Number(item.amount)
      } else {
        totalExpense += Number(item.amount)
      }
    })
    netBalance = totalIncome - totalExpense
  } catch (err) {
    console.error('Dashboard data fetch error:', err)
    const errorObj = err as { message?: string }
    const errorMsg = errorObj?.message || (err instanceof Error ? err.message : String(err))
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto px-4">
        <div className="p-3.5 rounded-full bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 mb-4">
          <AlertTriangle className="size-8 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Setup Required</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
          It looks like the Supabase database tables have not been created yet or there is an issue connecting to your project.
        </p>
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-2.5 rounded-lg mt-3 w-full font-mono text-left overflow-x-auto">
          {errorMsg}
        </p>
        <div className="mt-6 border border-stone-200 bg-white p-4 rounded-xl text-left dark:border-stone-800 dark:bg-stone-900 w-full">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Instructions:</p>
          <ol className="list-decimal list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
            <li>Open the file <code className="bg-stone-100 px-1 py-0.5 rounded dark:bg-stone-800">supabase/schema.sql</code> at the project root.</li>
            <li>Copy the contents of the file.</li>
            <li>Go to your Supabase Dashboard &gt; SQL Editor.</li>
            <li>Paste and click <strong>Run</strong> to initialize database tables.</li>
          </ol>
        </div>
        <Link href="/auth" className="mt-6 text-sm font-semibold text-stone-900 hover:underline dark:text-stone-150">
          Back to Authentication
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Greeting displayName={profile?.display_name || user.email?.split('@')[0]} timezone={tz} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <DepartureWidget schedule={departureSchedule} />

          <ScheduleList schedules={schedules || []} timezone={tz} />

          <div className="border border-stone-200 bg-white p-4 rounded-xl dark:border-stone-800 dark:bg-stone-900 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400 mb-3 flex items-center gap-1.5">
              <Compass className="size-4 text-stone-900 dark:text-stone-100" />
              Quick Hub
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/schedule"
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-stone-100 bg-stone-50 hover:bg-stone-100 hover:border-stone-900 text-center dark:border-stone-850 dark:bg-stone-950 dark:hover:bg-stone-800/30 transition-all"
              >
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Schedule</span>
              </Link>
              <Link
                href="/todo"
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-stone-100 bg-stone-50 hover:bg-stone-100 hover:border-stone-900 text-center dark:border-stone-850 dark:bg-stone-950 dark:hover:bg-stone-800/30 transition-all"
              >
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Tasks</span>
              </Link>
              <Link
                href="/money"
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-stone-100 bg-stone-50 hover:bg-stone-100 hover:border-stone-900 text-center dark:border-stone-850 dark:bg-stone-950 dark:hover:bg-stone-800/30 transition-all"
              >
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Money</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <FinanceSummary income={totalIncome} expense={totalExpense} balance={netBalance} />

          <TaskList initialTasks={tasks || []} />

          <NotesList notes={notes || []} />
        </div>
      </div>
    </div>
  )
}
