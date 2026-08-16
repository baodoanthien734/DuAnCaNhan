import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { GlobalModalProvider } from '@/components/providers/ModalContext';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Giữ nguyên logic của bạn: Dùng để lấy chữ cho các thẻ meta/html ở Server
  const t = await getTranslations('public_pages');
  
  // THÊM MỚI: Lấy toàn bộ bộ từ điển hiện tại
  const messages = await getMessages();

  return (
    <html lang={t('layout.lang')}>
      <body suppressHydrationWarning> 
        {/* enhanced: suppressHydrationWarning để tránh cảnh báo khi render trên client khi dữ liệu từ server khác với dữ liệu trên client vì extension */}
        {/* THÊM MỚI: Bọc Provider này để "bơm" từ điển xuống cho các Client Component (như trang Login) */}
        <NextIntlClientProvider messages={messages}>
          <GlobalModalProvider>{children}</GlobalModalProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}