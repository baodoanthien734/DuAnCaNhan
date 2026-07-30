"use client";

import React, { useEffect, useState } from 'react';
import { Category, createCategory, updateCategory, listCategories, uploadCategoryImage } from '../../../../lib/categories-api';

interface Props {
  initial?: Category | null;
  onSaved?: (cat: Category) => void;
  onCancel?: () => void;
}

export default function CategoryForm({ initial = null, onSaved, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [parentId, setParentId] = useState<number | ''>(initial?.parentId ?? '');
  const [position, setPosition] = useState<number | ''>(initial?.position ?? '');
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [image, setImage] = useState(initial?.image || '');
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(initial?.metaDesc || '');

  const [parents, setParents] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadParents() {
      try {
        const data = await listCategories({ take: 200 });
        if (mounted) setParents(data.filter((p) => p.id !== initial?.id));
      } catch (err) {
        // ignore
      }
    }
    loadParents();
    return () => {
      mounted = false;
    };
  }, [initial]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Tên danh mục là bắt buộc');

    const payload: Partial<Category> = {
      name: name.trim(),
      slug: slug?.trim() || undefined,
      parentId: parentId === '' ? undefined : Number(parentId),
      position: position === '' ? undefined : Number(position),
      isActive,
      image: image || undefined,
      metaTitle: metaTitle || undefined,
      metaDesc: metaDesc || undefined,
    };

    setSubmitting(true);
    try {
      let saved: Category;
      if (initial && initial.id) {
        saved = await updateCategory(initial.id, payload);
      } else {
        saved = await createCategory(payload);
      }
      onSaved && onSaved(saved);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Lỗi khi lưu danh mục');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Tên *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Parent</label>
        <select value={parentId} onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: 8 }}>
          <option value="">-- Không --</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Vị trí</label>
        <input type="number" value={position as any} onChange={(e) => setPosition(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="isActive">Hoạt động</label>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Ảnh danh mục</label>
        <input type="file" accept="image/*" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          setError(null);
          try {
            const result = await uploadCategoryImage(file);
            setImage(result.url);
          } catch (err: any) {
            console.error(err);
            setError(err?.message || 'Không thể upload ảnh');
          } finally {
            setUploading(false);
          }
        }} style={{ padding: 8 }} />
        <small style={{ color: '#6b7280' }}>Hoặc dán URL hình ảnh bên dưới nếu bạn đã có sẵn.</small>
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="URL hình ảnh" style={{ padding: 8 }} />
        {image && (
          <div style={{ display: 'grid', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#374151' }}>Xem trước</span>
            <img src={image} alt="Preview" style={{ maxWidth: '200px', maxHeight: '160px', borderRadius: 12, objectFit: 'cover' }} />
          </div>
        )}
        {uploading && <div style={{ color: '#2563eb' }}>Đang tải ảnh...</div>}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Meta Title</label>
        <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>Meta Description</label>
        <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="submit" disabled={submitting} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
          {submitting ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button type="button" onClick={() => onCancel && onCancel()} style={{ padding: '8px 12px', borderRadius: 8 }}>
          Hủy
        </button>
      </div>
    </form>
  );
}
