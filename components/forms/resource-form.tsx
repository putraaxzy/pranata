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

const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Please enter a valid URL').or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
})

type ResourceFormValues = z.infer<typeof resourceSchema>

interface ResourceFormProps {
  onSuccess?: () => void
  initialValues?: Partial<ResourceFormValues> & { id?: string }
}

const RESOURCE_CATEGORIES = [
  'Articles',
  'Books',
  'Documentation',
  'Khan Academy',
  'YouTube Playlists',
  'Online Courses',
  'Tutorials',
  'Others',
]

export function ResourceForm({ onSuccess, initialValues }: ResourceFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: initialValues?.title || '',
      url: initialValues?.url || '',
      category: initialValues?.category || 'Documentation',
      notes: initialValues?.notes || '',
    },
  })

  const onSubmit = async (values: ResourceFormValues) => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        toast.error('You must be logged in to manage resources')
        setLoading(false)
        return
      }

      const payload = {
        title: values.title,
        url: values.url || null,
        category: values.category,
        notes: values.notes || null,
        user_id: user.id,
      }

      if (initialValues?.id) {
        const { error } = await supabase
          .from('resources')
          .update(payload)
          .eq('id', initialValues.id)

        if (error) throw error
        toast.success('Resource updated successfully!')
      } else {
        const { error } = await supabase
          .from('resources')
          .insert(payload)

        if (error) throw error
        toast.success('Resource added successfully!')
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
        <Label htmlFor="res-title">Title</Label>
        <Input
          id="res-title"
          placeholder="Resource title (e.g. Next.js docs)"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="res-category">Category</Label>
          <Select
            onValueChange={(value) => form.setValue('category', value || 'Documentation')}
            defaultValue={form.getValues('category')}
          >
            <SelectTrigger id="res-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.category && (
            <p className="text-xs text-red-500">{form.formState.errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="res-url">URL (Optional)</Label>
          <Input
            id="res-url"
            placeholder="https://example.com"
            {...form.register('url')}
          />
          {form.formState.errors.url && (
            <p className="text-xs text-red-500">{form.formState.errors.url.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="res-notes">Notes (Optional)</Label>
        <Textarea
          id="res-notes"
          placeholder="Important points, highlights, etc..."
          {...form.register('notes')}
          className="min-h-[100px]"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Resource' : 'Add Resource'}
      </Button>
    </form>
  )
}
