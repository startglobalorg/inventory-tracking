'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockDataPoint {
    date: string;
    totalStock: number;
}

interface StockGraphCardProps {
    data: StockDataPoint[];
}

export function StockGraphCard({ data }: StockGraphCardProps) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Total Stock Over Time</h3>
                <p className="text-slate-400 text-center py-8">No historical data available</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Total Stock Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                        itemStyle={{ color: '#3b82f6' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="totalStock"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Total Stock"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
