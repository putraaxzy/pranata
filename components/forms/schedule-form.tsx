'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  type: z.enum(['general', 'work', 'study', 'workout', 'work_departure']),
  location: z.string().optional(),
  notes: z.string().optional(),
  work_start_time: z.string().optional().or(z.literal('')),
  travel_duration_minutes: z.number().min(0),
  traffic_buffer_minutes: z.number().min(0),
}).refine(data => {
  if (data.endTime && !data.startTime) {
    return false
  }
  return true
}, {
  message: "Start time is required if end time is set",
  path: ["startTime"]
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

interface ScheduleFormProps {
  onSuccess?: () => void
  initialValues?: Partial<ScheduleFormValues> & { id?: string; time?: string }
}

export function ScheduleForm({ onSuccess, initialValues }: ScheduleFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const initialTime = initialValues?.time || ''
  const hasRange = initialTime.includes(' - ')
  const initialStartTime = hasRange ? initialTime.split(' - ')[0] : initialTime
  const initialEndTime = hasRange ? initialTime.split(' - ')[1] : ''

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
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
    },
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const workStartTime = useWatch({ control: form.control, name: 'work_start_time' })
  const travelMins = useWatch({ control: form.control, name: 'travel_duration_minutes' })
  const bufferMins = useWatch({ control: form.control, name: 'traffic_buffer_minutes' })

  const [calcDeparture, setCalcDeparture] = useState('')

  useEffect(() => {
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
        setCalcDeparture(`${h}:${m}`)
      } else {
        setCalcDeparture('')
      }
    } else {
      setCalcDeparture('')
    }
  }, [type, workStartTime, travelMins, bufferMins])

  const onSubmit = async (values: ScheduleFormValues) => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        toast.error('You must be logged in to manage schedules')
        setLoading(false)
        return
      }

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
        const { error } = await supabase
          .from('schedules')
          .update(payload)
          .eq('id', initialValues.id)

        if (error) throw error
        toast.success('Schedule updated successfully!')
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert(payload)

        if (error) throw error
        toast.success('Schedule added successfully!')
      }

      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sched-title">Title</Label>
        <Input
          id="sched-title"
          placeholder="Schedule title (e.g. Daily Standup)"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sched-date">Date</Label>
          <Input
            id="sched-date"
            type="date"
            {...form.register('date')}
          />
          {form.formState.errors.date && (
            <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sched-type">Type</Label>
          <Select
            onValueChange={(value) => form.setValue('type', value as any)}
            defaultValue={form.getValues('type')}
          >
            <SelectTrigger id="sched-type">
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
      </div>

      {type !== 'work_departure' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sched-start-time">Start Time (Optional)</Label>
              <Input
                id="sched-start-time"
                type="time"
                {...form.register('startTime')}
              />
              {form.formState.errors.startTime && (
                <p className="text-xs text-red-500">{form.formState.errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-end-time">End Time (Optional)</Label>
              <Input
                id="sched-end-time"
                type="time"
                {...form.register('endTime')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sched-location">Location (Optional)</Label>
            <Input
              id="sched-location"
              placeholder="e.g. Office Room 3"
              {...form.register('location')}
            />
          </div>
        </div>
      ) : (
        <div className="border border-stone-200 bg-stone-50/50 p-4 rounded-lg space-y-4 dark:border-stone-800 dark:bg-stone-900/40">
          <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Work Departure Parameters</h4>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="sched-work-start" className="text-xs">Work Start</Label>
              <Input
                id="sched-work-start"
                type="time"
                {...form.register('work_start_time')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-travel" className="text-xs">Travel (mins)</Label>
              <Input
                id="sched-travel"
                type="number"
                {...form.register('travel_duration_minutes', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-buffer" className="text-xs">Buffer (mins)</Label>
              <Input
                id="sched-buffer"
                type="number"
                {...form.register('traffic_buffer_minutes', { valueAsNumber: true })}
              />
            </div>
          </div>

          {calcDeparture && (
            <div className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between border-t border-stone-200/50 pt-2 mt-2 dark:border-stone-800">
              <span>Calculated Departure Time:</span>
              <span className="text-stone-900 dark:text-stone-100 font-bold text-base">{calcDeparture}</span>
            </div>
          )}
        </div>
      )}

      {type !== 'work_departure' && (
        <div className="space-y-2">
          <Label htmlFor="sched-notes">Notes (Optional)</Label>
          <Textarea
            id="sched-notes"
            placeholder="Additional details..."
            {...form.register('notes')}
            className="min-h-[80px]"
          />
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Schedule' : 'Add Schedule'}
      </Button>
    </form>
  )
}
