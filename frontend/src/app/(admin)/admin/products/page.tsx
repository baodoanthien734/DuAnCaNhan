"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { listProducts } from "@/lib/products-api";
import { listCategories } from "@/lib/categories-api";
import ProductTableRow from "./components/ProductTableRow";

export default function ProductsListPage() {
  const t = useTranslations("admin_products");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State lưu dữ liệu
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Lấy các giá trị từ URL (nếu có)
  const currentQ = searchParams.get("q") || "";
  const currentCategory = searchParams.get("categoryId") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const take = 10; // Số sản phẩm trên 1 trang

  // 1. Thêm State lưu từ khóa đang gõ (Local State)
  const [searchTerm, setSearchTerm] = useState(currentQ);

  // 2. Thêm logic Debounce (Chờ 500ms sau khi ngừng gõ mới cập nhật URL)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Chỉ cập nhật URL nếu từ khóa khác với từ khóa hiện tại trên URL
      if (searchTerm !== currentQ) {
        updateFilter("q", searchTerm);
      }
    }, 500); // 500 milliseconds

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentQ]);

  // Tải danh sách Danh mục (để đưa vào dropdown Filter)
  useEffect(() => {
    listCategories().then(setCategories).catch(console.error);
  }, []);

  // Tải danh sách Sản phẩm mỗi khi URL thay đổi
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
        
        // API Backend trả về { items, total }
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

  // Hàm cập nhật URL khi thay đổi Filter
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Khi đổi filter, luôn reset về trang 1
    if (key !== "page") params.set("page", "1");
    
    router.push(`${pathname}?${params.toString()}`);
  };

  // Tính toán tổng số trang
  const totalPages = Math.ceil(totalItems / take);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("list.title")}</h1>
        <Link 
          href="/admin/products/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {t("list.addButton")}
        </Link>
      </div>

      {/* Bộ lọc (Filters) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t("list.searchPlaceholder")}
            value={searchTerm || ""} // <--- Thêm || "" vào đây để ép kiểu chuỗi
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        
        <select
          value={currentCategory}
          onChange={(e) => updateFilter("categoryId", e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">{t("list.allCategories")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={currentStatus}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">{t("list.allStatuses")}</option>
          <option value="ACTIVE">{t("list.statuses.ACTIVE")}</option>
          <option value="DRAFT">{t("list.statuses.DRAFT")}</option>
          <option value="ARCHIVED">{t("list.statuses.ARCHIVED")}</option>
        </select>
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
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)} // <--- Truyền hàm làm mới xuống
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