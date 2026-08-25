"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { listProducts } from "@/lib/products-api";
import { listCategories } from "@/lib/categories-api";
import ProductTableRow from "./components/ProductTableRow";
import BulkEditModal from "./components/BulkEditModal";
import { useModal } from '@/hooks/useModal'; // Nhập useModal hook

interface CategoryItem {
  id: number;
  name: string;
  slug?: string | null;      
  isSystem?: boolean | null; 
  parentId?: number | null;
}

export default function ProductsListPage() {
  const t = useTranslations("admin_products");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const modal = useModal(); // Khởi tạo useModal

  // State lưu dữ liệu
  const [products, setProducts] = useState<any[]>([]);
  const [leafCategories, setLeafCategories] = useState<{id: number, name: string, path: string}[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ==========================================
  // STATE & LOGIC CHO BULK EDIT (CHỈNH SỬA HÀNG LOẠT)
  // ==========================================
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isStateLoaded, setIsStateLoaded] = useState(false); 
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  
  // State mới cho bộ lọc "Chỉ hiện sản phẩm đã chọn"
  const [showSelectedOnly, setShowSelectedOnly] = useState(false); 

  // Khởi tạo từ sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('bulk_edit_products');
    if (stored) {
      try {
        setSelectedIds(JSON.parse(stored));
      } catch (e) {
        console.error("Lỗi parse sessionStorage", e);
      }
    }
    setIsStateLoaded(true);
  }, []);

  // Cập nhật vào sessionStorage mỗi khi mảng ID thay đổi
  useEffect(() => {
    if (isStateLoaded) {
      sessionStorage.setItem('bulk_edit_products', JSON.stringify(selectedIds));
    }
  }, [selectedIds, isStateLoaded]);

  // Hàm Toggle (Thêm/Bớt) ID
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // Hàm bỏ chọn tất cả (Clear All)
  const handleClearSelection = () => {
    setSelectedIds([]);
    setShowSelectedOnly(false); // Đóng luôn bộ lọc nếu bỏ chọn hết
  };

  // Nút mở Modal Chỉnh sửa hàng loạt (đã đổi thành async để dùng modal)
  const handleOpenBulkEdit = async () => {
    if (selectedIds.length === 0) {
      await modal.alert(t("list.noProductsSelected"));
      return;
    }
    setIsBulkEditModalOpen(true);
  };
  // ==========================================

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const currentQ = searchParams.get("q") || "";
  const currentCategory = searchParams.get("categoryId") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const take = 10; 

  const [searchTerm, setSearchTerm] = useState(currentQ);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== currentQ) {
        updateFilter("q", searchTerm);
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentQ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  useEffect(() => {
    listCategories().then((rawCategories: CategoryItem[]) => {
      const parentIds = new Set(rawCategories.map(c => c.parentId).filter(id => id != null));
      const leaves = rawCategories.filter(c => !parentIds.has(c.id));

      const buildPath = (categoryId: number): string => {
        const cat = rawCategories.find(c => c.id === categoryId);
        if (!cat) return "";
        if (cat.parentId) {
          const parentPath = buildPath(cat.parentId);
          return parentPath ? `${parentPath} > ${cat.name}` : cat.name;
        }
        return cat.name;
      };

      const formattedLeaves = leaves.map(leaf => ({
        id: leaf.id,
        name: leaf.name,
        path: buildPath(leaf.id)
      }));

      setLeafCategories(formattedLeaves);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const skip = (currentPage - 1) * take;
        const res = await listProducts({
          q: currentQ,
          categoryId: currentCategory ? Number(currentCategory) : undefined,
          status: currentStatus,
          skip,
          take,
        });
        
        setProducts(res.items || []);
        setTotalItems(res.total || 0);
      } catch (error) {
        console.error("Lỗi khi tải danh sách sản phẩm:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentQ, currentCategory, currentStatus, currentPage, refreshTrigger]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") params.set("page", "1");
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalItems / take);
  const selectedCategoryObj = leafCategories.find(c => c.id === Number(currentCategory));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("list.title")}</h1>
        
        {/* KHU VỰC NÚT ĐIỀU KHIỂN CHUNG */}
        <div className="flex gap-3">
          <button 
            onClick={handleOpenBulkEdit}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            {t("list.bulkEditButton")} 
            {selectedIds.length > 0 && <span className="bg-slate-900 text-white px-2 py-0.5 rounded-full text-xs">{selectedIds.length}</span>}
          </button>

          <Link 
            href="/admin/products/create"
            style={{ backgroundColor: '#4592b6' }}
            className="hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            + {t("list.addButton")}
          </Link>
        </div>
      </div>

      {/* THANH THÔNG BÁO KHI CÓ SẢN PHẨM ĐƯỢC CHỌN */}
      {selectedIds.length > 0 && (
        <div className="mb-6 rounded-xl bg-blue-50 border border-blue-100 p-4 flex justify-between items-center shadow-sm">
          <span className="text-blue-800 text-sm font-medium">
            {t("list.selectedCount", { count: selectedIds.length })}
          </span>
          <button 
            onClick={handleClearSelection}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            {t("list.clearSelection")}
          </button>
        </div>
      )}

      {/* Bộ lọc (Filters) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        
        {/* Tìm kiếm */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t("list.searchPlaceholder")}
            value={searchTerm || ""} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4592b6] focus:border-[#4592b6] outline-none text-sm"
          />
        </div>
        
        {/* CUSTOM DROPDOWN CATEGORY */}
        <div className="w-64 relative" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-[#4592b6] outline-none transition"
          >
            <div className="flex flex-col flex-1 mr-2">
              <span className="text-sm text-gray-700 break-words whitespace-normal leading-tight">
                {selectedCategoryObj ? selectedCategoryObj.name : t("list.allCategories")}
              </span>
            </div>
            <svg className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isCategoryOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div
                onClick={() => {
                  updateFilter("categoryId", "");
                  setIsCategoryOpen(false);
                }}
                className={`p-3 cursor-pointer transition hover:bg-gray-50 border-b border-gray-100 ${
                  !currentCategory ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-800">{t("list.allCategories")}</div>
              </div>

              {leafCategories.map((cat) => {
                const isSelected = cat.id === Number(currentCategory);
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      updateFilter("categoryId", String(cat.id));
                      setIsCategoryOpen(false);
                    }}
                    className={`p-3 cursor-pointer transition hover:bg-gray-50 border-b border-gray-100 last:border-none ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800">{cat.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 break-words whitespace-normal leading-relaxed">
                      {cat.path}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-48">
          <select
            value={currentStatus}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#4592b6] outline-none"
          >
            <option value="">{t("list.allStatuses")}</option>
            <option value="ACTIVE">{t("list.statuses.ACTIVE")}</option>
            <option value="DRAFT">{t("list.statuses.DRAFT")}</option>
            <option value="ARCHIVED">{t("list.statuses.ARCHIVED")}</option>
          </select>
        </div>

        {/* THÊM BỘ LỌC CHỈ HIỆN SẢN PHẨM ĐÃ CHỌN */}
        <div className="flex items-center ml-auto">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={showSelectedOnly}
              onChange={(e) => setShowSelectedOnly(e.target.checked)}
              disabled={selectedIds.length === 0}
              className="w-4 h-4 rounded border-gray-300 text-[#4592b6] focus:ring-[#4592b6] disabled:opacity-50"
            />
            <span className={`text-sm font-medium transition ${showSelectedOnly ? 'text-[#4592b6]' : 'text-gray-600'} group-hover:text-gray-900`}>
              {t("list.showSelectedOnly")}
            </span>
          </label>
        </div>
      </div>

      {/* Bảng Dữ liệu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-4 w-10" />
                <th className="px-6 py-4">{t("list.columns.product")}</th>
                <th className="px-6 py-4">{t("list.columns.basePrice")}</th>
                <th className="px-6 py-4">{t("list.columns.status")}</th>
                <th className="px-6 py-4 text-right">{t("list.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">{t("list.loading")}</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">{t("list.empty")}</td>
                </tr>
              ) : (
                products
                  // Áp dụng bộ lọc
                  .filter(product => showSelectedOnly ? selectedIds.includes(product.id) : true)
                  .map((product) => (
                  <ProductTableRow 
                    key={product.id} 
                    product={product} 
                    isSelected={selectedIds.includes(product.id)}
                    onToggleSelect={() => handleToggleSelect(product.id)}
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)} 
                  />
                ))
              )}
              {/* Thông báo nếu bật lọc mà không có kết quả trên trang này */}
              {!isLoading && showSelectedOnly && products.filter(p => selectedIds.includes(p.id)).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">
                    {t("list.noSelectedOnThisPage")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang (Pagination) */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {t("list.pagination.showCount", { count: products.length, total: totalItems })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter("page", String(currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("list.pagination.prev")}
              </button>
              <button
                onClick={() => updateFilter("page", String(currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("list.pagination.next")}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* BULK EDIT MODAL */}
      <BulkEditModal 
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedIds={selectedIds}
        categories={leafCategories}
        onSuccess={async () => {
          setIsBulkEditModalOpen(false);
          handleClearSelection(); // Xóa rỗng state và sessionStorage
          setRefreshTrigger(prev => prev + 1); // Báo bảng tải lại dữ liệu mới
          // Dùng modal.alert thay vì alert mặc định
          await modal.alert(t("bulkEdit.successMessage") || "Cập nhật thành công!");
        }}
      />
    </div>
  );
}