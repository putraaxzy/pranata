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
import { toast } from 'sonner'

const noteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  category: z.string().optional().or(z.literal('')),
})

type NoteFormValues = z.infer<typeof noteSchema>

interface NoteFormProps {
  onSuccess?: () => void
  initialValues?: Partial<NoteFormValues> & { id?: string }
}

export function NoteForm({ onSuccess, initialValues }: NoteFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: initialValues?.title || '',
      content: initialValues?.content || '',
      category: initialValues?.category || 'General',
    },
  })

  const onSubmit = async (values: NoteFormValues) => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        toast.error('You must be logged in to manage notes')
        setLoading(false)
        return
      }

      const payload = {
        title: values.title,
        content: values.content || null,
        category: values.category || 'General',
        user_id: user.id,
      }

      if (initialValues?.id) {
        const { error } = await supabase
          .from('notes')
          .update(payload)
          .eq('id', initialValues.id)

        if (error) throw error
        toast.success('Note updated successfully!')
      } else {
        const { error } = await supabase
          .from('notes')
          .insert(payload)

        if (error) throw error
        toast.success('Note added successfully!')
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
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          placeholder="Note title..."
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-category">Category (Optional)</Label>
        <Input
          id="note-category"
          placeholder="e.g. Work, Personal, Ideas"
          {...form.register('category')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          placeholder="Write your note here..."
          {...form.register('content')}
          className="min-h-[150px]"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Note' : 'Add Note'}
      </Button>
    </form>
  )
}
