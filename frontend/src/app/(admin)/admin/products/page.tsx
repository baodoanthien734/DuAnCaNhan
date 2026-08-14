"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { listProducts } from "@/lib/products-api";
import { listCategories } from "@/lib/categories-api";
import ProductTableRow from "./components/ProductTableRow";

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

  // State lưu dữ liệu
  const [products, setProducts] = useState<any[]>([]);
  const [leafCategories, setLeafCategories] = useState<{id: number, name: string, path: string}[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State cho Custom Dropdown Category
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Lấy các giá trị từ URL
  const currentQ = searchParams.get("q") || "";
  const currentCategory = searchParams.get("categoryId") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const take = 10; 

  // Local State cho Search Debounce
  const [searchTerm, setSearchTerm] = useState(currentQ);

  // Logic Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== currentQ) {
        updateFilter("q", searchTerm);
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentQ]);

  // Logic Click outside cho Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  // Tải và định dạng danh sách Danh mục (Giống ProductForm)
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

  // Tải danh sách Sản phẩm
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
        <Link 
          href="/admin/products/create"
          // Đổi màu nền nút Add theo yêu cầu
          style={{ backgroundColor: '#4592b6' }}
          className="hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          {t("list.addButton")}
        </Link>
      </div>

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
            {/* ĐÃ XÓA truncate Ở ĐÂY ĐỂ CHỮ NÚT BẤM CÓ THỂ RỚT DÒNG */}
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
                    
                    {/* ĐÃ XÓA truncate VÀ THÊM whitespace-normal ĐỂ ĐƯỜNG DẪN TỰ ĐỘNG XUỐNG DÒNG */}
                    <div className="text-[11px] text-gray-400 mt-0.5 break-words whitespace-normal leading-relaxed">
                      {cat.path}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lọc Trạng thái (Đã đẩy ra sau) */}
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
                products.map((product) => (
                  <ProductTableRow 
                    key={product.id} 
                    product={product} 
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)} 
                  />
                ))
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
    </div>
  );
}