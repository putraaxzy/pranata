'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Coins, Plus, Edit2, Trash2, TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/forms/transaction-form'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface Transaction {
  id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

export default function MoneyTrackerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchTransactions])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      toast.success('Transaction deleted successfully')
      setTransactions(prev => prev.filter(t => t.id !== deletingId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to delete transaction')
    } finally {
      setDeletingId(null)
    }
  }

  const getFinancialStats = () => {
    let income = 0
    let expense = 0
    const categoryExpenses: { [key: string]: number } = {}

    transactions.forEach(tx => {
      const amt = Number(tx.amount)
      if (tx.type === 'income') {
        income += amt
      } else {
        expense += amt
        categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt
      }
    })

    return {
      income,
      expense,
      balance: income - expense,
      categoryExpenses,
    }
  }

  const { income, expense, balance, categoryExpenses } = getFinancialStats()

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Money Tracker
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Keep track of your earnings and expenses.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 gap-2 rounded-xl w-full sm:w-auto justify-center shrink-0"
        >
          <Plus className="size-4" />
          Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-stone-450 dark:text-stone-400 uppercase font-semibold tracking-wider">
                Total Balance
              </span>
              <h3 className={`text-xl font-bold font-mono ${balance >= 0 ? 'text-stone-850 dark:text-stone-105' : 'text-red-650'}`}>
                {formatCurrency(balance)}
              </h3>
            </div>
            <div className="p-3 bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 rounded-xl">
              <Wallet className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-stone-450 dark:text-stone-400 uppercase font-semibold tracking-wider">
                Income
              </span>
              <h3 className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-500">
                {formatCurrency(income)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-55/40 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-500 rounded-xl">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-stone-450 dark:text-stone-400 uppercase font-semibold tracking-wider">
                Expenses
              </span>
              <h3 className="text-xl font-bold font-mono text-red-750 dark:text-red-500">
                {formatCurrency(expense)}
              </h3>
            </div>
            <div className="p-3 bg-red-55/40 text-red-800 dark:bg-red-950/30 dark:text-red-500 rounded-xl">
              <TrendingDown className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4 md:col-span-1">
          <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-2">
            <Coins className="size-4 text-stone-900 dark:text-stone-100" />
            Expense Breakdown
          </h3>
          <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 p-5 shadow-sm">
            <CardContent className="p-0 space-y-4">
              {Object.keys(categoryExpenses).length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400 py-4 text-center">
                  No expense category breakdown available yet.
                </p>
              ) : (
                Object.entries(categoryExpenses)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const pct = expense > 0 ? (amt / expense) * 100 : 0
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-stone-700 dark:text-stone-300">{cat}</span>
                          <span className="font-semibold text-stone-850 dark:text-stone-100 font-mono">
                            {formatCurrency(amt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-stone-450">
                          <span>Ratio: {pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-850 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-stone-900 dark:bg-stone-100 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 md:col-span-2">
          <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Transaction History
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-16 w-full bg-stone-100 dark:bg-stone-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-stone-200 rounded-2xl bg-white dark:border-stone-800 dark:bg-stone-900/40">
              <Coins className="size-10 text-stone-400 mb-3" />
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">No transactions recorded</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Begin logging your budget, salaries, bills, and purchases.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {transactions.map(item => (
                <Card
                  key={item.id}
                  className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm relative overflow-hidden"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          item.type === 'income'
                            ? 'bg-emerald-50 text-emerald-805 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-red-50 text-red-805 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-850 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mt-1.5 truncate">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {format(parseISO(item.date), 'MMMM d, yyyy')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-bold font-mono ${
                        item.type === 'income' ? 'text-emerald-705 dark:text-emerald-500' : 'text-red-705 dark:text-red-500'
                      }`}>
                        {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTransaction(item)}
                          className="size-8 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <Edit2 className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(item.id)}
                          className="size-8 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/25"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Add Transaction</DialogTitle>
            <DialogDescription className="sr-only">Log an expense or income entry.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <TransactionForm
              onSuccess={() => {
                setIsAddOpen(false)
                setLoading(true)
                fetchTransactions()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTransaction} onOpenChange={(v) => { if (!v) setEditingTransaction(null) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Edit Transaction</DialogTitle>
            <DialogDescription className="sr-only">Edit an expense or income entry.</DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <div className="py-2">
              <TransactionForm
                initialValues={editingTransaction}
                onSuccess={() => {
                  setEditingTransaction(null)
                  setLoading(true)
                  fetchTransactions()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-red-600">
              <AlertCircle className="size-5" />
              Delete Entry
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-stone-400">
              Are you sure you want to delete this financial record? This action cannot be undone.
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
