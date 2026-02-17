import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product, ProductStatus } from '../entities/product.entity';
import { Tag } from '../entities/tag.entity';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../../activity-logs';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,

    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateProductDto, currentUser: User): Promise<Product> {
    // 1. Vérifie si le nom existe déjà
    const existingProduct = await this.productRepository.findOne({
      where: { name: dto.name },
    });

    if (existingProduct) {
      throw new ConflictException(`Le produit "${dto.name}" existe déjà`);
    }

    // 2. Génère le slug
    const slug = this.generateSlug(dto.name);

    // 3. Vérifie si le slug existe déjà
    const existingSlug = await this.productRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Le slug "${slug}" existe déjà`);
    }

    // 4. Charge les tags si fournis
    let tags: Tag[] = [];
    if (dto.tagIds && dto.tagIds.length > 0) {
      tags = await this.tagRepository.find({
        where: { id: In(dto.tagIds) },
      });

      if (tags.length !== dto.tagIds.length) {
        throw new NotFoundException('Un ou plusieurs tags sont introuvables');
      }
    }

    // 5. Crée le produit (exclut tagIds du spread)
    const { tagIds: _tagIds, ...productData } = dto;

    const product = this.productRepository.create({
      ...productData,
      status: dto.status ?? ProductStatus.DRAFT,
      featured: dto.featured ?? false,
      slug,
      tags,
      createdBy: currentUser.id,
    });

    const savedProduct = await this.productRepository.save(product);

    // 6. Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_CREATED,
      entityType: EntityType.PRODUCT,
      entityId: savedProduct.id,
      severity: LogSeverity.INFO,
      metadata: {
        productName: savedProduct.name,
        productSlug: savedProduct.slug,
        status: savedProduct.status,
        tagCount: tags.length,
      },
    });

    return savedProduct;
  }

  // ========================================
  // READ ALL (avec filtre optionnel par statut)
  // ========================================
  async findAll(status?: ProductStatus): Promise<Product[]> {
    const where = status ? { status } : {};

    return this.productRepository.find({
      where,
      relations: ['tags'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========================================
  // READ ALL PUBLISHED (pour le front public)
  // ========================================
  async findAllPublished(): Promise<Product[]> {
    return this.productRepository.find({
      where: { status: ProductStatus.PUBLISHED },
      relations: ['tags', 'categories', 'subcategories'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========================================
  // READ FEATURED (produits mis en avant)
  // ========================================
  async findFeatured(): Promise<Product[]> {
    return this.productRepository.find({
      where: {
        status: ProductStatus.PUBLISHED,
        featured: true,
      },
      relations: ['tags'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========================================
  // READ ONE BY ID
  // ========================================
  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['tags'],
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${id}" non trouvé`);
    }

    return product;
  }

  // ========================================
  // READ ONE BY SLUG
  // ========================================
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: ['tags', 'categories', 'subcategories'], // ← ajout
    });

    if (!product) {
      throw new NotFoundException(`Produit avec le slug "${slug}" non trouvé`);
    }

    return product;
  }

  // UPDATE

  async update(id: string, dto: UpdateProductDto, currentUser: User): Promise<Product> {
    // Récupère le produit existant avec ses tags
    const product = await this.findById(id);

    // Stocke les anciennes valeurs AVANT modification
    const oldValues = {
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      status: product.status,
      featured: product.featured,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      tagIds: product.tags.map((tag) => tag.id),
    };

    // Si le nom change, vérifie l'unicité et régénère le slug
    if (dto.name && dto.name !== product.name) {
      const existingProduct = await this.productRepository.findOne({
        where: { name: dto.name },
      });

      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException(`Le produit "${dto.name}" existe déjà`);
      }

      product.name = dto.name;
      product.slug = this.generateSlug(dto.name);

      // Vérifie l'unicité du nouveau slug
      const existingSlug = await this.productRepository.findOne({
        where: { slug: product.slug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`Le slug "${product.slug}" existe déjà`);
      }
    }

    // Met à jour les champs simples
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.shortDescription !== undefined) product.shortDescription = dto.shortDescription;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.featured !== undefined) product.featured = dto.featured;
    if (dto.seoTitle !== undefined) product.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) product.seoDescription = dto.seoDescription;

    // Met à jour les tags si fournis
    if (dto.tagIds !== undefined) {
      if (dto.tagIds.length > 0) {
        const tags = await this.tagRepository.find({
          where: { id: In(dto.tagIds) },
        });
        if (tags.length !== dto.tagIds.length) {
          throw new NotFoundException('Un ou plusieurs tags sont introuvables');
        }
        product.tags = tags;
      } else {
        product.tags = [];
      }
    }

    // Traçabilité
    product.modifiedBy = currentUser.id;

    const updatedProduct = await this.productRepository.save(product);

    // Log l'acionh avec oldValues et les nouvelles values
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_UPDATED,
      entityType: EntityType.PRODUCT,
      entityId: updatedProduct.id,
      severity: LogSeverity.INFO,
      metadata: {
        oldValues,
        newValues: {
          name: updatedProduct.name,
          slug: updatedProduct.slug,
          description: updatedProduct.description,
          shortDescription: updatedProduct.shortDescription,
          status: updatedProduct.status,
          featured: updatedProduct.featured,
          seoTitle: updatedProduct.seoTitle,
          seoDescription: updatedProduct.seoDescription,
          tagIds: updatedProduct.tags.map((tag) => tag.id),
        },
      },
    });

    return updatedProduct;
  }

  // DELETE
  async remove(id: string, currentUser: User): Promise<void> {
    const product = await this.findById(id);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.PRODUCT_DELETED,
      entityType: EntityType.PRODUCT,
      entityId: product.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedProductName: product.name,
        deletedProductSlug: product.slug,
        status: product.status,
        tagIds: product.tags.map((tag) => tag.id),
      },
    });

    await this.productRepository.remove(product);
  }

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Génère un slug URL-friendly à partir du nom
   * "Coucher de soleil sur Tokyo" → "coucher-de-soleil-sur-tokyo"
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplace caractères spéciaux par -
      .replace(/^-|-$/g, ''); // Supprime - en début/fin
  }

  /**
   * Détermine le type d'acteur selon le rôle
   */
  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
