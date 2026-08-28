'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useModal } from '@/hooks/useModal';
import Cookies from 'js-cookie';
import { getCart, updateCartItem, removeCartItem } from '@/lib/cart-api';
import { resolveImageUrl } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireLogin?: () => void;
  onCartChange?: () => void;
}

export default function CartDrawer({ isOpen, onClose, onRequireLogin, onCartChange }: CartDrawerProps) {
  const t = useTranslations('cart');
  
  const pathname = usePathname();
  const router = useRouter();
  const modal = useModal();

  const [mounted, setMounted] = useState(false);
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  
  const [hasChanged, setHasChanged] = useState(false); 

  // Kiểm tra xem có đang ở trang checkout không
  const isCheckoutPage = pathname === '/checkout';

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCartData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getCart();
      setCart(data);
    } catch (err: any) {
      setErrorMsg(t('error_fetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const token = Cookies.get('accessToken');
      setIsGuest(!token);
      setHasChanged(false); 
      fetchCartData();
      document.body.style.overflow = 'hidden'; 
    } else {
      document.body.style.overflow = ''; 
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleUpdateQuantity = async (itemId: number, currentQty: number, change: number, maxStock: number, totalUsedQty: number) => {
    let newQty = currentQty + change;
    
    if (newQty < 1) return;
    if (change > 0 && totalUsedQty >= maxStock) return;
    if (change < 0 && currentQty > maxStock) newQty = maxStock;

    try {
      await updateCartItem(itemId, newQty);
      await fetchCartData(); 
      onCartChange?.();
      setHasChanged(true); 
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await removeCartItem(itemId);
      await fetchCartData(); 
      onCartChange?.();
      setHasChanged(true); 
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !mounted) return null; 

  const totalAmount = (cart?.items || []).reduce((sum: number, item: any) => {
    let itemPrice = Number(item.variant?.price || item.product.basePrice);
    const customs = item.customizations as any[];
    if (customs && Array.isArray(customs)) {
      customs.forEach((c) => {
        if (c.extraPrice) itemPrice += Number(c.extraPrice);
      });
    }
    return sum + itemPrice * item.quantity;
  }, 0);

  const stockUsage: Record<string, number> = (cart?.items || []).reduce((acc: Record<string, number>, item: any) => {
    const key = item.variantId ? `variant-${item.variantId}` : `product-${item.productId}`;
    acc[key] = (acc[key] || 0) + item.quantity;
    return acc;
  }, {});

  const hasStockError = (cart?.items || []).some((item: any) => {
    const key = item.variantId ? `variant-${item.variantId}` : `product-${item.productId}`;
    const stock = Number(item.variant?.stock || 0);
    return (stockUsage[key] || 0) > stock;
  });

  const handleGuestCheckout = () => {
    onClose();
    if (onRequireLogin) {
      onRequireLogin();
    }
  };

  const handleProceedToCheckout = async () => {
    if (hasStockError) return;

    if (isCheckoutPage) {
      if (!hasChanged) {
        onClose();
        return;
      }

      onClose();
      
      setTimeout(async () => {
        const confirmed = await modal.confirm(t('confirm_update_checkout'));
        if (confirmed) {
          window.dispatchEvent(new CustomEvent('cart-updated'));
        }
      }, 150);

    } else {
      onClose();
      router.push('/checkout');
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999999, 
      display: 'flex', justifyContent: 'flex-end', transition: 'opacity 0.3s ease',
      overflow: 'hidden'
    }} onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '90%', maxWidth: '380px', height: '100%', backgroundColor: '#fff',
          display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)',
          animation: 'slideInRight 0.3s forwards', boxSizing: 'border-box'
        }}
      >
        
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>🛒 {t('title')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>{t('loading')}</p>
          ) : errorMsg ? (
            <p style={{ textAlign: 'center', color: '#ef4444' }}>{errorMsg}</p>
          ) : !cart || !cart.items || cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '60px', color: '#6b7280' }}>
              <p style={{ fontSize: '48px', margin: '0 0 10px' }}>🛍️</p>
              <p>{t('empty')}</p>
              {isGuest && (
                <>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>{t('guest_hint')}</p>
                  <button onClick={handleGuestCheckout} style={{ marginTop: '12px', border: 'none', backgroundColor: '#111827', color: '#fff', borderRadius: '999px', padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }}>
                    {t('login_to_checkout')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.items.map((item: any) => {
                const img = item.variant?.image ? resolveImageUrl(item.variant.image) : (item.product.images?.[0] ? resolveImageUrl(item.product.images[0]) : null);
                
                const unitPrice = Number(item.variant?.price || item.product.basePrice);
                
                let itemTotalPrice = unitPrice;
                if (item.customizations && Array.isArray(item.customizations)) {
                  item.customizations.forEach((c: any) => {
                    if (c.extraPrice) itemTotalPrice += Number(c.extraPrice);
                  });
                }

                const stock = Number(item.variant?.stock || 0);
                const key = item.variantId ? `variant-${item.variantId}` : `product-${item.productId}`;
                
                const totalUsedQty = Number(stockUsage[key] || item.quantity);
                const isOutOfStock = totalUsedQty > stock;

                return (
                  <div key={item.id} style={{ 
                    display: 'flex', gap: '12px', padding: '12px', 
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: isOutOfStock ? '#fef2f2' : 'transparent',
                    borderRadius: '12px'
                  }}>
                    <div style={{ width: '70px', height: '70px', backgroundColor: '#fef3c7', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      {img ? <img src={img} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>📦</div>}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px', color: '#111827' }}>{item.product.name}</h4>

                      {item.variant ? (
                        <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '2px' }}>
                          {t('variant_label')}: <b>{item.variant.name}</b>{' '}
                          <span style={{ color: '#61656e' }}>({unitPrice.toLocaleString()} {t('currency')})</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>
                          {unitPrice.toLocaleString()} {t('currency')}
                        </div>
                      )}
                      
                      {item.customizations && Array.isArray(item.customizations) && item.customizations.map((c: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '12px', color: '#6b7280' }}>
                          {c.name}: <b>{c.value}</b> {c.extraPrice > 0 ? `(+${Number(c.extraPrice).toLocaleString()} ${t('currency')})` : ''}
                        </div>
                      ))}

                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#b45309', marginTop: '6px' }}>
                        {itemTotalPrice.toLocaleString()} {t('currency')}
                      </div>

                      {isOutOfStock && (
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600', marginTop: '4px' }}>
                          {t('stock_warning', { stock })}
                          <span style={{ fontWeight: 'normal', fontStyle: 'italic', marginLeft: '4px' }}>
                            (Đã chọn {totalUsedQty})
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
                          
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1, stock, totalUsedQty)} 
                            style={{ 
                              padding: '2px 10px', 
                              background: '#f3f4f6', 
                              border: 'none', 
                              cursor: 'pointer',
                              color: '#111827', 
                              fontWeight: 'bold' 
                            }}
                          >
                            -
                          </button>
                          
                          <span style={{ 
                            padding: '0 12px', 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: isOutOfStock ? '#dc2626' : '#111827' 
                          }}>
                            {item.quantity}
                          </span>
                          
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1, stock, totalUsedQty)} 
                            disabled={totalUsedQty >= stock}
                            style={{ 
                              padding: '2px 10px', 
                              background: '#f3f4f6', 
                              border: 'none', 
                              cursor: totalUsedQty >= stock ? 'not-allowed' : 'pointer',
                              opacity: totalUsedQty >= stock ? 0.3 : 1,
                              color: '#111827', 
                              fontWeight: 'bold'
                            }}
                          >
                            +
                          </button>

                        </div>
                        <button onClick={() => handleRemove(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>{t('remove_button')}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart && cart.items && cart.items.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '16px', fontWeight: 'bold' }}>
              <span>{t('total')}:</span>
              <span style={{ color: '#b45309' }}>{totalAmount.toLocaleString()} đ</span>
            </div>
            
            {hasStockError && (
              <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px', textAlign: 'center', fontWeight: '600' }}>
                {t('adjust_stock_warning')}
              </p>
            )}

            {isGuest ? (
              <button
                onClick={handleGuestCheckout}
                disabled={hasStockError}
                style={{ width: '100%', padding: '14px', backgroundColor: '#111827', color: '#fff', borderRadius: '999px', fontWeight: '600', border: 'none', cursor: hasStockError ? 'not-allowed' : 'pointer', opacity: hasStockError ? 0.5 : 1 }}
              >
                {t('login_to_checkout')} →
              </button>
            ) : (
              <button 
                onClick={handleProceedToCheckout}
                disabled={hasStockError}
                style={{ display: 'block', width: '100%', padding: '14px', backgroundColor: '#111827', color: '#fff', textAlign: 'center', borderRadius: '999px', fontWeight: '600', border: 'none', cursor: hasStockError ? 'not-allowed' : 'pointer', opacity: hasStockError ? 0.5 : 1 }}
              >
                {/* 3. LOGIC HIỂN THỊ TEXT NÚT DỰA TRÊN TRẠNG THÁI */}
                {isCheckoutPage && hasChanged ? t('update_cart') : `${t('checkout_button')} →`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}