'use client';
import { useState } from 'react';
import { AddressPayload } from '@/lib/user-api';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddressPayload) => void;
}

export default function AddressModal({ isOpen, onClose, onSubmit }: AddressModalProps) {
  const [formData, setFormData] = useState<AddressPayload>({
    recipientName: '',
    phone: '',
    street: '',
    ward: '',
    district: '',
    city: '',
    isDefault: true // Check sẵn luôn vì là địa chỉ đầu tiên
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '24px', borderRadius: '16px',
        width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>📍 Nhập thông tin nhận hàng</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <input required placeholder="Họ và tên người nhận" value={formData.recipientName}
            onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
            style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />

          <input required placeholder="Số điện thoại" value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
             <input required placeholder="Tỉnh / Thành phố" value={formData.city}
               onChange={(e) => setFormData({...formData, city: e.target.value})}
               style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />
             <input required placeholder="Quận / Huyện" value={formData.district}
               onChange={(e) => setFormData({...formData, district: e.target.value})}
               style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />
          </div>

          <input required placeholder="Phường / Xã" value={formData.ward}
            onChange={(e) => setFormData({...formData, ward: e.target.value})}
            style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />

          <input required placeholder="Địa chỉ cụ thể (Số nhà, tên đường)" value={formData.street}
            onChange={(e) => setFormData({...formData, street: e.target.value})}
            style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />

          <button type="submit" style={{ padding: '14px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>
            Lưu địa chỉ & Tiếp tục
          </button>
        </form>
      </div>
    </div>
  );
}   