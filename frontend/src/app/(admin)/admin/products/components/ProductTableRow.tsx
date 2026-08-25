"use client";

import React, { useState } from "react";
import Link from "next/link"; 
import { useTranslations } from "next-intl";
import { deleteProduct, updateProductStatus } from "@/lib/products-api"; 
import { useModal } from '@/hooks/useModal';
import { resolveImageUrl } from '@/lib/utils';

interface ProductTableRowProps {
  product: any;
  onRefresh: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export default function ProductTableRow({ product, onRefresh, isSelected, onToggleSelect }: ProductTableRowProps) {
  const t = useTranslations("admin_products");
  const modal = useModal();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  // Hàm xử lý Đổi trạng thái
  const handleToggleStatus = async () => {
    const newStatus = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      setIsProcessing(true);
      await updateProductStatus(product.id, newStatus);
      onRefresh(); 
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      await modal.alert(t("row.statusError"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Hàm xử lý Xóa
  const handleDelete = async () => {
    if (!(await modal.confirm(t("row.deleteConfirm", { name: product.name })))) {
      return;
    }
    
    try {
      setIsProcessing(true);
      await deleteProduct(product.id);
      onRefresh(); 
    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      await modal.alert(t("row.deleteError"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Format tiền tệ
  const formatPrice = (price: any) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
  };

  return (
    <React.Fragment>
      <tr className={`border-b hover:bg-gray-50 transition items-start ${
        isSelected 
          ? 'bg-emerald-50/50 border-emerald-100' 
          : isExpanded 
            ? 'bg-blue-50/30 border-blue-100' 
            : 'border-gray-50'
      }`}>
        <td className="px-4 py-4 w-10">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-md hover:bg-gray-200 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90 bg-blue-100 text-blue-600' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </td>

        <td className="px-6 py-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
              {product.images && product.images.length > 0 ? (
                <img src={resolveImageUrl(product.images[0])} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">{t("row.noImage")}</div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">
                {product.name}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium w-fit">
                {product.category?.name || t("row.uncategorized")}
              </span>
            </div>
          </div>
        </td>

        <td className="px-6 py-4 font-medium text-gray-900 align-middle">
          {formatPrice(product.basePrice)}
        </td>

        <td className="px-6 py-4 align-middle">
          <button 
            onClick={handleToggleStatus}
            disabled={isProcessing || product.status === 'ARCHIVED'} 
            className="focus:outline-none transition-opacity hover:opacity-80 disabled:opacity-50"
            title={t("row.toggleStatusTitle")}
          >
            {product.status === 'ACTIVE' && <span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-green-200 cursor-pointer">{t("row.statuses.ACTIVE")}</span>}
            {product.status === 'DRAFT' && <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200 cursor-pointer">{t("row.statuses.DRAFT")}</span>}
            {product.status === 'ARCHIVED' && <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-red-200 cursor-not-allowed">{t("row.statuses.ARCHIVED")}</span>}
          </button>
        </td>

       <td className="px-6 py-4 text-right align-middle space-x-3">
          <Link 
            href={`/admin/products/${product.id}/edit`} 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm inline-block px-2"
          >
            {t("row.edit")}
          </Link>
          <button 
            onClick={handleDelete}
            disabled={isProcessing || product.status === 'ARCHIVED'}
            className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed inline-block px-2"
          >
            {t("row.delete")}
          </button>
          
          {/* THAY ĐỔI: Nút Thêm/Hủy Chọn */}
          <button
            onClick={onToggleSelect}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all inline-block min-w-[70px] ${
              isSelected 
                ? 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isSelected ? t("list.cancelAddButton") || "Bỏ chọn" : t("list.addButtonAction") || "Chọn"}
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-gray-50/80 border-b border-gray-200">
          <td colSpan={5} className="p-0"> 
            <div className="p-6 pl-14 grid grid-cols-2 gap-8">
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t("row.descriptionTitle")}</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                    {product.description || <span className="italic text-gray-400">{t("row.noDescription")}</span>}
                  </p>
                </div>

                {product.customizations && product.customizations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t("row.customizationTitle")}</h4>
                    <div className="bg-white rounded border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">{t("row.typeLabel")}</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">{t("row.choiceLabel")}</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600">{t("row.extraPriceLabel")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {product.customizations.map((cust: any) => (
                            <tr key={cust.id}>
                              <td className="px-3 py-2 font-medium">{cust.name} {cust.isRequired && <span className="text-red-500">*</span>}</td>
                              <td className="px-3 py-2 text-gray-600">
                                {cust.type === 'TEXT' ? t("row.textInputWithMax", { max: cust.maxLength || t("row.unlimited") }) : cust.choices?.map((c:any) => c.label).join(', ')}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {cust.type === 'SELECT' && cust.choices?.map((c:any, i:number) => (
                                  <div key={i}>{c.label}: <span className="text-orange-600">+{formatPrice(c.extraPrice)}</span></div>
                                ))}
                                {cust.type === 'TEXT' && cust.extraPrice > 0 && (
                                  <div>
                                    Phụ phí: <span className="text-orange-600">+{formatPrice(cust.extraPrice)}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t("row.variantTitle")}</h4>
                {product.variants && product.variants.length > 0 ? (
                  <div className="bg-white rounded border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">{t("row.variantName")}</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">{t("row.variantSku")}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">{t("row.variantStock")}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">{t("row.variantPrice")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {product.variants.map((v: any) => (
                          <tr key={v.id}>
                            <td className="px-3 py-2 font-medium">{v.name}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{v.sku || '-'}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-medium ${v.stock === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {v.stock}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">{formatPrice(v.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-white p-3 rounded border border-gray-200 italic">{t("row.noVariants")}</p>
                )}
              </div>

            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}