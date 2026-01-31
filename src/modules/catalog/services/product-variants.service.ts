import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant, ProductVariantStatus } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';
import { Format } from '../entities/format.entity';
import { Material } from '../entities/material.entity';
import { CreateProductVariantDto, UpdateProductVariantDto } from '../dto/product-variant.dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../../activity-logs';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Format)
    private readonly formatRepository: Repository<Format>,

    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,

    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================
  async create(productId: string, dto: CreateProductVariantDto, currentUser: User): Promise<ProductVariant> {
    // 1. Vérifie que le produit existe
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${productId}" non trouvé`);
    }

    // 2. Vérifie que le format existe
    const format = await this.formatRepository.findOne({
      where: { id: dto.formatId },
    });

    if (!format) {
      throw new NotFoundException(`Format avec l'ID "${dto.formatId}" non trouvé`);
    }

    // 3. Vérifie que le matériau existe
    const material = await this.materialRepository.findOne({
      where: { id: dto.materialId },
    });

    if (!material) {
      throw new NotFoundException(`Matériau avec l'ID "${dto.materialId}" non trouvé`);
    }

    // 4. Vérifie l'unicité de la combinaison product + format + material
    const existingVariant = await this.variantRepository.findOne({
      where: {
        productId,
        formatId: dto.formatId,
        materialId: dto.materialId,
      },
    });

    if (existingVariant) {
      throw new ConflictException(`Une variante avec ce format et ce matériau existe déjà pour ce produit`);
    }

    // 5. Crée la variante
    const variant = this.variantRepository.create({
      productId,
      formatId: dto.formatId,
      materialId: dto.materialId,
      price: dto.price,
      stockQty: dto.stockQty ?? 0,
      status: dto.status ?? ProductVariantStatus.AVAILABLE,
      createdBy: currentUser.id,
    });

    const savedVariant = await this.variantRepository.save(variant);

    // 6. Recharge avec les relations pour le retour
    const variantWithRelations = await this.findById(savedVariant.id);

    // 7. Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_CREATED,
      entityType: EntityType.PRODUCT_VARIANT,
      entityId: savedVariant.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId,
        productName: product.name,
        formatName: format.name,
        materialName: material.name,
        price: savedVariant.price,
        stockQty: savedVariant.stockQty,
        status: savedVariant.status,
      },
    });

    return variantWithRelations;
  }

  // ========================================
  // READ ALL BY PRODUCT
  // ========================================
  async findAllByProduct(productId: string): Promise<ProductVariant[]> {
    // Vérifie que le produit existe
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${productId}" non trouvé`);
    }

    return this.variantRepository.find({
      where: { productId },
      relations: ['format', 'material'],
      order: { createdAt: 'ASC' },
    });
  }

  // ========================================
  // READ ONE BY ID
  // ========================================
  async findById(id: string): Promise<ProductVariant> {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['format', 'material', 'product'],
    });

    if (!variant) {
      throw new NotFoundException(`Variante avec l'ID "${id}" non trouvée`);
    }

    return variant;
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: string, dto: UpdateProductVariantDto, currentUser: User): Promise<ProductVariant> {
    const variant = await this.findById(id);

    // Stocke les anciennes valeurs
    const oldValues = {
      formatId: variant.formatId,
      materialId: variant.materialId,
      price: variant.price,
      stockQty: variant.stockQty,
      status: variant.status,
    };

    // Si format ou material change, vérifie l'unicité
    const newFormatId = dto.formatId ?? variant.formatId;
    const newMaterialId = dto.materialId ?? variant.materialId;

    if (dto.formatId || dto.materialId) {
      // Vérifie que le nouveau format existe si fourni
      if (dto.formatId) {
        const format = await this.formatRepository.findOne({
          where: { id: dto.formatId },
        });
        if (!format) {
          throw new NotFoundException(`Format avec l'ID "${dto.formatId}" non trouvé`);
        }
      }

      // Vérifie que le nouveau matériau existe si fourni
      if (dto.materialId) {
        const material = await this.materialRepository.findOne({
          where: { id: dto.materialId },
        });
        if (!material) {
          throw new NotFoundException(`Matériau avec l'ID "${dto.materialId}" non trouvé`);
        }
      }

      // Vérifie l'unicité de la nouvelle combinaison
      const existingVariant = await this.variantRepository.findOne({
        where: {
          productId: variant.productId,
          formatId: newFormatId,
          materialId: newMaterialId,
        },
      });

      if (existingVariant && existingVariant.id !== id) {
        throw new ConflictException(`Une variante avec ce format et ce matériau existe déjà pour ce produit`);
      }
    }

    // Applique les modifications
    if (dto.formatId !== undefined) variant.formatId = dto.formatId;
    if (dto.materialId !== undefined) variant.materialId = dto.materialId;
    if (dto.price !== undefined) variant.price = dto.price;
    if (dto.stockQty !== undefined) variant.stockQty = dto.stockQty;
    if (dto.status !== undefined) variant.status = dto.status;

    // Traçabilité
    variant.modifiedBy = currentUser.id;

    await this.variantRepository.save(variant);

    // Recharge avec les relations
    const updatedVariant = await this.findById(id);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_UPDATED,
      entityType: EntityType.PRODUCT_VARIANT,
      entityId: updatedVariant.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId: updatedVariant.productId,
        oldValues,
        newValues: {
          formatId: updatedVariant.formatId,
          materialId: updatedVariant.materialId,
          price: updatedVariant.price,
          stockQty: updatedVariant.stockQty,
          status: updatedVariant.status,
        },
      },
    });

    return updatedVariant;
  }

  // ========================================
  // UPDATE STOCK (méthode utilitaire)
  // ========================================
  async updateStock(id: string, quantityChange: number, currentUser: User): Promise<ProductVariant> {
    const variant = await this.findById(id);

    const oldStockQty = variant.stockQty;
    const newStockQty = variant.stockQty + quantityChange;

    if (newStockQty < 0) {
      throw new ConflictException(
        `Stock insuffisant. Stock actuel: ${variant.stockQty}, changement demandé: ${quantityChange}`,
      );
    }

    variant.stockQty = newStockQty;

    // Met à jour automatiquement le statut si stock épuisé
    if (newStockQty === 0 && variant.status === ProductVariantStatus.AVAILABLE) {
      variant.status = ProductVariantStatus.OUT_OF_STOCK;
    } else if (newStockQty > 0 && variant.status === ProductVariantStatus.OUT_OF_STOCK) {
      variant.status = ProductVariantStatus.AVAILABLE;
    }

    variant.modifiedBy = currentUser.id;

    await this.variantRepository.save(variant);

    // Recharge avec les relations
    const updatedVariant = await this.findById(id);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_STOCK_UPDATED,
      entityType: EntityType.PRODUCT_VARIANT,
      entityId: updatedVariant.id,
      severity: LogSeverity.INFO,
      metadata: {
        productId: updatedVariant.productId,
        oldStockQty,
        newStockQty: updatedVariant.stockQty,
        quantityChange,
        statusChanged: oldStockQty > 0 !== updatedVariant.stockQty > 0,
      },
    });

    return updatedVariant;
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: string, currentUser: User): Promise<void> {
    const variant = await this.findById(id);

    // Log AVANT suppression
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_VARIANT_DELETED,
      entityType: EntityType.PRODUCT_VARIANT,
      entityId: variant.id,
      severity: LogSeverity.WARNING,
      metadata: {
        productId: variant.productId,
        formatId: variant.formatId,
        formatName: variant.format.name,
        materialId: variant.materialId,
        materialName: variant.material.name,
        price: variant.price,
        stockQty: variant.stockQty,
      },
    });

    await this.variantRepository.remove(variant);
  }

  // ========================================
  // HELPERS
  // ========================================
  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
