"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { bulkUpdateProducts } from "@/lib/products-api";

interface CategoryOption {
  id: number;
  name: string;
  path: string;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  categories: CategoryOption[];
  onSuccess: () => void; // Hàm gọi khi update thành công (để clear state và refresh bảng)
}

export default function BulkEditModal({ isOpen, onClose, selectedIds, categories, onSuccess }: BulkEditModalProps) {
  const t = useTranslations("admin_products");
  
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bắt lỗi: Nếu Admin mở lên mà không chọn gì cả, bắt họ phải chọn ít nhất 1 thứ để đổi
    if (categoryId === "" && status === "") {
      setError(t("bulkEdit.noChangesError") || "Vui lòng chọn ít nhất một mục (Danh mục hoặc Trạng thái) để thay đổi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await bulkUpdateProducts({
        productIds: selectedIds,
        categoryId: categoryId === "" ? undefined : Number(categoryId),
        status: status === "" ? undefined : status,
      });
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || t("bulkEdit.submitError") || "Có lỗi xảy ra khi cập nhật hàng loạt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-xl font-bold text-slate-900">
            {t("bulkEdit.title") || "Chỉnh sửa hàng loạt"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("bulkEdit.subtitle", { count: selectedIds.length }) || `Bạn đang thực hiện thay đổi cho ${selectedIds.length} sản phẩm đã chọn.`}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {/* Cập nhật Danh mục */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              {t("bulkEdit.newCategory") || "Danh mục mới"}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
            >
              <option value="">-- {t("bulkEdit.keepUnchanged") || "Giữ nguyên"} --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.path || cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cập nhật Trạng thái */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              {t("bulkEdit.newStatus") || "Trạng thái mới"}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
            >
              <option value="">-- {t("bulkEdit.keepUnchanged") || "Giữ nguyên"} --</option>
              <option value="ACTIVE">{t("list.statuses.ACTIVE")}</option>
              <option value="DRAFT">{t("list.statuses.DRAFT")}</option>
              <option value="ARCHIVED">{t("list.statuses.ARCHIVED")}</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            {t("bulkEdit.cancel") || "Hủy bỏ"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-[#4592b6] px-6 py-2.5 font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {t("bulkEdit.save") || "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}