import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageUploadResult, ImageTransformOptions } from '../interfaces/storage.interface';

/**
 * Résultat de la suppression Cloudinary.
 * Le SDK Cloudinary ne type pas précisément ce retour.
 */
interface CloudinaryDestroyResult {
  result: string;
}
/**
 * Provider Cloudinary pour la gestion des images.
 */
@Injectable()
export class CloudinaryProvider implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Configuration de Cloudinary au démarrage du module.
   * Supporte soit CLOUDINARY_URL, soit les 3 variables séparées.
   */
  onModuleInit(): void {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');

    if (cloudinaryUrl) {
      // Option 1 : Configuration via URL (recommandée par Cloudinary)
      // Le SDK Cloudinary détecte automatiquement CLOUDINARY_URL dans process.env
      this.logger.log('Cloudinary configuré via CLOUDINARY_URL');
      return;
    }

    // Option 2 : Configuration via variables séparées
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Variables Cloudinary manquantes. Le service de stockage ne fonctionnera pas.');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.log(`Cloudinary configuré (cloud: ${cloudName})`);
  }

  /**
   * Upload un fichier vers Cloudinary.
   */
  async upload(file: Buffer, folder: string, filename?: string): Promise<StorageUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: `art-shop/${folder}`,
        public_id: filename,
        resource_type: 'image' as const,
        overwrite: true,
      };

      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          this.logger.error(`Erreur upload: ${error.message}`);
          reject(new Error(`Échec de l'upload: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error("Échec de l'upload: résultat vide"));
          return;
        }

        this.logger.log(`Image uploadée: ${result.public_id} (${result.bytes} octets)`);

        const uploadResult: StorageUploadResult = {
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        };

        resolve(uploadResult);
      });

      uploadStream.end(file);
    });
  }

  /**
   * Supprime un fichier de Cloudinary.
   */
  async delete(publicId: string): Promise<void> {
    try {
      // Cast explicite car le SDK Cloudinary retourne un type imprécis
      const result = (await cloudinary.uploader.destroy(publicId)) as CloudinaryDestroyResult;

      if (result.result === 'ok') {
        this.logger.log(`Image supprimée: ${publicId}`);
      } else if (result.result === 'not found') {
        this.logger.warn(`Image non trouvée sur Cloudinary: ${publicId}`);
      } else {
        this.logger.warn(`Suppression Cloudinary: ${result.result} pour ${publicId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erreur suppression: ${message}`);
      throw new Error(`Échec de la suppression: ${publicId}`);
    }
  }

  /**
   * Génère une URL avec transformations optionnelles.
   */
  getUrl(publicId: string, options?: ImageTransformOptions): string {
    if (!options) {
      return cloudinary.url(publicId, { secure: true });
    }

    const transformations: Record<string, string | number> = {};

    if (options.width) transformations.width = options.width;
    if (options.height) transformations.height = options.height;
    if (options.crop) transformations.crop = options.crop;
    if (options.quality) {
      transformations.quality = options.quality === 'auto' ? 'auto' : options.quality;
    }
    if (options.format) {
      transformations.fetch_format = options.format === 'auto' ? 'auto' : options.format;
    }

    return cloudinary.url(publicId, {
      secure: true,
      transformation: transformations,
    });
  }
}
