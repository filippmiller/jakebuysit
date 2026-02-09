"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Bell, BellOff, User, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [volume, setVolume] = useState(80);
  const [notifications, setNotifications] = useState(true);

  return (
    <main className="min-h-screen bg-gradient-to-b from-saloon-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-dusty-800 mb-8">Settings</h1>

        {/* Voice Settings */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-dusty-800 mb-4 flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-saloon-600" />
            Voice Settings
          </h2>

          <div className="space-y-4">
            {/* Voice Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-dusty-800">Jake's Voice</p>
                <p className="text-sm text-dusty-600">
                  Hear Jake speak his offers
                </p>
              </div>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  voiceEnabled ? "bg-saloon-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                    voiceEnabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Auto-play */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-dusty-800">Auto-play</p>
                <p className="text-sm text-dusty-600">
                  Automatically play voice messages
                </p>
              </div>
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  autoPlay ? "bg-saloon-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                    autoPlay ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-dusty-800">Volume</p>
                <span className="text-sm text-dusty-600">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-saloon-500"
              />
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-dusty-800 mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6 text-saloon-600" />
            Notifications
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-dusty-800">Push Notifications</p>
              <p className="text-sm text-dusty-600">
                Get updates on your offers and shipments
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                notifications ? "bg-saloon-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                  notifications ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Account Settings */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-dusty-800 mb-4 flex items-center gap-2">
            <User className="w-6 h-6 text-saloon-600" />
            Account
          </h2>

          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
              <p className="font-medium text-dusty-800">Edit Profile</p>
              <p className="text-sm text-dusty-600">
                Update your name and contact info
              </p>
            </button>
            <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
              <p className="font-medium text-dusty-800">Change Email</p>
              <p className="text-sm text-dusty-600">partner@example.com</p>
            </button>
          </div>
        </section>

        {/* Payout Methods */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-dusty-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-saloon-600" />
            Payout Methods
          </h2>

          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border-2 border-gray-200">
              <p className="font-medium text-dusty-800">PayPal</p>
              <p className="text-sm text-dusty-600">p*****r@example.com</p>
            </button>
            <button className="w-full px-4 py-3 bg-saloon-50 text-saloon-600 hover:bg-saloon-100 rounded-lg transition-colors font-medium">
              + Add Payout Method
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
