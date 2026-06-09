'use client'

import React from 'react'
import { Coins, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FinanceSummaryProps {
  income: number
  expense: number
  balance: number
}

export function FinanceSummary({ income, expense, balance }: FinanceSummaryProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const expenseRatio = income > 0 ? (expense / income) * 100 : 0

  return (
    <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-stone-600 dark:text-stone-400 flex items-center gap-2">
          <Coins className="size-4 text-amber-800 dark:text-amber-500" />
          Finance Summary (This Month)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-950 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-500">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Net Balance</p>
              <h3 className={`text-base font-bold font-mono ${balance >= 0 ? 'text-stone-800 dark:text-stone-100' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-stone-100 dark:border-stone-800/80 p-3 rounded-xl flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-500">
              <TrendingUp className="size-3.5" />
            </div>
            <div>
              <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Income</p>
              <h4 className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-500">{formatCurrency(income)}</h4>
            </div>
          </div>

          <div className="border border-stone-100 dark:border-stone-800/80 p-3 rounded-xl flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-500">
              <TrendingDown className="size-3.5" />
            </div>
            <div>
              <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Expenses</p>
              <h4 className="text-xs font-bold font-mono text-red-700 dark:text-red-500">{formatCurrency(expense)}</h4>
            </div>
          </div>
        </div>

        {income > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-stone-500">
              <span>Monthly Budget Used</span>
              <span>{expenseRatio.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  expenseRatio > 90 ? 'bg-red-500' : expenseRatio > 70 ? 'bg-amber-500' : 'bg-amber-800'
                }`}
                style={{ width: `${Math.min(expenseRatio, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
