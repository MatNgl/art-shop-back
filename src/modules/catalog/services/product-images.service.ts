import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage, ProductImageStatus } from '../entities/product-image.entity';
import { Product } from '../entities/product.entity';
import { StorageService } from '../../storage';
import { CreateProductImageDto, UpdateProductImageDto, ProductImageResponseDto, ImageUrlsDto } from '../dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../../activity-logs';

/** Interface pour le fichier uploadé (évite dépendance @types/multer) */
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly storageService: StorageService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // UPLOAD

  async upload(
    productId: string,
    file: UploadedFile,
    dto: CreateProductImageDto,
    currentUser: User,
  ): Promise<ProductImageResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${productId}" non trouvé`);
    }

    // Valider le fichier
    this.validateFile(file);

    // Si isPrimary = true, retirer le flag des autres images
    if (dto.isPrimary) {
      await this.clearPrimaryFlag(productId);
    }

    // Upload vers Cloudinary
    const uploadResult = await this.storageService.uploadProductImage(file.buffer, product.slug);
    this.logger.log(`Image uploadée: ${uploadResult.publicId} pour produit ${productId}`);

    // Créer l'entité
    const image = this.productImageRepository.create({
      productId,
      publicId: uploadResult.publicId,
      url: uploadResult.secureUrl,
      altText: dto.altText,
      position: dto.position ?? 0,
      isPrimary: dto.isPrimary ?? false,
      status: dto.status ?? ProductImageStatus.ACTIVE,
      createdById: currentUser.id,
    });

    const savedImage = await this.productImageRepository.save(image);

    // Log d'action pour l'upload
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_IMAGE_UPLOADED,
      entityType: EntityType.PRODUCT_IMAGE,
      entityId: savedImage.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
        productName: product.name,
        productSlug: product.slug,
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

  async findAllByProductId(productId: string): Promise<ProductImageResponseDto[]> {
    const productExists = await this.productRepository.existsBy({ id: productId });

    if (!productExists) {
      throw new NotFoundException(`Produit avec l'ID "${productId}" non trouvé`);
    }

    const images = await this.productImageRepository.find({
      where: { productId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    return images.map((image) => this.toResponseDto(image));
  }

  // GET ONE

  async findOne(productId: string, imageId: string): Promise<ProductImageResponseDto> {
    const image = await this.findImageOrFail(productId, imageId);
    return this.toResponseDto(image);
  }

  // UPDATE

  async update(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
    currentUser: User,
  ): Promise<ProductImageResponseDto> {
    const image = await this.findImageOrFail(productId, imageId);

    // Stocke les anciennes valeurs AVANT modification
    const oldValues = {
      altText: image.altText,
      position: image.position,
      isPrimary: image.isPrimary,
      status: image.status,
    };

    // Si isPrimary = true, retirer le flag des autres images
    if (dto.isPrimary === true) {
      await this.clearPrimaryFlag(productId, imageId);
    }

    // Mettre à jour les champs
    if (dto.altText !== undefined) image.altText = dto.altText;
    if (dto.position !== undefined) image.position = dto.position;
    if (dto.isPrimary !== undefined) image.isPrimary = dto.isPrimary;
    if (dto.status !== undefined) image.status = dto.status;

    const updatedImage = await this.productImageRepository.save(image);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_IMAGE_UPDATED,
      entityType: EntityType.PRODUCT_IMAGE,
      entityId: updatedImage.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
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

  //  DELETE

  async delete(productId: string, imageId: string, currentUser: User): Promise<void> {
    const image = await this.findImageOrFail(productId, imageId);

    // Stocker les infos pour le log AVANT suppression
    const imageMetadata = {
      productId,
      publicId: image.publicId,
      url: image.url,
      altText: image.altText,
      position: image.position,
      isPrimary: image.isPrimary,
    };

    // Log AVANT suppression
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_IMAGE_DELETED,
      entityType: EntityType.PRODUCT_IMAGE,
      entityId: imageId,
      severity: LogSeverity.WARNING,
      metadata: imageMetadata,
    });

    // Supprimer de Cloudinary
    try {
      await this.storageService.deleteImage(image.publicId);
    } catch (error) {
      this.logger.warn(
        `Échec suppression Cloudinary pour ${image.publicId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Supprimer de la BDD
    await this.productImageRepository.remove(image);

    this.logger.log(`Image ${imageId} supprimée par utilisateur ${currentUser.id}`);
  }

  // SET PRIMARY

  async setPrimary(productId: string, imageId: string, currentUser: User): Promise<ProductImageResponseDto> {
    const image = await this.findImageOrFail(productId, imageId);

    if (image.isPrimary) {
      return this.toResponseDto(image);
    }

    await this.clearPrimaryFlag(productId, imageId);

    image.isPrimary = true;
    const updatedImage = await this.productImageRepository.save(image);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_IMAGE_SET_PRIMARY,
      entityType: EntityType.PRODUCT_IMAGE,
      entityId: updatedImage.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
        publicId: updatedImage.publicId,
        previousPrimaryCleared: true,
      },
    });

    this.logger.log(`Image ${imageId} définie comme principale par utilisateur ${currentUser.id}`);

    return this.toResponseDto(updatedImage);
  }

  // HELPERS PRIVÉS

  private async findImageOrFail(productId: string, imageId: string): Promise<ProductImage> {
    const image = await this.productImageRepository.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException(`Image avec l'ID "${imageId}" non trouvée pour le produit "${productId}"`);
    }

    return image;
  }

  private async clearPrimaryFlag(productId: string, excludeImageId?: string): Promise<void> {
    const queryBuilder = this.productImageRepository
      .createQueryBuilder()
      .update(ProductImage)
      .set({ isPrimary: false })
      .where('product_id = :productId', { productId })
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

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: 10 MB`,
      );
    }
  }

  private toResponseDto(image: ProductImage): ProductImageResponseDto {
    const urls: ImageUrlsDto = this.storageService.getAllImageUrls(image.publicId);

    return {
      id: image.id,
      productId: image.productId,
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
