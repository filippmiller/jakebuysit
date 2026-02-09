"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { jakeVoice } from "@/lib/jake-scripts";
import { HeroSection } from "@/components/HeroSection";
import { apiClient } from "@/lib/api-client";

const FALLBACK_OFFERS = [
  { item: "iPhone 14 Pro", price: "$520" },
  { item: "MacBook Air M2", price: "$780" },
  { item: "Nintendo Switch", price: "$180" },
  { item: "AirPods Pro", price: "$140" },
  { item: "iPad Air", price: "$350" },
  { item: "PS5 Console", price: "$380" },
];

export default function Home() {
  const [recentOffers, setRecentOffers] = useState(FALLBACK_OFFERS);

  useEffect(() => {
    // Try to load real recent offers; fall back to mock data silently
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/offers/recent`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.offers?.length > 0) {
          setRecentOffers(
            data.offers.map((o: any) => ({
              item: `${o.itemBrand || ""} ${o.itemModel || "Item"}`.trim(),
              price: `$${o.offerAmount}`,
            }))
          );
        }
      })
      .catch(() => { /* Keep fallback data */ });
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* How It Works */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center text-dusty-800 mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            {jakeVoice.howItWorks.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-saloon-100 rounded-full flex items-center justify-center text-4xl font-bold text-saloon-600">
                  {index + 1}
                </div>
                <h3 className="text-2xl font-bold text-dusty-800 mb-4">
                  {step.title}
                </h3>
                <p className="text-dusty-600 text-lg">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Offers Ticker */}
      <section className="py-16 px-4 bg-saloon-50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-dusty-800 mb-8">
            Recent Offers
          </h3>

          <div className="overflow-hidden">
            <div className="flex animate-ticker">
              {[0, 1].map((setIdx) => (
                <div key={setIdx} className="flex gap-6 shrink-0 pr-6">
                  {recentOffers.map((offer, index) => (
                    <div
                      key={`${setIdx}-${index}`}
                      className="flex-shrink-0 px-6 py-4 bg-white rounded-lg shadow-md"
                    >
                      <p className="text-sm text-dusty-600">{offer.item}</p>
                      <p className="text-2xl font-bold text-saloon-600">
                        {offer.price}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-center text-dusty-800 mb-16">
            Got Questions?
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "How does Jake know what to pay?",
                a: "I check real market data from eBay, Amazon, and more. You get what it's actually worth, not some made-up number.",
              },
              {
                q: "How fast do I get paid?",
                a: "Accept my offer, ship it out, and I'll send your money within 24 hours of receivin' it. Quick as a rattlesnake's strike.",
              },
              {
                q: "What if I don't like the offer?",
                a: "No hard feelings, partner! Just decline and we'll call it a day. No strings attached.",
              },
              {
                q: "What can I sell?",
                a: "Electronics, tools, collectibles, jewelry - if it's got value, I'll take a look. Just snap a few photos and I'll tell ya what I can do.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-saloon-50 rounded-xl"
              >
                <h3 className="text-xl font-bold text-dusty-800 mb-2">
                  {faq.q}
                </h3>
                <p className="text-dusty-600">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-b from-saloon-500 to-saloon-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Ready to Get Paid?
          </h2>
          <p className="text-2xl mb-12 opacity-90">
            Show Jake what you got. Takes less than a minute.
          </p>

          <Link
            href="/submit"
            className="inline-block px-16 py-6 bg-white text-saloon-600 text-2xl font-bold rounded-full hover:scale-105 transition-all shadow-2xl"
          >
            Get Your Offer Now
          </Link>
        </div>
      </section>
    </main>
  );
}
