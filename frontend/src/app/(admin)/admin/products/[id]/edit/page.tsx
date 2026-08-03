"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProduct, updateProduct } from "@/lib/products-api";
import ProductForm, { ProductFormValues } from "../../components/ProductForm";

export default function EditProductPage() {
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
            choices: c.choices?.map((choice: any) => ({
              ...choice,
              extraPrice: Number(choice.extraPrice)
            })) || []
          })) || []
        };

        setInitialData(formattedData);
      } catch (error) {
        console.error("Lỗi tải chi tiết sản phẩm:", error);
        alert("Sản phẩm không tồn tại hoặc đã bị xóa.");
        router.push("/admin/products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductDetail();
  }, [id, router]);

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
          stock: v.stock
        })),

        // Làm tương tự với mảng customizations (cả tầng 1 và tầng 2)
        customizations: data.customizations.map((c: any) => ({
          id: c.id, // Vô cùng quan trọng
          name: c.name,
          type: c.type,
          isRequired: c.isRequired,
          maxLength: c.maxLength,
          choices: c.choices?.map((choice: any) => ({
            id: choice.id, // Vô cùng quan trọng
            label: choice.label,
            extraPrice: choice.extraPrice
          }))
        })),
      };

      await updateProduct(id, payload);
      alert("Cập nhật sản phẩm thành công!");
      router.push("/admin/products");
      
    } catch (error: any) {
      console.error("Lỗi khi cập nhật:", error);
      const resData = error.response?.data;
      if (resData?.message) {
        alert("Lỗi dữ liệu từ Backend:\n" + JSON.stringify(resData.message, null, 2));
      } else {
        alert("Đã xảy ra lỗi khi cập nhật sản phẩm. Vui lòng mở F12 để xem chi tiết!");
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
        <p className="text-gray-500 font-medium">Đang tải dữ liệu sản phẩm...</p>
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