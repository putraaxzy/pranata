'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Square, Trash2, Edit2, Search, Plus, AlertCircle, Clock, Play, Pause } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TaskForm } from '@/components/forms/task-form'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { getNow, getTodayStr } from '@/lib/timezone'

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'done'
  start_time?: string | null
  end_time?: string | null
}

export default function TodoPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [timezone, setTimezone] = useState<string>('auto')
  const [currentTime, setCurrentTime] = useState(new Date())

  const [quickTitle, setQuickTitle] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const [tasksRes, profileRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('timezone_setting')
          .eq('user_id', user.id)
          .maybeSingle()
      ])

      if (tasksRes.error) throw tasksRes.error
      if (profileRes.error) throw profileRes.error

      setTasks(tasksRes.data || [])
      setTimezone(profileRes.data?.timezone_setting || 'auto')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchTasks])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return

    setQuickLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        toast.error('You must be logged in')
        return
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: quickTitle,
          priority: 'medium',
          status: 'pending',
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Task created!')
      setTasks(prev => [data, ...prev])
      setQuickTitle('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to create task')
    } finally {
      setQuickLoading(false)
    }
  }

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done'

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: nextStatus as Task['status'] } : t))
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', taskId)

      if (error) throw error
      toast.success(nextStatus === 'done' ? 'Task marked as complete!' : 'Task status reopened.')
    } catch {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: currentStatus as Task['status'] } : t))
      )
      toast.error('Could not update task')
    }
  }

  const handleToggleInProgress = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'in_progress' ? 'pending' : 'in_progress'

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: nextStatus as Task['status'] } : t))
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', taskId)

      if (error) throw error
      toast.success(nextStatus === 'in_progress' ? 'Task timer started!' : 'Task timer paused.')
    } catch {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: currentStatus as Task['status'] } : t))
      )
      toast.error('Could not update task status')
    }
  }

  const getActiveTimerInfo = (task: Task) => {
    if (currentTime && task.status === 'done') return null
    if (!task.due_date || !task.start_time || !task.end_time) return null

    const todayStr = getTodayStr(timezone)
    if (task.due_date !== todayStr) return null

    const now = getNow(timezone)
    const currentH = now.getHours()
    const currentM = now.getMinutes()
    const currentMins = currentH * 60 + currentM

    const [startH, startM] = task.start_time.split(':').map(Number)
    const [endH, endM] = task.end_time.split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM

    if (currentMins >= startMins && currentMins <= endMins) {
      const remainingMins = endMins - currentMins
      if (remainingMins <= 0) return null

      if (remainingMins >= 60) {
        const h = Math.floor(remainingMins / 60)
        const m = remainingMins % 60
        return m > 0 ? `${h}h ${m}m left` : `${h}h left`
      }
      return `${remainingMins}m left`
    }
    return null
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      toast.success('Task deleted successfully')
      setTasks(prev => prev.filter(t => t.id !== deletingId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to delete task')
    } finally {
      setDeletingId(null)
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 dark:bg-red-950/25 dark:text-red-400 border-red-200/50'
      case 'medium':
        return 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 border-stone-200/50 font-semibold'
      default:
        return 'bg-stone-50 text-stone-700 dark:bg-stone-850 dark:text-stone-400 border-stone-200/50'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-250/30'
      case 'in_progress':
        return 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400'
      default:
        return 'bg-stone-105 text-stone-600 dark:bg-stone-850 dark:text-stone-400'
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Task Organizer
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Manage your actions and things to do.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-105 dark:hover:bg-stone-200 dark:text-stone-950 gap-2 rounded-xl w-full sm:w-auto justify-center shrink-0"
        >
          <Plus className="size-4" />
          Add Task
        </Button>
      </div>

      <form onSubmit={handleQuickAdd} className="flex gap-2 bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <Input
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          placeholder="Add a task quickly... (Press Enter)"
          className="border-0 focus-visible:ring-0 shadow-none focus-visible:ring-offset-0 px-2"
          disabled={quickLoading}
        />
        <Button
          type="submit"
          size="sm"
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200 rounded-lg"
          disabled={quickLoading || !quickTitle.trim()}
        >
          Add
        </Button>
      </form>

      <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3 shadow-sm">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-lg border-stone-200 dark:border-stone-850 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="status-filter" className="text-xs font-semibold text-stone-500">Status</Label>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
              <SelectTrigger id="status-filter" className="h-9 rounded-lg border-stone-200 dark:border-stone-850">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="priority-filter" className="text-xs font-semibold text-stone-500">Priority</Label>
            <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || 'all')}>
              <SelectTrigger id="priority-filter" className="h-9 rounded-lg border-stone-200 dark:border-stone-850">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 w-full bg-stone-100 dark:bg-stone-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-stone-200 rounded-2xl bg-white dark:border-stone-800 dark:bg-stone-900/40">
          <CheckSquare className="size-10 text-stone-400 mb-3" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">No tasks found</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Adjust your search terms or add a new task to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map(task => (
            <Card
              key={task.id}
              className={`border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm relative transition-opacity duration-200 ${task.status === 'done' ? 'opacity-60' : 'opacity-100'
                }`}
            >
              <CardContent className="p-4 flex items-start gap-3 justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(task.id, task.status)}
                    className="mt-0.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-250 transition-colors shrink-0"
                    aria-label={task.status === 'done' ? 'Mark pending' : 'Mark done'}
                  >
                    {task.status === 'done' ? (
                      <CheckSquare className="size-5 text-stone-900 dark:text-stone-100" />
                    ) : (
                      <Square className="size-5" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1 flex-1">
                    <h3 className={`text-sm font-semibold text-stone-800 dark:text-stone-100 truncate ${task.status === 'done' ? 'line-through text-stone-400 dark:text-stone-500' : ''}`}>
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 pr-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded capitalize ${getStatusBadge(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.due_date && (
                        <span className="text-[10px] text-stone-400 font-mono" suppressHydrationWarning>
                          Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {task.start_time && (
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono flex items-center gap-0.5">
                          <Clock className="size-3" />
                          {task.start_time} {task.end_time ? ` - ${task.end_time}` : ''}
                        </span>
                      )}
                      {(() => {
                        const activeTimerText = getActiveTimerInfo(task)
                        const isActive = activeTimerText || task.status === 'in_progress'
                        if (!isActive) return null
                        return (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-250/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 animate-pulse">
                            <span className="size-1 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                            {task.status === 'in_progress' ? (activeTimerText ? `Active (${activeTimerText})` : 'Active Now') : activeTimerText}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-center">
                  {task.status !== 'done' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleInProgress(task.id, task.status)}
                      className={
                        task.status === 'in_progress'
                          ? "size-8 text-stone-900 hover:text-stone-950 rounded-lg bg-stone-100 hover:bg-stone-200 dark:text-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 animate-pulse"
                          : "size-8 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                      }
                      title={task.status === 'in_progress' ? 'Pause Action' : 'Start Action'}
                    >
                      {task.status === 'in_progress' ? (
                        <Pause className="size-3.5" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      <span className="sr-only">
                        {task.status === 'in_progress' ? 'Pause' : 'Start'}
                      </span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingTask(task)}
                    className="size-8 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <Edit2 className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(task.id)}
                    className="size-8 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/25"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Add Task</DialogTitle>
            <DialogDescription className="sr-only">Create a checklist item.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <TaskForm
              onSuccess={() => {
                setIsAddOpen(false)
                setLoading(true)
                fetchTasks()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(v) => { if (!v) setEditingTask(null) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Edit Task</DialogTitle>
            <DialogDescription className="sr-only">Edit a checklist item.</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="py-2">
              <TaskForm
                initialValues={editingTask}
                onSuccess={() => {
                  setEditingTask(null)
                  setLoading(true)
                  fetchTasks()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-red-650">
              <AlertCircle className="size-5" />
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-stone-400">
              Are you sure you want to delete this task? This action cannot be undone.
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
