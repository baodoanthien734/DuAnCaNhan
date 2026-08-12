"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Category, createCategory, updateCategory, listCategories, resolveCategoryImageUrl } from '../../../../lib/categories-api';

interface Props {
  initial?: Category | null;
  onSaved?: (cat: Category) => void;
  onCancel?: () => void;
}

export default function CategoryForm({ initial = null, onSaved, onCancel }: Props) {
  const t = useTranslations('admin_categories');
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [parentId, setParentId] = useState<number | ''>(initial?.parentId ?? '');
  const [position, setPosition] = useState<number | ''>(initial?.position ?? '');
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(initial?.metaDesc || '');

  // ==========================================
  // STATE MỚI CHO LOGIC UPLOAD FORM DATA
  // ==========================================
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveCategoryImageUrl(initial?.image) || null);
  const [removeImage, setRemoveImage] = useState(false); // Cờ báo hiệu backend xóa ảnh cũ

  const [parents, setParents] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
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

  // Xử lý khi người dùng chọn file mới (Tạo URL ảo để preview)
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file)); 
    setRemoveImage(false); // Có ảnh mới thì hủy cờ đòi xóa ảnh
  }

  // Xử lý khi bấm nút "X" để gỡ ảnh (dọn state và đánh cờ xóa)
  function handleRemoveImage() {
    setImageFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
    
    // Reset input file để có thể chọn lại chính file đó nếu muốn
    const fileInput = document.getElementById('category-image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t('form.requiredName'));

    // SỬA LẠI ĐOẠN KHỞI TẠO PAYLOAD NÀY
    const payload: any = {
      name: name.trim(),
      isActive: String(isActive),
      removeImage: String(removeImage),
    };

    // Chỉ gán giá trị nếu người dùng thực sự có nhập (tránh gửi chuỗi rỗng "")
    if (slug?.trim()) payload.slug = slug.trim();
    if (parentId !== '') payload.parentId = String(parentId);
    if (position !== '') payload.position = String(position);
    if (metaTitle) payload.metaTitle = metaTitle;
    if (metaDesc) payload.metaDesc = metaDesc;

    if (imageFile) {
      payload.image = imageFile;
    }

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
      setError(err?.message || t('form.saveError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.nameLabel')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.slugLabel')}</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.parentLabel')}</label>
        <select value={parentId} onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: 8 }}>
          <option value="">{t('form.noneOption')}</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.positionLabel')}</label>
        <input type="number" value={position as any} onChange={(e) => setPosition(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="isActive">{t('form.activeLabel')}</label>
      </div>

      {/* ========================================== */}
      {/* UI PREVIEW VÀ UPLOAD ẢNH (BASE64)           */}
      {/* ========================================== */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.imageLabel')}</label>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
          {previewUrl && (
            <div style={{ position: 'relative' }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ width: '120px', height: '120px', borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }} 
              />
              <button 
                type="button" 
                onClick={handleRemoveImage}
                style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          )}
          
          <input 
            id="category-image"
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            style={{ 
              padding: 8, border: '1px dashed #d1d5db', borderRadius: 8, background: '#f9fafb', width: '100%',
              display: previewUrl ? 'none' : 'block' // Ẩn nút chọn file nếu đã có ảnh, ép người dùng bấm nút X nếu muốn đổi ảnh khác
            }} 
          />
        </div>
        <small style={{ color: '#6b7280' }}>{t('form.imageHelp')}</small>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.metaTitleLabel')}</label>
        <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('form.metaDescriptionLabel')}</label>
        <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} style={{ padding: 8 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="submit" disabled={submitting} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
          {submitting ? t('form.saving') : t('form.saveButton')}
        </button>
        <button type="button" onClick={() => onCancel && onCancel()} style={{ padding: '8px 12px', borderRadius: 8 }}>
          {t('form.cancelButton')}
        </button>
      </div>
    </form>
  );
}