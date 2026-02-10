import { Metadata } from 'next'
import { notFound } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100'

type Props = {
  params: { id: string }
  children: React.ReactNode
}

async function getOffer(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/offers/${id}`, {
      cache: 'no-store' // Don't cache during processing
    })

    if (!res.ok) {
      return null
    }

    return await res.json()
  } catch (error) {
    console.error('Failed to fetch offer for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const offer = await getOffer(params.id)

  if (!offer || !offer.item) {
    return {
      title: 'Offer Loading | JakeBuysIt',
      description: 'Your offer is being processed by Jake',
    }
  }

  // Use SEO title if available, otherwise generate basic title
  const title = offer.seoTitle || `${offer.item.brand} ${offer.item.model} - ${offer.item.condition}`
  const description = `Get an instant cash offer for your ${offer.item.brand} ${offer.item.model}. ${offer.item.condition} condition. ${offer.pricing ? `We're offering $${offer.pricing.offerAmount}` : 'Analyzing market value now'}.`

  // Get first photo for OG image
  const image = offer.photos?.[0]?.url || '/og-default.jpg'

  // Generate structured data (JSON-LD)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: description,
    image: offer.photos?.map((p: any) => p.url) || [],
    brand: {
      '@type': 'Brand',
      name: offer.item.brand
    },
    model: offer.item.model,
    ...(offer.pricing && {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: offer.pricing.offerAmount,
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'JakeBuysIt'
        },
        validFrom: offer.createdAt,
        ...(offer.expiresAt && { priceValidUntil: offer.expiresAt })
      }
    }),
    ...(offer.item.condition && {
      itemCondition: `https://schema.org/${offer.item.condition === 'New' ? 'NewCondition' : 'UsedCondition'}`
    }),
    ...(offer.item.features && offer.item.features.length > 0 && {
      additionalProperty: offer.item.features.map((feature: string) => ({
        '@type': 'PropertyValue',
        name: 'Feature',
        value: feature
      }))
    })
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    other: {
      'structured-data': JSON.stringify(structuredData)
    }
  }
}

export default function OfferLayout({ children }: Props) {
  return (
    <>
      {children}
      {/* Inject structured data into page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'JakeBuysIt - Instant Cash Offers',
            description: 'Get instant cash offers for your electronics, gadgets, and more',
          })
        }}
      />
    </>
  )
}
