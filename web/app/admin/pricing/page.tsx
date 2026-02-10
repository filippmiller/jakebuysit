'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Zap, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

interface OptimizerStats {
  total_adjustments: number;
  total_reduction: number;
  avg_reduction_pct: number;
  first_optimization: string;
  last_optimization: string;
  breakdown: Array<{
    reason: string;
    count: number;
    avg_reduction: number;
  }>;
}

export default function PricingOptimizerPage() {
  const [stats, setStats] = useState<OptimizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const response = await adminApi.get('/pricing/optimizer-stats');
      setStats(response);
    } catch (error: any) {
      toast.error('Failed to load optimizer stats');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerOptimizer(dryRun: boolean) {
    setTriggering(true);
    try {
      const response = await adminApi.post('/pricing/trigger-optimizer', {
        dryRun,
      });

      toast.success(
        dryRun
          ? 'Dry run completed - check logs for results'
          : 'Optimizer triggered successfully',
        {
          description: `Job ID: ${response.jobId}`,
        }
      );

      // Reload stats after a few seconds
      setTimeout(loadStats, 3000);
    } catch (error: any) {
      toast.error('Failed to trigger optimizer');
      console.error(error);
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 rounded w-1/3"></div>
          <div className="h-64 bg-zinc-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Price Optimizer</h1>
          <p className="text-zinc-600 mt-1">
            Automatic time-decay pricing for stale listings
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => triggerOptimizer(true)}
            disabled={triggering}
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-2" />
            Dry Run
          </Button>
          <Button
            onClick={() => triggerOptimizer(false)}
            disabled={triggering}
          >
            <Zap className="w-4 h-4 mr-2" />
            Trigger Now
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Adjustments (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.total_adjustments || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Reduction</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              ${Math.abs(stats?.total_reduction || 0).toFixed(0)}
              <TrendingDown className="w-5 h-5 ml-2 text-red-500" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Reduction %</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.avg_reduction_pct?.toFixed(1) || 0}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Last Run</CardDescription>
            <CardTitle className="text-lg">
              {stats?.last_optimization
                ? new Date(stats.last_optimization).toLocaleDateString()
                : 'Never'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Breakdown by Reason */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Breakdown</CardTitle>
          <CardDescription>
            Price adjustments by reason (last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.breakdown && stats.breakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Avg Reduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.breakdown.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">
                      {item.reason}
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {item.avg_reduction?.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              No optimization data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How the Optimizer Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Velocity Detection</h4>
            <ul className="space-y-1 text-zinc-600">
              <li>
                • <strong>High</strong> (&gt;5 views/day): No price change
              </li>
              <li>
                • <strong>Medium</strong> (2-5 views/day): Monitor only
              </li>
              <li>
                • <strong>Low</strong> (&lt;2 views/day): Apply time decay
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Time Decay Schedule</h4>
            <ul className="space-y-1 text-zinc-600">
              <li>
                • <strong>7-13 days</strong> + &lt;10 views: -5% reduction
              </li>
              <li>
                • <strong>14-29 days</strong> + &lt;20 views: -10% reduction
              </li>
              <li>
                • <strong>30+ days</strong>: -15% reduction
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Price Floor Protection</h4>
            <p className="text-zinc-600">
              Optimizer will never reduce price below{' '}
              <strong>original offer + 20% margin</strong>
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Schedule</h4>
            <p className="text-zinc-600">
              Runs automatically every day at <strong>2:00 AM</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
