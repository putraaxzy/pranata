import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, body, test } = await request.json()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_chat_id, display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile?.telegram_chat_id) {
      return NextResponse.json({ error: 'Telegram Chat ID not set' }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 500 })
    }

    let messageText = ''
    if (test) {
      const name = profile.display_name || user.email?.split('@')[0] || 'User'
      messageText = `<b>🔗 Pranata Connection Test</b>\n\nHello ${name}! The Pranata Telegram Bot has been successfully connected to your account.`
    } else {
      messageText = `<b>${title}</b>\n\n${body}`
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: messageText,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Telegram API error: ${errorText}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
