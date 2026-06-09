import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTodayStr, getNow, getMomentInTimezone } from '@/lib/timezone'
import { differenceInSeconds } from 'date-fns'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

interface ScheduleItem {
  id: string
  title: string
  time?: string
  type: string
  location?: string
  notes?: string
  is_recurring: boolean
  completed_dates?: string[]
  reminder_minutes?: number
  calculated_departure_time?: string
  work_start_time?: string
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!supabaseUrl || !supabaseServiceKey || !botToken) {
      return NextResponse.json(
        { error: 'Server configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, telegram_chat_id, timezone_setting, display_name')
      .not('telegram_chat_id', 'is', null)

    if (profilesError || !profiles) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError },
        { status: 500 }
      )
    }

    const now = new Date()
    const notificationsSent: Array<{ chat_id: string; title: string }> = []

    const sendTelegram = async (chatId: string, text: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      })
    }

    for (const profile of profiles) {
      const chatId = profile.telegram_chat_id
      if (!chatId) continue

      const tz = profile.timezone_setting || 'auto'
      const todayStr = getTodayStr(tz)
      const todayDow = getNow(tz).getDay()

      const [datedResult, recurringResult] = await Promise.all([
        supabase
          .from('schedules')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('is_done', false)
          .eq('date', todayStr),
        supabase
          .from('schedules')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('is_recurring', true)
      ])

      const datedSchedules = datedResult.data || []
      const recurringSchedules = (recurringResult.data || []).filter((s) => {
        const isDayMatched = s.recurring_days && s.recurring_days.includes(todayDow)
        const isStarted = !s.start_date || s.start_date <= todayStr
        const isNotEnded = !s.end_date || s.end_date >= todayStr
        const isNotExcluded = !s.exception_dates || !s.exception_dates.includes(todayStr)
        const isNotCompleted = !s.completed_dates || !s.completed_dates.includes(todayStr)
        return isDayMatched && isStarted && isNotEnded && isNotExcluded && isNotCompleted
      })

      const datedIds = new Set(datedSchedules.map((s) => s.id))
      const uniqueRecurring = recurringSchedules.filter((s) => !datedIds.has(s.id))
      const allSchedules: ScheduleItem[] = [...datedSchedules, ...uniqueRecurring]

      for (const sched of allSchedules) {
        if (sched.type === 'work_departure' && sched.calculated_departure_time) {
          const departureTime = getMomentInTimezone(sched.calculated_departure_time, todayStr, tz)
          const diffSec = differenceInSeconds(departureTime, now)

          if (diffSec >= 0 && diffSec < 60) {
            const title = '🚗 Time to Leave for Work!'
            const body = `"${sched.title}" starts at ${sched.work_start_time}. Depart now to arrive on time!`
            await sendTelegram(chatId, `<b>${title}</b>\n\n${body}`)
            notificationsSent.push({ chat_id: chatId, title })
          }
        }

        if (sched.reminder_minutes && sched.reminder_minutes > 0 && sched.time) {
          const eventTimeStr = sched.time.includes(' - ') ? sched.time.split(' - ')[0] : sched.time
          const eventTime = getMomentInTimezone(eventTimeStr, todayStr, tz)

          const reminderTime = new Date(eventTime.getTime() - sched.reminder_minutes * 60 * 1000)
          const diffSec = differenceInSeconds(reminderTime, now)

          if (diffSec >= 0 && diffSec < 60) {
            const recurringLabel = sched.is_recurring ? ` (${DAY_LABELS[todayDow]})` : ''
            const reminderLabel = sched.reminder_minutes >= 60
              ? `${sched.reminder_minutes / 60} hour(s)`
              : `${sched.reminder_minutes} minutes`

            const title = `🔔 Upcoming: ${sched.title}${recurringLabel}`
            const body = `Starting in ${reminderLabel} at ${eventTimeStr}.`
            await sendTelegram(chatId, `<b>${title}</b>\n\n${body}`)
            notificationsSent.push({ chat_id: chatId, title })
          }
        }
      }
    }

    return NextResponse.json({ success: true, dispatched: notificationsSent.length, details: notificationsSent })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
