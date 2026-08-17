'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
        <Link href="/" style={{ fontSize: '14px', color: '#4b5563', textDecoration: 'none' }}>
          ← Home
        </Link>

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
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t('avatar')}</label>
                <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: '13px' }}>{t('avatarHint')}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt={t('avatar')} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-500">
                        {(name || profile?.email || '?').trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                      {t('changeAvatar')}
                      <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                    </label>
                    {(avatarPreview || profile?.image) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatarPreview}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        {t('removeAvatar')}
                      </button>
                    )}
                  </div>
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