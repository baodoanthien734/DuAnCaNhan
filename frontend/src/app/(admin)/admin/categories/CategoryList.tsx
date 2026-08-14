"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listCategories, Category, removeCategory, reorderCategories, resolveCategoryImageUrl } from '../../../../lib/categories-api';
import CategoryForm from './CategoryForm';
import { useModal } from '@/hooks/useModal';

export default function CategoryList() {
  const t = useTranslations('admin_categories');
  const modal = useModal();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  
  const [showTree, setShowTree] = useState(true); 
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  // LOẠI BỎ HOÀN TOÀN PHÂN TRANG - LOAD MAX 1000 DANH MỤC
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCategories({ 
        q: query || undefined, 
        take: 1000 // Lấy đủ nhiều để ôm trọn toàn bộ cây danh mục
      });
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || t('list.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query, showForm]);

  const handleMove = async (node: Category, direction: 'up' | 'down') => {
    if (reordering || node.parentId) return;
    
    const roots = categories.filter(c => !c.parentId).sort((a, b) => (a.position || 0) - (b.position || 0));
    const idx = roots.findIndex(r => r.id === node.id);
    
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= roots.length - 1) return;

    const newRoots = [...roots];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    [newRoots[idx], newRoots[swapIdx]] = [newRoots[swapIdx], newRoots[idx]];

    setReordering(true);
    try {
      const updates = newRoots.map((r, i) => ({ id: r.id, position: i + 1 }));
      await reorderCategories(updates);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(t('list.reorderError'));
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (id: number) => {
    // Sử dụng i18n cho Title và Message
    const isConfirmed = await modal.confirm(
      t('list.deleteConfirmMessage'),
      t('list.deleteConfirmTitle')
    );

    if (isConfirmed) {
      setDeletingId(id);
      try {
        await removeCategory(id);
        setToast(t('list.deleteSuccess')); // Toast thành công
        setTimeout(() => setToast(null), 3000);
        await loadData();
      } catch (err: any) {
        alert(t('list.deleteError')); // Thông báo lỗi
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div style={{ marginTop: 18 }}>
      {toast && <div style={{ marginBottom: 12, padding: '12px 16px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: 8, fontWeight: 500 }}>{toast}</div>}

      {!showForm ? (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <input
              placeholder={t('list.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', width: 320, outline: 'none' }}
            />
            {/* Đã bỏ nút Search vì input change sẽ gọi lại loadData ngay lập tức nhờ useEffect */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={showTree} onChange={(e) => setShowTree(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ color: '#374151', fontWeight: 500 }}>{t('list.showTree')}</span>
              </label>
              <button 
                onClick={() => { setEditing(null); setShowForm(true); }} 
                style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: '#4592b6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
              >
                + {t('list.createButton')}
              </button>
            </div>
          </div>

          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>{t('list.loading')}</div>}
          {error && <div style={{ padding: 16, backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}

          {!loading && !error && (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '14px 16px', color: '#374151', fontSize: 14, width: '80px' }}>{t('list.columns.image')}</th>
                    <th style={{ padding: '14px 16px', color: '#374151', fontSize: 14, width: '40%' }}>{t('list.columns.name')}</th>
                    <th style={{ padding: '14px 16px', color: '#374151', fontSize: 14 }}>{t('list.columns.status')}</th>
                    <th style={{ padding: '14px 16px', color: '#374151', fontSize: 14, textAlign: 'right' }}>{t('list.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                        {t('list.empty')}
                      </td>
                    </tr>
                  ) : showTree ? (
                    (() => {
                      const map: Record<number, Category & { children?: Category[] }> = {} as any;
                      const sortedCategories = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));
                      
                      sortedCategories.forEach((cat) => (map[cat.id] = { ...cat, children: [] }));
                      const roots: (Category & { children?: Category[] })[] = [];
                      
                      sortedCategories.forEach((cat) => {
                        if (cat.parentId && map[cat.parentId]) {
                          map[cat.parentId].children!.push(map[cat.id]);
                        } else if (!cat.parentId) {
                          roots.push(map[cat.id]);
                        }
                      });

                      const renderNode = (node: Category & { children?: Category[] }, depth = 0) => {
                        const isExpanded = !!expandedIds[node.id];
                        return (
                          <React.Fragment key={node.id}>
                            <tr style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '12px 16px' }}>
                                {node.image ? (
                                  <img src={resolveCategoryImageUrl(node.image)} alt={node.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                ) : (
                                  <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }} />
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: depth * 32 }}>
                                  {node.children && node.children.length > 0 ? (
                                    <button 
                                      onClick={() => setExpandedIds((s) => ({ ...s, [node.id]: !s[node.id] }))} 
                                      style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
                                    >
                                      {isExpanded ? '−' : '+'}
                                    </button>
                                  ) : (
                                    <div style={{ width: 24, height: 24 }}></div>
                                  )}
                                  <span style={{ fontWeight: depth === 0 ? 600 : 500, color: depth === 0 ? '#111827' : '#374151' }}>
                                    {node.name}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {node.isActive ? (
                                  <span style={{ padding: '4px 10px', backgroundColor: '#dcfce3', color: '#166534', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                                    {t('list.statusActive')}
                                  </span>
                                ) : (
                                  <span style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                                    {t('list.statusInactive')}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                                  
                                  {depth === 0 && !node.isSystem && (
                                    <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                                      <button title={t('list.actions.moveUp')} onClick={() => handleMove(node, 'up')} disabled={reordering} style={{ background: '#f9fafb', border: 'none', borderRight: '1px solid #e5e7eb', cursor: reordering ? 'not-allowed' : 'pointer', padding: '4px 8px', color: '#6b7280' }}>↑</button>
                                      <button title={t('list.actions.moveDown')} onClick={() => handleMove(node, 'down')} disabled={reordering} style={{ background: '#f9fafb', border: 'none', cursor: reordering ? 'not-allowed' : 'pointer', padding: '4px 8px', color: '#6b7280' }}>↓</button>
                                    </div>
                                  )}

                                  {!node.isSystem && (
                                    <>
                                      <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setEditing(node); setShowForm(true); }}>{t('list.actions.edit')}</button>
                                      <button style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => handleDelete(node.id)} disabled={deletingId === node.id}>{deletingId === node.id ? '...' : t('list.actions.delete')}</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {node.children && node.children.length > 0 && isExpanded && node.children.map((ch) => renderNode(ch, depth + 1))}
                          </React.Fragment>
                        );
                      };
                      return roots.map((r) => renderNode(r, 0));
                    })()
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '12px 16px' }}>
                          {c.image ? (
                            <img src={resolveCategoryImageUrl(c.image)} alt={c.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }} />
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{c.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {c.isActive ? (
                            <span style={{ padding: '4px 10px', backgroundColor: '#dcfce3', color: '#166534', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Active</span>
                          ) : (
                            <span style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Inactive</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {!c.isSystem && (
                              <>
                                <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setEditing(c); setShowForm(true); }}>{t('list.actions.edit')}</button>
                                <button style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}>{deletingId === c.id ? '...' : t('list.actions.delete')}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* ĐÃ XÓA FOOTER PHÂN TRANG Ở ĐÂY */}
        </>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22, color: '#111827', fontWeight: 700 }}>
                {editing ? t('form.editTitle') : t('form.createTitle')}
              </h3>
            </div>
            <button 
              onClick={() => setShowForm(false)} 
              style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>←</span> {t('form.cancelButton')}
            </button>
          </div>
          <CategoryForm
            initial={editing ?? undefined}
            onSaved={(cat) => {
              setShowForm(false);
              // Đã dùng i18n thay cho text cứng
              setToast(editing ? t('list.updateSuccess') : t('list.createSuccess')); 
              setTimeout(() => setToast(null), 3000);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}