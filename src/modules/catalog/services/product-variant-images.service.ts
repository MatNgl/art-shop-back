import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariantImage, ProductVariantImageStatus } from '../entities/product-variant-image.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';
import { StorageService } from '../../storage';
import {
  CreateProductVariantImageDto,
  UpdateProductVariantImageDto,
  ProductVariantImageResponseDto,
  ImageUrlsDto,
} from '../dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../../activity-logs';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ProductVariantImagesService {
  private readonly logger = new Logger(ProductVariantImagesService.name);

  constructor(
    @InjectRepository(ProductVariantImage)
    private readonly variantImageRepository: Repository<ProductVariantImage>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly storageService: StorageService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // UPLOAD
  async upload(
    productId: string,
    variantId: string,
    file: UploadedFile,
    dto: CreateProductVariantImageDto,
    currentUser: User,
  ): Promise<ProductVariantImageResponseDto> {
    const { product, variant } = await this.findVariantWithProduct(productId, variantId);

    this.validateFile(file);

    if (dto.isPrimary) {
      await this.clearPrimaryFlag(variantId);
    }

    const uploadResult = await this.storageService.uploadVariantImage(file.buffer, product.slug, variantId);

    this.logger.log(`Image uploadée: ${uploadResult.publicId} pour variante ${variantId}`);

    const image = this.variantImageRepository.create({
      variantId,
      publicId: uploadResult.publicId,
      url: uploadResult.secureUrl,
      altText: dto.altText,
      position: dto.position ?? 0,
      isPrimary: dto.isPrimary ?? false,
      status: dto.status ?? ProductVariantImageStatus.ACTIVE,
      createdById: currentUser.id,
    });

    const savedImage = await this.variantImageRepository.save(image);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_IMAGE_UPLOADED,
      entityType: EntityType.PRODUCT_VARIANT_IMAGE,
      entityId: savedImage.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
        productName: product.name,
        variantId,
        formatName: variant.format?.name,
        materialName: variant.material?.name,
        publicId: savedImage.publicId,
        position: savedImage.position,
        isPrimary: savedImage.isPrimary,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    return this.toResponseDto(savedImage);
  }

  // LIST
  async findAllByVariantId(productId: string, variantId: string): Promise<ProductVariantImageResponseDto[]> {
    await this.findVariantWithProduct(productId, variantId);

    const images = await this.variantImageRepository.find({
      where: { variantId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    return images.map((image) => this.toResponseDto(image));
  }

  // GET ONE
  async findOne(productId: string, variantId: string, imageId: string): Promise<ProductVariantImageResponseDto> {
    await this.findVariantWithProduct(productId, variantId);
    const image = await this.findImageOrFail(variantId, imageId);
    return this.toResponseDto(image);
  }

  // UPDATE
  async update(
    productId: string,
    variantId: string,
    imageId: string,
    dto: UpdateProductVariantImageDto,
    currentUser: User,
  ): Promise<ProductVariantImageResponseDto> {
    await this.findVariantWithProduct(productId, variantId);
    const image = await this.findImageOrFail(variantId, imageId);

    const oldValues = {
      altText: image.altText,
      position: image.position,
      isPrimary: image.isPrimary,
      status: image.status,
    };

    if (dto.isPrimary === true) {
      await this.clearPrimaryFlag(variantId, imageId);
    }

    if (dto.altText !== undefined) image.altText = dto.altText;
    if (dto.position !== undefined) image.position = dto.position;
    if (dto.isPrimary !== undefined) image.isPrimary = dto.isPrimary;
    if (dto.status !== undefined) image.status = dto.status;

    const updatedImage = await this.variantImageRepository.save(image);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_IMAGE_UPDATED,
      entityType: EntityType.PRODUCT_VARIANT_IMAGE,
      entityId: updatedImage.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
        variantId,
        publicId: updatedImage.publicId,
        oldValues,
        newValues: {
          altText: updatedImage.altText,
          position: updatedImage.position,
          isPrimary: updatedImage.isPrimary,
          status: updatedImage.status,
        },
      },
    });

    this.logger.log(`Image ${imageId} mise à jour par utilisateur ${currentUser.id}`);

    return this.toResponseDto(updatedImage);
  }

  // DELETE
  async delete(productId: string, variantId: string, imageId: string, currentUser: User): Promise<void> {
    await this.findVariantWithProduct(productId, variantId);
    const image = await this.findImageOrFail(variantId, imageId);

    const imageMetadata = {
      productId,
      variantId,
      publicId: image.publicId,
      url: image.url,
      altText: image.altText,
      position: image.position,
      isPrimary: image.isPrimary,
    };

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_IMAGE_DELETED,
      entityType: EntityType.PRODUCT_VARIANT_IMAGE,
      entityId: imageId,
      severity: LogSeverity.WARNING,
      metadata: imageMetadata,
    });

    try {
      await this.storageService.deleteImage(image.publicId);
    } catch (error) {
      this.logger.warn(
        `Échec suppression Cloudinary pour ${image.publicId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.variantImageRepository.remove(image);

    this.logger.log(`Image ${imageId} supprimée par utilisateur ${currentUser.id}`);
  }

  // SET PRIMARY
  async setPrimary(
    productId: string,
    variantId: string,
    imageId: string,
    currentUser: User,
  ): Promise<ProductVariantImageResponseDto> {
    await this.findVariantWithProduct(productId, variantId);
    const image = await this.findImageOrFail(variantId, imageId);

    if (image.isPrimary) {
      return this.toResponseDto(image);
    }

    await this.clearPrimaryFlag(variantId, imageId);

    image.isPrimary = true;
    const updatedImage = await this.variantImageRepository.save(image);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_IMAGE_SET_PRIMARY,
      entityType: EntityType.PRODUCT_VARIANT_IMAGE,
      entityId: updatedImage.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
        variantId,
        publicId: updatedImage.publicId,
        previousPrimaryCleared: true,
      },
    });

    this.logger.log(`Image ${imageId} définie comme principale par utilisateur ${currentUser.id}`);

    return this.toResponseDto(updatedImage);
  }

  // HELPERS PRIVÉS

  private async findVariantWithProduct(
    productId: string,
    variantId: string,
  ): Promise<{ product: Product; variant: ProductVariant }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${productId}" non trouvé`);
    }

    const variant = await this.variantRepository.findOne({
      where: { id: variantId, productId },
      relations: ['format', 'material'],
    });

    if (!variant) {
      throw new NotFoundException(`Variante avec l'ID "${variantId}" non trouvée pour le produit "${productId}"`);
    }

    return { product, variant };
  }

  private async findImageOrFail(variantId: string, imageId: string): Promise<ProductVariantImage> {
    const image = await this.variantImageRepository.findOne({
      where: { id: imageId, variantId },
    });

    if (!image) {
      throw new NotFoundException(`Image avec l'ID "${imageId}" non trouvée pour la variante "${variantId}"`);
    }

    return image;
  }

  private async clearPrimaryFlag(variantId: string, excludeImageId?: string): Promise<void> {
    const queryBuilder = this.variantImageRepository
      .createQueryBuilder()
      .update(ProductVariantImage)
      .set({ isPrimary: false })
      .where('variant_id = :variantId', { variantId })
      .andWhere('is_primary = :isPrimary', { isPrimary: true });

    if (excludeImageId) {
      queryBuilder.andWhere('id != :excludeImageId', { excludeImageId });
    }

    await queryBuilder.execute();
  }

  private validateFile(file: UploadedFile): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: 10 MB`,
      );
    }
  }

  private toResponseDto(image: ProductVariantImage): ProductVariantImageResponseDto {
    const urls: ImageUrlsDto = this.storageService.getAllImageUrls(image.publicId);

    return {
      id: image.id,
      variantId: image.variantId,
      publicId: image.publicId,
      url: image.url,
      urls,
      altText: image.altText,
      position: image.position,
      isPrimary: image.isPrimary,
      status: image.status,
      createdAt: image.createdAt,
      createdById: image.createdById,
    };
  }

  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
