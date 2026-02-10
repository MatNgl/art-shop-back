import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subcategory } from '../entities/subcategory.entity';
import { Category } from '../entities/category.entity';
import {
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
  SubcategoryResponseDto,
  SubcategoryWithCategoryResponseDto,
} from '../dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActionType, EntityType, ActorType, LogSeverity } from '../../activity-logs';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================
  async create(categoryId: string, dto: CreateSubcategoryDto, currentUser: User): Promise<SubcategoryResponseDto> {
    // Vérifie que la catégorie existe
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${categoryId}" non trouvée`);
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    // Vérifie l'unicité du slug (global)
    const existingSlug = await this.subcategoryRepository.findOne({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Une sous-catégorie avec le slug "${slug}" existe déjà`);
    }

    // Vérifie l'unicité du nom dans la catégorie
    const existingName = await this.subcategoryRepository.findOne({
      where: { name: dto.name, categoryId },
    });
    if (existingName) {
      throw new ConflictException(`Une sous-catégorie avec le nom "${dto.name}" existe déjà dans cette catégorie`);
    }

    const subcategory = this.subcategoryRepository.create({
      name: dto.name,
      slug,
      position: dto.position ?? 0,
      categoryId,
      createdBy: currentUser.id,
    });

    const savedSubcategory = await this.subcategoryRepository.save(subcategory);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.SUBCATEGORY_CREATED,
      entityType: EntityType.SUBCATEGORY,
      entityId: savedSubcategory.id,
      severity: LogSeverity.INFO,
      metadata: {
        subcategoryName: savedSubcategory.name,
        slug: savedSubcategory.slug,
        position: savedSubcategory.position,
        categoryId,
        categoryName: category.name,
      },
    });

    return this.toResponseDto(savedSubcategory);
  }

  // ========================================
  // READ ALL (par catégorie)
  // ========================================
  async findAllByCategory(categoryId: string): Promise<SubcategoryResponseDto[]> {
    // Vérifie que la catégorie existe
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${categoryId}" non trouvée`);
    }

    const subcategories = await this.subcategoryRepository.find({
      where: { categoryId },
      order: { position: 'ASC', name: 'ASC' },
    });

    return subcategories.map((sub) => this.toResponseDto(sub));
  }

  // ========================================
  // READ ALL (global)
  // ========================================
  async findAll(): Promise<SubcategoryWithCategoryResponseDto[]> {
    const subcategories = await this.subcategoryRepository.find({
      relations: ['category'],
      order: { position: 'ASC', name: 'ASC' },
    });

    return subcategories.map((sub) => this.toResponseWithCategoryDto(sub));
  }

  // ========================================
  // READ ONE
  // ========================================
  async findById(id: string): Promise<SubcategoryResponseDto> {
    const subcategory = await this.subcategoryRepository.findOne({ where: { id } });

    if (!subcategory) {
      throw new NotFoundException(`Sous-catégorie avec l'ID "${id}" non trouvée`);
    }

    return this.toResponseDto(subcategory);
  }

  async findByIdWithCategory(id: string): Promise<SubcategoryWithCategoryResponseDto> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Sous-catégorie avec l'ID "${id}" non trouvée`);
    }

    return this.toResponseWithCategoryDto(subcategory);
  }

  async findBySlug(slug: string): Promise<SubcategoryWithCategoryResponseDto> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { slug },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Sous-catégorie avec le slug "${slug}" non trouvée`);
    }

    return this.toResponseWithCategoryDto(subcategory);
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: string, dto: UpdateSubcategoryDto, currentUser: User): Promise<SubcategoryResponseDto> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Sous-catégorie avec l'ID "${id}" non trouvée`);
    }

    const oldValues = {
      name: subcategory.name,
      slug: subcategory.slug,
      position: subcategory.position,
    };

    // Vérifie l'unicité du slug si modifié
    if (dto.slug && dto.slug !== subcategory.slug) {
      const existingSlug = await this.subcategoryRepository.findOne({ where: { slug: dto.slug } });
      if (existingSlug) {
        throw new ConflictException(`Une sous-catégorie avec le slug "${dto.slug}" existe déjà`);
      }
    }

    // Vérifie l'unicité du nom dans la catégorie si modifié
    if (dto.name && dto.name !== subcategory.name) {
      const existingName = await this.subcategoryRepository.findOne({
        where: { name: dto.name, categoryId: subcategory.categoryId },
      });
      if (existingName) {
        throw new ConflictException(`Une sous-catégorie avec le nom "${dto.name}" existe déjà dans cette catégorie`);
      }
    }

    if (dto.name !== undefined) subcategory.name = dto.name;
    if (dto.slug !== undefined) subcategory.slug = dto.slug;
    if (dto.position !== undefined) subcategory.position = dto.position;
    subcategory.modifiedBy = currentUser.id;

    const updatedSubcategory = await this.subcategoryRepository.save(subcategory);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.SUBCATEGORY_UPDATED,
      entityType: EntityType.SUBCATEGORY,
      entityId: updatedSubcategory.id,
      severity: LogSeverity.INFO,
      metadata: {
        oldValues,
        newValues: {
          name: updatedSubcategory.name,
          slug: updatedSubcategory.slug,
          position: updatedSubcategory.position,
        },
      },
    });

    return this.toResponseDto(updatedSubcategory);
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: string, currentUser: User): Promise<void> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Sous-catégorie avec l'ID "${id}" non trouvée`);
    }

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.SUBCATEGORY_DELETED,
      entityType: EntityType.SUBCATEGORY,
      entityId: subcategory.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedSubcategoryName: subcategory.name,
        slug: subcategory.slug,
        categoryId: subcategory.categoryId,
        categoryName: subcategory.category?.name,
      },
    });

    await this.subcategoryRepository.remove(subcategory);
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  /** Génère un slug à partir du nom */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** Transforme l'entité en DTO de réponse */
  private toResponseDto(subcategory: Subcategory): SubcategoryResponseDto {
    return {
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      position: subcategory.position,
      categoryId: subcategory.categoryId,
      createdBy: subcategory.createdBy,
      createdAt: subcategory.createdAt,
      modifiedBy: subcategory.modifiedBy,
      updatedAt: subcategory.updatedAt,
    };
  }

  /** Transforme l'entité en DTO avec catégorie */
  private toResponseWithCategoryDto(subcategory: Subcategory): SubcategoryWithCategoryResponseDto {
    return {
      ...this.toResponseDto(subcategory),
      category: {
        id: subcategory.category.id,
        name: subcategory.category.name,
        slug: subcategory.category.slug,
      },
    };
  }

  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
