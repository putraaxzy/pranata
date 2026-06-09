'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const transactionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required'),
  date: z.string().min(1, 'Date is required'),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface TransactionFormProps {
  onSuccess?: () => void
  initialValues?: Partial<TransactionFormValues> & { id?: string }
}

const DEFAULT_CATEGORIES = [
  'Salary',
  'Investment',
  'Food & Dining',
  'Transport',
  'Rent & Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Others',
]

export function TransactionForm({ onSuccess, initialValues }: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      title: initialValues?.title || '',
      amount: initialValues?.amount || 0,
      type: initialValues?.type || 'expense',
      category: initialValues?.category || 'Others',
      date: initialValues?.date || new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (values: TransactionFormValues) => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        toast.error('You must be logged in to manage transactions')
        setLoading(false)
        return
      }

      const payload = {
        title: values.title,
        amount: values.amount,
        type: values.type,
        category: values.category,
        date: values.date,
        user_id: user.id,
      }

      if (initialValues?.id) {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', initialValues.id)

        if (error) throw error
        toast.success('Transaction updated successfully!')
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert(payload)

        if (error) throw error
        toast.success('Transaction added successfully!')
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
      <div className="space-y-2">
        <Label htmlFor="tx-title">Title / Payee</Label>
        <Input
          id="tx-title"
          placeholder="e.g. Monthly Salary, Grocery Store"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tx-amount">Amount</Label>
          <Input
            id="tx-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register('amount', { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tx-type">Type</Label>
          <Select
            onValueChange={(value) => form.setValue('type', value as TransactionFormValues['type'])}
            defaultValue={form.getValues('type')}
          >
            <SelectTrigger id="tx-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tx-category">Category</Label>
          <Select
            onValueChange={(value) => form.setValue('category', value || 'Others')}
            defaultValue={form.getValues('category')}
          >
            <SelectTrigger id="tx-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_CATEGORIES.map((cat) => (
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
          <Label htmlFor="tx-date">Date</Label>
          <Input
            id="tx-date"
            type="date"
            {...form.register('date')}
          />
          {form.formState.errors.date && (
            <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 mt-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : initialValues?.id ? 'Update Transaction' : 'Add Transaction'}
      </Button>
    </form>
  )
}
