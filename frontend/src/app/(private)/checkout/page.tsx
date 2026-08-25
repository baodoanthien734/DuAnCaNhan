'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getCart } from '@/lib/cart-api';
import { checkout } from '@/lib/orders-api';
import { getAddresses, createAddress } from '@/lib/user-api'; 
import AddressModal from '@/components/ui/AddressModal';
import { useModal } from '@/hooks/useModal';

export default function CheckoutPage() {
  const router = useRouter();
  const modal = useModal();
  const t = useTranslations('checkout'); 

  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]); 
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null); 
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [note, setNote] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cartData, addressData] = await Promise.all([
        getCart(),
        getAddresses(),
      ]);
      
      setCart(cartData);
      setAddresses(Array.isArray(addressData) ? addressData : []);

      if (addressData && addressData.length > 0) {
        const defaultAddr = addressData.find((a: any) => a.isDefault);
        setSelectedAddressId(defaultAddr ? defaultAddr.id : addressData[0].id);
      }
    } catch (err) {
      setErrorMsg(t('error.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleAddressAdded = async (newAddressData: any) => {
    try {
      const res = await createAddress(newAddressData);
      setIsModalOpen(false);
      
      const updatedAddresses = await getAddresses();
      setAddresses(Array.isArray(updatedAddresses) ? updatedAddresses : []);
      
      if (updatedAddresses && updatedAddresses.length > 0) {
        setSelectedAddressId(updatedAddresses[updatedAddresses.length - 1].id);
      }
    } catch (error: any) {
      await modal.alert(error.response?.data?.message || t('error.address_failed'));
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (addresses.length === 0 || !selectedAddressId) {
      setIsModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await checkout({
        addressId: selectedAddressId, 
        paymentMethod: 'COD',
        note: note || undefined,
      });

      await modal.alert(t('success_order'));
      router.push('/');
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('error_order');
      setErrorMsg(backendMessage);
      await modal.alert(`${backendMessage} ${t('error.reload_cart_notice')}`);
      router.push('/');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'system-ui' }}>{t('loading_page')}</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'system-ui' }}>
        <h2>{t('empty_cart')}</h2>
        <Link href="/" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 20px', backgroundColor: '#111827', color: '#fff', borderRadius: '999px', textDecoration: 'none' }}>
          {t('back_to_home')}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', padding: '40px 20px', color: '#111827' }}>
      
      <AddressModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSubmit={handleAddressAdded}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)' }}>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '20px 0 24px' }}>📦 {t('title')}</h1>

        {errorMsg && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCheckout} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px' }}>{t('shipping_address')}</h3>

            {addresses.length === 0 && (
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '14px' }}>
                {t('address_required_notice')}
              </div>
            )}

            {addresses.length === 1 && (
              <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{addresses[0].recipientName} - {addresses[0].phone}</div>
                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>
                  {addresses[0].street}, {addresses[0].ward}, {addresses[0].district}, {addresses[0].city}
                </div>
              </div>
            )}

            {addresses.length >= 2 && (
              <select 
                value={selectedAddressId || ''}
                onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
              >
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.recipientName} - {addr.phone} | {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', backgroundColor: '#f9fafb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px' }}>{t('purchased_items', { count: cart.items.length })}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {cart.items.map((item: any) => {
                const baseItemPrice = Number(item.variant?.price || item.product.basePrice);
                let totalCustomizationPrice = 0;
                
                const customs = item.customizations as any[];
                const hasCustomizations = customs && Array.isArray(customs) && customs.length > 0;

                if (hasCustomizations) {
                  customs.forEach((c) => {
                    if (c.extraPrice) totalCustomizationPrice += Number(c.extraPrice);
                  });
                }
                
                const finalUnitPrice = baseItemPrice + totalCustomizationPrice;
                const finalLinePrice = finalUnitPrice * item.quantity;

                return (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '12px', borderBottom: '1px dashed #e5e7eb' }}>
                    
                    {/* Dòng 1: Tên sản phẩm và Tổng tiền của Item đó */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600' }}>
                      <span>{item.product.name} (x{item.quantity})</span>
                      <span style={{ color: '#b45309' }}>{finalLinePrice.toLocaleString()} đ</span>
                    </div>
                    
                    {/* Dòng 2: Phân loại (Variant) */}
                    {item.variant && (
                      <div style={{ fontSize: '13px', color: '#6b7280', paddingLeft: '8px', display: 'flex', gap: '4px' }}>
                        <span>• {t('variant')}:</span>
                        <strong style={{ color: '#374151' }}>{item.variant.name}</strong>
                        {Number(item.variant.price) > 0 && (
                          <span style={{ color: '#b45309' }}>
                            ({Number(item.variant.price).toLocaleString()} đ)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Dòng 3: Các tùy chọn Customizations */}
                    {hasCustomizations && customs.map((c: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '13px', color: '#6b7280', paddingLeft: '8px', display: 'flex', gap: '4px' }}>
                        <span>• {c.name}:</span>
                        <strong style={{ color: '#374151' }}>{c.value}</strong>
                        {Number(c.extraPrice) > 0 && <span style={{ color: '#b45309' }}>(+{Number(c.extraPrice).toLocaleString()} đ)</span>}
                      </div>
                    ))}

                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
              <span>{t('total')}</span>
              <span style={{ color: '#b45309' }}>{totalAmount.toLocaleString()} đ</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>{t('payment_method')}</label>
            <div style={{ padding: '12px', border: '2px solid #111827', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>
              {t('payment_cod')}
            </div>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? t('submitting') : t('submit_button')}
          </button>

        </form>
      </div>
    </div>
  );
}