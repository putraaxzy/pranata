'use client'

import React, { useState } from 'react'
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const timezones = [
  { id: 'Asia/Jakarta', label: 'Asia/Jakarta' },
  { id: 'Asia/Makassar', label: 'Asia/Makassar' },
  { id: 'Asia/Jayapura', label: 'Asia/Jayapura' },
  { id: 'UTC', label: 'UTC' },
]

const parseScheduleLine = (line: string) => {
  const parts = line.split(' ')
  if (parts[1] === '-') {
    return { time: `${parts[0]} - ${parts[2]}`, title: parts.slice(3).join(' ') }
  }
  return { time: parts[0], title: parts.slice(1).join(' ') }
}

const REMINDER_OPTIONS = [
  { value: '0', label: 'No Reminder' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
]

const scheduleBaseSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional().or(z.literal('')),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  type: z.enum(['general', 'work', 'study', 'workout', 'work_departure']),
  location: z.string().optional(),
  notes: z.string().optional(),
  work_start_time: z.string().optional().or(z.literal('')),
  travel_duration_minutes: z.number().min(0),
  traffic_buffer_minutes: z.number().min(0),
  is_recurring: z.boolean().default(false),
  recurring_days: z.array(z.number()).default([]),
  timezone: z.string().min(1, 'Timezone is required'),
  end_date: z.string().optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  exception_dates: z.string().optional().or(z.literal('')),
  is_bulk: z.boolean().default(false),
  reminder_minutes: z.number().optional(),
})

const scheduleSchema = scheduleBaseSchema
  .refine(data => {
    if (!data.is_bulk && data.endTime && !data.startTime) return false
    return true
  }, { message: 'Start time is required if end time is set', path: ['startTime'] })
  .refine(data => {
    if (!data.is_bulk && !data.is_recurring && !data.date) return false
    return true
  }, { message: 'Date is required for non-recurring events', path: ['date'] })
  .refine(data => {
    if (data.is_recurring && data.recurring_days.length === 0) return false
    return true
  }, { message: 'Select at least one day for recurring events', path: ['recurring_days'] })
  .refine(data => {
    if (data.is_recurring && data.start_date && data.end_date) {
      return data.start_date <= data.end_date
    }
    return true
  }, { message: 'Start date must be before or equal to end date', path: ['start_date'] })

type ScheduleFormValues = z.output<typeof scheduleBaseSchema>

interface ScheduleFormProps {
  onSuccess?: () => void
  initialValues?: Partial<Omit<ScheduleFormValues, 'date' | 'location' | 'notes' | 'work_start_time' | 'travel_duration_minutes' | 'traffic_buffer_minutes' | 'recurring_days' | 'reminder_minutes' | 'exception_dates' | 'start_date' | 'end_date'>> & {
    id?: string
    time?: string
    date?: string | null
    location?: string | null
    notes?: string | null
    work_start_time?: string | null
    travel_duration_minutes?: number | null
    traffic_buffer_minutes?: number | null
    recurring_days?: number[] | null
    reminder_minutes?: number | null
    start_date?: string | null
    end_date?: string | null
    exception_dates?: string[] | null
  }
}


