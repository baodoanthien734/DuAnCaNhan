'use client';
import { useLocale, useTranslations } from 'next-intl';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartProps {
  data: { name: string; total: number }[];
}

export default function OrderChart({ data }: ChartProps) {
  const locale = useLocale();
  const t = useTranslations('admin_dashboard.charts');

  const formatOrderCount = (value: number) => {
    const num = Number(value || 0);
    const formattedNum = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN').format(num);
    const unit = num <= 1 ? t('order_unit_single') : t('order_unit_plural');
    
    return `${formattedNum} ${unit}`;
  };

  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-sm flex items-center justify-center h-full">{t('empty_data')}</div>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOrder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
          <YAxis 
            allowDecimals={false}
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#6b7280', fontSize: 12}} 
            tickFormatter={(val) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { notation: 'compact' }).format(val)} 
          />
          <Tooltip formatter={(value: any) => [formatOrderCount(value), '']} />
          <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrder)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}