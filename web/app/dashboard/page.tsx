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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-saloon-50 to-white">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-saloon-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-dusty-600">{jakeVoice.loading.default}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-saloon-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-red-600 mb-4">{error || "Failed to load dashboard"}</p>
          <button
            onClick={loadDashboard}
            className="px-6 py-3 bg-saloon-500 hover:bg-saloon-600 text-white rounded-lg transition-colors"
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
    <main className="min-h-screen bg-gradient-to-b from-saloon-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-saloon-500 to-saloon-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Jake Greeting */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl font-bold mb-2">
                {getGreeting()}
              </h1>
              <p className="text-saloon-100 text-lg">
                {data.user.name || "Partner"}
              </p>
              {data.user.vipStatus && (
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  <span className="text-sm">VIP Customer</span>
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
            className="mb-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl shadow-xl p-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-yellow-900" />
              <h2 className="text-3xl font-bold text-yellow-900">
                Jake Bucks Balance
              </h2>
            </div>
            <p className="text-5xl font-bold text-yellow-900 mb-2">
              {formatCurrency(data.user.jakeBucks)}
            </p>
            <p className="text-yellow-800">
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
            className="block bg-saloon-500 hover:bg-saloon-600 text-white rounded-2xl shadow-xl p-8 transition-all hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  Got somethin' else to sell?
                </h3>
                <p className="text-saloon-100">
                  Show Jake what you got and get paid today
                </p>
              </div>
              <Camera className="w-16 h-16 opacity-80" />
            </div>
          </Link>
        </motion.div>

        {/* Active Offers */}
        {data.activeOffers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-dusty-800 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-saloon-600" />
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
            <h2 className="text-2xl font-bold text-dusty-800 mb-4 flex items-center gap-2">
              <Truck className="w-6 h-6 text-saloon-600" />
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
            <h2 className="text-2xl font-bold text-dusty-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-saloon-600" />
              Payout History
            </h2>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payout.method}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payout.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : payout.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
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
              <h3 className="text-2xl font-bold text-dusty-800 mb-2">
                Ready to get started?
              </h3>
              <p className="text-dusty-600 mb-6">
                Show Jake what you got and get paid today!
              </p>
              <Link
                href="/submit"
                className="inline-block px-8 py-4 bg-saloon-500 hover:bg-saloon-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Camera className="w-5 h-5 inline mr-2" />
                Sell Your First Item
              </Link>
            </motion.div>
          )}
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
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors[color]} border-2 rounded-xl p-4`}
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
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
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-dusty-800">{offer.itemName}</h3>
          {offer.brand && (
            <p className="text-sm text-dusty-600">{offer.brand}</p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isExpired
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {isExpired ? "Expired" : "Active"}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-dusty-600 mb-1">Jake's Offer</p>
        <p className="text-3xl font-bold text-saloon-600">
          {formatCurrency(offer.jakePrice)}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-dusty-600 mb-4">
        <Clock className="w-4 h-4" />
        <span>{formatTimeRemaining(expiresAt)}</span>
      </div>

      <Link
        href={`/offers/${offer.id}`}
        className="block w-full py-3 bg-saloon-500 hover:bg-saloon-600 text-white text-center font-semibold rounded-lg transition-colors"
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
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <p className="font-semibold text-dusty-800">
              Tracking: {shipment.trackingNumber}
            </p>
            <p className="text-sm text-dusty-600">{getStatusText()}</p>
          </div>
        </div>
        <a
          href={shipment.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-dusty-700 rounded-lg transition-colors text-sm font-medium"
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
