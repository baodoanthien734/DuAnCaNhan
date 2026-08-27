'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AddressPayload } from '@/lib/user-api';
import { getProvinces, getWards } from '@/integrations/tinhthanh/api';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddressPayload) => void;
}

export default function AddressModal({ isOpen, onClose, onSubmit }: AddressModalProps) {
  const t = useTranslations('profile'); 
  
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<{code: string, name: string} | null>(null);
  const [selectedWard, setSelectedWard] = useState<{code: string, name: string} | null>(null);

  const [formData, setFormData] = useState({
    recipientName: '',
    phone: '',
    street: '',
    isDefault: false 
  });

  useEffect(() => {
    if (isOpen) {
      getProvinces().then(setProvinces).catch(console.error);
      setFormData({ recipientName: '', phone: '', street: '', isDefault: false });
      setSelectedProvince(null);
      setSelectedWard(null);
      setWards([]);
    }
  }, [isOpen]);

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    
    setSelectedProvince({ code, name });
    setSelectedWard(null);
    setWards([]); 

    if (code) {
      try {
        const wrds = await getWards(code);
        setWards(wrds);
      } catch (err) {
        console.error("Lỗi tải Phường/Xã", err);
      }
    }
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedWard({ code, name });
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvince || !selectedWard) return;

    const payload: AddressPayload = {
      recipientName: formData.recipientName,
      phone: formData.phone,
      street: formData.street,
      ward: selectedWard.name,
      city: selectedProvince.name, 
      isDefault: formData.isDefault
    };

    onSubmit(payload);
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: '#fff'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff', padding: '24px', borderRadius: '16px',
        width: '100%', maxWidth: '560px', boxSizing: 'border-box',
        boxShadow: '0 24px 50px rgba(15, 23, 42, 0.25)'
      }} onClick={(e) => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{t('addNewAddress')}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input required placeholder={t('recipientName')} value={formData.recipientName}
              onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
              style={inputStyle} />

            <input required placeholder={t('phone')} value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select required style={inputStyle} value={selectedProvince?.code || ''} onChange={handleProvinceChange}>
              {/* SỬA THÀNH DÙNG i18n */}
              <option value="" disabled>{t('selectProvince')}</option>
              {provinces.map((p, index) => (
                <option key={`${p.province_code}-${index}`} value={p.province_code}>{p.name}</option>
              ))}
            </select>

            <select required style={inputStyle} value={selectedWard?.code || ''} onChange={handleWardChange} disabled={!selectedProvince}>
              {/* SỬA THÀNH DÙNG i18n */}
              <option value="" disabled>{t('selectWard')}</option>
              {wards.map((w, index) => (
                <option key={`${w.ward_code}-${index}`} value={w.ward_code}>{w.ward_name}</option>
              ))}
            </select>
          </div>

          <input required placeholder={t('street')} value={formData.street}
            onChange={(e) => setFormData({...formData, street: e.target.value})}
            style={inputStyle} />

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            />
            {t('isDefault')}
          </label>

          <button type="submit" style={{ padding: '14px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer', marginTop: '16px', fontWeight: 'bold' }}>
            {t('saveAddress')}
          </button>
        </form>
      </div>
    </div>
  );
}