export function ScheduleForm({ onSuccess, initialValues }: ScheduleFormProps) {
  const [loading, setLoading] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const supabase = createClient()

  const initialTime = initialValues?.time || ''
  const hasRange = initialTime.includes(' - ')
  const initialStartTime = hasRange ? initialTime.split(' - ')[0] : initialTime
  const initialEndTime = hasRange ? initialTime.split(' - ')[1] : ''

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: {
      title: initialValues?.title || '',
      date: initialValues?.date || new Date().toISOString().split('T')[0],
      startTime: initialStartTime,
      endTime: initialEndTime,
      type: initialValues?.type || 'general',
      location: initialValues?.location || '',
      notes: initialValues?.notes || '',
      work_start_time: initialValues?.work_start_time || '08:00',
      travel_duration_minutes: initialValues?.travel_duration_minutes ?? 25,
      traffic_buffer_minutes: initialValues?.traffic_buffer_minutes ?? 15,
      is_recurring: initialValues?.is_recurring || false,
      recurring_days: initialValues?.recurring_days || [],
      timezone: initialValues?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      end_date: initialValues?.end_date || '',
      start_date: initialValues?.start_date || '',
      exception_dates: initialValues?.exception_dates?.join(', ') || '',
      reminder_minutes: initialValues?.reminder_minutes != null ? initialValues.reminder_minutes : undefined
    },
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const workStartTime = useWatch({ control: form.control, name: 'work_start_time' })
  const travelMins = useWatch({ control: form.control, name: 'travel_duration_minutes' })
  const bufferMins = useWatch({ control: form.control, name: 'traffic_buffer_minutes' })
  const isRecurring = useWatch({ control: form.control, name: 'is_recurring' })
  const currentDays = useWatch({ control: form.control, name: 'recurring_days' }) || []

  let calcDeparture = ''
  if (type === 'work_departure' && workStartTime) {
    const tMins = Number(travelMins) || 0
    const bMins = Number(bufferMins) || 0
    const [hoursStr, minutesStr] = workStartTime.split(':')
    const hours = parseInt(hoursStr, 10)
    const minutes = parseInt(minutesStr, 10)
    if (!isNaN(hours) && !isNaN(minutes)) {
      const dateObj = new Date()
      dateObj.setHours(hours, minutes, 0, 0)
      dateObj.setMinutes(dateObj.getMinutes() - (tMins + bMins))
      const h = String(dateObj.getHours()).padStart(2, '0')
      const m = String(dateObj.getMinutes()).padStart(2, '0')
      calcDeparture = `${h}:${m}`
    }
  }

  const toggleRecurringDay = (day: number) => {
    const current = form.getValues('recurring_days')
    if (current.includes(day)) {
      form.setValue('recurring_days', current.filter(d => d !== day), { shouldValidate: true })
    } else {
      form.setValue('recurring_days', [...current, day].sort(), { shouldValidate: true })
    }
  }

  const onSubmit: SubmitHandler<ScheduleFormValues> = async (values) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        toast.error('You must be logged in to manage schedules')
        setLoading(false)
        return
      }

      const cleanExceptionDates = values.exception_dates
        ? values.exception_dates.split(',').map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        : null

      if (isBulkMode) {
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
        if (lines.length === 0) {
          toast.error('Please enter at least one schedule item')
          setLoading(false)
          return
        }

        const payloads = lines.map(line => {
          const parsed = parseScheduleLine(line)
          return {
            title: parsed?.title || 'Untitled Event',
            date: values.is_recurring ? null : (values.date || null),
            time: values.type === 'work_departure' ? calcDeparture : (parsed?.time || null),
            type: values.type,
            location: values.location || null,
            notes: values.notes || null,
            work_start_time: values.type === 'work_departure' ? (values.work_start_time || null) : null,
            travel_duration_minutes: values.type === 'work_departure' ? (Number(values.travel_duration_minutes) || 0) : null,
            traffic_buffer_minutes: values.type === 'work_departure' ? (Number(values.traffic_buffer_minutes) || 0) : null,
            calculated_departure_time: values.type === 'work_departure' ? calcDeparture : null,
            is_done: false,
            is_recurring: values.is_recurring,
            recurring_days: values.is_recurring ? values.recurring_days : null,
            reminder_minutes: values.reminder_minutes && values.reminder_minutes > 0 ? values.reminder_minutes : null,
            start_date: values.is_recurring ? (values.start_date || null) : null,
            end_date: values.is_recurring ? (values.end_date || null) : null,
            exception_dates: values.is_recurring ? (cleanExceptionDates && cleanExceptionDates.length > 0 ? cleanExceptionDates : null) : null,
            user_id: user.id,
          }
        })

        const { error } = await supabase.from('schedules').insert(payloads)
        if (error) throw error
        toast.success(`Successfully imported ${payloads.length} events!`)
      } else {
        const timeStr = values.startTime
          ? (values.endTime ? `${values.startTime} - ${values.endTime}` : values.startTime)
          : null

        const payload = {
          title: values.title,
          date: values.date,
          time: values.type === 'work_departure' ? calcDeparture : timeStr,
          type: values.type,
          location: values.location || null,
          notes: values.notes || null,
          work_start_time: values.type === 'work_departure' ? (values.work_start_time || null) : null,
          travel_duration_minutes: values.type === 'work_departure' ? (Number(values.travel_duration_minutes) || 0) : null,
          traffic_buffer_minutes: values.type === 'work_departure' ? (Number(values.traffic_buffer_minutes) || 0) : null,
          calculated_departure_time: values.type === 'work_departure' ? calcDeparture : null,
          user_id: user.id,
        }

        if (initialValues?.id) {
          const { error } = await supabase.from('schedules').update(payload).eq('id', initialValues.id)
          if (error) throw error
          toast.success('Schedule updated successfully!')
        } else {
          const { error } = await supabase.from('schedules').insert(payload)
          if (error) throw error
          toast.success('Schedule added successfully!')
        }
      }

      if (onSuccess) onSuccess()
    } catch (error) {
      const errorObj = error as { message?: string }
      const msg = errorObj?.message || (error instanceof Error ? error.message : String(error))
      toast.error(msg || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {!initialValues?.id && (
        <div className="flex rounded-lg bg-stone-100 p-1 dark:bg-stone-850">
          <button
            type="button"
            onClick={() => { setIsBulkMode(false); form.setValue('is_bulk', false) }}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${!isBulkMode
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-50'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
          >
            Single Event
          </button>
          <button
            type="button"
            onClick={() => { setIsBulkMode(true); form.setValue('is_bulk', true) }}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${isBulkMode
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-50'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
          >
            Bulk Paste
          </button>
        </div>
      )}

      {isBulkMode ? (
        <div className="space-y-1.5">
          <Label htmlFor="bulk-text" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Schedule List</Label>
          <Textarea
            id="bulk-text"
            rows={6}
            placeholder="06.15 - 06.30 Shower&#10;06.30 - 06.45 Breakfast&#10;06.45 Depart to Work"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="font-mono text-sm rounded-lg"
          />
          <p className="text-[10px] text-stone-400 leading-tight">Supports: HH.MM - HH.MM, HH:MM, or text-only (one per line).</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="sched-title" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Title</Label>
          <Input
            id="sched-title"
            placeholder="Schedule title (e.g. Daily Standup)"
            {...form.register('title')}
            className="h-10 rounded-lg"
          />
          {form.formState.errors.title && (
            <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div>
          <Label htmlFor="sched-recurring-toggle" className="text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">Recurring Weekly</Label>
          <p className="text-[10px] text-stone-400 mt-0.5">Repeat event on specific days every week</p>
        </div>
        <button
          id="sched-recurring-toggle"
          type="button"
          role="switch"
          aria-checked={isRecurring}
          onClick={() => form.setValue('is_recurring', !isRecurring, { shouldValidate: true })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${isRecurring ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700'
            }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-stone-900 transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'
              }`}
          />
        </button>
      </div>

      {isRecurring && (
        <div className="space-y-4 border-l-2 border-stone-200 dark:border-stone-800 pl-4 py-1">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Active Days</Label>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleRecurringDay(idx)}
                  className={`text-[10px] font-semibold py-2 rounded-lg border transition-all ${currentDays.includes(idx)
                    ? 'bg-stone-900 text-stone-50 border-stone-900 dark:bg-stone-100 dark:text-stone-950 dark:border-stone-100 shadow-sm'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-700 dark:hover:border-stone-500'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.formState.errors.recurring_days && (
              <p className="text-xs text-red-500">{String(form.formState.errors.recurring_days.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched-start-date" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Start Date (Optional)</Label>
              <Input
                id="sched-start-date"
                type="date"
                {...form.register('start_date')}
                className="h-9 rounded-lg text-xs"
              />
              {form.formState.errors.start_date && (
                <p className="text-xs text-red-500">{form.formState.errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-end-date" className="text-xs font-semibold text-stone-700 dark:text-stone-300">End Date (Optional)</Label>
              <Input
                id="sched-end-date"
                type="date"
                {...form.register('end_date')}
                className="h-9 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-exceptions" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Skip Dates (Optional)</Label>
            <Input
              id="sched-exceptions"
              placeholder="e.g. 2026-06-12, 2026-06-15"
              {...form.register('exception_dates')}
              className="h-9 rounded-lg text-xs"
            />
            <p className="text-[9px] text-stone-400 leading-tight">Comma-separated dates (YYYY-MM-DD)</p>
          </div>
        </div>
      )}

      {!isRecurring && (
        <div className="space-y-1.5">
          <Label htmlFor="sched-date" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Date</Label>
          <Input
            id="sched-date"
            type="date"
            {...form.register('date')}
            className="h-10 rounded-lg text-sm"
          />
          {form.formState.errors.date && (
            <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-type" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Type</Label>
          <Select
            onValueChange={(value) => form.setValue('type', value as ScheduleFormValues['type'])}
            defaultValue={form.getValues('type')}
          >
            <SelectTrigger id="sched-type" className="h-10 rounded-lg text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="study">Study</SelectItem>
              <SelectItem value="workout">Workout</SelectItem>
              <SelectItem value="work_departure">Work Departure</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sched-reminder" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Reminder</Label>
          <Select
            onValueChange={(value) => form.setValue('reminder_minutes', Number(value))}
            defaultValue={String(form.getValues('reminder_minutes') ?? 0)}
          >
            <SelectTrigger id="sched-reminder" className="h-10 rounded-lg text-sm">
              <SelectValue placeholder="Select reminder" />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sched-timezone" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Timezone</Label>
        <div className="flex gap-2">
          <Select
            onValueChange={(value) => { if (value) form.setValue('timezone', value) }}
            value={form.watch('timezone') ?? ''}
          >
            <SelectTrigger id="sched-timezone" className="flex-1 h-10 rounded-lg text-sm">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map(tz => (
                <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => form.setValue('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)}
            className="shrink-0 text-xs px-2 h-10 rounded-lg"
            title="Auto-detect local timezone"
          >
            Auto
          </Button>
        </div>
        {form.formState.errors.timezone && (
          <p className="text-xs text-red-500">{form.formState.errors.timezone.message}</p>
        )}
      </div>

      {type !== 'work_departure' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched-start-time" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Start Time (Optional)</Label>
              <Input
                id="sched-start-time"
                type="time"
                {...form.register('startTime')}
                className="h-10 rounded-lg text-sm"
              />
              {form.formState.errors.startTime && (
                <p className="text-xs text-red-500">{form.formState.errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-end-time" className="text-xs font-semibold text-stone-700 dark:text-stone-300">End Time (Optional)</Label>
              <Input
                id="sched-end-time"
                type="time"
                {...form.register('endTime')}
                className="h-10 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-location" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Location (Optional)</Label>
            <Input
              id="sched-location"
              placeholder="e.g. Office Room 3"
              {...form.register('location')}
              className="h-10 rounded-lg text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-notes" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Notes (Optional)</Label>
            <Textarea
              id="sched-notes"
              placeholder="Additional details..."
              {...form.register('notes')}
              className="min-h-[80px] rounded-lg text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="border-l-2 border-stone-900 bg-stone-50/50 p-4 rounded-r-lg space-y-4 dark:border-stone-100 dark:bg-stone-900/40">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">Work Departure Parameters</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-work-start" className="text-[10px] font-semibold text-stone-600 dark:text-stone-400">Work Start</Label>
              <Input
                id="sched-work-start"
                type="time"
                {...form.register('work_start_time')}
                className="h-9 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-travel" className="text-[10px] font-semibold text-stone-600 dark:text-stone-400">Travel (mins)</Label>
              <Input
                id="sched-travel"
                type="number"
                {...form.register('travel_duration_minutes', { valueAsNumber: true })}
                className="h-9 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-buffer" className="text-[10px] font-semibold text-stone-600 dark:text-stone-400">Buffer (mins)</Label>
              <Input
                id="sched-buffer"
                type="number"
                {...form.register('traffic_buffer_minutes', { valueAsNumber: true })}
                className="h-9 rounded-lg text-xs"
              />
            </div>
          </div>
          {calcDeparture && (
            <div className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between border-t border-stone-200/50 pt-2.5 mt-2.5 dark:border-stone-800">
              <span>Calculated Departure:</span>
              <span className="text-stone-900 dark:text-stone-100 font-bold text-sm">{calcDeparture}</span>
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2 rounded-lg font-semibold"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Schedule' : 'Add Schedule'}
      </Button>
    </form>
  )
}