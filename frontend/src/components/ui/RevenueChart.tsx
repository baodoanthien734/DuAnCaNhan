'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartProps {
  data: { name: string; total: number }[];
}

export default function RevenueChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-sm flex items-center justify-center h-full">Chưa có dữ liệu.</div>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
          {/* Format số tiền rút gọn trên trục Y (VD: 1M, 500K) */}
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#6b7280', fontSize: 12}} 
            tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val)} 
          />
          <Tooltip formatter={(value: any) => new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫'} />
          <Area type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}