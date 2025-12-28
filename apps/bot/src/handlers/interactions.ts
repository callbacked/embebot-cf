import type { Env, Interaction, InteractionResponse, AutocompleteChoice } from '../types'
import {
  getEnabledServices,
  setServiceEnabled,
  setAllServicesEnabled,
  getCustomEndpoints,
  setCustomEndpoint,
  resetCustomEndpoint,
} from '../services/database'
import { ALL_SERVICES, DEFAULT_ENDPOINTS } from '../services/url-matcher'

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
      case 'endpoint':
        return handleEndpoint(interaction, env)
      default:
        return errorResponse('Unknown command')
    }
  }

  return errorResponse('Unknown interaction type')
}

function handleAutocomplete(interaction: Interaction): InteractionResponse {
  const focusedOption = interaction.data?.options?.find((opt) => opt.focused)
  // For subcommands, options are nested
  const subcommandOptions = interaction.data?.options?.[0]?.options
  const nestedFocused = subcommandOptions?.find((opt) => opt.focused)
  const query = ((nestedFocused?.value || focusedOption?.value) as string)?.toLowerCase() || ''

  const commandName = interaction.data?.name

  // For endpoint command, don't include 'all' option
  let choices: AutocompleteChoice[] =
    commandName === 'endpoint'
      ? [
          { name: 'Reddit', value: 'reddit' },
          { name: 'TikTok', value: 'tiktok' },
          { name: 'Instagram', value: 'instagram' },
          { name: 'Twitter', value: 'twitter' },
          { name: 'X', value: 'x' },
        ]
      : [
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
    const [enabledServices, customEndpoints] = await Promise.all([
      getEnabledServices(env, guildId),
      getCustomEndpoints(env, guildId),
    ])

    const enabled: string[] = []
    const disabled: string[] = []

    for (const service of ALL_SERVICES) {
      if (enabledServices.has(service)) {
        enabled.push(service)
      } else {
        disabled.push(service)
      }
    }

    // Build endpoints display
    const endpointLines = ALL_SERVICES.map((service) => {
      const custom = customEndpoints[service]
      const endpoint = custom || DEFAULT_ENDPOINTS[service]
      const isCustom = custom ? ' (custom)' : ''
      return `**${service}**: ${endpoint}${isCustom}`
    })

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
              {
                name: 'Endpoints',
                value: endpointLines.join('\n'),
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

async function handleEndpoint(interaction: Interaction, env: Env): Promise<InteractionResponse> {
  const guildId = interaction.guild_id
  if (!guildId) {
    return errorResponse('This command can only be used in a server')
  }

  // Get subcommand (set or reset)
  const subcommand = interaction.data?.options?.[0]
  const subcommandName = subcommand?.name
  const subcommandOptions = subcommand?.options || []

  if (subcommandName === 'set') {
    const service = subcommandOptions.find((o) => o.name === 'service')?.value as string
    let endpoint = subcommandOptions.find((o) => o.name === 'url')?.value as string

    if (!service || !ALL_SERVICES.includes(service)) {
      return errorResponse(`Invalid service. Valid options: ${ALL_SERVICES.join(', ')}`)
    }

    if (!endpoint) {
      return errorResponse('Please provide an endpoint URL')
    }

    // Clean up the endpoint - remove protocol and trailing slashes
    endpoint = endpoint
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .toLowerCase()

    try {
      await setCustomEndpoint(env, guildId, service, endpoint)
      return successResponse(`Set **${service}** endpoint to \`${endpoint}\``)
    } catch (error) {
      console.error('Error setting endpoint:', error)
      return errorResponse('Failed to set endpoint. Please try again.')
    }
  }

  if (subcommandName === 'reset') {
    const service = subcommandOptions.find((o) => o.name === 'service')?.value as string

    if (!service || !ALL_SERVICES.includes(service)) {
      return errorResponse(`Invalid service. Valid options: ${ALL_SERVICES.join(', ')}`)
    }

    try {
      await resetCustomEndpoint(env, guildId, service)
      return successResponse(
        `Reset **${service}** endpoint to default (\`${DEFAULT_ENDPOINTS[service]}\`)`
      )
    } catch (error) {
      console.error('Error resetting endpoint:', error)
      return errorResponse('Failed to reset endpoint. Please try again.')
    }
  }

  return errorResponse('Unknown subcommand')
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
