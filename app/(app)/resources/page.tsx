'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, Plus, Edit2, Trash2, Search, ExternalLink, Tag, AlertCircle } from 'lucide-react'
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
import { ResourceForm } from '@/components/forms/resource-form'
import { toast } from 'sonner'

interface Resource {
  id: string
  title: string
  url?: string
  category: string
  notes?: string
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchResources = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setResources(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      toast.success('Resource deleted successfully')
      setResources(prev => prev.filter(r => r.id !== deletingId))
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete resource')
    } finally {
      setDeletingId(null)
    }
  }

  const getCategories = () => {
    const cats = new Set<string>()
    resources.forEach(r => {
      if (r.category) {
        cats.add(r.category.trim())
      }
    })
    return ['All', ...Array.from(cats)]
  }

  const categories = getCategories()

  const filteredResources = resources.filter(res => {
    const matchesSearch =
      res.title.toLowerCase().includes(search.toLowerCase()) ||
      (res.notes && res.notes.toLowerCase().includes(search.toLowerCase())) ||
      (res.url && res.url.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'All' ||
      (res.category && res.category.trim().toLowerCase() === selectedCategory.toLowerCase())

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Resource Vault
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Store courses, documentation links, books, and articles.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 gap-2 rounded-xl w-full sm:w-auto justify-center shrink-0"
        >
          <Plus className="size-4" />
          Add Resource
        </Button>
      </div>

      <div className="relative bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <Search className="absolute left-4 top-5 size-4 text-stone-400" />
        <Input
          placeholder="Search resources by title, url, or notes..."
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
                  ? 'bg-stone-900 border-stone-900 text-stone-50 dark:bg-stone-100 dark:border-stone-100 dark:text-stone-955'
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
          {[1, 2].map(n => (
            <div key={n} className="h-28 w-full bg-stone-100 dark:bg-stone-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-stone-200 rounded-2xl bg-white dark:border-stone-800 dark:bg-stone-900/40">
          <Bookmark className="size-10 text-stone-400 mb-3" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">No resources saved</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Archive learning references, YouTube playlists, articles, or books.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredResources.map(res => (
            <Card
              key={res.id}
              className="border-stone-200 bg-white hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-305 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-stone-900/40 dark:bg-stone-100/40" />

              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-1 pr-2">
                      {res.title}
                    </h3>
                    <span className="text-[9px] font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded capitalize shrink-0 border border-stone-200/50 flex items-center gap-1">
                      <Tag className="size-2.5" />
                      {res.category}
                    </span>
                  </div>

                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stone-900 dark:text-stone-100 font-semibold hover:underline flex items-center gap-1 mt-0.5 truncate font-mono max-w-full"
                    >
                      <ExternalLink className="size-3 shrink-0" />
                      {res.url}
                    </a>
                  )}

                  {res.notes && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-955 p-2 rounded border border-stone-100 dark:border-stone-900 leading-relaxed">
                      {res.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end border-t border-stone-100 dark:border-stone-800/80 pt-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingResource(res)}
                      className="size-7 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Edit2 className="size-3" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(res.id)}
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Add Resource Link</DialogTitle>
            <DialogDescription className="sr-only">Save a bookmark item.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ResourceForm
              onSuccess={() => {
                setIsAddOpen(false)
                fetchResources()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingResource} onOpenChange={(v) => { if (!v) setEditingResource(null) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight text-stone-900 dark:text-stone-100">Edit Resource Link</DialogTitle>
            <DialogDescription className="sr-only">Edit a bookmark item.</DialogDescription>
          </DialogHeader>
          {editingResource && (
            <div className="py-2">
              <ResourceForm
                initialValues={editingResource}
                onSuccess={() => {
                  setEditingResource(null)
                  fetchResources()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-red-650">
              <AlertCircle className="size-5" />
              Delete Resource
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-stone-400">
              Are you sure you want to delete this resource link? This action cannot be undone.
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
