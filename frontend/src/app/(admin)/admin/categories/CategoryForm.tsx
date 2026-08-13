"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Category, createCategory, updateCategory, listCategories, resolveCategoryImageUrl } from '../../../../lib/categories-api';

interface Props {
  initial?: Category | null;
  onSaved?: (cat: Category) => void;
  onCancel?: () => void;
}

// =====================================================================
// COMPONENT: MENU ĐA CẤP (DẠNG CỘT) ĐÃ FIX BUG MỒ CÔI (ORPHAN NODES)
// =====================================================================
type CategoryTreeNode = Category & { children: CategoryTreeNode[] };

const CascadingCategorySelect = ({
  categories,
  value,
  onChange,
  placeholder = "-- None --"
}: {
  categories: Category[];
  value: number | '';
  onChange: (val: number | '') => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePath, setActivePath] = useState<number[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Phẳng hóa thành Cây (Tree) - ĐÃ FIX BUG
  const roots = useMemo(() => {
    const map: Record<number, CategoryTreeNode> = {};
    categories.forEach((cat) => (map[cat.id] = { ...cat, children: [] }));
    
    const treeRoots: CategoryTreeNode[] = [];
    categories.forEach((cat) => {
      if (cat.parentId) {
        // Nếu có cha, và cha tồn tại trong map thì nhét vào con của cha
        if (map[cat.parentId]) {
          map[cat.parentId].children.push(map[cat.id]);
        }
        // NẾU KHÔNG TÌM THẤY CHA (Do đã bị filter out): Bỏ qua luôn, không push vào treeRoots!
      } else {
        // Chỉ những danh mục thực sự không có cha mới được làm Root
        treeRoots.push(map[cat.id]);
      }
    });
    return treeRoots;
  }, [categories]);

  // 2. TỰ ĐỘNG TRUY TÌM CHUỖI ÔNG-BÀ-CHA-CON TỪ ID ĐANG CHỌN
  const getAncestorPath = (targetId: number | ''): number[] => {
    if (!targetId) return [];
    const path: number[] = [];
    let current: number | null | undefined = Number(targetId);
    let depth = 0;
    while (current && depth < 20) {
      path.unshift(current);
      const cat = categories.find(c => c.id === current);
      current = cat?.parentId;
      depth++;
    }
    return path;
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      setActivePath(getAncestorPath(value));
    }
    setIsOpen(!isOpen);
  };

  // 3. Tính toán các cột cần hiển thị
  const columns: CategoryTreeNode[][] = [roots];
  let currentList = roots;
  
  for (let i = 0; i < activePath.length; i++) {
    const hoverId = activePath[i];
    const node = currentList.find(n => n.id === hoverId);
    if (node && node.children && node.children.length > 0) {
      columns.push(node.children);
      currentList = node.children;
    } else {
      break;
    }
  }

  // 4. Xử lý click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategory = categories.find(c => c.id === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={handleToggleOpen}
        style={{
          padding: '10px 14px',
          border: '1px solid #d1d5db',
          borderRadius: 8,
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: selectedCategory ? '#111827' : '#6b7280'
        }}
      >
        <span>{selectedCategory ? selectedCategory.name : placeholder}</span>
        <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          borderRadius: 8,
          zIndex: 50,
          overflowX: 'auto',
          maxWidth: '100%'
        }}>
          {columns.map((col, colIndex) => (
            <div key={colIndex} style={{
              minWidth: '220px',
              maxWidth: '220px',
              maxHeight: '320px',
              overflowY: 'auto',
              borderRight: colIndex < columns.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              {colIndex === 0 && (
                <div
                  onClick={() => { onChange(''); setIsOpen(false); setActivePath([]); }}
                  onMouseEnter={() => setActivePath([])}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', 
                    color: '#6b7280', fontStyle: 'italic', backgroundColor: value === '' ? '#f9fafb' : '#fff'
                  }}
                >
                  {placeholder}
                </div>
              )}

              {col.length === 0 && colIndex === 0 ? (
                <div style={{ padding: '10px 16px', color: '#9ca3af' }}>Trống</div>
              ) : (
                col.map(node => {
                  const hasChildren = node.children.length > 0;
                  const isHovered = activePath[colIndex] === node.id;
                  const isSelected = value === node.id;

                  return (
                    <div
                      key={node.id}
                      onMouseEnter={() => setActivePath(prev => [...prev.slice(0, colIndex), node.id])}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(node.id);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isSelected ? '#eff6ff' : isHovered ? '#f3f4f6' : '#fff',
                        color: isSelected ? '#2563eb' : '#374151',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'background-color 0.15s',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
                      {hasChildren && <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 8 }}>▶</span>}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// =====================================================================

export default function CategoryForm({ initial = null, onSaved, onCancel }: Props) {
  const t = useTranslations('admin_categories');
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [parentId, setParentId] = useState<number | ''>(initial?.parentId ?? '');
  const [position, setPosition] = useState<number | ''>(initial?.position ?? '');
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(initial?.metaDesc || '');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.image ? resolveCategoryImageUrl(initial.image) : null
  );
  
  const [removeImage, setRemoveImage] = useState(false); 

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file)); 
    setRemoveImage(false); 
  }

  function handleRemoveImage() {
    setImageFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
    
    const fileInput = document.getElementById('category-image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t('form.requiredName'));

    // Bắt buộc khởi tạo payload gửi kèm parentId (dù là rỗng)
    const payload: any = {
      name: name.trim(),
      isActive: String(isActive),
      removeImage: String(removeImage),
      parentId: parentId === '' ? '' : String(parentId), // FIX LỖI Ở ĐÂY
    };

    if (slug?.trim()) payload.slug = slug.trim();
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
      // console.error(err);
      
      const backendMessage = err.response?.data?.message;
      
      // Xử lý trường hợp NestJS trả về mảng lỗi (ValidationPipe) hoặc chuỗi (BadRequestException)
      const displayError = Array.isArray(backendMessage) 
        ? backendMessage[0] 
        : backendMessage;

      setError(displayError || err?.message || t('form.saveError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 12 }}>
      {error && <div style={{ color: '#b91c1c', backgroundColor: '#fee2e2', padding: '12px', borderRadius: 8 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t('form.parentLabel')}</label>
        <CascadingCategorySelect 
          categories={parents}
          value={parentId}
          onChange={(val) => setParentId(val)}
          placeholder={t('form.noneOption')}
        />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t('form.nameLabel')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none' }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t('form.slugLabel')}</label>
        <input 
          value={slug} 
          onChange={(e) => setSlug(e.target.value)} 
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none' }} 
        />
        <small style={{ color: '#6b7280' }}>
          {t('form.slugHelp')}
        </small>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 16, height: 16 }} />
        <label htmlFor="isActive" style={{ fontWeight: 500, color: '#374151' }}>{t('form.activeLabel')}</label>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t('form.imageLabel')}</label>
        
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
              padding: '10px 14px', border: '1px dashed #d1d5db', borderRadius: 8, background: '#f9fafb', width: '100%',
              display: previewUrl ? 'none' : 'block' 
            }} 
          />
        </div>
        <small style={{ color: '#6b7280' }}>{t('form.imageHelp')}</small>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t('form.metaTitleLabel')}</label>
        <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none' }} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t('form.metaDescriptionLabel')}</label>
        <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', minHeight: 80 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
        <button type="submit" disabled={submitting} style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? t('form.saving') : t('form.saveButton')}
        </button>
        <button type="button" onClick={() => onCancel && onCancel()} style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          {t('form.cancelButton')}
        </button>
      </div>
    </form>
  );
}