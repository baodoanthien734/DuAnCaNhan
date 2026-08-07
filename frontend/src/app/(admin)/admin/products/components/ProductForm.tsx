"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { listCategories } from "@/lib/categories-api";
import { uploadProductImage } from "@/lib/products-api";

// --- TYPE DEFINITIONS ---
export type ProductFormValues = {
  name: string;
  categoryId: number;
  description: string;
  basePrice: number;
  isPrivate: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  images: string[];
  variants: {
    name: string;
    sku: string;
    price: number;
    stock: number;
  }[];
  customizations: {
    name: string;
    type: "TEXT" | "SELECT";
    isRequired: boolean;
    maxLength?: number;
    extraPrice?: number;
    choices: { label: string; extraPrice: number }[];
  }[];
};

// --- COMPONENT XỬ LÝ MẢNG CHOICES LỒNG NHAU ---
const CustomizationChoices = ({ nestIndex, control, register, t }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `customizations.${nestIndex}.choices`,
  });

  return (
    <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md shadow-inner">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{t("form.customizationChoicesLabel")}</label>
        <button
          type="button"
          onClick={() => append({ label: "", extraPrice: 0 })}
          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition"
        >
          {t("form.addChoice")}
        </button>
      </div>
      
      {fields.map((item, k) => (
        <div key={item.id} className="flex gap-3 mb-2 items-end">
          <div className="flex-1">
            <input
              {...register(`customizations.${nestIndex}.choices.${k}.label` as const, { required: true })}
              placeholder={t("form.choicePlaceholder")}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              {...register(`customizations.${nestIndex}.choices.${k}.extraPrice` as const, { valueAsNumber: true })}
              placeholder={t("form.choiceExtraPricePlaceholder")}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(k)}
            className="p-2 text-red-500 hover:bg-red-50 rounded"
            title={t("form.choiceRemoveTitle")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
      {fields.length === 0 && <p className="text-xs text-gray-400 italic">{t("form.choiceEmpty")}</p>}
    </div>
  );
};

// --- MAIN FORM COMPONENT ---
interface ProductFormProps {
  initialData?: any; 
  onSubmitData: (data: ProductFormValues) => Promise<void>;
  isLoading: boolean;
}

export default function ProductForm({ initialData, onSubmitData, isLoading }: ProductFormProps) {
  const t = useTranslations("admin_products");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: initialData || {
      name: "",
      categoryId: 1,
      description: "",
      basePrice: 0,
      isPrivate: false,
      status: "ACTIVE",
      variants: [],
      customizations: [],
      images: [],
    },
  });

  // Tự động điền dữ liệu nếu là trang Edit
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants",
  });

  const { fields: customFields, append: appendCustom, remove: removeCustom } = useFieldArray({
    control,
    name: "customizations",
  });

  const watchCustomizations = watch("customizations");
  const imagesWatch = watch("images") || [];

  useEffect(() => {
    listCategories().then(setCategories).catch(console.error);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const data = await uploadProductImage(file);
      setValue("images", [...imagesWatch, data.url], { shouldValidate: true });
    } catch (error) {
      console.error("Lỗi upload ảnh:", error);
      alert(t("form.imageUploadError"));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    const newImages = imagesWatch.filter((_, index) => index !== indexToRemove);
    setValue("images", newImages, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <form onSubmit={handleSubmit(onSubmitData)}>
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {initialData ? t("form.titleEdit") : t("form.titleCreate")}
            </h1>
            <p className="text-sm text-gray-500">{t("form.description")}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              {t("form.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 shadow-md transition disabled:bg-gray-400 flex items-center gap-2"
            >
              {isLoading ? t("form.saving") : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {initialData ? t("form.saveEdit") : t("form.saveCreate")}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CỘT TRÁI (Nội dung chính: Thông tin, Variants, Customizations) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* SECTION: THÔNG TIN CƠ BẢN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-5 border-b pb-2">{t("form.sectionInfo")}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("form.nameLabel")} <span className="text-red-500">*</span></label>
                  <input
                    {...register("name", { required: true })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder={t("form.namePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("form.descriptionLabel")}</label>
                  <textarea
                    {...register("description")}
                    rows={4}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder={t("form.descriptionPlaceholder")}
                  />
                </div>
              </div>
            </div>

            {/* SECTION: BIẾN THỂ (VARIANTS) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-5 border-b pb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{t("form.sectionVariants")}</h2>
                  <p className="text-xs text-gray-500">{t("form.sectionVariantsSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => appendVariant({ name: "", sku: "", price: 0, stock: 0 })}
                  className="bg-green-50 text-green-600 font-semibold px-4 py-2 rounded-lg hover:bg-green-100 border border-green-200 transition"
                >
                  {t("form.addVariant")}
                </button>
              </div>

              <div className="space-y-4">
                {variantFields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t("form.variantNameLabel")}</label>
                        <input {...register(`variants.${index}.name` as const, { required: true })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t("form.variantSkuLabel")}</label>
                        <input {...register(`variants.${index}.sku` as const)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t("form.variantPriceLabel")}</label>
                        <input type="number" {...register(`variants.${index}.price` as const, { valueAsNumber: true })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t("form.variantStockLabel")}</label>
                        <input type="number" {...register(`variants.${index}.stock` as const, { valueAsNumber: true })} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm mt-1" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeVariant(index)} className="self-center p-2 text-red-500 hover:bg-red-100 rounded-lg transition" title={t("form.variantRemoveTitle")}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                {variantFields.length === 0 && (
                  <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    {t("form.variantEmpty")}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: TÙY CHỌN CÁ NHÂN HÓA (CUSTOMIZATIONS) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-5 border-b pb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{t("form.sectionCustomizations")}</h2>
                  <p className="text-xs text-gray-500">{t("form.sectionCustomizationsSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => appendCustom({ name: "", type: "TEXT", isRequired: false, maxLength: 10, extraPrice: 0, choices: [] })}
                  className="bg-purple-50 text-purple-600 font-semibold px-4 py-2 rounded-lg hover:bg-purple-100 border border-purple-200 transition"
                >
                  {t("form.addCustomization")}
                </button>
              </div>

              <div className="space-y-6">
                {customFields.map((field, index) => {
                  const currentType = watchCustomizations?.[index]?.type || "TEXT";
                  
                  return (
                    <div key={field.id} className="p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{t("form.customizationNameLabel")}</label>
                          <input {...register(`customizations.${index}.name` as const, { required: true })} className="w-full p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 text-sm" />
                        </div>
                        <div className="w-40">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{t("form.customizationTypeLabel")}</label>
                          <select {...register(`customizations.${index}.type` as const)} className="w-full p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 text-sm bg-white">
                            <option value="TEXT">{t("form.customizationTypeText")}</option>
                            <option value="SELECT">{t("form.customizationTypeSelect")}</option>
                          </select>
                        </div>
                        <div className="w-24 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input type="checkbox" {...register(`customizations.${index}.isRequired` as const)} className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4" />
                            {t("form.customizationRequired")}
                          </label>
                        </div>
                        <button type="button" onClick={() => removeCustom(index)} className="mt-6 self-start p-2 text-red-500 hover:bg-red-100 rounded-lg transition" title={t("form.customizationRemoveTitle")}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>

                      {/* Hiển thị linh hoạt dựa vào TYPE */}
                      {currentType === "TEXT" && (
                        <div className="mt-3 flex gap-4 w-2/3">
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600 mb-1 block">
                              {t("form.customizationMaxLengthLabel")}
                            </label>
                            <input 
                              type="number" 
                              {...register(`customizations.${index}.maxLength` as const, { valueAsNumber: true })} 
                              className="w-full p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 text-sm" 
                              placeholder={t("form.maxLengthPlaceholder")} 
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600 mb-1 block">
                              Phụ phí thêu/khắc (VNĐ)
                            </label>
                            <input 
                              type="number" 
                              {...register(`customizations.${index}.extraPrice` as const, { valueAsNumber: true })} 
                              className="w-full p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 text-sm" 
                              placeholder="Ví dụ: 15000" 
                            />
                          </div>
                        </div>
                      )}

                      {currentType === "SELECT" && (
                        <CustomizationChoices nestIndex={index} control={control} register={register} t={t} />
                      )}
                    </div>
                  );
                })}
                {customFields.length === 0 && (
                   <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    {t("form.customizationEmpty")}
                 </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Sidebar: Giá gốc, Cài đặt đăng bán, Hình ảnh) */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">{t("form.salesSetupTitle")}</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("form.basePriceLabel")} <span className="text-red-500">*</span></label>
                  <p className="text-xs text-gray-400 mb-2">{t("form.basePriceHint")}</p>
                  <input
                    type="number"
                    {...register("basePrice", { valueAsNumber: true })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("form.categoryLabel")}</label>
                 <select 
                    {...register("categoryId", { valueAsNumber: true })} 
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {categories.length === 0 && <option value="">{t("form.loadingCategories")}</option>}
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("form.statusLabel")}</label>
                  <select {...register("status")} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="ACTIVE">{t("form.statusActive")}</option>
                    <option value="DRAFT">{t("form.statusDraft")}</option>
                    <option value="ARCHIVED">{t("form.statusArchived")}</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("isPrivate")} className="rounded text-blue-600 focus:ring-blue-500 h-5 w-5" />
                    <div>
                      <span className="block text-sm font-semibold text-gray-700">{t("form.privateLabel")}</span>
                      <span className="block text-xs text-gray-500">{t("form.privateHint")}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
              <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">{t("form.imageTitle")}</h2>
              <div className="grid grid-cols-3 gap-4 mb-2">
                {imagesWatch.map((url, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                    <img src={url} alt={t("form.imageAlt", { index: index + 1 })} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      title={t("form.removeImageTitle")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {imagesWatch.length < 5 && (
                  <label className="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition aspect-square relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                      </svg>
                      <span className="text-xs font-medium text-gray-500">{t("form.addImage")}</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                        <span className="text-[10px] font-semibold text-blue-600">{t("form.imageUploadLoading")}</span>
                      </div>
                    )}
                  </label>
                )}
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                <p>{t("form.imageHint")}</p>
                <p>{t("form.imageCount", { count: imagesWatch.length })}</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}