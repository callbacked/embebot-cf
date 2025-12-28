import type { DurableObjectState } from '@cloudflare/workers-types'
import type { Env, DiscordMessage } from '../types'
import { getMessage, sendMessage, suppressEmbeds } from '../services/discord'
import { getEnabledServices, getCustomEndpoints } from '../services/database'
import { matchUrls } from '../services/url-matcher'

// Suppression alarm data stored in DO
interface SuppressionTask {
  channelId: string
  messageId: string
  attempts: number
}

export async function handleMessageCreate(
  message: DiscordMessage,
  env: Env,
  ctx: DurableObjectState
): Promise<void> {
  // Skip DMs
  if (!message.guild_id) return

  // Get enabled services and custom endpoints for this guild
  const [enabledServices, customEndpoints] = await Promise.all([
    getEnabledServices(env, message.guild_id),
    getCustomEndpoints(env, message.guild_id),
  ])

  if (enabledServices.size === 0) {
    return
  }

  // Match URLs in message content
  const matches = matchUrls(message.content, enabledServices, customEndpoints)

  if (matches.length === 0) {
    return
  }

  console.log(`Found ${matches.length} URLs to convert in message ${message.id}`)

  // Build response with vx links
  // Using invisible character trick: [⠀](url)
  const responses = matches.map((m) => `[⠀](${m.vxUrl})`)
  const responseContent = responses.join(' ')

  // Attempt to suppress embeds immediately
  try {
    await suppressEmbeds(env, message.channel_id, message.id)
  } catch (error) {
    console.error('Initial suppress failed:', error)
  }

  // Send reply with vx links
  try {
    await sendMessage(env, message.channel_id, responseContent, {
      messageId: message.id,
      guildId: message.guild_id,
    })
  } catch (error) {
    console.error('Failed to send reply:', error)
    return
  }

  // Schedule suppression verification
  await scheduleSuppression(ctx, message.channel_id, message.id)
}

async function scheduleSuppression(
  ctx: DurableObjectState,
  channelId: string,
  messageId: string
): Promise<void> {
  const task: SuppressionTask = {
    channelId,
    messageId,
    attempts: 0,
  }

  // Store the suppression task
  const key = `suppression:${messageId}`
  await ctx.storage.put(key, task)

  // Add to pending tasks list
  const pendingTasks = (await ctx.storage.get<string[]>('pendingSuppressions')) || []
  if (!pendingTasks.includes(key)) {
    pendingTasks.push(key)
    await ctx.storage.put('pendingSuppressions', pendingTasks)
  }

  // Only set alarm if not already set
  const existingAlarm = await ctx.storage.getAlarm()
  if (!existingAlarm) {
    await ctx.storage.setAlarm(Date.now() + 5000)
  }
}

// Called from the DO's alarm handler
export async function processSuppressionAlarms(ctx: DurableObjectState, env: Env): Promise<void> {
  const pendingTasks = (await ctx.storage.get<string[]>('pendingSuppressions')) || []

  if (pendingTasks.length === 0) {
    return
  }

  const remainingTasks: string[] = []

  for (const key of pendingTasks) {
    const task = await ctx.storage.get<SuppressionTask>(key)
    if (!task) continue

    try {
      // Fetch the message to check if embeds are still present
      const message = await getMessage(env, task.channelId, task.messageId)

      const hasEmbeds = message.embeds && message.embeds.length > 0
      const isSuppressed = (message.flags || 0) & 4 // MessageFlags.SuppressEmbeds

      if (hasEmbeds || !isSuppressed) {
        console.log(
          `Suppressing embeds for message ${task.messageId} (attempt ${task.attempts + 1})`
        )
        await suppressEmbeds(env, task.channelId, task.messageId)
        task.attempts++

        // If we haven't tried too many times, schedule another check
        if (task.attempts < 3) {
          await ctx.storage.put(key, task)
          remainingTasks.push(key)
        } else {
          console.log(`Max suppression attempts reached for ${task.messageId}`)
          await ctx.storage.delete(key)
        }
      } else {
        console.log(`Embeds already suppressed for ${task.messageId}`)
        await ctx.storage.delete(key)
      }
    } catch (error) {
      console.error(`Error processing suppression for ${task.messageId}:`, error)
      await ctx.storage.delete(key)
    }
  }

  // Update pending tasks
  await ctx.storage.put('pendingSuppressions', remainingTasks)

  // If there are remaining tasks, schedule another alarm
  if (remainingTasks.length > 0) {
    await ctx.storage.setAlarm(Date.now() + 5000)
  }
}
