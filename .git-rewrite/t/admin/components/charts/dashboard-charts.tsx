'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data - replace with real API calls
const offersOverTimeData = [
  { date: 'Jan 1', offers: 45 },
  { date: 'Jan 2', offers: 52 },
  { date: 'Jan 3', offers: 48 },
  { date: 'Jan 4', offers: 61 },
  { date: 'Jan 5', offers: 55 },
  { date: 'Jan 6', offers: 67 },
  { date: 'Jan 7', offers: 72 },
];

const acceptanceRateData = [
  { date: 'Week 1', rate: 35 },
  { date: 'Week 2', rate: 38 },
  { date: 'Week 3', rate: 42 },
  { date: 'Week 4', rate: 41 },
];

const revenueData = [
  { month: 'Jan', revenue: 2400, costs: 1800 },
  { month: 'Feb', revenue: 3200, costs: 2200 },
  { month: 'Mar', revenue: 4100, costs: 2800 },
  { month: 'Apr', revenue: 3800, costs: 2500 },
];

const categoryData = [
  { name: 'Electronics', value: 45 },
  { name: 'Gaming', value: 25 },
  { name: 'Fashion', value: 15 },
  { name: 'Collectibles', value: 10 },
  { name: 'Other', value: 5 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DashboardCharts() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Offers Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Offers Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={offersOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="offers" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Acceptance Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Acceptance Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={acceptanceRateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue vs Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#8884d8" />
              <Bar dataKey="costs" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
