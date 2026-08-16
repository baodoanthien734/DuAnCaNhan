import { getPublicProductBySlug } from '@/lib/public-api';
import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/ui/ProductDetailClient';
import ProductReviews from '@/components/ui/ProductReviews'; 

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  let product: any = null;

  try {
    product = await getPublicProductBySlug(slug);
  } catch (error) {
    notFound();
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="bg-slate-50 py-8 sm:py-10">
      <ProductDetailClient product={product} />
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}