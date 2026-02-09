"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { JakeCharacter } from "@/components/JakeCharacter";
import { JakeState, jakeVoice } from "@/lib/jake-scripts";
import { Camera, TrendingUp, DollarSign, Clock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-saloon-50 to-white px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Jake Character */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <JakeCharacter state={JakeState.IDLE} className="w-full h-96" />
          </motion.div>

          {/* Hero Copy */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-6xl font-bold text-dusty-800 mb-4">
              {jakeVoice.hero.headline}
            </h1>
            <p className="text-2xl text-dusty-600 mb-8">
              {jakeVoice.hero.subheadline}
            </p>

            <Link
              href="/submit"
              className="inline-block px-12 py-6 bg-saloon-500 hover:bg-saloon-600 text-white text-2xl font-bold rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              {jakeVoice.hero.cta}
            </Link>

            {/* Trust Signals */}
            <div className="mt-8 flex gap-6 text-dusty-600">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Instant offers</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Fair prices</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Real market data</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

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
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="flex gap-6"
            >
              {[
                { item: "iPhone 14 Pro", price: "$520" },
                { item: "MacBook Air M2", price: "$780" },
                { item: "Nintendo Switch", price: "$180" },
                { item: "AirPods Pro", price: "$140" },
                { item: "iPad Air", price: "$350" },
                { item: "PS5 Console", price: "$380" },
              ].map((offer, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-6 py-4 bg-white rounded-lg shadow-md"
                >
                  <p className="text-sm text-dusty-600">{offer.item}</p>
                  <p className="text-2xl font-bold text-saloon-600">
                    {offer.price}
                  </p>
                </div>
              ))}
            </motion.div>
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
