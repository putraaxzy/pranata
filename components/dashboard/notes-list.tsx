'use client'

import React from 'react'
import { FileText, ChevronRight, Bookmark } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface Note {
  id: string
  title: string
  content?: string
  category?: string
  updated_at: string
}

interface NotesListProps {
  notes: Note[]
}

export function NotesList({ notes }: NotesListProps) {
  const getSnippet = (text?: string) => {
    if (!text) return 'No content'
    if (text.length <= 60) return text
    return `${text.substring(0, 60)}...`
  }

  return (
    <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-stone-600 dark:text-stone-400 flex items-center gap-2">
          <FileText className="size-4 text-amber-800 dark:text-amber-500" />
          Recent Notes
        </CardTitle>
        <Link href="/notes" className="text-xs text-amber-800 dark:text-amber-500 hover:underline flex items-center gap-0.5 font-medium">
          View All
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-stone-500 dark:text-stone-400">No notes written yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Link
                key={note.id}
                href="/notes"
                className="block p-3 rounded-lg border border-stone-100 hover:border-amber-800/40 bg-stone-50/20 hover:bg-stone-50/50 dark:border-stone-800/60 dark:bg-stone-900/20 dark:hover:bg-stone-800/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate pr-2">{note.title}</h4>
                  {note.category && (
                    <span className="text-[9px] font-medium text-amber-800 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded capitalize shrink-0">
                      {note.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                  {getSnippet(note.content)}
                </p>
                <p className="text-[10px] text-stone-400 mt-2 font-mono">
                  Updated: {format(parseISO(note.updated_at), 'MMM d, yyyy h:mm a')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
