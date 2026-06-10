'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Search, Plus, Edit2, Trash2, Tag, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NoteForm } from '@/components/forms/note-form'
import { NoteEditorOverlay } from '@/components/note-editor-overlay'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface Note {
  id: string
  title: string
  content?: string
  category?: string
  created_at: string
  updated_at: string
}

const renderNoteContent = (content: string | undefined) => {
  if (!content) return 'No content.'

  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = content.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-900 dark:text-stone-100 font-semibold underline break-all hover:text-stone-700 dark:hover:text-stone-300"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchNotes])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      toast.success('Note deleted successfully')
      setNotes(prev => prev.filter(n => n.id !== deletingId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Failed to delete note')
    } finally {
      setDeletingId(null)
    }
  }

  const getCategories = () => {
    const cats = new Set<string>()
    notes.forEach(n => {
      if (n.category) {
        cats.add(n.category.trim())
      }
    })
    return ['All', ...Array.from(cats)]
  }

  const categories = getCategories()

  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'All' ||
      (note.category && note.category.trim().toLowerCase() === selectedCategory.toLowerCase())

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Notebook
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Capture thoughts, ideas, and reminders.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 gap-2 rounded-xl w-full sm:w-auto justify-center shrink-0"
        >
          <Plus className="size-4" />
          Add Note
        </Button>
      </div>

      <div className="relative bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <Search className="absolute left-4 top-5 size-4 text-stone-400" />
        <Input
          placeholder="Search notes by title or content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none pl-9 py-6 text-sm"
        />
      </div>

      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-stone-900 border-stone-900 text-stone-50 dark:bg-stone-100 dark:border-stone-100 dark:text-stone-950'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 w-full bg-stone-100 dark:bg-stone-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-stone-200 rounded-2xl bg-white dark:border-stone-800 dark:bg-stone-900/40">
          <FileText className="size-10 text-stone-400 mb-3" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">No notes found</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Write down thoughts, ideas, lists, and reference info.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredNotes.map(note => (
            <Card
              key={note.id}
              onClick={() => setEditingNote(note)}
              className="cursor-pointer border-stone-200 bg-white hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900/60 dark:bg-stone-100/60" />

              <CardContent className="p-5 flex flex-col justify-between h-full gap-4 pl-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-stone-850 dark:text-stone-100 line-clamp-1 pr-2">
                      {note.title}
                    </h3>
                    {note.category && (
                      <span className="text-[9px] font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded capitalize shrink-0 flex items-center gap-1 border border-stone-200/50">
                        <Tag className="size-2.5" />
                        {note.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-pre-wrap line-clamp-4 leading-relaxed font-sans">
                    {renderNoteContent(note.content)}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80 pt-3 text-[10px] text-stone-400 font-mono">
                  <span suppressHydrationWarning>
                    Updated: {format(parseISO(note.updated_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNote(note);
                      }}
                      className="size-7 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Edit2 className="size-3" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(note.id);
                      }}
                      className="size-7 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/25"
                    >
                      <Trash2 className="size-3" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NoteEditorOverlay
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          setLoading(true)
          fetchNotes()
        }}
      />

      <NoteEditorOverlay
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        initialValues={editingNote}
        onSuccess={() => {
          setLoading(true)
          fetchNotes()
        }}
      />

      <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-red-600">
              <AlertCircle className="size-5" />
              Delete Note
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-stone-400">
              Are you sure you want to delete this note? This action cannot be undone.
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
              className="bg-red-600 hover:bg-red-700 text-stone-50"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
