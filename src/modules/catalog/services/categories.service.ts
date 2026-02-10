import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryWithSubcategoriesResponseDto,
} from '../dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActionType, EntityType, ActorType, LogSeverity } from '../../activity-logs';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateCategoryDto, currentUser: User): Promise<CategoryResponseDto> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Vérifie l'unicité du slug
    const existingSlug = await this.categoryRepository.findOne({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Une catégorie avec le slug "${slug}" existe déjà`);
    }

    // Vérifie l'unicité du nom
    const existingName = await this.categoryRepository.findOne({ where: { name: dto.name } });
    if (existingName) {
      throw new ConflictException(`Une catégorie avec le nom "${dto.name}" existe déjà`);
    }

    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      position: dto.position ?? 0,
      createdBy: currentUser.id,
    });

    const savedCategory = await this.categoryRepository.save(category);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.CATEGORY_CREATED,
      entityType: EntityType.CATEGORY,
      entityId: savedCategory.id,
      severity: LogSeverity.INFO,
      metadata: {
        categoryName: savedCategory.name,
        slug: savedCategory.slug,
        position: savedCategory.position,
      },
    });

    return this.toResponseDto(savedCategory);
  }

  // ========================================
  // READ ALL
  // ========================================
  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find({
      order: { position: 'ASC', name: 'ASC' },
      relations: ['subcategories'],
    });

    return categories.map((cat) => this.toResponseDto(cat));
  }

  async findAllWithSubcategories(): Promise<CategoryWithSubcategoriesResponseDto[]> {
    const categories = await this.categoryRepository.find({
      order: { position: 'ASC', name: 'ASC' },
      relations: ['subcategories'],
    });

    return categories.map((cat) => this.toResponseWithSubcategoriesDto(cat));
  }

  // ========================================
  // READ ONE
  // ========================================
  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }

    return this.toResponseDto(category);
  }

  async findByIdWithSubcategories(id: string): Promise<CategoryWithSubcategoriesResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }

    return this.toResponseWithSubcategoriesDto(category);
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec le slug "${slug}" non trouvée`);
    }

    return this.toResponseDto(category);
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: string, dto: UpdateCategoryDto, currentUser: User): Promise<CategoryResponseDto> {
    const category = await this.findEntityById(id);

    const oldValues = {
      name: category.name,
      slug: category.slug,
      position: category.position,
    };

    // Vérifie l'unicité du slug si modifié
    if (dto.slug && dto.slug !== category.slug) {
      const existingSlug = await this.categoryRepository.findOne({ where: { slug: dto.slug } });
      if (existingSlug) {
        throw new ConflictException(`Une catégorie avec le slug "${dto.slug}" existe déjà`);
      }
    }

    // Vérifie l'unicité du nom si modifié
    if (dto.name && dto.name !== category.name) {
      const existingName = await this.categoryRepository.findOne({ where: { name: dto.name } });
      if (existingName) {
        throw new ConflictException(`Une catégorie avec le nom "${dto.name}" existe déjà`);
      }
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.slug !== undefined) category.slug = dto.slug;
    if (dto.position !== undefined) category.position = dto.position;
    category.modifiedBy = currentUser.id;

    const updatedCategory = await this.categoryRepository.save(category);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.CATEGORY_UPDATED,
      entityType: EntityType.CATEGORY,
      entityId: updatedCategory.id,
      severity: LogSeverity.INFO,
      metadata: {
        oldValues,
        newValues: {
          name: updatedCategory.name,
          slug: updatedCategory.slug,
          position: updatedCategory.position,
        },
      },
    });

    return this.toResponseDto(updatedCategory);
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: string, currentUser: User): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.CATEGORY_DELETED,
      entityType: EntityType.CATEGORY,
      entityId: category.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedCategoryName: category.name,
        slug: category.slug,
        subcategoriesCount: category.subcategories?.length || 0,
      },
    });

    await this.categoryRepository.remove(category);
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  /** Récupère l'entité - usage interne uniquement */
  private async findEntityById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }
    return category;
  }

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
  private toResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      position: category.position,
      subcategoriesCount: category.subcategories?.length || 0,
      createdBy: category.createdBy,
      createdAt: category.createdAt,
      modifiedBy: category.modifiedBy,
      updatedAt: category.updatedAt,
    };
  }

  /** Transforme l'entité en DTO avec sous-catégories */
  private toResponseWithSubcategoriesDto(category: Category): CategoryWithSubcategoriesResponseDto {
    return {
      ...this.toResponseDto(category),
      subcategories: (category.subcategories || [])
        .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
        .map((sub) => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          position: sub.position,
          categoryId: sub.categoryId,
          createdBy: sub.createdBy,
          createdAt: sub.createdAt,
          modifiedBy: sub.modifiedBy,
          updatedAt: sub.updatedAt,
        })),
    };
  }

  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
