import type { Env, Interaction, InteractionResponse, AutocompleteChoice } from '../types'
import { getEnabledServices, setServiceEnabled, setAllServicesEnabled } from '../services/database'
import { ALL_SERVICES } from '../services/url-matcher'

const VALID_SERVICES = ['all', ...ALL_SERVICES]

export async function handleInteraction(
  interaction: Interaction,
  env: Env
): Promise<InteractionResponse> {
  // Handle ping
  if (interaction.type === 1) {
    return { type: 1 } // Pong
  }

  // Handle autocomplete
  if (interaction.type === 4) {
    return handleAutocomplete(interaction)
  }

  // Handle slash commands
  if (interaction.type === 2) {
    const commandName = interaction.data?.name

    switch (commandName) {
      case 'enable':
        return handleEnableDisable(interaction, env, true)
      case 'disable':
        return handleEnableDisable(interaction, env, false)
      case 'settings':
        return handleSettings(interaction, env)
      default:
        return errorResponse('Unknown command')
    }
  }

  return errorResponse('Unknown interaction type')
}

function handleAutocomplete(interaction: Interaction): InteractionResponse {
  const focusedOption = interaction.data?.options?.find((opt) => opt.focused)
  const query = (focusedOption?.value as string)?.toLowerCase() || ''

  let choices: AutocompleteChoice[] = [
    { name: 'All', value: 'all' },
    { name: 'Reddit', value: 'reddit' },
    { name: 'TikTok', value: 'tiktok' },
    { name: 'Instagram', value: 'instagram' },
    { name: 'Twitter', value: 'twitter' },
    { name: 'X', value: 'x' },
  ]

  if (query) {
    choices = choices.filter((c) => c.name.toLowerCase().startsWith(query))
  }

  return {
    type: 8, // ApplicationCommandAutocompleteResult
    data: { choices },
  }
}

async function handleEnableDisable(
  interaction: Interaction,
  env: Env,
  enable: boolean
): Promise<InteractionResponse> {
  const guildId = interaction.guild_id
  if (!guildId) {
    return errorResponse('This command can only be used in a server')
  }

  const service = interaction.data?.options?.[0]?.value as string
  if (!service || !VALID_SERVICES.includes(service)) {
    return errorResponse(`Invalid service. Valid options: ${VALID_SERVICES.join(', ')}`)
  }

  const action = enable ? 'enabled' : 'disabled'

  try {
    if (service === 'all') {
      await setAllServicesEnabled(env, guildId, enable)
    } else {
      await setServiceEnabled(env, guildId, service, enable)
    }

    return successResponse(
      `Successfully ${action} **${service}** embed service(s) for this server.`
    )
  } catch (error) {
    console.error('Error updating settings:', error)
    return errorResponse('Failed to update settings. Please try again.')
  }
}

async function handleSettings(interaction: Interaction, env: Env): Promise<InteractionResponse> {
  const guildId = interaction.guild_id
  if (!guildId) {
    return errorResponse('This command can only be used in a server')
  }

  try {
    const enabledServices = await getEnabledServices(env, guildId)
    const enabled: string[] = []
    const disabled: string[] = []

    for (const service of ALL_SERVICES) {
      if (enabledServices.has(service)) {
        enabled.push(service)
      } else {
        disabled.push(service)
      }
    }

    return {
      type: 4, // ChannelMessageWithSource
      data: {
        embeds: [
          {
            title: 'Embed Settings for this Server',
            color: 0x82ff8c,
            fields: [
              {
                name: 'Enabled Services',
                value: enabled.length > 0 ? enabled.join(', ') : 'None',
              },
              {
                name: 'Disabled Services',
                value: disabled.length > 0 ? disabled.join(', ') : 'None',
              },
            ],
          },
        ],
      },
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
    return errorResponse('Failed to fetch settings. Please try again.')
  }
}

function successResponse(message: string): InteractionResponse {
  return {
    type: 4,
    data: {
      embeds: [{ description: message, color: 0x82ff8c }],
    },
  }
}

function errorResponse(message: string): InteractionResponse {
  return {
    type: 4,
    data: {
      embeds: [{ title: 'Error', description: message, color: 0xff0000 }],
    },
  }
}
