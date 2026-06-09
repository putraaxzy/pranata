'use client'

import React, { useState } from 'react'
import { CheckSquare, Square, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'done'
}

interface TaskListProps {
  initialTasks: Task[]
}

export function TaskList({ initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const supabase = createClient()

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done'

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus as any } : t))
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', taskId)

      if (error) throw error

      toast.success(nextStatus === 'done' ? 'Task completed!' : 'Task reopened.')
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus as any } : t))
      )
      toast.error('Could not update task status')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400'
      case 'medium':
        return 'text-stone-800 bg-stone-100 dark:bg-stone-800 dark:text-stone-200'
      default:
        return 'text-stone-600 bg-stone-50/50 dark:bg-stone-850/40 dark:text-stone-400'
    }
  }

  const activeTasks = tasks.filter((t) => t.status !== 'done')

  return (
    <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-stone-600 dark:text-stone-400 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-stone-900 dark:text-stone-100" />
          Upcoming Tasks
        </CardTitle>
        <Link href="/todo" className="text-xs text-stone-900 dark:text-stone-100 hover:underline flex items-center gap-0.5 font-medium">
          View All
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {activeTasks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-stone-500 dark:text-stone-400">All caught up! No tasks left.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {activeTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-start justify-between py-3 first:pt-0 last:pb-0 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(task.id, task.status)}
                    className="mt-0.5 text-stone-400 hover:text-stone-850 dark:hover:text-stone-100 transition-colors shrink-0"
                  >
                    <Square className="size-4.5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-[11px] text-stone-400 mt-0.5 font-mono" suppressHydrationWarning>
                        Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
