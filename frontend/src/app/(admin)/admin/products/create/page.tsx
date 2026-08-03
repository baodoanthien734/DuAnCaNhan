"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/products-api";
import ProductForm, { ProductFormValues } from "../components/ProductForm";

export default function CreateProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      await createProduct(data);
      alert("Tạo sản phẩm thành công!");
      router.push('/admin/products');
    } catch (error: any) {
      console.error("Lỗi kết nối:", error);
      const resData = error.response?.data;
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Phiên đăng nhập đã hết hạn hoặc bạn không đủ quyền!");
      } else if (resData?.message) {
        alert("Lỗi validate:\n" + JSON.stringify(resData.message, null, 2));
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại sau!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <ProductForm onSubmitData={handleCreate} isLoading={isLoading} />;
}