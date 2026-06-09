'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, Trash2, Edit2, Plus, Compass, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScheduleForm } from '@/components/forms/schedule-form'
import { toast } from 'sonner'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'

interface Schedule {
  id: string
  title: string
  date: string
  time?: string
  type: 'general' | 'work' | 'study' | 'workout' | 'work_departure'
  location?: string
  notes?: string
  work_start_time?: string
  travel_duration_minutes?: number
  traffic_buffer_minutes?: number
  calculated_departure_time?: string
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const supabase = useMemo(() => createClient(), [])

  const fetchSchedules = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (error) throw error
      setSchedules(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchedules()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchSchedules])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      toast.success('Schedule deleted successfully')
      setSchedules(prev => prev.filter(s => s.id !== deletingId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to delete schedule')
    } finally {
      setDeletingId(null)
    }
  }

  const getScheduleBadge = (type: string) => {
    switch (type) {
      case 'work':
      case 'work_departure':
        return 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 font-semibold'
      case 'study':
        return 'bg-stone-100 text-stone-900 dark:bg-stone-850 dark:text-stone-100'
      case 'workout':
        return 'bg-stone-100 text-stone-900 dark:bg-stone-850 dark:text-stone-100'
      default:
        return 'bg-stone-100 text-stone-755 dark:bg-stone-800 dark:text-stone-300'
    }
  }

  const groupSchedulesByDate = () => {
    const groups: { [key: string]: Schedule[] } = {}
    schedules.forEach(s => {
      if (!groups[s.date]) {
        groups[s.date] = []
      }
      groups[s.date].push(s)
    })
    return groups
  }

  const formatGroupHeader = (dateStr: string) => {
    const parsedDate = parseISO(dateStr)
    if (isToday(parsedDate)) {
      return `Today — ${format(parsedDate, 'MMMM d, yyyy')}`
    }
    if (isTomorrow(parsedDate)) {
      return `Tomorrow — ${format(parsedDate, 'MMMM d, yyyy')}`
    }
    return format(parsedDate, 'EEEE, MMMM d, yyyy')
  }

  const scheduleGroups = groupSchedulesByDate()
  const sortedDates = Object.keys(scheduleGroups).sort()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Schedule Planner
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Organize your meetings, tasks, and travel times.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 gap-2 rounded-xl w-full sm:w-auto justify-center shrink-0"
        >
          <Plus className="size-4" />
          Add Event
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="space-y-2">
              <div className="h-6 w-40 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
              <div className="h-20 w-full bg-stone-100 dark:bg-stone-900 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-stone-200 rounded-2xl bg-white dark:border-stone-800 dark:bg-stone-900/40">
          <Calendar className="size-10 text-stone-400 mb-3" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">No events scheduled</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-[240px]">
            Keep track of workouts, meetings, and calculate travel times.
          </p>
          <Button
            onClick={() => setIsAddOpen(true)}
            variant="outline"
            className="mt-4 border-stone-200 hover:bg-stone-50 dark:border-stone-850 dark:hover:bg-stone-850 text-xs"
          >
            Create your first event
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateStr => (
            <div key={dateStr} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400" suppressHydrationWarning>
                {formatGroupHeader(dateStr)}
              </h3>
              <div className="grid gap-3">
                {scheduleGroups[dateStr].map(item => (
                  <Card
                    key={item.id}
                    className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm relative overflow-hidden group"
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${getScheduleBadge(item.type)}`}>
                            {item.type.replace('_', ' ')}
                          </span>
                          {item.time && (
                            <span className="text-xs font-bold font-mono text-stone-600 dark:text-stone-400 flex items-center gap-1">
                              <Clock className="size-3 text-stone-400" />
                              {item.time}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-semibold text-stone-800 dark:text-stone-100">{item.title}</h4>

                        {item.location && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                            <MapPin className="size-3.5 text-stone-400 shrink-0" />
                            {item.location}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-950 p-2 rounded border border-stone-100 dark:border-stone-900 mt-1">
                            {item.notes}
                          </p>
                        )}

                        {item.type === 'work_departure' && (
                          <div className="border border-stone-200 bg-stone-50/40 dark:border-stone-800 dark:bg-stone-950/40 p-3 rounded-lg flex flex-col gap-1.5 mt-2 max-w-md">
                            <p className="text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between">
                              <span>Work Start:</span>
                              <strong className="font-semibold text-stone-800 dark:text-stone-200">{item.work_start_time}</strong>
                            </p>
                            <p className="text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between">
                              <span>Travel Time:</span>
                              <span>{item.travel_duration_minutes} mins</span>
                            </p>
                            <p className="text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between">
                              <span>Traffic Buffer:</span>
                              <span>{item.traffic_buffer_minutes} mins</span>
                            </p>
                            <div className="border-t border-stone-200 dark:border-stone-800 pt-1.5 flex items-center justify-between text-xs font-semibold text-stone-900 dark:text-stone-100">
                              <span className="flex items-center gap-1">
                                <Compass className="size-3.5" />
                                Departure Reminder:
                              </span>
                              <span className="text-sm font-bold font-mono">{item.calculated_departure_time}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSchedule(item)}
                          className="size-9 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <Edit2 className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(item.id)}
                          className="size-9 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/25"
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Add Schedule Event</DialogTitle>
            <DialogDescription className="sr-only">Create a schedule planner item.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ScheduleForm
              onSuccess={() => {
                setIsAddOpen(false)
                setLoading(true)
                fetchSchedules()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSchedule} onOpenChange={(v) => { if (!v) setEditingSchedule(null) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Edit Schedule Event</DialogTitle>
            <DialogDescription className="sr-only">Edit a schedule planner item.</DialogDescription>
          </DialogHeader>
          {editingSchedule && (
            <div className="py-2">
              <ScheduleForm
                initialValues={editingSchedule}
                onSuccess={() => {
                  setEditingSchedule(null)
                  setLoading(true)
                  fetchSchedules()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-red-605">
              <AlertCircle className="size-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-stone-400">
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeletingId(null)}
              className="text-stone-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-650 hover:bg-red-700 text-stone-50"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
