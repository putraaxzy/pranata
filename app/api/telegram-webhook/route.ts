import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { getTodayStr, getNow } from '@/lib/timezone'

interface TelegramMessage {
  chat: {
    id: number
  }
  text?: string
  from?: {
    first_name?: string
    username?: string
  }
}

interface TelegramUpdate {
  message?: TelegramMessage
}

interface ProfileData {
  user_id: string
  display_name: string
  timezone_setting: string
}

interface ScheduleItem {
  title: string
  time?: string
  type: string
  location?: string
  notes?: string
  is_recurring: boolean
  completed_dates?: string[]
}

interface TaskItem {
  title: string
  priority: string
  status: string
  due_date?: string
  description?: string
  start_time?: string
  end_time?: string
}

interface MoneySummary {
  income: number
  expense: number
  balance: number
  recent: Array<{
    title: string
    amount: number
    type: 'income' | 'expense'
    category: string
    date: string
  }>
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
    }

    const payload: TelegramUpdate = await request.json()
    const message = payload.message
    if (!message || !message.chat?.id) {
      return NextResponse.json({ success: true })
    }

    const chatId = message.chat.id
    const text = message.text?.trim() || ''

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    const fromUser = message.from
    const telegramUsername = fromUser?.username ? `@${fromUser.username}` : ''

    if (text.startsWith('/ping')) {
      const pongMsg = `🏓 <b>Pong!</b>\n\nPranata Bot connection is healthy.\nServer Time: <code>${new Date().toISOString()}</code>`
      await sendTelegramMessage(botToken, chatId, pongMsg)
      return NextResponse.json({ success: true })
    }

    if (text.startsWith('/connect')) {
      const connectLink = `${siteUrl}/dashboard?connect_telegram=${chatId}`
      const connectMsg = `🔗 <b>Connect Telegram Account</b>\n\nClick the link below to link your Pranata account to this Telegram bot:\n\n👉 <a href="${connectLink}">Connect to Pranata Web App</a>\n\n<i>Note: You must be logged into your Pranata account on the web browser.</i>`
      await sendTelegramMessage(botToken, chatId, connectMsg)
      return NextResponse.json({ success: true })
    }

    const supabase = createClient()
    const { data: profileJson, error: profileError } = await supabase
      .rpc('get_telegram_user_profile', { chat_id: String(chatId) })

    const profile = profileJson as ProfileData | null

    if (profileError || !profile) {
      const joinMsg = `🤖 <b>Welcome to Pranata Bot!</b>\n\nYour Telegram account is not linked to any Pranata account yet.\n\nYour Chat ID is: <code>${chatId}</code>\n\nCopy this Chat ID and paste it into the <b>Telegram Settings</b> in your Pranata sidebar dashboard, or type /connect to link it directly!\n\nMessage @rogaq_bot to start receiving reminders.`
      await sendTelegramMessage(botToken, chatId, joinMsg)
      return NextResponse.json({ success: true })
    }

    const name = profile.display_name || message.from?.first_name || 'User'
    const tz = profile.timezone_setting || 'auto'

    if (text.startsWith('/start') || text.startsWith('/help')) {
      const tgHandle = telegramUsername ? ` (${telegramUsername})` : ''
      const helpMsg = `🤖 <b>Hello ${name}${tgHandle}! Welcome back to Pranata Bot.</b>\n\nHere are the commands you can use:\n\n📅 /today - View today's schedules\n✅ /tasks - View your pending tasks\n🪙 /money - View this month's money summary\n🔌 /connect - Link account via browser\n🏓 /ping - Test bot latency\nℹ️ /help - Show this help message`
      await sendTelegramMessage(botToken, chatId, helpMsg)
      return NextResponse.json({ success: true })
    }

    if (text.startsWith('/today')) {
      const todayStr = getTodayStr(tz)
      const todayDow = getNow(tz).getDay()

      const { data: schedulesJson, error: schedulesError } = await supabase
        .rpc('get_telegram_today_schedules', {
          chat_id: String(chatId),
          today_str: todayStr,
          today_dow: todayDow,
        })

      if (schedulesError || !schedulesJson) {
        await sendTelegramMessage(botToken, chatId, `⚠️ Failed to fetch schedules: ${schedulesError?.message || 'Unknown error'}`)
        return NextResponse.json({ success: true })
      }

      const schedules = schedulesJson as ScheduleItem[]
      if (schedules.length === 0) {
        await sendTelegramMessage(botToken, chatId, `📅 <b>Today's Schedule</b> (${tz})\n\nYour schedule is clear for today!`)
        return NextResponse.json({ success: true })
      }

      let schedText = `📅 <b>Today's Schedule</b> (${tz})\n\n`
      schedules.forEach((item) => {
        const timeVal = item.time ? `[${item.time}]` : ''
        const typeLabel = item.type.replace('_', ' ')
        
        let statusEmoji = '🔹'
        const isDone = item.is_recurring
          ? (item.completed_dates ? item.completed_dates.includes(todayStr) : false)
          : false

        if (isDone) {
          statusEmoji = '✅'
        }

        const titleText = isDone ? `<s>${item.title}</s>` : item.title
        schedText += `${statusEmoji} ${timeVal} <b>${titleText}</b> (${typeLabel})\n`
        if (item.location) {
          schedText += `   📍 <i>Location: ${item.location}</i>\n`
        }
        if (item.notes) {
          schedText += `   📝 <i>Notes: ${item.notes}</i>\n`
        }
      })

      await sendTelegramMessage(botToken, chatId, schedText)
      return NextResponse.json({ success: true })
    }

    if (text.startsWith('/tasks')) {
      const { data: tasksJson, error: tasksError } = await supabase
        .rpc('get_telegram_pending_tasks', { chat_id: String(chatId) })

      if (tasksError || !tasksJson) {
        await sendTelegramMessage(botToken, chatId, `⚠️ Failed to fetch tasks: ${tasksError?.message || 'Unknown error'}`)
        return NextResponse.json({ success: true })
      }

      const tasks = tasksJson as TaskItem[]
      if (tasks.length === 0) {
        await sendTelegramMessage(botToken, chatId, `✅ <b>Pending Tasks</b>\n\nAll caught up! No tasks left.`)
        return NextResponse.json({ success: true })
      }

      let taskText = `✅ <b>Pending Tasks</b>\n\n`
      tasks.forEach((item, index) => {
        const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '⚪'
        const dueVal = item.due_date ? ` (Due: ${item.due_date})` : ''
        const statusLabel = item.status === 'in_progress' ? ' - <i>In Progress</i>' : ''
        const timeVal = (item.start_time || item.end_time) ? ` [${item.start_time || ''}${item.start_time && item.end_time ? ' - ' : ''}${item.end_time || ''}]` : ''
        
        taskText += `${index + 1}. ${priorityEmoji} <b>${item.title}</b>${dueVal}${timeVal}${statusLabel}\n`
        if (item.description) {
          taskText += `   📝 <i>${item.description}</i>\n`
        }
      })

      await sendTelegramMessage(botToken, chatId, taskText)
      return NextResponse.json({ success: true })
    }

    if (text.startsWith('/money')) {
      const todayStr = getTodayStr(tz)
      const monthStartStr = todayStr.substring(0, 8) + '01'

      const { data: moneyJson, error: moneyError } = await supabase
        .rpc('get_telegram_money_summary', {
          chat_id: String(chatId),
          month_start_str: monthStartStr,
        })

      if (moneyError || !moneyJson) {
        await sendTelegramMessage(botToken, chatId, `⚠️ Failed to fetch finance summary: ${moneyError?.message || 'Unknown error'}`)
        return NextResponse.json({ success: true })
      }

      const money = moneyJson as MoneySummary
      
      const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
      }

      const balanceText = money.balance >= 0 ? `🟢 Balance: <b>${formatCurrency(money.balance)}</b>` : `🔴 Balance: <b>${formatCurrency(money.balance)}</b>`

      let moneyText = `🪙 <b>Finance Summary</b> (${todayStr.substring(0, 7)})\n\n📥 Income: <b>${formatCurrency(money.income)}</b>\n📤 Expense: <b>${formatCurrency(money.expense)}</b>\n\n${balanceText}`
      
      if (money.recent && money.recent.length > 0) {
        moneyText += `\n\n📝 <b>Recent Transactions (Current Month):</b>\n`
        money.recent.forEach((tx) => {
          const sign = tx.type === 'income' ? '➕' : '➖'
          moneyText += `• ${tx.date} | ${sign} <b>${formatCurrency(tx.amount)}</b>\n  🏷️ <b>${tx.title}</b> (${tx.category})\n`
        })
      }
      
      await sendTelegramMessage(botToken, chatId, moneyText)
      return NextResponse.json({ success: true })
    }

    const unkMsg = `❓ Unknown command. Type /help to see available commands.`
    await sendTelegramMessage(botToken, chatId, unkMsg)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}
