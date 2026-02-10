import { MetadataRoute } from 'next'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch all "ready" offers from the backend
    const response = await fetch(`${API_BASE}/api/v1/offers/public`, {
      next: { revalidate: 3600 } // Revalidate every hour
    })

    if (!response.ok) {
      console.error('Failed to fetch offers for sitemap:', response.statusText)
      return getStaticPages()
    }

    const offers = await response.json()

    // Generate offer URLs
    const offerUrls: MetadataRoute.Sitemap = offers.map((offer: any) => {
      // Calculate priority based on offer age (newer = higher priority)
      const createdDate = new Date(offer.created_at)
      const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)

      let priority = 0.8
      if (ageInDays < 7) priority = 1.0      // Last week
      else if (ageInDays < 30) priority = 0.9  // Last month
      else if (ageInDays < 90) priority = 0.7  // Last 3 months
      else priority = 0.6                      // Older

      return {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/offers/${offer.id}`,
        lastModified: new Date(offer.updated_at),
        changeFrequency: 'daily' as const,
        priority
      }
    })

    // Combine with static pages
    return [...getStaticPages(), ...offerUrls]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return getStaticPages()
  }
}

function getStaticPages(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ]
}
