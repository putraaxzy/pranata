'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'done']),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.end_time && !data.start_time) {
    return false
  }
  return true
}, {
  message: "Start time is required if end time is set",
  path: ["start_time"]
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  onSuccess?: () => void
  initialValues?: Partial<Omit<TaskFormValues, 'start_time' | 'end_time'>> & {
    id?: string
    start_time?: string | null
    end_time?: string | null
  }
}

export function TaskForm({ onSuccess, initialValues }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialValues?.title || '',
      description: initialValues?.description || '',
      due_date: initialValues?.due_date || '',
      priority: initialValues?.priority || 'medium',
      status: initialValues?.status || 'pending',
      start_time: initialValues?.start_time || '',
      end_time: initialValues?.end_time || '',
    },
  })

  const onSubmit = async (values: TaskFormValues) => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        toast.error('You must be logged in to manage tasks')
        setLoading(false)
        return
      }

      const payload = {
        title: values.title,
        description: values.description || null,
        due_date: values.due_date || null,
        priority: values.priority,
        status: values.status,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        user_id: user.id,
      }

      if (initialValues?.id) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', initialValues.id)

        if (error) throw error
        toast.success('Task updated successfully!')
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(payload)

        if (error) throw error
        toast.success('Task added successfully!')
      }

      if (onSuccess) onSuccess()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(msg || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Title</Label>
        <Input
          id="task-title"
          placeholder="Task title..."
          {...form.register('title')}
          className="h-10 rounded-lg text-sm"
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-description" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Description (Optional)</Label>
        <Textarea
          id="task-description"
          placeholder="More details about this task..."
          {...form.register('description')}
          className="min-h-[80px] rounded-lg text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-due-date" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Due Date (Optional)</Label>
        <Input
          id="task-due-date"
          type="date"
          {...form.register('due_date')}
          className="h-10 rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-start-time" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Start Time (Optional)</Label>
          <Input
            id="task-start-time"
            type="time"
            {...form.register('start_time')}
            className="h-10 rounded-lg text-sm"
          />
          {form.formState.errors.start_time && (
            <p className="text-xs text-red-500">{form.formState.errors.start_time.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-end-time" className="text-xs font-semibold text-stone-700 dark:text-stone-300">End Time (Optional)</Label>
          <Input
            id="task-end-time"
            type="time"
            {...form.register('end_time')}
            className="h-10 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-priority" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Priority</Label>
          <Select
            onValueChange={(value) => form.setValue('priority', value as TaskFormValues['priority'])}
            defaultValue={form.getValues('priority')}
          >
            <SelectTrigger id="task-priority" className="h-10 rounded-lg text-sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-status" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Status</Label>
          <Select
            onValueChange={(value) => form.setValue('status', value as TaskFormValues['status'])}
            defaultValue={form.getValues('status')}
          >
            <SelectTrigger id="task-status" className="h-10 rounded-lg text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2 rounded-lg font-semibold"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Task' : 'Add Task'}
      </Button>
    </form>
  )
}
