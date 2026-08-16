'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type SidebarProps = {
  user: { name?: string };
  brand?: string;
  title?: string;
};

export default function Sidebar({ user, brand, title }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('admin_sidebar');

  const navItems = [
    { label: t('nav.dashboard'), href: '/admin' },
    { label: t('nav.categories'), href: '/admin/categories' },
    { label: t('nav.products'), href: '/admin/products' },
    { label: t('nav.posts'), href: '/admin/posts' },
    { label: t('nav.orders'), href: '/admin/orders' },
    { label: t('nav.reviews'), href: '/admin/reviews' },
    { label: t('nav.customers'), href: '/admin/customers' },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '76px' : '254px',
        minWidth: collapsed ? '76px' : '254px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0', // Trả lại màu viền gốc
        zIndex: 30,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '24px 18px',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        borderRadius: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'space-between', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gap: '6px', alignItems: 'center', width: '100%', opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}>
          <p style={{ margin: 0, color: '#0c4a6e', fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{brand ?? t('brand')}</p>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a', lineHeight: 1.1 }}>{title ?? t('title')}</h2>
          <p style={{ margin: '10px 0 0', color: '#475569', fontSize: '13px' }}>
            {t('greeting', { name: user.name ?? 'Admin' })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#eff6ff', // Trả lại màu nút gốc
            color: '#0c4a6e',
            cursor: 'pointer',
            fontSize: '18px',
            padding: 0,
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav style={{ display: 'grid', gap: '10px' }}>
        {navItems.map((item) => {
          // Logic active đã được sửa chuẩn xác bằng usePathname()
          const isActive = 
            item.href === '/admin' 
              ? pathname === '/admin' 
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '16px',
                textDecoration: 'none',
                // Trả lại màu sắc và background gốc của admin
                color: isActive ? '#0f172a' : '#334155',
                backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                fontWeight: isActive ? '700' : '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '9999px', 
                  backgroundColor: isActive ? '#0284c7' : '#94a3b8', 
                  flexShrink: 0 
                }} 
              />
              <span>{collapsed ? item.label.charAt(0) : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}