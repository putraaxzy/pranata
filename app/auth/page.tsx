'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, User, CheckCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormType = 'login' | 'register'

export default function AuthPage() {
  const [type, setType] = useState<FormType>('login')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', username: '', password: '' },
  })

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    const mockEmail = `${values.username.trim().toLowerCase()}@pranata.com`
    
    const { error } = await supabase.auth.signInWithPassword({
      email: mockEmail,
      password: values.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Logged in successfully!')
      router.refresh()
      router.push('/dashboard')
    }
  }

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    const mockEmail = `${values.username.trim().toLowerCase()}@pranata.com`

    const { error } = await supabase.auth.signUp({
      email: mockEmail,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Registration successful! You can now log in.')
      setType('login')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="hidden md:flex md:w-1/2 bg-stone-900 dark:bg-stone-950 p-16 flex-col justify-between text-stone-50 border-r border-stone-800/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-stone-800),transparent_70%)] opacity-30 pointer-events-none" />
        
        <div className="flex items-center gap-2.5 z-10">
          <Image src="/lg_pranata.png" width={36} height={36} className="size-9 invert" alt="Pranata Logo" />
          <span className="text-xl font-bold tracking-tight">Pranata</span>
        </div>

        <div className="space-y-6 z-10 max-w-md my-auto">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Nata Urip •<br />
            Tentreming Ati.
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed">
            Manage your daily life, track schedules & traffic departures, organize tasks, record notes, and control your personal finances in a single minimalist workspace.
          </p>
          
          <ul className="space-y-3 pt-4">
            <li className="flex items-center gap-2.5 text-xs text-stone-300">
              <CheckCircle className="size-4 text-stone-100 shrink-0" />
              <span>Smart Travel Departure Alarms</span>
            </li>
            <li className="flex items-center gap-2.5 text-xs text-stone-300">
              <CheckCircle className="size-4 text-stone-100 shrink-0" />
              <span>Unified Task & Life Calendar</span>
            </li>
            <li className="flex items-center gap-2.5 text-xs text-stone-300">
              <CheckCircle className="size-4 text-stone-100 shrink-0" />
              <span>Personal Finance & Ledger Tracking</span>
            </li>
          </ul>
        </div>

        <div className="text-[10px] text-stone-500 tracking-wider font-semibold z-10 flex flex-col gap-1">
          <span>© {new Date().getFullYear()} Pranata • Open Source & Free</span>
          <span>
            By{' '}
            <a
              href="https://github.com/putraaxzy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-200 underline transition-colors"
            >
              @putraaxzy
            </a>
          </span>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-16 lg:px-24 py-12 bg-white dark:bg-stone-900 relative">
        <div className="flex items-center gap-2 md:hidden absolute top-6 left-6">
          <Image src="/lg_pranata.png" width={28} height={28} className="size-7 dark:invert invert-0" alt="Pranata Logo" />
          <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100">Pranata</span>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {type === 'login' ? 'Wilujeng Sumping' : 'Create an Account'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-normal">
              {type === 'login' 
                ? 'Sign in with your username to access your personal workspace.' 
                : 'Fill in the details below to initialize your life dashboard.'}
            </p>
          </div>

          {type === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Username</Label>
                <div className="relative flex items-center w-full">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username"
                    className="pl-10 h-10 border-stone-200 dark:border-stone-850 rounded-xl bg-transparent w-full"
                    {...loginForm.register('username')}
                  />
                </div>
                {loginForm.formState.errors.username && (
                  <p className="text-xs text-red-500">{loginForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Password</Label>
                <div className="relative flex items-center w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-10 border-stone-200 dark:border-stone-850 rounded-xl bg-transparent w-full"
                    {...loginForm.register('password')}
                  />
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 font-semibold rounded-xl mt-2 transition-all cursor-pointer flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin shrink-0" />
                    <span>Signing In...</span>
                  </>
                ) : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Full Name</Label>
                <div className="relative flex items-center w-full">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Your Name"
                    className="pl-10 h-10 border-stone-200 dark:border-stone-850 rounded-xl bg-transparent w-full"
                    {...registerForm.register('fullName')}
                  />
                </div>
                {registerForm.formState.errors.fullName && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-username" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Username</Label>
                <div className="relative flex items-center w-full">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="Choose username"
                    className="pl-10 h-10 border-stone-200 dark:border-stone-850 rounded-xl bg-transparent w-full"
                    {...registerForm.register('username')}
                  />
                </div>
                {registerForm.formState.errors.username && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Password</Label>
                <div className="relative flex items-center w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-10 border-stone-200 dark:border-stone-850 rounded-xl bg-transparent w-full"
                    {...registerForm.register('password')}
                  />
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-red-500">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 font-semibold rounded-xl mt-2 transition-all cursor-pointer flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin shrink-0" />
                    <span>Creating Account...</span>
                  </>
                ) : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            {type === 'login' ? (
              <>
                <span className="text-stone-500 dark:text-stone-400">{"Don't have an account?"}</span>
                <button
                  type="button"
                  onClick={() => setType('register')}
                  className="font-bold text-stone-900 hover:underline dark:text-stone-100 cursor-pointer"
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                <span className="text-stone-500 dark:text-stone-400">Already have an account?</span>
                <button
                  type="button"
                  onClick={() => setType('login')}
                  className="font-bold text-stone-900 hover:underline dark:text-stone-100 cursor-pointer"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
