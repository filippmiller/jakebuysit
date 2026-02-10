"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { JakeCharacter } from "@/components/JakeCharacter";
import { JakeState, jakeVoice } from "@/lib/jake-scripts";
import { apiClient, DashboardData } from "@/lib/api-client";
import { formatCurrency, formatTimeRemaining } from "@/lib/utils";
import {
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  Camera,
  CheckCircle,
  XCircle,
  Truck,
  Star,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user ID - in production would come from auth
  const userId = "mock-user-123";

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardData = await apiClient.getDashboard(userId);
      setData(dashboardData);
    } catch (err) {
      setError(jakeVoice.errors.generic);
      console.error("Failed to load dashboard:", err);
      // Mock data for development
      setData(getMockDashboardData());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0d0a]">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#a89d8a]">{jakeVoice.loading.default}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0d0a] p-4">
        <div className="max-w-md w-full bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8 text-center">
          <p className="text-red-400 mb-4">{error || "Failed to load dashboard"}</p>
          <button
            onClick={loadDashboard}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-[#1a1510] font-semibold rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    if (data.user.vipStatus) {
      return jakeVoice.dashboard.greeting.vip;
    }
    if (data.activeOffers.length > 0 || data.shipments.length > 0) {
      return jakeVoice.dashboard.greeting.returning;
    }
    return jakeVoice.dashboard.greeting.new;
  };

  return (
    <main className="min-h-screen bg-[#0f0d0a] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-amber-900/[0.06] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-800/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/[0.15] to-amber-400/[0.05] border-b border-white/[0.08] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Jake Greeting */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl font-bold text-[#f5f0e8] mb-2">
                {getGreeting()}
              </h1>
              <p className="text-[#a89d8a] text-lg">
                {data.user.name || "Partner"}
              </p>
              {data.user.vipStatus && (
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="text-sm text-amber-300">VIP Customer</span>
                </div>
              )}
            </motion.div>

            {/* Jake Character */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:block"
            >
              <JakeCharacter
                state={data.user.vipStatus ? JakeState.EXCITED : JakeState.IDLE}
                className="w-full h-48"
              />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Jake Bucks Balance */}
        {data.user.jakeBucks > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-500/[0.15] to-amber-400/[0.08] border border-amber-400/20 rounded-2xl p-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-amber-400" />
              <h2 className="text-3xl font-bold text-[#f5f0e8]">
                Jake Bucks Balance
              </h2>
            </div>
            <p className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent mb-2">
              {formatCurrency(data.user.jakeBucks)}
            </p>
            <p className="text-[#a89d8a]">
              Use on your next sale for a bonus!
            </p>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Package className="w-6 h-6" />}
            label="Active Offers"
            value={data.activeOffers.length}
            color="blue"
          />
          <StatCard
            icon={<Truck className="w-6 h-6" />}
            label="In Transit"
            value={data.shipments.filter((s) => s.status === "in_transit").length}
            color="orange"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Total Earned"
            value={formatCurrency(
              data.payouts.reduce((sum, p) => sum + p.amount, 0)
            )}
            color="green"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Completed"
            value={data.payouts.filter((p) => p.status === "completed").length}
            color="purple"
          />
        </div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Link
            href="/submit"
            className="block bg-gradient-to-r from-amber-500/[0.15] to-amber-400/[0.08] border border-amber-400/20 hover:border-amber-400/40 rounded-2xl p-8 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[#f5f0e8] mb-2">
                  Got somethin&apos; else to sell?
                </h3>
                <p className="text-[#a89d8a]">
                  Show Jake what you got and get paid today
                </p>
              </div>
              <Camera className="w-16 h-16 text-amber-400/60" />
            </div>
          </Link>
        </motion.div>

        {/* Active Offers */}
        {data.activeOffers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-400" />
              Active Offers
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {data.activeOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          </section>
        )}

        {/* Shipments */}
        {data.shipments.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
              <Truck className="w-6 h-6 text-amber-400" />
              Shipments
            </h2>
            <div className="space-y-4">
              {data.shipments.map((shipment) => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
              ))}
            </div>
          </section>
        )}

        {/* Payout History */}
        {data.payouts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              Payout History
            </h2>
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#706557] uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#706557] uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#706557] uppercase">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#706557] uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-white/[0.04]">
                      <td className="px-6 py-4 text-sm text-[#c3bbad]">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#f5f0e8]">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#a89d8a]">
                        {payout.method}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payout.status === "completed"
                              ? "bg-green-500/[0.15] text-green-400 border border-green-500/20"
                              : payout.status === "pending"
                              ? "bg-amber-500/[0.15] text-amber-400 border border-amber-500/20"
                              : "bg-white/[0.08] text-[#a89d8a] border border-white/[0.1]"
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty State */}
        {data.activeOffers.length === 0 &&
          data.shipments.length === 0 &&
          data.payouts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">🤠</div>
              <h3 className="text-2xl font-bold text-[#f5f0e8] mb-2">
                Ready to get started?
              </h3>
              <p className="text-[#a89d8a] mb-6">
                Show Jake what you got and get paid today!
              </p>
              <Link
                href="/submit"
                className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-[#1a1510] font-semibold rounded-lg transition-all"
              >
                <Camera className="w-5 h-5 inline mr-2" />
                Sell Your First Item
              </Link>
            </motion.div>
          )}
      </div>
      </div>
    </main>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "blue" | "orange" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-blue-500/[0.1] text-blue-400 border-blue-500/20",
    orange: "bg-orange-500/[0.1] text-orange-400 border-orange-500/20",
    green: "bg-green-500/[0.1] text-green-400 border-green-500/20",
    purple: "bg-purple-500/[0.1] text-purple-400 border-purple-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors[color]} border rounded-xl p-4`}
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#f5f0e8]">{value}</p>
    </motion.div>
  );
}

