"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createProduct } from "@/lib/products-api";
import ProductForm, { ProductFormValues } from "../components/ProductForm";
import { useModal } from '@/hooks/useModal';

export default function CreateProductPage() {
  const t = useTranslations("admin_products");
  const modal = useModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      await createProduct(data);
      await modal.alert(t("form.createSuccess"));
      router.push('/admin/products');
    } catch (error: any) {
      console.error("Lỗi kết nối:", error);
      const resData = error.response?.data;
      if (error.response?.status === 401 || error.response?.status === 403) {
        await modal.alert(t("form.createAuthError"));
      } else if (resData?.message) {
        await modal.alert(t("form.createValidationError", { message: JSON.stringify(resData.message, null, 2) }));
      } else {
        await modal.alert(t("form.createGenericError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <ProductForm onSubmitData={handleCreate} isLoading={isLoading} />;
}