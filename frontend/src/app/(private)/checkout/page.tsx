'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCart } from '@/lib/cart-api';
import { checkout } from '@/lib/orders-api';
import { getAddresses, createAddress } from '@/lib/user-api'; 
import AddressModal from '@/components/ui/AddressModal'; // Component Modal nhỏ gọn
import { useModal } from '@/hooks/useModal';

export default function CheckoutPage() {
  const router = useRouter();
  const modal = useModal();

  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]); 
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null); 
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [note, setNote] = useState('');

  // Trạng thái bật/tắt Modal
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

      // Tự động chọn địa chỉ mặc định hoặc địa chỉ đầu tiên
      if (addressData && addressData.length > 0) {
        const defaultAddr = addressData.find((a: any) => a.isDefault);
        setSelectedAddressId(defaultAddr ? defaultAddr.id : addressData[0].id);
      }
    } catch (err) {
      setErrorMsg('Không thể tải dữ liệu thanh toán. Vui lòng thử lại sau.');
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

  // Xử lý khi User nhập xong địa chỉ ở Modal
  const handleAddressAdded = async (newAddressData: any) => {
    try {
      const res = await createAddress(newAddressData);
      setIsModalOpen(false);
      
      // Tải lại danh sách địa chỉ mới
      const updatedAddresses = await getAddresses();
      setAddresses(Array.isArray(updatedAddresses) ? updatedAddresses : []);
      
      // Tự động set ID vừa tạo (ví dụ lấy cái cuối cùng hoặc default)
      if (updatedAddresses && updatedAddresses.length > 0) {
        setSelectedAddressId(updatedAddresses[updatedAddresses.length - 1].id);
      }
    } catch (error: any) {
      await modal.alert(error.response?.data?.message || 'Có lỗi khi thêm địa chỉ');
    }
  }

  // 🚀 Xử lý Chốt đơn
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // FLOW: Nếu chưa có địa chỉ nào -> Bật Modal lên và chặn việc gọi API checkout
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

      await modal.alert('Đặt hàng thành công! Đã lưu vào hệ thống.');
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'system-ui' }}>Đang tải trang thanh toán...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'system-ui' }}>
        <h2>Giỏ hàng trống</h2>
        <Link href="/" style={{ padding: '10px 20px', backgroundColor: '#111827', color: '#fff', borderRadius: '999px', textDecoration: 'none' }}>
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', padding: '40px 20px', color: '#111827' }}>
      
      {/* Gọi Modal Nhập địa chỉ (Chỉ hiện khi isModalOpen = true) */}
      <AddressModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSubmit={handleAddressAdded}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)' }}>
        
        <Link href="/" style={{ fontSize: '14px', color: '#4b5563', textDecoration: 'none' }}>
          ← Quay lại trang chủ
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '20px 0 24px' }}>📦 Xác nhận Thanh toán</h1>

        {errorMsg && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCheckout} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* 📍 KHU VỰC HIỂN THỊ ĐỊA CHỈ */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px' }}>Địa chỉ giao hàng</h3>

            {addresses.length === 0 && (
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '14px' }}>
                Hệ thống sẽ yêu cầu bạn nhập địa chỉ khi chốt đơn.
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

          {/* 🛒 Thông tin đơn hàng tóm tắt */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', backgroundColor: '#f9fafb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px' }}>Sản phẩm mua ({cart.items.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {cart.items.map((item: any) => {
                const price = Number(item.variant?.price || item.product.basePrice);
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>{item.product.name} (x{item.quantity})</span>
                    <span style={{ fontWeight: '600', color: '#b45309' }}>{(price * item.quantity).toLocaleString()} đ</span>
                  </div>
                );
              })}
            </div>
            
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
              <span>Tổng cộng:</span>
              <span style={{ color: '#b45309' }}>{totalAmount.toLocaleString()} đ</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Phương thức thanh toán</label>
            <div style={{ padding: '12px', border: '2px solid #111827', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>
              💵 Thanh toán khi nhận hàng (COD)
            </div>
          </div>

          {/* Nút chốt đơn */}
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
            {submitting ? 'Đang xử lý đơn hàng...' : '🚀 Xác nhận & Chốt đơn'}
          </button>

        </form>
      </div>
    </div>
  );
}