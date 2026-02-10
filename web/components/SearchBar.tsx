"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface SearchResult {
  id: string
  itemBrand: string
  itemModel: string
  itemCategory: string
  itemCondition: string
  offerAmount: number | null
  seoTitle: string | null
  thumbnailUrl: string | null
  relevance: number
}

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100'
        const response = await fetch(
          `${apiBase}/api/v1/offers/search?q=${encodeURIComponent(query)}&limit=5`
        )

        if (response.ok) {
          const data = await response.json()
          setResults(data.results)
          setIsOpen(true)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (id: string) => {
    router.push(`/offers/${id}`)
    setIsOpen(false)
    setQuery("")
  }

  const handleClear = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for items..."
          className="w-full pl-10 pr-10 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg
                     text-zinc-100 placeholder:text-zinc-500
                     focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-transparent
                     transition-all duration-200"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-zinc-900/95 border border-zinc-800
                        rounded-lg shadow-2xl backdrop-blur-sm z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-zinc-500">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.id)}
                  className="w-full p-3 flex items-start gap-3 hover:bg-zinc-800/50
                             transition-colors text-left"
                >
                  {/* Thumbnail */}
                  {result.thumbnailUrl ? (
                    <img
                      src={result.thumbnailUrl}
                      alt={result.seoTitle || `${result.itemBrand} ${result.itemModel}`}
                      className="w-12 h-12 object-cover rounded bg-zinc-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center">
                      <Search className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-100 truncate">
                      {result.seoTitle || `${result.itemBrand} ${result.itemModel}`}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {result.itemCategory} • {result.itemCondition}
                    </p>
                    {result.offerAmount && (
                      <p className="text-sm text-amber-500 font-semibold">
                        ${result.offerAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
