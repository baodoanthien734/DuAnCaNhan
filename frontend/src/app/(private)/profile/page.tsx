'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link'; // Vẫn giữ lại import Link phòng trường hợp dùng ở nơi khác, dù đã bỏ nút Home
import { useTranslations } from 'next-intl';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  getProfile,
  setDefaultAddress,
  updateProfile,
} from '@/lib/user-api';
import { resolveImageUrl } from '@/lib/utils';

type Profile = {
  id: number;
  email: string;
  name?: string | null;
  image?: string | null;
};

type Address = {
  id: number;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
};

type AddressForm = {
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
};

type AlertState = {
  type: 'success' | 'error';
  text: string;
} | null;

const INITIAL_ADDRESS_FORM: AddressForm = {
  recipientName: '',
  phone: '',
  street: '',
  ward: '',
  district: '',
  city: '',
  isDefault: false,
};

export default function ProfilePage() {
  const t = useTranslations('profile');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>('profile');
  const [alert, setAlert] = useState<AlertState>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(INITIAL_ADDRESS_FORM);
  const [pendingAddressId, setPendingAddressId] = useState<number | null>(null);

  const sortedAddresses = useMemo(
    () => [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.id - a.id),
    [addresses],
  );

  const loadData = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const [profileRes, addressRes] = await Promise.all([getProfile(), getAddresses()]);
      setProfile(profileRes);
      setName(profileRes?.name || '');
      setAvatarPreview(null);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setAddresses(Array.isArray(addressRes) ? addressRes : []);
    } catch (error: any) {
      setAlert({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to load profile data.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const preview = await readFileAsDataUrl(file);
      setAvatarPreview(preview);
      setAvatarFile(file);
      setRemoveAvatar(false);
      setAlert(null);
    } catch {
      setAlert({ type: 'error', text: t('avatarUploadFailed') });
    }
  };

  const handleRemoveAvatarPreview = () => {
    if (avatarPreview) {
      setAvatarPreview(null);
      setAvatarFile(null);
      return;
    }

    if (profile?.image) {
      setRemoveAvatar(true);
      setAvatarFile(null);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setAlert(null);
    try {
      const res = await updateProfile({
        name: name.trim() || undefined,
        avatarFile,
        removeAvatar,
      });
      const nextProfile = res?.data || profile;
      setProfile(nextProfile);
      setName(nextProfile?.name || '');
      setAvatarPreview(null);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setAlert({ type: 'success', text: res?.message || t('profileUpdated') });
    } catch (error: any) {
      setAlert({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateAddress = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingAddress(true);
    setAlert(null);
    try {
      const res = await createAddress(addressForm);
      const nextAddresses = await getAddresses();
      setAddresses(Array.isArray(nextAddresses) ? nextAddresses : []);
      setModalOpen(false);
      setAddressForm(INITIAL_ADDRESS_FORM);
      setAlert({ type: 'success', text: res?.message || t('addressCreated') });
      setActiveTab('addresses');
    } catch (error: any) {
      setAlert({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to create address.',
      });
    } finally {
      setCreatingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    setPendingAddressId(id);
    setAlert(null);
    try {
      const res = await deleteAddress(id);
      const nextAddresses = await getAddresses();
      setAddresses(Array.isArray(nextAddresses) ? nextAddresses : []);
      setAlert({ type: 'success', text: res?.message || t('addressDeleted') });
    } catch (error: any) {
      setAlert({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to delete address.',
      });
    } finally {
      setPendingAddressId(null);
    }
  };

  const handleSetDefault = async (id: number) => {
    setPendingAddressId(id);
    setAlert(null);
    try {
      const res = await setDefaultAddress(id);
      const nextAddresses = await getAddresses();
      setAddresses(Array.isArray(nextAddresses) ? nextAddresses : []);
      setAlert({ type: 'success', text: res?.message || t('defaultAddressUpdated') });
    } catch (error: any) {
      setAlert({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to set default address.',
      });
    } finally {
      setPendingAddressId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', padding: '40px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center', color: '#4b5563' }}>
          {t('saving')}
        </div>
      </div>
    );
  }

  const currentAvatar =
    avatarPreview ||
    (!removeAvatar && profile?.image ? resolveImageUrl(profile.image) : '');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', padding: '40px 20px', color: '#111827' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Đã loại bỏ Link Back to Home ở đây */}

        <div style={{ marginTop: '16px', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>{t('title')}</h1>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>{t('subtitle')}</p>
        </div>

        {alert && (
          <div
            style={{
              marginBottom: '18px',
              borderRadius: '10px',
              padding: '12px 14px',
              backgroundColor: alert.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: alert.type === 'error' ? '#b91c1c' : '#166534',
              fontSize: '14px',
            }}
          >
            {alert.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              border: activeTab === 'profile' ? '2px solid #111827' : '1px solid #d1d5db',
              backgroundColor: activeTab === 'profile' ? '#f3f4f6' : '#fff',
              borderRadius: '999px',
              padding: '9px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('personalInfo')}
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            style={{
              border: activeTab === 'addresses' ? '2px solid #111827' : '1px solid #d1d5db',
              backgroundColor: activeTab === 'addresses' ? '#f3f4f6' : '#fff',
              borderRadius: '999px',
              padding: '9px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('addressBook')}
          </button>
        </div>

        {activeTab === 'profile' && (
          <form
            onSubmit={handleUpdateProfile}
            style={{
              backgroundColor: '#fff',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 15px 30px rgba(15, 23, 42, 0.06)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'grid', gap: '14px' }}>
              
              {/* PHẦN AVATAR ĐÃ ĐƯỢC CHỈNH SỬA: CĂN GIỮA, PHÓNG TO VÀ DÙNG ICON */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  
                  {/* Khung hiển thị ảnh */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {currentAvatar ? (
                      <img src={currentAvatar} alt={t('avatar')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#9ca3af' }}>
                        {(name || profile?.email || '?').trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Nút Đổi Ảnh (Icon Camera) */}
                  <label 
                    style={{ 
                      position: 'absolute', 
                      bottom: '0', 
                      right: '0', 
                      backgroundColor: '#111827', 
                      color: '#fff', 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    title={t('changeAvatar')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: 'none' }} />
                  </label>

                  {/* Nút Xóa Ảnh (Icon Thùng rác) - Chỉ hiện khi có ảnh */}
                  {(avatarPreview || profile?.image) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatarPreview}
                      title={t('removeAvatar')}
                      style={{ 
                        position: 'absolute', 
                        bottom: '0', 
                        left: '0', 
                        backgroundColor: '#fff', 
                        color: '#ef4444', 
                        border: '1px solid #fca5a5',
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t('email')}</label>
                <input
                  value={profile?.email || ''}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t('fullName')}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '18px' }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  border: 'none',
                  backgroundColor: '#111827',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '10px 18px',
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  opacity: savingProfile ? 0.75 : 1,
                  fontWeight: 600,
                  width: '100%',
                }}
              >
                {savingProfile ? t('saving') : t('saveProfile')}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'addresses' && (
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 15px 30px rgba(15, 23, 42, 0.06)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{t('addressBook')}</h2>
              <button
                onClick={() => {
                  setAddressForm(INITIAL_ADDRESS_FORM);
                  setModalOpen(true);
                }}
                style={{
                  border: 'none',
                  backgroundColor: '#111827',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t('addNewAddress')}
              </button>
            </div>

            {sortedAddresses.length === 0 && <p style={{ color: '#6b7280', margin: 0 }}>{t('noAddresses')}</p>}

            <div style={{ display: 'grid', gap: '12px' }}>
              {sortedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '14px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{addr.recipientName}</strong>
                      {addr.isDefault && (
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            fontWeight: 600,
                          }}
                        >
                          {t('defaultBadge')}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#4b5563', fontSize: '14px' }}>{addr.phone}</span>
                  </div>

                  <p style={{ margin: '10px 0 0', color: '#374151', lineHeight: 1.6 }}>
                    {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={pendingAddressId === addr.id}
                        style={{
                          border: '1px solid #d1d5db',
                          backgroundColor: '#fff',
                          color: '#111827',
                          borderRadius: '999px',
                          padding: '7px 12px',
                          cursor: pendingAddressId === addr.id ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {t('setDefault')}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={pendingAddressId === addr.id}
                      style={{
                        border: '1px solid #fecaca',
                        backgroundColor: '#fff1f2',
                        color: '#b91c1c',
                        borderRadius: '999px',
                        padding: '7px 12px',
                        cursor: pendingAddressId === addr.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          onClick={() => {
            if (!creatingAddress) setModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            zIndex: 50,
          }}
        >
          <form
            onSubmit={handleCreateAddress}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 24px 50px rgba(15, 23, 42, 0.25)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '14px' }}>{t('addNewAddress')}</h3>

            <div style={{ display: 'grid', gap: '10px' }}>
              <input
                required
                value={addressForm.recipientName}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, recipientName: e.target.value }))}
                placeholder={t('recipientName')}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
              <input
                required
                value={addressForm.phone}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={t('phone')}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
              <input
                required
                value={addressForm.street}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, street: e.target.value }))}
                placeholder={t('street')}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <input
                  required
                  value={addressForm.ward}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, ward: e.target.value }))}
                  placeholder={t('ward')}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
                <input
                  required
                  value={addressForm.district}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder={t('district')}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
                <input
                  required
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder={t('city')}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                />
                {t('isDefault')}
              </label>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={creatingAddress}
                style={{
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#111827',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  cursor: creatingAddress ? 'not-allowed' : 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={creatingAddress}
                style={{
                  border: 'none',
                  backgroundColor: '#111827',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  cursor: creatingAddress ? 'not-allowed' : 'pointer',
                  opacity: creatingAddress ? 0.75 : 1,
                  fontWeight: 600,
                }}
              >
                {creatingAddress ? t('saving') : t('saveAddress')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}