// Offer Card Component
function OfferCard({
  offer,
}: {
  offer: DashboardData["activeOffers"][0];
}) {
  const expiresAt = new Date(offer.expiresAt);
  const isExpired = expiresAt < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-xl p-6 hover:border-white/[0.2] transition-colors"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-[#f5f0e8]">{offer.itemName}</h3>
          {offer.brand && (
            <p className="text-sm text-[#a89d8a]">{offer.brand}</p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isExpired
              ? "bg-red-500/[0.15] text-red-400 border border-red-500/20"
              : "bg-green-500/[0.15] text-green-400 border border-green-500/20"
          }`}
        >
          {isExpired ? "Expired" : "Active"}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-[#a89d8a] mb-1">Jake&apos;s Offer</p>
        <p className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
          {formatCurrency(offer.jakePrice)}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-[#a89d8a] mb-4">
        <Clock className="w-4 h-4" />
        <span>{formatTimeRemaining(expiresAt)}</span>
      </div>

      <Link
        href={`/offers/${offer.id}`}
        className="block w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-[#1a1510] text-center font-semibold rounded-lg transition-all"
      >
        View Offer
      </Link>
    </motion.div>
  );
}

// Shipment Card Component
function ShipmentCard({
  shipment,
}: {
  shipment: DashboardData["shipments"][0];
}) {
  const getStatusIcon = () => {
    switch (shipment.status) {
      case "label_created":
        return <Package className="w-5 h-5 text-blue-600" />;
      case "in_transit":
        return <Truck className="w-5 h-5 text-orange-600" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    return shipment.status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-xl p-6 hover:border-white/[0.2] transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <p className="font-semibold text-[#f5f0e8]">
              Tracking: {shipment.trackingNumber}
            </p>
            <p className="text-sm text-[#a89d8a]">{getStatusText()}</p>
          </div>
        </div>
        <a
          href={shipment.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-[#c3bbad] rounded-lg transition-colors text-sm font-medium"
        >
          View Label
        </a>
      </div>
    </motion.div>
  );
}

// Mock data for development
function getMockDashboardData(): DashboardData {
  return {
    user: {
      name: "Partner",
      email: "partner@example.com",
      jakeBucks: 45,
      vipStatus: "gold",
    },
    activeOffers: [
      {
        id: "offer-1",
        itemName: "iPhone 13 Pro",
        brand: "Apple",
        model: "128GB",
        condition: "Good",
        category: "Electronics",
        jakePrice: 520,
        marketAvg: 650,
        marketRange: { min: 500, max: 750 },
        comparablesCount: 147,
        confidence: 0.89,
        jakeVoiceUrl: "/jake/voices/offer-1.mp3",
        jakeScript: "That's a fine iPhone you got there, partner!",
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        animationState: "offering",
      },
    ],
    shipments: [
      {
        id: "ship-1",
        offerId: "offer-2",
        status: "in_transit",
        trackingNumber: "1Z999AA10123456784",
        labelUrl: "https://example.com/label.pdf",
      },
    ],
    payouts: [
      {
        id: "payout-1",
        amount: 520,
        method: "PayPal",
        status: "completed",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "payout-2",
        amount: 180,
        method: "Venmo",
        status: "completed",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}
