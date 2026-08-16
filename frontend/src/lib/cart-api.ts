import { apiClient } from './api-client';
import Cookies from 'js-cookie';

type CartPayload = {
  productId: number;
  variantId?: number;
  quantity: number;
  customizations?: any;
  product?: any;
  variant?: any;
};

type GuestCartItem = {
  id: number;
  productId: number;
  variantId?: number;
  quantity: number;
  customizations?: any;
  product: any;
  variant?: any;
};

type GuestCart = {
  items: GuestCartItem[];
};

const GUEST_CART_KEY = 'guest_cart_items';

const hasAccessToken = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(Cookies.get('accessToken'));
};

const readGuestCart = (): GuestCart => {
  if (typeof window === 'undefined') return { items: [] };

  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return { items: [] };

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };

    return { items: parsed.items };
  } catch {
    return { items: [] };
  }
};

const writeGuestCart = (cart: GuestCart) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};

const guestSignature = (item: { productId: number; variantId?: number; customizations?: any }) =>
  JSON.stringify({
    productId: item.productId,
    variantId: item.variantId ?? null,
    customizations: item.customizations ?? null,
  });

const normalizeServerPayload = (data: CartPayload) => ({
  productId: data.productId,
  variantId: data.variantId,
  quantity: data.quantity,
  customizations: data.customizations,
});

export const getCart = async () => {
  if (!hasAccessToken()) {
    return readGuestCart();
  }

  const response = await apiClient.get('/cart');
  return response.data;
};

export const addToCart = async (data: CartPayload) => {
  if (!hasAccessToken()) {
    const cart = readGuestCart();
    const items = cart.items || [];

    const nextSignature = guestSignature(data);
    const existingIndex = items.findIndex((item) => guestSignature(item) === nextSignature);

    if (existingIndex >= 0) {
      items[existingIndex].quantity += data.quantity;
    } else {
      const item: GuestCartItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        productId: data.productId,
        variantId: data.variantId,
        quantity: data.quantity,
        customizations: data.customizations ?? null,
        // Snapshot product info for guest display
        product: {
          id: data.product?.id ?? data.productId,
          name: data.product?.name ?? 'Product',
          basePrice: Number(data.product?.basePrice || 0),
          images: Array.isArray(data.product?.images) ? data.product.images : [],
        },
        variant: data.variant
          ? {
              id: data.variant.id,
              name: data.variant.name,
              price: Number(data.variant.price || 0),
              image: data.variant.image,
            }
          : undefined,
      };
      items.unshift(item);
    }

    const nextCart = { items };
    writeGuestCart(nextCart);
    return nextCart;
  }

  const response = await apiClient.post('/cart/items', normalizeServerPayload(data));
  return response.data;
};

export const updateCartItem = async (itemId: number, quantity: number) => {
  if (!hasAccessToken()) {
    const cart = readGuestCart();
    const items = (cart.items || []).map((item) =>
      item.id === itemId ? { ...item, quantity } : item,
    );

    const nextCart = { items };
    writeGuestCart(nextCart);
    return nextCart;
  }

  const response = await apiClient.patch(`/cart/items/${itemId}`, { quantity });
  return response.data;
};

export const removeCartItem = async (itemId: number) => {
  if (!hasAccessToken()) {
    const cart = readGuestCart();
    const items = (cart.items || []).filter((item) => item.id !== itemId);

    const nextCart = { items };
    writeGuestCart(nextCart);
    return nextCart;
  }

  const response = await apiClient.delete(`/cart/items/${itemId}`);
  return response.data;
};

export const syncGuestCartToServer = async () => {
  if (!hasAccessToken() || typeof window === 'undefined') return;

  const guestCart = readGuestCart();
  const items = Array.isArray(guestCart.items) ? guestCart.items : [];
  if (items.length === 0) return;

  for (const item of items) {
    await apiClient.post('/cart/items', {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      customizations: item.customizations,
    });
  }

  localStorage.removeItem(GUEST_CART_KEY);
};