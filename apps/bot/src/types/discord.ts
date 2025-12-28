// Discord Gateway Opcodes
export enum GatewayOpcode {
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  PresenceUpdate = 3,
  VoiceStateUpdate = 4,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,
  Hello = 10,
  HeartbeatAck = 11,
}

// Discord Gateway Intents
export enum GatewayIntent {
  Guilds = 1 << 0,
  GuildMembers = 1 << 1,
  GuildModeration = 1 << 2,
  GuildEmojisAndStickers = 1 << 3,
  GuildIntegrations = 1 << 4,
  GuildWebhooks = 1 << 5,
  GuildInvites = 1 << 6,
  GuildVoiceStates = 1 << 7,
  GuildPresences = 1 << 8,
  GuildMessages = 1 << 9,
  GuildMessageReactions = 1 << 10,
  GuildMessageTyping = 1 << 11,
  DirectMessages = 1 << 12,
  DirectMessageReactions = 1 << 13,
  DirectMessageTyping = 1 << 14,
  MessageContent = 1 << 15,
  GuildScheduledEvents = 1 << 16,
}

// Gateway payload types
export interface GatewayPayload {
  op: GatewayOpcode
  d: unknown
  s?: number | null
  t?: string | null
}

export interface HelloPayload {
  heartbeat_interval: number
}

export interface ReadyPayload {
  v: number
  user: DiscordUser
  session_id: string
  resume_gateway_url: string
  guilds: { id: string; unavailable?: boolean }[]
  application: { id: string; flags: number }
}

export interface IdentifyPayload {
  token: string
  intents: number
  properties: {
    os: string
    browser: string
    device: string
  }
  presence?: {
    activities?: Activity[]
    status?: 'online' | 'dnd' | 'idle' | 'invisible' | 'offline'
    since?: number | null
    afk?: boolean
  }
}

export interface ResumePayload {
  token: string
  session_id: string
  seq: number
}

// Discord API types
export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  bot?: boolean
}

export interface DiscordMessage {
  id: string
  channel_id: string
  guild_id?: string
  author: DiscordUser
  content: string
  timestamp: string
  embeds: DiscordEmbed[]
  flags?: number
}

export interface DiscordEmbed {
  title?: string
  type?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
}

export interface Activity {
  name: string
  type: ActivityType
  url?: string
}

export enum ActivityType {
  Playing = 0,
  Streaming = 1,
  Listening = 2,
  Watching = 3,
  Custom = 4,
  Competing = 5,
}

// Message flags
export enum MessageFlags {
  SuppressEmbeds = 1 << 2,
}

// Interaction types
export enum InteractionType {
  Ping = 1,
  ApplicationCommand = 2,
  MessageComponent = 3,
  ApplicationCommandAutocomplete = 4,
  ModalSubmit = 5,
}

export enum InteractionResponseType {
  Pong = 1,
  ChannelMessageWithSource = 4,
  DeferredChannelMessageWithSource = 5,
  DeferredUpdateMessage = 6,
  UpdateMessage = 7,
  ApplicationCommandAutocompleteResult = 8,
  Modal = 9,
}

export interface Interaction {
  id: string
  application_id: string
  type: InteractionType
  data?: ApplicationCommandData
  guild_id?: string
  channel_id?: string
  member?: { user: DiscordUser }
  user?: DiscordUser
  token: string
}

export interface ApplicationCommandData {
  id: string
  name: string
  type: number
  options?: ApplicationCommandOption[]
}

export interface ApplicationCommandOption {
  name: string
  type: number
  value?: string | number | boolean
  focused?: boolean
  options?: ApplicationCommandOption[] // For subcommands
}

export interface InteractionResponse {
  type: InteractionResponseType
  data?: InteractionResponseData
}

export interface InteractionResponseData {
  content?: string
  embeds?: DiscordEmbed[]
  flags?: number
  choices?: AutocompleteChoice[]
}

export interface AutocompleteChoice {
  name: string
  value: string
}
