'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

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
  
  // Kiểm tra xem TOÀN BỘ biến thể có đang hết hàng hay không
  const isAllVariantsOutOfStock = hasVariants && (product.variants || []).every((v) => v.stock === 0);

  const priceDisplay = useMemo(() => {
    const totalCustomPrice = customValues.reduce((sum, item) => sum + (item.extraPrice || 0), 0);

    if (selectedVariantPrice !== null) {
      return <span className="text-4xl font-semibold tracking-tight text-amber-600">{formatCurrency(selectedVariantPrice + totalCustomPrice)}</span>;
    }

    if (hasVariants) {
      const minPrice = Math.min(Number(product.basePrice || 0), ...variantPrices) + totalCustomPrice;
      const maxPrice = Math.max(Number(product.basePrice || 0), ...variantPrices) + totalCustomPrice;

      if (minPrice === maxPrice) {
        return <span className="text-4xl font-semibold tracking-tight text-amber-600">{formatCurrency(minPrice)}</span>;
      }

      return (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">{t('from')}</span>
          <span className="text-4xl font-semibold tracking-tight text-amber-600">
            {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
          </span>
        </div>
      );
    }

    return <span className="text-4xl font-semibold tracking-tight text-amber-600">{formatCurrency(Number(product.basePrice || 0) + totalCustomPrice)}</span>;
    
  }, [hasVariants, product.basePrice, selectedVariantPrice, t, variantPrices, customValues]);

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/products" className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900">
        {t('back')}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[92px_1fr]">
            <div className="order-2 flex max-h-[560px] flex-row gap-3 overflow-x-auto pb-1 lg:order-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {allImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all lg:h-18 lg:w-full ${
                    currentIndex === index
                      ? 'border-amber-500 ring-4 ring-amber-100'
                      : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="order-1 group relative min-h-[440px] overflow-hidden rounded-[26px] bg-slate-50 lg:order-2 lg:min-h-[620px]">
              {mainImage ? (
                <img src={mainImage} alt={product.name} className="h-full w-full object-contain p-3 sm:p-6" />
              ) : (
                <div className="flex h-full min-h-[440px] items-center justify-center text-6xl text-slate-300 lg:min-h-[620px]">
                  📦
                </div>
              )}

              {allImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 opacity-0 shadow-lg backdrop-blur transition hover:bg-white group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 opacity-0 shadow-lg backdrop-blur transition hover:bg-white group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="space-y-4">
            {product.category?.name ? (
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-600">{product.category.name}</p>
            ) : null}

            <h1 className="text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{product.name}</h1>

            <div className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-5 py-5 shadow-[0_12px_28px_rgba(251,191,36,0.12)]">
              {priceDisplay}
            </div>
          </div>

          {/* GIAO DIỆN DROPDOWN MỚI CHO BIẾN THỂ */}
          {hasVariants ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{t('variants')}</h2>
              </div>
              <div className="relative">
                <select
                  value={selectedVariant?.id || ""}
                  onChange={(e) => {
                    const variantId = parseInt(e.target.value);
                    const variant = product.variants?.find((v) => v.id === variantId);
                    if (variant) handleVariantClick(variant);
                  }}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition-all hover:bg-slate-50 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100/50 cursor-pointer"
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
                {/* Custom Arrow Icon */}
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
          ) : null}

          {/* Customizations (Giữ nguyên) */}
          {product.customizations && product.customizations.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{t('customizations')}</h2>

              <div className="space-y-4">
                {product.customizations.map((customization) => (
                  <div key={customization.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {customization.name}
                          {customization.type === 'TEXT' && customization.extraPrice ? (
                            <span className="ml-2 text-xs font-medium text-amber-600">(+{formatCurrency(Number(customization.extraPrice))})</span>
                          ) : null}
                        </p>
                      </div>
                      {customization.isRequired ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                          {t('required')}
                        </span>
                      ) : null}
                    </div>

                    {customization.type === 'TEXT' ? (
                      <input
                        type="text"
                        maxLength={customization.maxLength || 50}
                        placeholder={customization.name}
                        onChange={(event) => handleCustomChange(customization.name, event.target.value, Number(customization.extraPrice || 0))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
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
                                if (isActive) {
                                  handleCustomChange(customization.name, '');
                                } else {
                                  handleCustomChange(customization.name, choice.label, Number(choice.extraPrice || 0));
                                }
                              }}
                              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                                isActive
                                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/60'
                              }`}
                            >
                              {choice.label}
                              {choice.extraPrice > 0 ? <span className="ml-1 text-xs text-amber-600">(+{formatCurrency(Number(choice.extraPrice))})</span> : null}
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

          {message ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {message.text}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleAddToCart}
            // Khóa nút nếu: Đang tải OR (Có biến thể nhưng tất cả đều hết hàng) OR (Biến thể đang chọn hết hàng)
            disabled={loading || isAllVariantsOutOfStock || (hasVariants && selectedVariant?.stock === 0)}
            className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAllVariantsOutOfStock ? tCart('out_of_stock') : loading ? tCart('adding') : t('addToCart')}
          </button>

          {product.description ? (
            <p className="text-sm leading-7 text-slate-600">
              {product.description}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}