"use client";

import { useTranslations } from 'next-intl';
import CategoryList from './CategoryList';

export default function AdminCategoriesPage() {
  const t = useTranslations('admin_categories');

  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          {t('page.eyebrow')}
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          {t('page.title')}
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          {t('page.description')}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{t('list.title')}</h2>
          <p style={{ margin: '12px 0 0', color: '#475569' }}>
            {t('list.description')}
          </p>

          <CategoryList />
        </div>
      </div>
    </div>
  );
}
