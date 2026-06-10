'use client'

import React, { useEffect } from 'react'
import { NoteForm } from './forms/note-form'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NoteEditorOverlayProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialValues?: any
}

export function NoteEditorOverlay({ isOpen, onClose, onSuccess, initialValues }: NoteEditorOverlayProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-stone-950 overflow-y-auto animate-in fade-in-0 duration-200">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/85 px-6 py-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/85">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
          {initialValues?.id ? 'Edit Note' : 'New Note'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-8 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-850 dark:hover:bg-stone-900 dark:hover:text-stone-100"
          title="Close editor"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 md:py-12 flex flex-col justify-start">
        <NoteForm
          initialValues={initialValues}
          onSuccess={() => {
            onSuccess()
            onClose()
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
