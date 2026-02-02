import { Injectable } from '@nestjs/common';
import { CloudinaryProvider } from './providers/cloudfinary.provider';
import { StorageUploadResult, ImageTransformOptions, ImageSize, IMAGE_SIZES } from './interfaces/storage.interface';

/**
 * Service de stockage d'images.
 */
@Injectable()
export class StorageService {
  constructor(private readonly cloudinaryProvider: CloudinaryProvider) {}

  /**
   * Upload une image de produit.
   */
  async uploadProductImage(file: Buffer, productSlug: string, filename?: string): Promise<StorageUploadResult> {
    const folder = `products/${productSlug}`;
    return this.cloudinaryProvider.upload(file, folder, filename);
  }

  /**
   * Upload une image de variante de produit.
   */
  async uploadVariantImage(
    file: Buffer,
    productSlug: string,
    variantId: string,
    filename?: string,
  ): Promise<StorageUploadResult> {
    const folder = `products/${productSlug}/variants/${variantId}`;
    return this.cloudinaryProvider.upload(file, folder, filename);
  }

  /**
   * Upload une image générale du site.
   */
  async uploadSiteImage(file: Buffer, folder: string, filename?: string): Promise<StorageUploadResult> {
    return this.cloudinaryProvider.upload(file, folder, filename);
  }

  /**
   * Supprime une image.
   */
  async deleteImage(publicId: string): Promise<void> {
    return this.cloudinaryProvider.delete(publicId);
  }

  /**
   * Génère une URL pour une taille prédéfinie.
   */
  getImageUrl(publicId: string, size: ImageSize = 'medium'): string {
    const options = IMAGE_SIZES[size];
    return this.cloudinaryProvider.getUrl(publicId, options);
  }

  /**
   * Génère une URL avec des transformations personnalisées.
   */
  getImageUrlWithTransform(publicId: string, options: ImageTransformOptions): string {
    return this.cloudinaryProvider.getUrl(publicId, options);
  }

  /**
   * Génère toutes les URLs pour les différentes tailles prédéfinies.
   */
  getAllImageUrls(publicId: string): Record<ImageSize, string> {
    return {
      thumbnail: this.getImageUrl(publicId, 'thumbnail'),
      small: this.getImageUrl(publicId, 'small'),
      medium: this.getImageUrl(publicId, 'medium'),
      large: this.getImageUrl(publicId, 'large'),
      original: this.getImageUrl(publicId, 'original'),
    };
  }
}

// ⚠️ SUPPRIMER la fonction Injectable() parasite qui était en bas !
