"use client";

import React, { useEffect, useState } from 'react';
import { listCategories, Category, removeCategory, reorderCategories } from '../../../../lib/categories-api';
import CategoryForm from './CategoryForm';

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const take = 20;
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listCategories({ q: query || undefined, skip: (page - 1) * take, take });
        if (mounted) setCategories(data);
      } catch (err: any) {
        console.error('Failed to load categories', err);
        if (mounted) setError(err?.message || 'Lỗi khi tải danh mục');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [query, page]);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Tìm kiếm danh mục..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', width: 320 }}
        />
        <button style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>Tìm</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={showTree} onChange={(e) => setShowTree(e.target.checked)} />
            <span style={{ color: '#374151' }}>Hiển thị cây</span>
          </label>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#10b981', color: '#fff', border: 'none' }}>Tạo danh mục</button>
        </div>
      </div>

      {loading && <div>Đang tải...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 8px' }}>Ảnh</th>
              <th style={{ padding: '12px 8px' }}>Tên</th>
              <th style={{ padding: '12px 8px' }}>Slug</th>
              <th style={{ padding: '12px 8px' }}>Vị trí</th>
              <th style={{ padding: '12px 8px' }}>Trạng thái</th>
              <th style={{ padding: '12px 8px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: '#6b7280' }}>
                  Không có danh mục
                </td>
              </tr>
            ) : showTree ? (
              (() => {
                const map: Record<number, Category & { children?: Category[] }> = {} as any;
                categories.forEach((cat) => (map[cat.id] = { ...cat, children: [] }));
                const roots: (Category & { children?: Category[] })[] = [];
                categories.forEach((cat) => {
                  if (cat.parentId && map[cat.parentId]) {
                    map[cat.parentId].children!.push(map[cat.id]);
                  } else {
                    roots.push(map[cat.id]);
                  }
                });

                const renderNode = (node: Category & { children?: Category[] }, depth = 0) => {
                  const isExpanded = !!expandedIds[node.id];
                  return (
                    <React.Fragment key={node.id}>
                      <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 8px' }}>
                          {node.image ? (
                            <img src={node.image} alt={node.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f3f4f6' }} />
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: depth * 18 }}>
                            {node.children && node.children.length > 0 && (
                              <button onClick={() => setExpandedIds((s) => ({ ...s, [node.id]: !s[node.id] }))} style={{ width: 28, height: 28 }}>
                                {isExpanded ? '−' : '+'}
                              </button>
                            )}
                            <span>{node.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#6b7280' }}>{node.slug || '—'}</td>
                        <td style={{ padding: '12px 8px' }}>{node.position ?? '—'}</td>
                        <td style={{ padding: '12px 8px' }}>{node.isActive ? 'Hoạt động' : 'Tạm ẩn'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <button style={{ marginRight: 8 }} onClick={() => { setEditing(node); setShowForm(true); }}>Sửa</button>
                          <button
                            title="Di chuyển lên"
                            onClick={async () => {
                              const flat = categories.slice();
                              const idx = flat.findIndex((x) => x.id === node.id);
                              if (idx <= 0) return;
                              const newCats = [...flat];
                              const tmp = newCats[idx - 1];
                              newCats[idx - 1] = newCats[idx];
                              newCats[idx] = tmp;
                              const updates = newCats.map((cat, i) => ({ id: cat.id, position: i + 1 }));
                              try {
                                setReordering(true);
                                await reorderCategories(updates);
                                setCategories(newCats.map((cat, i) => ({ ...cat, position: i + 1 })));
                                setToast('Đã cập nhật vị trí');
                                setTimeout(() => setToast(null), 2500);
                              } catch (err: any) {
                                console.error(err);
                                setToast(err?.message || 'Lỗi khi sắp xếp');
                                setTimeout(() => setToast(null), 4000);
                              } finally {
                                setReordering(false);
                              }
                            }}
                            disabled={reordering}
                            style={{ marginRight: 8 }}
                          >
                            ↑
                          </button>
                          <button
                            title="Di chuyển xuống"
                            onClick={async () => {
                              const flat = categories.slice();
                              const idx = flat.findIndex((x) => x.id === node.id);
                              if (idx === -1 || idx >= flat.length - 1) return;
                              const newCats = [...flat];
                              const tmp = newCats[idx + 1];
                              newCats[idx + 1] = newCats[idx];
                              newCats[idx] = tmp;
                              const updates = newCats.map((cat, i) => ({ id: cat.id, position: i + 1 }));
                              try {
                                setReordering(true);
                                await reorderCategories(updates);
                                setCategories(newCats.map((cat, i) => ({ ...cat, position: i + 1 })));
                                setToast('Đã cập nhật vị trí');
                                setTimeout(() => setToast(null), 2500);
                              } catch (err: any) {
                                console.error(err);
                                setToast(err?.message || 'Lỗi khi sắp xếp');
                                setTimeout(() => setToast(null), 4000);
                              } finally {
                                setReordering(false);
                              }
                            }}
                            disabled={reordering}
                            style={{ marginRight: 8 }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={async () => {
                              const ok = confirm(`Xóa danh mục "${node.name}"? Hành động này sẽ ẩn danh mục.`);
                              if (!ok) return;
                              try {
                                setDeletingId(node.id);
                                await removeCategory(node.id);
                                setCategories((prev) => prev.filter((p) => p.id !== node.id));
                                setToast('Đã xóa danh mục');
                                setTimeout(() => setToast(null), 3000);
                              } catch (err: any) {
                                console.error(err);
                                setToast(err?.message || 'Lỗi khi xóa');
                                setTimeout(() => setToast(null), 4000);
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                            disabled={deletingId === node.id}
                          >
                            {deletingId === node.id ? 'Đang xóa...' : 'Xóa'}
                          </button>
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
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 8px' }}>
                    {c.image ? (
                      <img src={c.image} alt={c.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f3f4f6' }} />
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>{c.name}</td>
                  <td style={{ padding: '12px 8px', color: '#6b7280' }}>{c.slug || '—'}</td>
                  <td style={{ padding: '12px 8px' }}>{c.position ?? '—'}</td>
                  <td style={{ padding: '12px 8px' }}>{c.isActive ? 'Hoạt động' : 'Tạm ẩn'}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <button style={{ marginRight: 8 }} onClick={() => { setEditing(c); setShowForm(true); }}>Sửa</button>
                    <button
                      title="Di chuyển lên"
                      onClick={async () => {
                        const idx = categories.findIndex((x) => x.id === c.id);
                        if (idx <= 0) return;
                        const newCats = [...categories];
                        const tmp = newCats[idx - 1];
                        newCats[idx - 1] = newCats[idx];
                        newCats[idx] = tmp;
                        // assign positions as index+1
                        const updates = newCats.map((cat, i) => ({ id: cat.id, position: i + 1 }));
                        try {
                          setReordering(true);
                          await reorderCategories(updates);
                          // update local list with new positions
                          setCategories(newCats.map((cat, i) => ({ ...cat, position: i + 1 })));
                          setToast('Đã cập nhật vị trí');
                          setTimeout(() => setToast(null), 2500);
                        } catch (err: any) {
                          console.error(err);
                          setToast(err?.message || 'Lỗi khi sắp xếp');
                          setTimeout(() => setToast(null), 4000);
                        } finally {
                          setReordering(false);
                        }
                      }}
                      disabled={reordering}
                      style={{ marginRight: 8 }}
                    >
                      ↑
                    </button>
                    <button
                      title="Di chuyển xuống"
                      onClick={async () => {
                        const idx = categories.findIndex((x) => x.id === c.id);
                        if (idx === -1 || idx >= categories.length - 1) return;
                        const newCats = [...categories];
                        const tmp = newCats[idx + 1];
                        newCats[idx + 1] = newCats[idx];
                        newCats[idx] = tmp;
                        const updates = newCats.map((cat, i) => ({ id: cat.id, position: i + 1 }));
                        try {
                          setReordering(true);
                          await reorderCategories(updates);
                          setCategories(newCats.map((cat, i) => ({ ...cat, position: i + 1 })));
                          setToast('Đã cập nhật vị trí');
                          setTimeout(() => setToast(null), 2500);
                        } catch (err: any) {
                          console.error(err);
                          setToast(err?.message || 'Lỗi khi sắp xếp');
                          setTimeout(() => setToast(null), 4000);
                        } finally {
                          setReordering(false);
                        }
                      }}
                      disabled={reordering}
                      style={{ marginRight: 8 }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={async () => {
                        const ok = confirm(`Xóa danh mục "${c.name}"? Hành động này sẽ ẩn danh mục.`);
                        if (!ok) return;
                        try {
                          setDeletingId(c.id);
                          await removeCategory(c.id);
                          setCategories((prev) => prev.filter((p) => p.id !== c.id));
                          setToast('Đã xóa danh mục');
                          setTimeout(() => setToast(null), 3000);
                        } catch (err: any) {
                          console.error(err);
                          setToast(err?.message || 'Lỗi khi xóa');
                          setTimeout(() => setToast(null), 4000);
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#f9fafb' }}>
          <h3 style={{ marginTop: 0 }}>{editing ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h3>
          <CategoryForm
            initial={editing ?? undefined}
            onSaved={(cat) => {
              setShowForm(false);
              // reload list
              setPage(1);
              setQuery('');
              // quick refresh
              (async () => {
                setLoading(true);
                try {
                  const data = await listCategories({ take });
                  setCategories(data);
                } catch (err: any) {
                  setError(err?.message || 'Lỗi khi tải danh mục');
                } finally {
                  setLoading(false);
                }
              })();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 10px' }}>
          Prev
        </button>
        <div style={{ alignSelf: 'center' }}>{page}</div>
        <button onClick={() => setPage((p) => p + 1)} style={{ padding: '6px 10px' }}>
          Next
        </button>
      </div>
    </div>
  );
}
