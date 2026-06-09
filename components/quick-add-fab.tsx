'use client'

import React, { useState } from 'react'
import { Plus, Calendar, CheckSquare, FileText, Coins, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TaskForm } from './forms/task-form'
import { ScheduleForm } from './forms/schedule-form'
import { NoteForm } from './forms/note-form'
import { TransactionForm } from './forms/transaction-form'

type ActiveView = 'menu' | 'task' | 'schedule' | 'note' | 'transaction'

export function QuickAddFab() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ActiveView>('menu')

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => setView('menu'), 200)
  }

  const handleSuccess = () => {
    handleClose()
    window.location.reload()
  }

  const renderActiveForm = () => {
    switch (view) {
      case 'task':
        return <TaskForm onSuccess={handleSuccess} />
      case 'schedule':
        return <ScheduleForm onSuccess={handleSuccess} />
      case 'note':
        return <NoteForm onSuccess={handleSuccess} />
      case 'transaction':
        return <TransactionForm onSuccess={handleSuccess} />
      default:
        return null
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          setView('menu')
          setOpen(true)
        }}
        size="icon"
        className="fixed bottom-20 right-6 size-14 rounded-full bg-stone-900 text-stone-50 shadow-lg hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 md:bottom-8 md:right-8 z-40 transition-transform active:scale-95 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200"
        aria-label="Quick Add Menu"
      >
        <Plus className="size-6 transition-transform hover:rotate-90" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 rounded-2xl shadow-lg">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              {view !== 'menu' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  onClick={() => setView('menu')}
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}
              <DialogTitle className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {view === 'menu' && 'Quick Add'}
                {view === 'task' && 'New Task'}
                {view === 'schedule' && 'New Schedule'}
                {view === 'note' && 'New Note'}
                {view === 'transaction' && 'New Transaction'}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Quickly create productive life items.
            </DialogDescription>
          </DialogHeader>

          {view === 'menu' ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                onClick={() => setView('schedule')}
                className="flex flex-col items-center justify-center h-28 gap-2 border-stone-200 hover:bg-stone-50 hover:border-stone-900 dark:border-stone-800 dark:hover:bg-stone-800/50 dark:hover:border-stone-100 rounded-xl transition-all"
              >
                <Calendar className="size-6 text-stone-900 dark:text-stone-100" />
                <span className="text-sm font-medium text-stone-850 dark:text-stone-200">Schedule</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setView('task')}
                className="flex flex-col items-center justify-center h-28 gap-2 border-stone-200 hover:bg-stone-50 hover:border-stone-900 dark:border-stone-800 dark:hover:bg-stone-800/50 dark:hover:border-stone-100 rounded-xl transition-all"
              >
                <CheckSquare className="size-6 text-stone-900 dark:text-stone-100" />
                <span className="text-sm font-medium text-stone-850 dark:text-stone-200">Task</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setView('note')}
                className="flex flex-col items-center justify-center h-28 gap-2 border-stone-200 hover:bg-stone-50 hover:border-stone-900 dark:border-stone-800 dark:hover:bg-stone-800/50 dark:hover:border-stone-100 rounded-xl transition-all"
              >
                <FileText className="size-6 text-stone-900 dark:text-stone-100" />
                <span className="text-sm font-medium text-stone-850 dark:text-stone-200">Note</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setView('transaction')}
                className="flex flex-col items-center justify-center h-28 gap-2 border-stone-200 hover:bg-stone-50 hover:border-stone-900 dark:border-stone-800 dark:hover:bg-stone-800/50 dark:hover:border-stone-100 rounded-xl transition-all"
              >
                <Coins className="size-6 text-stone-900 dark:text-stone-100" />
                <span className="text-sm font-medium text-stone-850 dark:text-stone-200">Money</span>
              </Button>
            </div>
          ) : (
            <div className="py-4">
              {renderActiveForm()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
