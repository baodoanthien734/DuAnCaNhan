"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getProduct, updateProduct } from "@/lib/products-api";
import ProductForm, { ProductFormValues } from "../../components/ProductForm";
import { useModal } from '@/hooks/useModal';

export default function EditProductPage() {
  const t = useTranslations("admin_products");
  const modal = useModal();
  const router = useRouter();
  const params = useParams(); // Lấy ID từ URL
  const id = Number(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<ProductFormValues | null>(null);

  // Gọi API lấy dữ liệu chi tiết khi trang vừa load
  useEffect(() => {
    if (!id) return;

    const fetchProductDetail = async () => {
      try {
        const data = await getProduct(id);
        
        // Prisma trả về decimal (chuỗi) cho giá tiền, cần parse lại thành number để Form không báo lỗi
        const formattedData = {
          ...data,
          basePrice: Number(data.basePrice),
          variants: data.variants?.map((v: any) => ({
            ...v,
            price: Number(v.price),
          })) || [],
          customizations: data.customizations?.map((c: any) => ({
            ...c,
            extraPrice: Number(c.extraPrice || 0), // <--- 1. THÊM DÒNG NÀY ĐỂ LOAD DỮ LIỆU CŨ LÊN FORM
            choices: c.choices?.map((choice: any) => ({
              ...choice,
              extraPrice: Number(choice.extraPrice)
            })) || []
          })) || []
        };

        setInitialData(formattedData);
      } catch (error) {
        console.error("Lỗi tải chi tiết sản phẩm:", error);
        await modal.alert(t("form.detailsLoadError"));
        router.push("/admin/products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductDetail();
  }, [id, router, t]);

  // Hàm xử lý khi người dùng bấm "Cập nhật sản phẩm"
  const handleUpdate = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Dọn dẹp payload: Chỉ bốc đúng những trường cần thiết và giữ lại 'id'
      const payload = {
        name: data.name,
        categoryId: data.categoryId,
        description: data.description,
        basePrice: data.basePrice,
        isPrivate: data.isPrivate,
        status: data.status,
        images: data.images,
        
        // Map qua mảng variants để lọc bỏ createdAt, updatedAt, productId...
        variants: data.variants.map((v: any) => ({
          id: v.id, // Vô cùng quan trọng cho Backend Sync
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          image: v.image,
        })),

        // Làm tương tự với mảng customizations (cả tầng 1 và tầng 2)
        customizations: data.customizations.map((c: any) => ({
          id: c.id, 
          name: c.name,
          type: c.type,
          isRequired: c.isRequired,
          maxLength: c.maxLength,
          extraPrice: c.extraPrice || 0, // <--- 2. THÊM DÒNG NÀY! ĐÂY LÀ CHỐT CHẶN CUỐI CÙNG!
          choices: c.choices?.map((choice: any) => ({
            id: choice.id, 
            label: choice.label,
            extraPrice: choice.extraPrice
          }))
        })),
      };

      await updateProduct(id, payload);
      await modal.alert(t("form.updateSuccess"));
      router.push("/admin/products");
      
    } catch (error: any) {
      console.error("Lỗi khi cập nhật:", error);
      const resData = error.response?.data;
      if (resData?.message) {
        await modal.alert(t("form.updateValidationError", { message: JSON.stringify(resData.message, null, 2) }));
      } else {
        await modal.alert(t("form.updateError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị màn hình Loading trong lúc chờ API trả dữ liệu
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">{t("form.loadingProduct")}</p>
      </div>
    );
  }

  // Gọi Component dùng chung ra và truyền dữ liệu
  return (
    <ProductForm 
      initialData={initialData} 
      onSubmitData={handleUpdate} 
      isLoading={isSubmitting} 
    />
  );
}