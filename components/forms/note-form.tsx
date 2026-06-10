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
import { Tag } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const noteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  category: z.string().optional().or(z.literal('')),
})

type NoteFormValues = z.infer<typeof noteSchema>

interface NoteFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  initialValues?: Partial<NoteFormValues> & {
    id?: string
    created_at?: string
    updated_at?: string
  }
}

export function NoteForm({ onSuccess, initialValues, onCancel }: NoteFormProps) {
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(msg || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 h-full space-y-6">
      <div className="space-y-1">
        <input
          id="note-title"
          placeholder="Untitled Note"
          className="w-full text-xl font-bold tracking-tight bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-700 outline-none border-none p-0 focus:ring-0"
          {...form.register('title')}
          autoFocus
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <Tag className="size-3.5" />
          <span>Category:</span>
        </div>
        <input
          id="note-category"
          placeholder="e.g. Work, Personal, Ideas"
          className="text-xs bg-stone-150 text-stone-750 dark:bg-stone-900 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500 rounded-full px-3 py-1 outline-none border-none focus:ring-0 font-medium"
          {...form.register('category')}
        />
      </div>

      {initialValues?.created_at && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1 text-[10px] text-stone-450 dark:text-stone-500 font-mono -mt-2 border-b border-stone-100 dark:border-stone-800 pb-3">
          <span suppressHydrationWarning>
            Created: {format(parseISO(initialValues.created_at), 'MMM d, yyyy h:mm a')}
          </span>
          {initialValues?.updated_at && (
            <span suppressHydrationWarning>
              Last Edited: {format(parseISO(initialValues.updated_at), 'MMM d, yyyy h:mm a')}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-[350px]">
        <textarea
          id="note-content"
          placeholder="Start writing your thoughts here..."
          className="w-full flex-1 bg-transparent text-base leading-relaxed text-stone-800 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-700 outline-none border-none p-0 resize-none focus:ring-0 font-sans min-h-[350px]"
          {...form.register('content')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800 mt-auto">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-stone-500 hover:text-stone-850 dark:text-stone-400 dark:hover:text-stone-100 text-sm px-4 h-10 rounded-xl"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 font-semibold px-6 h-10 rounded-xl flex items-center gap-2"
          disabled={loading}
        >
          {loading ? 'Saving...' : initialValues?.id ? 'Save Changes' : 'Create Note'}
        </Button>
      </div>
    </form>
  )
}
