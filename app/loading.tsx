'use client'

import React from 'react'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <img 
            src="/load_pranata.png" 
            className="w-36 h-36 animate-pulse dark:invert invert-0 object-contain" 
            alt="Pranata Logo" 
          />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold animate-pulse">
          Nata Urip • Tentreming Ati
        </p>
      </div>
    </div>
  )
}
