'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getCart, updateCartItem, removeCartItem } from '@/lib/cart-api';
import { resolveImageUrl } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireLogin?: () => void;
}

export default function CartDrawer({ isOpen, onClose, onRequireLogin }: CartDrawerProps) {
  const t = useTranslations('cart');
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isGuest, setIsGuest] = useState(false);

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
      fetchCartData();
    }
  }, [isOpen]);

  // ==========================================
  // LOGIC ĐÃ ĐƯỢC FIX: AUTO-SNAP SỐ LƯỢNG LỖI
  // ==========================================
  const handleUpdateQuantity = async (itemId: number, currentQty: number, change: number, maxStock: number) => {
    let newQty = currentQty + change;
    
    // Chặn không cho giảm xuống dưới 1
    if (newQty < 1) return;

    // Nếu đang bị lố kho (currentQty > maxStock) và khách bấm trừ (change < 0)
    // -> Tự động kéo số lượng về bằng đúng kho hiện tại (Auto-snap)
    if (change < 0 && currentQty > maxStock) {
      newQty = maxStock;
    } 
    // Nếu khách bấm cộng (change > 0) mà vượt quá kho -> Chặn lại
    else if (change > 0 && newQty > maxStock) {
      return;
    }

    try {
      await updateCartItem(itemId, newQty);
      await fetchCartData(); 
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await removeCartItem(itemId);
      await fetchCartData(); 
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const totalAmount = cart?.items?.reduce((sum: number, item: any) => {
    let itemPrice = Number(item.variant?.price || item.product.basePrice);
    const customs = item.customizations as any[];
    if (customs && Array.isArray(customs)) {
      customs.forEach((c) => {
        if (c.extraPrice) itemPrice += Number(c.extraPrice);
      });
    }
    return sum + itemPrice * item.quantity;
  }, 0) || 0;

  const handleGuestCheckout = () => {
    onClose();
    if (onRequireLogin) {
      onRequireLogin();
    }
  };

  const hasStockError = cart?.items?.some((item: any) => item.quantity > (item.variant?.stock || 0));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex',
      justifyContent: 'flex-end', transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', height: '100%', backgroundColor: '#fff',
        display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.3s forwards'
      }}>
        
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
                const stock = item.variant?.stock || 0;
                const isOutOfStock = item.quantity > stock;

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

                      {item.variant && <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '2px' }}>{t('variant_label')}: <b>{item.variant.name}</b></div>}
                      
                      {item.customizations && Array.isArray(item.customizations) && item.customizations.map((c: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '12px', color: '#6b7280' }}>
                          {c.name}: <b>{c.value}</b> {c.extraPrice > 0 ? `(+${Number(c.extraPrice).toLocaleString()} ${t('currency')})` : ''}
                        </div>
                      ))}

                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#b45309', marginTop: '6px' }}>
                        {unitPrice.toLocaleString()} {t('currency')}
                      </div>

                      {isOutOfStock && (
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600', marginTop: '4px' }}>
                          {t('stock_warning', { stock })}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1, stock)} style={{ padding: '2px 8px', background: '#f9fafb', border: 'none', cursor: 'pointer' }}>-</button>
                          <span style={{ padding: '0 10px', fontSize: '13px', fontWeight: '600', color: isOutOfStock ? '#dc2626' : 'inherit' }}>{item.quantity}</span>
                          
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1, stock)} 
                            disabled={item.quantity >= stock}
                            style={{ 
                              padding: '2px 8px', background: '#f9fafb', border: 'none', 
                              cursor: item.quantity >= stock ? 'not-allowed' : 'pointer',
                              opacity: item.quantity >= stock ? 0.3 : 1
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
              <Link 
                href={hasStockError ? "#" : "/checkout"}
                onClick={(e) => { if (hasStockError) { e.preventDefault(); } else { onClose(); } }}
                style={{ display: 'block', width: '100%', padding: '14px', backgroundColor: '#111827', color: '#fff', textAlign: 'center', borderRadius: '999px', fontWeight: '600', textDecoration: 'none', cursor: hasStockError ? 'not-allowed' : 'pointer', opacity: hasStockError ? 0.5 : 1 }}
              >
                {t('checkout_button')} →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}