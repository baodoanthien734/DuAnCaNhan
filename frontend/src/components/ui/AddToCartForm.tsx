'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { addToCart } from '@/lib/cart-api';

interface AddToCartFormProps {
  product: any;
}

export default function AddToCartForm({ product }: AddToCartFormProps) {
  const t = useTranslations('cart');

  // State lưu trữ biến thể đang chọn
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  // State lưu trữ mảng tùy chọn cá nhân hóa (JSON)
  const [customValues, setCustomValues] = useState<any[]>([]);

  // State trạng thái giao diện
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSelectVariant = (variantId: number) => {
  // Bấm lần 2 thì set về null (hủy chọn)
  setSelectedVariant(prev => prev === variantId ? null : variantId);
  setMessage(null);
  };

  // Xử lý khi nhập/chọn Customizations (Cá nhân hóa)
  const handleCustomChange = (customName: string, value: string, extraPrice: number = 0) => {
    setMessage(null);
    setCustomValues((prev) => {
      const existingIndex = prev.findIndex((c) => c.name === customName);
      
      // Nếu value rỗng (Xóa text hoặc Hủy chọn) -> Xóa khỏi danh sách customValues
      if (value === '') {
        return prev.filter((c) => c.name !== customName);
      }

      const newCustom = { name: customName, value, extraPrice };
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = newCustom;
        return next;
      }
      return [...prev, newCustom];
    });
  };

  // Xử lý Submit thêm vào giỏ hàng
  const handleSubmit = async () => {
    setMessage(null);

    // 1. Kiểm tra điều kiện bắt buộc
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      setMessage({ type: 'error', text: t('required_variant') });
      return;
    }

    if (product.customizations && product.customizations.length > 0) {
      const missingRequired = product.customizations.some((c: any) => {
        if (!c.isRequired) return false;
        return !customValues.find((val) => val.name === c.name);
      });

      if (missingRequired) {
        setMessage({ type: 'error', text: t('required_customization') });
        return;
      }
    }

    // 2. Gửi API
    setLoading(true);
    try {
      const selectedVariantData = selectedVariant
        ? product.variants.find((item: any) => item.id === selectedVariant)
        : undefined;

      await addToCart({
        productId: product.id,
        variantId: selectedVariant || undefined,
        quantity: 1,
        customizations: customValues.length > 0 ? customValues : undefined,
        product: {
          id: product.id,
          name: product.name,
          basePrice: product.basePrice,
          images: product.images,
        },
        variant: selectedVariantData
          ? {
              id: selectedVariantData.id,
              name: selectedVariantData.name,
              price: selectedVariantData.price,
              image: selectedVariantData.image,
            }
          : undefined,
      });

      setMessage({ type: 'success', text: t('success_add') });
      
      // Reset form sau khi thêm thành công
      setSelectedVariant(null);
      setCustomValues([]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('error_add') });
    } finally {
      setLoading(false);
    }
  };

  // 3. Tính toán lại tổng giá trị sản phẩm real-time
  let currentPrice = Number(product.basePrice);
  if (selectedVariant) {
    const v = product.variants.find((item: any) => item.id === selectedVariant);
    if (v) currentPrice = Number(v.price);
  }
  const extraTotal = customValues.reduce((sum, item) => sum + (item.extraPrice || 0), 0);
  const finalPrice = currentPrice + extraTotal;

  return (
    <div>
      {/* Hiển thị giá tiền real-time */}
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#b45309', marginBottom: '16px' }}>
        {finalPrice.toLocaleString()} đ
      </div>

      <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '24px' }}>
        {product.description || t('no_description')}
      </p>

      {/* Danh sách Biến thể (Variants) */}
      {product.variants && product.variants.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
            {t('variants_label')}
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {product.variants.map((v: any) => {
              const isSelected = selectedVariant === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVariant(v.id)}
                  style={{
                    padding: '8px 14px',
                    border: isSelected ? '2px solid #111827' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '13px',
                    backgroundColor: isSelected ? '#f3f4f6' : '#f9fafb',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{v.name}</div>
                  <div style={{ color: '#b45309' }}>{Number(v.price).toLocaleString()} {t('currency')}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Danh sách Cá nhân hóa (Customizations) */}
      {product.customizations && product.customizations.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
            {t('customizations_label')}
          </h3>
          {product.customizations.map((c: any) => (
            <div key={c.id} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                <span>
                  {c.name}
                  {/* Bổ sung: Hiển thị tiền phụ phí cho type TEXT */}
                  {c.type === 'TEXT' && c.extraPrice > 0 && (
                    <span style={{ color: '#ea580c', marginLeft: '6px' }}>
                      (+{Number(c.extraPrice).toLocaleString()} {t('currency')})
                    </span>
                  )}
                </span>
                {c.isRequired && <span style={{ color: '#ef4444', fontSize: '11px' }}>{t('required')}</span>}
              </div>

              {/* Bổ sung: Cập nhật hàm onChange truyền thêm c.extraPrice */}
              {c.type === 'TEXT' && (
                <input
                  type="text"
                  maxLength={c.maxLength || 50}
                  placeholder={t('text_input_placeholder', { name: c.name.toLowerCase() })}
                  onChange={(e) => handleCustomChange(c.name, e.target.value, Number(c.extraPrice || 0))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
                />
              )}

              {c.type === 'SELECT' && c.choices?.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {c.choices.map((choice: any) => {
                    const isActive = customValues.some((val) => val.name === c.name && val.value === choice.label);
                    return (
                      <button
                        key={choice.id}
                        onClick={() => {
                          if (isActive) {
                            // Đã xóa cái chốt chặn ở đây!
                            handleCustomChange(c.name, ''); // Gửi value rỗng để hủy chọn
                          } else {
                            handleCustomChange(c.name, choice.label, Number(choice.extraPrice));
                          }
                        }}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          backgroundColor: isActive ? '#111827' : '#fff',
                          color: isActive ? '#fff' : '#111827',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {choice.label} {choice.extraPrice > 0 ? `(+${Number(choice.extraPrice).toLocaleString()} ${t('currency')})` : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Thông báo trạng thái */}
      {message && (
        <div
          style={{
            padding: '10px',
            marginBottom: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce3',
            color: message.type === 'error' ? '#b91c1c' : '#166534',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Nút Thêm vào giỏ hàng */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#111827',
          color: '#fff',
          border: 'none',
          borderRadius: '999px',
          fontWeight: '600',
          fontSize: '15px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          marginTop: '8px',
        }}
      >
        {loading ? t('adding') : t('add_button')}
      </button>
    </div>
  );
}