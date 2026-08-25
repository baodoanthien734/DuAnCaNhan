'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
// Thêm useLocale để format tiền tệ động
import { useTranslations, useLocale } from 'next-intl';
import { addToCart } from '@/lib/cart-api';
import { resolveImageUrl } from '@/lib/utils';

type ProductVariant = {
  id: number;
  name: string;
  price: number;
  stock: number;
  image?: string | null;
};

type ProductCustomizationChoice = {
  id: number;
  label: string;
  extraPrice: number;
};

type ProductCustomization = {
  id: number;
  name: string;
  type: 'TEXT' | 'SELECT';
  isRequired: boolean;
  maxLength?: number | null;
  extraPrice?: number | null;
  choices?: ProductCustomizationChoice[];
};

type ProductDetailClientProps = {
  product: {
    id: number;
    name: string;
    description?: string | null;
    basePrice: number;
    images?: string[] | null;
    variants?: ProductVariant[] | null;
    customizations?: ProductCustomization[] | null;
    category?: { name: string } | null;
  };
};

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const t = useTranslations('public_pages.product_detail');
  const tCart = useTranslations('cart');
  const locale = useLocale(); // Lấy ngôn ngữ hiện tại

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [customValues, setCustomValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const allImages = useMemo(() => {
    const productImages = (product.images || []).map((image) => resolveImageUrl(image)).filter(Boolean);
    const variantImages = (product.variants || [])
      .map((variant) => variant.image)
      .filter((image): image is string => Boolean(image))
      .map((image) => resolveImageUrl(image));

    return [...productImages, ...variantImages];
  }, [product.images, product.variants]);

  // HÀM FORMAT TIỀN TỆ ĐỘNG (vi = đ, en = VND)
  const formatCurrency = (value: number) => {
    if (locale === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' })
        .format(Number(value || 0))
        .replace('₫', 'VND');
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  };

  const mainImage = allImages[currentIndex] || '';

  const handlePrev = () => {
    if (allImages.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (allImages.length === 0) return;
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleVariantClick = (variant: ProductVariant) => {
    if (variant.stock === 0) return;

    setSelectedVariant(variant);
    setMessage(null);

    if (variant.image) {
      const targetImage = resolveImageUrl(variant.image);
      const targetIndex = allImages.findIndex((image) => image === targetImage);
      if (targetIndex !== -1) {
        setCurrentIndex(targetIndex);
      }
    }
  };

  const handleCustomChange = (customName: string, value: string, extraPrice: number = 0) => {
    setMessage(null);
    setCustomValues((prev) => {
      const existingIndex = prev.findIndex((item) => item.name === customName);

      if (value === '') {
        return prev.filter((item) => item.name !== customName);
      }

      const nextCustom = { name: customName, value, extraPrice };
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextCustom;
        return next;
      }

      return [...prev, nextCustom];
    });
  };

  const selectedVariantPrice = selectedVariant ? Number(selectedVariant.price || 0) : null;
  const variantPrices = (product.variants || []).map((variant) => Number(variant.price || 0));
  const hasVariants = variantPrices.length > 0;
  
  const isAllVariantsOutOfStock = hasVariants && (product.variants || []).every((v) => v.stock === 0);

  const priceDisplay = useMemo(() => {
    const totalCustomPrice = customValues.reduce((sum, item) => sum + (item.extraPrice || 0), 0);

    if (selectedVariantPrice !== null) {
      // Giảm kích thước text-4xl xuống text-3xl
      return <span className="text-3xl font-semibold tracking-tight text-amber-600">{formatCurrency(selectedVariantPrice + totalCustomPrice)}</span>;
    }

    if (hasVariants) {
      const minPrice = Math.min(Number(product.basePrice || 0), ...variantPrices) + totalCustomPrice;
      const maxPrice = Math.max(Number(product.basePrice || 0), ...variantPrices) + totalCustomPrice;

      if (minPrice === maxPrice) {
        return <span className="text-3xl font-semibold tracking-tight text-amber-600">{formatCurrency(minPrice)}</span>;
      }

      return (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">{t('from')}</span>
          <span className="text-3xl font-semibold tracking-tight text-amber-600">
            {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
          </span>
        </div>
      );
    }

    return <span className="text-3xl font-semibold tracking-tight text-amber-600">{formatCurrency(Number(product.basePrice || 0) + totalCustomPrice)}</span>;
    
  }, [hasVariants, product.basePrice, selectedVariantPrice, t, variantPrices, customValues, locale]);

  const handleAddToCart = async () => {
    setMessage(null);

    if (hasVariants && !selectedVariant) {
      setMessage({ type: 'error', text: tCart('required_variant') });
      return;
    }

    if (product.customizations && product.customizations.length > 0) {
      const missingRequired = product.customizations.some((customization) => {
        if (!customization.isRequired) return false;
        return !customValues.find((value) => value.name === customization.name);
      });

      if (missingRequired) {
        setMessage({ type: 'error', text: tCart('required_customization') });
        return;
      }
    }

    setLoading(true);
    try {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity: 1,
        customizations: customValues.length > 0 ? customValues : undefined,
        product: {
          id: product.id,
          name: product.name,
          basePrice: product.basePrice,
          images: product.images || [],
        },
        variant: selectedVariant
          ? {
              id: selectedVariant.id,
              name: selectedVariant.name,
              price: selectedVariant.price,
              image: selectedVariant.image || undefined,
            }
          : undefined,
      });

      setMessage({ type: 'success', text: tCart('success_add') });
      setSelectedVariant(null);
      setCustomValues([]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || tCart('error_add') });
    } finally {
      setLoading(false);
    }
  };

  return (
    // THAY ĐỔI 1: Bọc font-sans (vuông vắn) và text-[0.85rem] (khoảng 85% của text-base mặc định)
    <div className="font-sans text-[0.85rem] mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12 bg-slate-50/30">
      <Link href="/products" className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-900">
        {t('back')}
      </Link>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        
        <section className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
          <div className="flex h-auto w-full flex-row gap-3 overflow-x-auto pb-2 lg:w-20 lg:flex-col lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border transition-all lg:w-full ${
                  currentIndex === index
                    ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300 bg-white'
                }`}
              >
                <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-contain p-1" />
              </button>
            ))}
          </div>

          <div className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white aspect-[4/5] lg:aspect-square lg:h-[500px] shadow-sm">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl text-slate-300">📦</div>
            )}

            {allImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur transition-all hover:bg-white hover:scale-110 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur transition-all hover:bg-white hover:scale-110 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </section>

        <aside className="lg:sticky lg:top-8 flex flex-col h-full min-h-[450px]">
          
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              {product.category?.name ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{product.category.name}</p>
              ) : null}

              {/* Giảm kích thước heading */}
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
              
              <div className="mt-2">
                {priceDisplay}
              </div>
            </div>

            <div className="h-[2px] w-full bg-slate-300"></div>

            {hasVariants ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">{t('variants')}</h2>
                </div>
                <div className="relative">
                  <select
                    value={selectedVariant?.id || ""}
                    onChange={(e) => {
                      const variantId = parseInt(e.target.value);
                      const variant = product.variants?.find((v) => v.id === variantId);
                      if (variant) handleVariantClick(variant);
                    }}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[0.85rem] text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="" disabled>
                      {t('select_variant') || '-- Chọn biến thể --'}
                    </option>
                    {(product.variants || []).map((variant) => {
                      const isOutOfStock = variant.stock === 0;
                      return (
                        <option 
                          key={variant.id} 
                          value={variant.id} 
                          disabled={isOutOfStock}
                        >
                          {variant.name} - {formatCurrency(Number(variant.price || 0))} {isOutOfStock ? `(${tCart('out_of_stock')})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : null}

            {product.customizations && product.customizations.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">{t('customizations')}</h2>

                <div className="space-y-4">
                  {product.customizations.map((customization) => (
                    <div key={customization.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="font-medium text-slate-700">
                          {customization.name}
                          {customization.type === 'TEXT' && customization.extraPrice ? (
                            <span className="ml-1 text-amber-600">(+{formatCurrency(Number(customization.extraPrice))})</span>
                          ) : null}
                        </label>
                        {customization.isRequired ? (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-red-500">* {t('required')}</span>
                        ) : null}
                      </div>

                      {customization.type === 'TEXT' ? (
                        <input
                          type="text"
                          maxLength={customization.maxLength || 50}
                          placeholder="..."
                          onChange={(event) => handleCustomChange(customization.name, event.target.value, Number(customization.extraPrice || 0))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[0.85rem] text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      ) : null}

                      {customization.type === 'SELECT' && customization.choices?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {customization.choices.map((choice) => {
                            const isActive = customValues.some((value) => value.name === customization.name && value.value === choice.label);

                            return (
                              <button
                                key={choice.id}
                                type="button"
                                onClick={() => {
                                  if (isActive) handleCustomChange(customization.name, '');
                                  else handleCustomChange(customization.name, choice.label, Number(choice.extraPrice || 0));
                                }}
                                className={`rounded-lg border px-3 py-1.5 font-medium transition-all ${
                                  isActive
                                    ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                {choice.label}
                                {choice.extraPrice > 0 ? <span className="ml-1 text-[10px] text-amber-600">(+{formatCurrency(Number(choice.extraPrice))})</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-auto pt-6">
            {message ? (
              <div className={`mb-3 rounded-lg px-3 py-2 font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                {message.text}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={loading || isAllVariantsOutOfStock || (hasVariants && selectedVariant?.stock === 0)}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {isAllVariantsOutOfStock ? tCart('out_of_stock') : loading ? tCart('adding') : (
                <>
                  {t('addToCart')}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {product.description ? (
        <div className="mt-12 border-t-2 border-slate-300 pt-8">
          <div className="max-w-4xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Chi tiết sản phẩm</h2>
            <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed">
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}