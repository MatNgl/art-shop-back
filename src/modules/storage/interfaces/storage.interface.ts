/**
 * Résultat retourné après un upload réussi vers le provider de stockage.
 * Renommé en "StorageUploadResult" pour éviter le conflit avec le type Cloudinary.
 */
export interface StorageUploadResult {
  /** Identifiant unique chez le provider (ex: "art-shop/products/mon-produit/main") */
  publicId: string;

  /** URL HTTP de l'image */
  url: string;

  /** URL HTTPS sécurisée */
  secureUrl: string;

  /** Largeur originale en pixels */
  width: number;

  /** Hauteur originale en pixels */
  height: number;

  /** Format du fichier (jpg, png, webp...) */
  format: string;

  /** Taille en octets */
  bytes: number;
}

/**
 * Options de transformation d'image.
 * Cloudinary applique ces transformations à la volée lors de la requête.
 */
export interface ImageTransformOptions {
  /** Largeur cible en pixels */
  width?: number;

  /** Hauteur cible en pixels */
  height?: number;

  /**
   * Mode de recadrage :
   * - fill: remplit les dimensions exactes (coupe si nécessaire)
   * - fit: s'adapte aux dimensions sans couper
   * - scale: redimensionne (peut déformer)
   * - thumb: miniature optimisée avec détection de visage
   */
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';

  /**
   * Qualité de compression :
   * - 'auto': Cloudinary optimise automatiquement
   * - number (1-100): qualité fixe
   */
  quality?: 'auto' | number;

  /**
   * Format de sortie :
   * - 'auto': Cloudinary choisit selon le navigateur (WebP si supporté)
   */
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}

/**
 * Tailles prédéfinies pour standardiser les images dans l'application.
 */
export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

/**
 * Configuration des tailles prédéfinies.
 */
export const IMAGE_SIZES: Record<ImageSize, ImageTransformOptions> = {
  thumbnail: { width: 150, height: 150, crop: 'thumb', quality: 'auto', format: 'auto' },
  small: { width: 300, height: 300, crop: 'fit', quality: 'auto', format: 'auto' },
  medium: { width: 600, height: 600, crop: 'fit', quality: 'auto', format: 'auto' },
  large: { width: 1200, height: 1200, crop: 'fit', quality: 'auto', format: 'auto' },
  original: { quality: 'auto', format: 'auto' },
};
