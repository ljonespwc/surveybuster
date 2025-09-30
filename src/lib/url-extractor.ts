export interface ExtractedLink {
  type: 'url' | 'placeholder'
  text: string
  href?: string
}

export interface URLExtractionResult {
  hasLinks: boolean
  links: ExtractedLink[]
}

/**
 * Extracts URLs and link references from FAQ answers
 * Returns structured data with actual URLs and placeholders for vague references
 */
export function extractURLsFromAnswer(answer: string): URLExtractionResult {
  const links: ExtractedLink[] = []

  // Pattern to match explicit URLs (domains)
  // Improved to avoid matching Ph.D, M.D., etc.
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)*/g
  const matches = answer.match(urlPattern)

  if (matches) {
    matches.forEach(match => {
      // Skip common abbreviations that aren't URLs
      if (match.match(/^(Ph\.D|M\.D|Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.|Inc\.|Ltd\.|LLC)/i)) {
        return
      }

      // Remove trailing punctuation (periods, commas, etc.)
      const cleanMatch = match.replace(/[.,;!?]$/, '')

      // Validate it looks like a real domain (has at least one dot and TLD is 2+ chars)
      const parts = cleanMatch.split('.')
      const tld = parts[parts.length - 1]
      if (!cleanMatch.includes('.') || !tld || tld.length < 2) {
        return
      }

      // Clean up the URL
      const cleanUrl = cleanMatch.startsWith('http') ? cleanMatch :
                      cleanMatch.startsWith('www.') ? `https://${cleanMatch}` :
                      `https://${cleanMatch}`

      // For Airtable forms, show cleaner display text
      let displayText = cleanMatch
      if (cleanUrl.includes('airtable.com')) {
        // Check by app ID for more reliable matching
        if (cleanUrl.includes('app3khvqyh3rdqa5g')) {
          displayText = 'Guest Suggestion Form'
        } else if (cleanUrl.includes('app9yIGPaaYyDlhxz')) {
          displayText = 'Sponsorship Form'
        } else if (cleanUrl.includes('appzMBzeGsDceqhoE')) {
          displayText = 'Speaking Request Form'
        } else if (cleanUrl.includes('appDg88FrbCxePxpG')) {
          displayText = 'Podcast Invitation Form'
        } else {
          displayText = 'Submission Form'
        }
      } else {
        // For non-Airtable URLs, remove https:// for cleaner display
        displayText = cleanMatch.replace(/^https?:\/\/(www\.)?/, '')
      }

      links.push({
        type: 'url',
        text: displayText,
        href: cleanUrl
      })
    })
  }

  // Check for vague link references and provide actual URLs
  const vagueReferences = [
    // Newsletter signup
    { pattern: /join the Neural Network newsletter/i, url: 'https://www.hubermanlab.com/newsletter' },
    // Email list for events
    { pattern: /join our email list/i, url: 'https://www.hubermanlab.com/events' },
    // Past newsletters
    { pattern: /available here/i, url: 'https://www.hubermanlab.com/newsletter' },
    // Help articles
    { pattern: /review these help articles/i, url: 'https://support.supercast.com/category/53-subscriber-support' },
    // Stanford lab website - publications
    { pattern: /Stanford lab website.*publications/i, url: 'https://hubermanlab.stanford.edu/publications' },
    // Stanford lab website - research
    { pattern: /Stanford lab website.*research/i, url: 'https://hubermanlab.stanford.edu/giving' },
    // Stanford lab website - general
    { pattern: /Stanford lab website/i, url: 'https://hubermanlab.stanford.edu/' },
  ]

  vagueReferences.forEach(({ pattern, url }) => {
    if (pattern.test(answer)) {
      // Use the full URL without https:// for display
      const displayText = url.replace(/^https?:\/\//, '')

      // Check if we haven't already added this URL
      if (!links.some(link => link.href === url)) {
        links.push({
          type: 'url',
          text: displayText,
          href: url
        })
      }
    }
  })

  return {
    hasLinks: links.length > 0,
    links
  }
}

/**
 * Maps known FAQ patterns to their actual URLs
 * This could be expanded with a more comprehensive mapping
 */
export function getKnownURLMappings(): Record<string, string> {
  return {
    'shop.hubermanlab.com': 'https://shop.hubermanlab.com',
    'hubermanlab.com/search': 'https://hubermanlab.com/search',
    'www.supercast.com': 'https://www.supercast.com',
    'support@supercast.com': 'mailto:support@supercast.com',
  }
}