'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { resolveImageUrl } from '@/lib/utils';
import { listProducts } from '@/lib/products-api';
import { getTaggedProducts, updateTaggedProducts } from '@/lib/posts-api';
import { useModal } from '@/hooks/useModal';

interface ProductTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number | null;
}

export default function ProductTaggingModal({ isOpen, onClose, postId }: ProductTaggingModalProps) {
  const t = useTranslations("posts.tag_modal");
  const modal = useModal(); 
  
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]); 
  
  const [taggedProducts, setTaggedProducts] = useState<any[]>([]); 

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- LOGIC LOAD KHO SẢN PHẨM (BÊN TRÁI) ---
  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailableProducts = async () => {
      setIsLoading(true);
      try {
        const res = await listProducts({ q: debouncedSearch, status: 'ACTIVE', take: 50 });
        
        // CẬP NHẬT: Lọc bỏ các sản phẩm thuộc danh mục Chưa phân loại (isSystem)
        const validProducts = (res.items || []).filter(
          (p: any) => !p.category?.isSystem && p.category?.slug !== 'chua-phan-loai'
        );
        
        setAvailableProducts(validProducts);
      } catch (error) {
        console.error("Lỗi tải kho sản phẩm:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableProducts();
  }, [debouncedSearch, isOpen]);

  // --- LOGIC LOAD SẢN PHẨM ĐÃ GẮN (BÊN PHẢI) ---
  useEffect(() => {
    if (isOpen && postId) {
      document.body.style.overflow = 'hidden';
      
      getTaggedProducts(postId)
        .then((data) => setTaggedProducts(data || []))
        .catch((err) => console.error("Lỗi tải SP đã gắn:", err));
        
    } else {
      document.body.style.overflow = '';
      setSearchQuery("");
      setDebouncedSearch("");
      setTaggedProducts([]);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, postId]);

  const handleAddProduct = (product: any) => {
    if (!taggedProducts.find(p => p.id === product.id)) {
      setTaggedProducts([...taggedProducts, product]);
    }
  };

  const handleRemoveProduct = (productId: number) => {
    setTaggedProducts(taggedProducts.filter(p => p.id !== productId));
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); 
    if (draggedIndex === null || draggedIndex === index) return;
    
    const items = [...taggedProducts];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setTaggedProducts(items);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const handleSave = async () => {
    if (!postId) return;
    setIsSaving(true);
    try {
      const productIds = taggedProducts.map(p => p.id);
      await updateTaggedProducts(postId, productIds);
      onClose(); 
    } catch (error: any) {
      console.error(error);
      modal.alert(t("saveError", { defaultValue: "Có lỗi xảy ra khi lưu!" }));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-black/50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t("title")}</h2>
            <p className="text-sm text-gray-500">{t("description")}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-gray-50/50">
          
          <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                 <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : availableProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  {t("noProductsFound")}
                </div>
              ) : (
                availableProducts.map((product) => {
                  // CẬP NHẬT: Xử lý hiển thị ảnh an toàn
                  const imgSrc = product.images?.[0] ? resolveImageUrl(product.images[0]) : null;

                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition">
                      <div className="flex items-center gap-3">
                        {imgSrc ? (
                          <img src={imgSrc} alt={product.name} className="w-12 h-12 object-cover rounded-md border border-gray-100 bg-white" />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-md border border-gray-100 text-gray-400 text-lg">📦</div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{product.name}</h4>
                          <p className="text-xs text-amber-600 font-medium">{Number(product.basePrice).toLocaleString()} đ</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddProduct(product)}
                        disabled={taggedProducts.some(p => p.id === product.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {taggedProducts.some(p => p.id === product.id) ? t("added") : t("add")}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-1/2 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200 bg-gray-100/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t("taggedProductsTitle")}</h3>
              <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border shadow-sm">
                {taggedProducts.length} {t("itemsCount")}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {taggedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  {t("emptyTagged")}
                </div>
              ) : (
                taggedProducts.map((product, index) => {
                  // CẬP NHẬT: Xử lý hiển thị ảnh an toàn
                  const imgSrc = product.images?.[0] ? resolveImageUrl(product.images[0]) : null;

                  return (
                    <div 
                      key={product.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index ? 'opacity-50 border-blue-400 scale-[0.98]' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-gray-300 cursor-grab px-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                        </div>
                        {imgSrc ? (
                          <img src={imgSrc} alt={product.name} className="w-12 h-12 object-cover rounded-md border border-gray-100 bg-white" />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-md border border-gray-100 text-gray-400 text-lg">📦</div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</h4>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveProduct(product.id)}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                        title={t("remove")}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
            {t("cancel")}
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition shadow-sm disabled:opacity-50">
            {isSaving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}