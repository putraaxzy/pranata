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
import { format } from 'date-fns'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'done']),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  onSuccess?: () => void
  initialValues?: Partial<TaskFormValues> & { id?: string }
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
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          placeholder="Task title..."
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description (Optional)</Label>
        <Textarea
          id="task-description"
          placeholder="More details about this task..."
          {...form.register('description')}
          className="min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            type="date"
            {...form.register('due_date')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            onValueChange={(value) => form.setValue('priority', value as any)}
            defaultValue={form.getValues('priority')}
          >
            <SelectTrigger id="task-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-status">Status</Label>
        <Select
          onValueChange={(value) => form.setValue('status', value as any)}
          defaultValue={form.getValues('status')}
        >
          <SelectTrigger id="task-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Task' : 'Add Task'}
      </Button>
    </form>
  )
}
