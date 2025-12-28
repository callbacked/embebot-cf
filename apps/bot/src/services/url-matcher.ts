import type { CustomService } from '@embebot/db'

export interface MatchConfig {
  pattern: RegExp
  baseLink: string
  vxLink: string
  serviceName: string
}

export interface MatchResult {
  original: string
  vxUrl: string
  serviceName: string
}

// URL patterns ported from match.json
const MATCH_CONFIGS: MatchConfig[] = [
  {
    pattern: /https?:\/\/(?:www\.)?twitter\.com\/[\w-]+\/status\/\d+/g,
    baseLink: 'twitter.com',
    vxLink: 'vxtwitter.com',
    serviceName: 'twitter',
  },
  {
    pattern: /https?:\/\/(?:www\.)?x\.com\/[\w-]+\/status\/\d+/g,
    baseLink: 'x.com',
    vxLink: 'vxtwitter.com',
    serviceName: 'x',
  },
  {
    pattern: /https?:\/\/(?:www\.|vm\.)?tiktok\.com\/(?:@[\w-]+\/video\/\d+|t\/[\w-]+)\/?/g,
    baseLink: 'tiktok.com',
    vxLink: 'vxtiktok.com',
    serviceName: 'tiktok',
  },
  {
    pattern: /https:\/\/www\.instagram\.com\/(?:reel|p)\/[\w-]+\/?/g,
    baseLink: 'instagram.com',
    vxLink: 'ddinstagram.com',
    serviceName: 'instagram',
  },
  {
    pattern:
      /https?:\/\/(?:www\.)?reddit\.com\/(?:r\/[\w-]+\/comments\/[\w-]+(?:\/[\w-]*)?|u\/[\w-]+|[\w/]+)?(?:\?[^\s]*)?/g,
    baseLink: 'reddit.com',
    vxLink: 'vxreddit.com',
    serviceName: 'reddit',
  },
]

export const ALL_SERVICES = MATCH_CONFIGS.map((c) => c.serviceName)

// Default endpoints for display in /settings
export const DEFAULT_ENDPOINTS: Record<string, string> = Object.fromEntries(
  MATCH_CONFIGS.map((c) => [c.serviceName, c.vxLink])
)

export function matchUrls(
  content: string,
  enabledServices: Set<string>,
  customEndpoints?: Record<string, string | null>
): MatchResult[] {
  const results: MatchResult[] = []

  for (const config of MATCH_CONFIGS) {
    if (!enabledServices.has(config.serviceName)) {
      continue
    }

    // Reset regex lastIndex for global patterns
    config.pattern.lastIndex = 0
    const matches = content.matchAll(config.pattern)

    for (const match of matches) {
      const original = match[0]
      // Use custom endpoint if set, otherwise use default
      const vxLink = customEndpoints?.[config.serviceName] || config.vxLink
      const vxUrl = original.replace(config.baseLink, vxLink)
      results.push({
        original,
        vxUrl,
        serviceName: config.serviceName,
      })
    }
  }

  return results
}

export function getServiceByName(name: string): MatchConfig | undefined {
  return MATCH_CONFIGS.find((c) => c.serviceName === name)
}

export function matchCustomUrls(content: string, customServices: CustomService[]): MatchResult[] {
  const urlRegex = /https?:\/\/[^\s<>]+/g
  const urls = content.match(urlRegex) || []
  const results: MatchResult[] = []

  for (const url of urls) {
    try {
      const parsed = new URL(url)
      const hostname = parsed.hostname // already lowercase
      for (const service of customServices) {
        if (!service.enabled) continue
        if (hostname === service.matchDomain || hostname.endsWith('.' + service.matchDomain)) {
          // Replace hostname case-insensitively, preserve path/query
          parsed.hostname = parsed.hostname.replace(
            new RegExp(service.matchDomain.replace(/\./g, '\\.'), 'i'),
            service.replaceDomain
          )
          results.push({
            original: url,
            vxUrl: parsed.href,
            serviceName: `custom:${service.matchDomain}`,
          })
          break
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return results
}
