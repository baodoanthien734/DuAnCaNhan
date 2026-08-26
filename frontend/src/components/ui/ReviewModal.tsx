'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { uploadReviewImage, submitReview, updateReview } from '@/lib/reviews-api';
import { useModal } from '@/hooks/useModal';
import { resolveImageUrl } from '@/lib/utils';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  orderId: number;
  productName: string;
  existingReview?: {
    id: number;
    rating: number;
    comment: string | null;
    images: string[];
  } | null;
  onSuccess?: (savedReview: any) => void;  
}

type ReviewFormData = {
  comment: string;
};

type LocalImagePreview = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function ReviewModal({ isOpen, onClose, productId, orderId, productName, existingReview, onSuccess }: ReviewModalProps) {
  const t = useTranslations('user_reviews');
  const modal = useModal();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<LocalImagePreview[]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset } = useForm<ReviewFormData>({ defaultValues: { comment: '' } });

  useEffect(() => {
    if (!isOpen) return;

    setRating(existingReview?.rating || 0);
    setHoverRating(0);
    setExistingImageUrls(existingReview?.images || []);
    reset({ comment: existingReview?.comment || '' });

    setNewImagePreviews((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, [isOpen, existingReview, reset]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [newImagePreviews]);

  if (!isOpen) return null;

  const totalImages = existingImageUrls.length + newImagePreviews.length;

  // --- HÀM XỬ LÝ VÀ BẢO VỆ FILE (DÙNG CHUNG CHO CHỌN FILE & KÉO THẢ) ---
  const processImageFiles = async (files: File[]) => {
    const remainingSlots = Math.max(0, 3 - totalImages);
    if (remainingSlots === 0) return;

    // 1. Kiểm tra định dạng (Chỉ lấy file ảnh)
    const validFormatFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFormatFiles.length < files.length) {
      await modal.alert(t('err_invalid_file_type'));
    }

    // 2. Kiểm tra dung lượng (Tối đa 5MB)
    const validSizeFiles = validFormatFiles.filter(f => f.size <= 5 * 1024 * 1024);
    if (validSizeFiles.length < validFormatFiles.length) {
      await modal.alert(t('err_file_too_large'));
    }

    // 3. Giới hạn số lượng còn lại (tối đa 3 ảnh)
    let filesToProcess = validSizeFiles;
    if (filesToProcess.length > remainingSlots) {
      filesToProcess = filesToProcess.slice(0, remainingSlots);
      await modal.alert(t('err_limit_exceeded'));
    }

    if (filesToProcess.length === 0) return;

    const nextPreviews = filesToProcess.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNewImagePreviews((prev) => [...prev, ...nextPreviews]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processImageFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // --- LOGIC KÉO THẢ (DRAG & DROP) ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processImageFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeNewImage = (id: string) => {
    setNewImagePreviews((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (rating === 0) {
      await modal.alert(t('err_rating'));
      return;
    }

    setIsSubmitting(true);
    try {
      const newUploadedImageUrls: string[] = [];
      for (const imageItem of newImagePreviews) {
        try {
          const res = await uploadReviewImage(productId, imageItem.file);
          if (res && res.url) {
            newUploadedImageUrls.push(res.url);
          }
        } catch (err) {
          console.error('Upload failed for one image:', err);
          await modal.alert(t('err_upload'));
          setIsSubmitting(false);
          return; 
        }
      }

      const finalImages = [...existingImageUrls, ...newUploadedImageUrls];

      let savedData: any = null;
      if (existingReview) {
        const res = await updateReview(existingReview.id, {
          rating,
          comment: data.comment,
          images: finalImages,
        });
        savedData = res?.data;
        await modal.alert(t('success_update'));
      } else {
        const res = await submitReview({
          productId,
          orderId,
          rating,
          comment: data.comment,
          images: finalImages,
        });
        savedData = res?.data;
        await modal.alert(t('success'));
      }

      reset();
      setRating(0);
      setExistingImageUrls([]);
      setNewImagePreviews((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
      if (onSuccess) onSuccess(savedData);
      onClose();

    } catch (error: any) {
      console.error(error);
      await modal.alert(error.response?.data?.message || t('err_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">{t('modal_title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <p className="text-sm text-gray-500 mb-4 font-medium">{productName}</p>

          {/* Star Rating */}
          <div className="mb-6 text-center">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('rating_label')}</label>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-3xl focus:outline-none transition-colors"
                  style={{ color: star <= (hoverRating || rating) ? '#facc15' : '#e5e7eb' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('comment_label')}</label>
            <textarea
              {...register('comment')}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
              placeholder={t('comment_placeholder')}
            ></textarea>
          </div>

          {/* Image Upload & Drag Drop Area */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('image_label')}</label>
            
            <div 
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 border-2 border-dashed rounded-xl transition-colors duration-200 ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              <div className="flex gap-3 flex-wrap items-center">
                {existingImageUrls.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img src={resolveImageUrl(url)} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {newImagePreviews.map((item) => (
                  <div key={item.id} className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(item.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {totalImages < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 bg-white transition shadow-sm"
                  >
                    <span className="text-2xl leading-none">+</span>
                    <span className="text-[10px] mt-1">{t('add_image_btn')}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                {t('image_hint', { count: totalImages, max: 3 })}
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition min-w-[120px]"
            >
              {isSubmitting ? t('btn_submitting') : t('btn_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}