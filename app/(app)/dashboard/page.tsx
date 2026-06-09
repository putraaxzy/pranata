import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Greeting } from '@/components/dashboard/greeting'
import { DepartureWidget } from '@/components/dashboard/departure-widget'
import { ScheduleList } from '@/components/dashboard/schedule-list'
import { TaskList } from '@/components/dashboard/task-list'
import { NotesList } from '@/components/dashboard/notes-list'
import { FinanceSummary } from '@/components/dashboard/finance-summary'
import { Compass, AlertTriangle, Play } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const currentMonthStr = format(new Date(), 'yyyy-MM-01')

    const [
      profileResult,
      schedulesResult,
      tasksResult,
      transactionsResult,
      notesResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('schedules').select('*').eq('user_id', user.id).eq('date', todayStr).order('time', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false }).limit(5),
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', currentMonthStr),
      supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3)
    ])

    const { data: profile, error: profileErr } = profileResult
    const { data: schedules, error: schedErr } = schedulesResult
    const { data: tasks, error: taskErr } = tasksResult
    const { data: transactions, error: txErr } = transactionsResult
    const { data: notes, error: noteErr } = notesResult

    if (profileErr) throw profileErr
    if (schedErr) throw schedErr
    if (taskErr) throw taskErr
    if (txErr) throw txErr
    if (noteErr) throw noteErr

    const departureSchedule = schedules?.find((s) => s.type === 'work_departure')

    let totalIncome = 0
    let totalExpense = 0
    transactions?.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += Number(tx.amount)
      } else {
        totalExpense += Number(tx.amount)
      }
    })
    const netBalance = totalIncome - totalExpense

    return (
      <div className="space-y-6">
        <Greeting displayName={profile?.display_name || user.email?.split('@')[0]} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <DepartureWidget schedule={departureSchedule} />

            <ScheduleList schedules={schedules || []} />

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
  } catch (err: any) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto px-4">
        <div className="p-3.5 rounded-full bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 mb-4">
          <AlertTriangle className="size-8 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Setup Required</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
          It looks like the Supabase database tables have not been created yet or there is an issue connecting to your project.
        </p>
        <div className="mt-6 border border-stone-200 bg-white p-4 rounded-xl text-left dark:border-stone-800 dark:bg-stone-900 w-full">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Instructions:</p>
          <ol className="list-decimal list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
            <li>Open the file <code className="bg-stone-100 px-1 py-0.5 rounded dark:bg-stone-800">supabase_schema.sql</code> at the project root.</li>
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
}
