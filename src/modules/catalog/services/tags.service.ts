import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../entities/tag.entity';
import { CreateTagDto, TagResponseDto, UpdateTagDto } from '../dto/tag.dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../../activity-logs';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // CREATE
  async create(dto: CreateTagDto, currentUser: User): Promise<Tag> {
    // Vérifie si le nom existe déjà
    const existingTag = await this.tagRepository.findOne({
      where: { name: dto.name },
    });

    if (existingTag) {
      throw new ConflictException(`Le tag "${dto.name}" existe déjà`);
    }

    // Génère le slug
    const slug = this.generateSlug(dto.name);

    // Vérifie si le slug existe déjà
    const existingSlug = await this.tagRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Le slug "${slug}" existe déjà`);
    }

    // Crée le tag
    const tag = this.tagRepository.create({
      name: dto.name,
      slug,
      createdBy: currentUser.id,
    });

    const savedTag = await this.tagRepository.save(tag);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.TAG_CREATED,
      entityType: EntityType.TAG,
      entityId: savedTag.id,
      severity: LogSeverity.INFO,
      metadata: {
        tagName: savedTag.name,
        tagSlug: savedTag.slug,
      },
    });

    return savedTag;
  }

  // READ ALL
  async findAll(): Promise<TagResponseDto[]> {
    return this.tagRepository.find({
      order: { name: 'ASC' },
    });
  }

  // READ ONE
  async findById(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag avec l'ID "${id}" non trouvé`);
    }

    return tag;
  }

  async findBySlug(slug: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { slug },
    });

    if (!tag) {
      throw new NotFoundException(`Tag avec le slug "${slug}" non trouvé`);
    }

    return tag;
  }

  // UPDATE
  async update(id: string, dto: UpdateTagDto, currentUser: User): Promise<Tag> {
    const tag = await this.findById(id);

    const oldValues = { name: tag.name, slug: tag.slug };

    // Si le nom change, vérifie l'unicité et régénère le slug
    if (dto.name && dto.name !== tag.name) {
      const existingTag = await this.tagRepository.findOne({
        where: { name: dto.name },
      });

      if (existingTag && existingTag.id !== id) {
        throw new ConflictException(`Le tag "${dto.name}" existe déjà`);
      }

      tag.name = dto.name;
      tag.slug = this.generateSlug(dto.name);

      // Vérifie l'unicité du nouveau slug
      const existingSlug = await this.tagRepository.findOne({
        where: { slug: tag.slug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`Le slug "${tag.slug}" existe déjà`);
      }
    }

    // Met à jour la traçabilité
    tag.modifiedBy = currentUser.id;

    const updatedTag = await this.tagRepository.save(tag);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.TAG_UPDATED,
      entityType: EntityType.TAG,
      entityId: updatedTag.id,
      severity: LogSeverity.INFO,

      metadata: {
        oldValues,
        newValues: { name: updatedTag.name, slug: updatedTag.slug },
      },
    });

    return updatedTag;
  }

  // DELETE
  async remove(id: string, currentUser: User): Promise<void> {
    const tag = await this.findById(id);

    // Log AVANT suppression
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.TAG_DELETED,
      entityType: EntityType.TAG,
      entityId: tag.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedTagName: tag.name,
        deletedTagSlug: tag.slug,
      },
    });

    await this.tagRepository.remove(tag);
  }

  // HELPERS

  /**
   * Génère un slug URL-friendly à partir d'un nom
   * "Nature & Paysages" → "nature-paysages"
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par -
      .replace(/^-|-$/g, ''); // Supprime les - en début/fin
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
