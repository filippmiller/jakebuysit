'use client';

import React from 'react';
import { Coins } from 'lucide-react';

interface JakeBucksDisplayProps {
  balance: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function JakeBucksDisplay({
  balance,
  size = 'md',
  showLabel = true,
  className = '',
}: JakeBucksDisplayProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Coins className={`${sizeClasses[size]} text-amber-500`} />
      <div className="flex items-center gap-1">
        <span className={`font-bold ${textSizeClasses[size]} text-amber-500`}>
          {balance.toLocaleString()}
        </span>
        {showLabel && (
          <span className={`${textSizeClasses[size]} text-gray-400`}>
            Jake Bucks
          </span>
        )}
      </div>
    </div>
  );
}

interface TransactionHistoryProps {
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: Date | string;
  }>;
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No transactions yet</p>
        <p className="text-sm mt-1">Start earning Jake Bucks by selling items!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isEarned = tx.type === 'earned' || tx.amount > 0;
        const date = new Date(tx.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{tx.description}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formattedDate}</p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-bold ${
                  isEarned ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {isEarned ? '+' : ''}{Math.abs(tx.amount).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Balance: {tx.balance_after.toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
