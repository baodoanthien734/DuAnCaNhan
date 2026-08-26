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
      const resData = error.response?.data;
      if (error.response?.status === 401 || error.response?.status === 403) {
        await modal.alert(t("form.createAuthError"));
      } else if (resData?.message) {
        const errorText = Array.isArray(resData.message) 
          ? '\n- ' + resData.message.map((err: string) => {
              return err
                .replace(/variants\.(\d+)\./g, (_, index) => 
                  `${t("form.errorVariantPrefix", { index: Number(index) + 1 })}: `
                )
                .replace(/customizations\.(\d+)\.choices\.(\d+)\./g, (_, cIdx, chIdx) => 
                  `${t("form.errorChoicePrefix", { cIdx: Number(cIdx) + 1, chIdx: Number(chIdx) + 1 })}: `
                )
                .replace(/customizations\.(\d+)\./g, (_, index) => 
                  `${t("form.errorCustomizationPrefix", { index: Number(index) + 1 })}: `
                );
            }).join('\n- ') 
          : resData.message;

        await modal.alert(t("form.createValidationError", { message: errorText }));
      } else {
        await modal.alert(t("form.createGenericError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <ProductForm onSubmitData={handleCreate} isLoading={isLoading} />;
}