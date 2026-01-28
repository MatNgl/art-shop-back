import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormatDto, FormatResponseDto, UpdateFormatDto } from '../dto/index';
import { Format } from '../entities';
import { User } from '../../users';
import { ActionType, ActivityLogService, ActorType, EntityType, LogSeverity } from '../../activity-logs';

@Injectable()
export class FormatsService {
  constructor(
    @InjectRepository(Format)
    private readonly formatRepository: Repository<Format>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateFormatDto, currentUser: User): Promise<FormatResponseDto> {
    const existingFormat = await this.formatRepository.findOne({
      where: { name: dto.name },
    });

    if (existingFormat) {
      throw new ConflictException(`Le format "${dto.name}" existe déjà`);
    }

    const format = this.formatRepository.create({
      ...dto,
      createdBy: currentUser.id,
    });

    const savedFormat = await this.formatRepository.save(format);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.FORMAT_CREATED,
      entityType: EntityType.FORMAT,
      entityId: savedFormat.id,
      severity: LogSeverity.INFO,
      metadata: {
        formatName: savedFormat.name,
        dimensions: `${savedFormat.widthMm}x${savedFormat.heightMm}mm`,
      },
    });

    return this.toResponseDto(savedFormat);
  }

  // ========================================
  // READ ALL
  // ========================================
  async findAll(): Promise<FormatResponseDto[]> {
    const formats = await this.formatRepository.find({
      order: { name: 'ASC' },
    });
    return formats.map((f) => this.toResponseDto(f));
  }

  // ========================================
  // READ ONE
  // ========================================
  async findById(id: string): Promise<FormatResponseDto> {
    const format = await this.findEntityById(id);
    return this.toResponseDto(format);
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: string, dto: UpdateFormatDto, currentUser: User): Promise<FormatResponseDto> {
    const format = await this.findEntityById(id);

    const oldValues = {
      name: format.name,
      widthMm: format.widthMm,
      heightMm: format.heightMm,
      isCustom: format.isCustom,
    };

    if (dto.name && dto.name !== format.name) {
      const existingFormat = await this.formatRepository.findOne({
        where: { name: dto.name },
      });
      if (existingFormat && existingFormat.id !== id) {
        throw new ConflictException(`Le format "${dto.name}" existe déjà`);
      }
    }

    if (dto.name !== undefined) format.name = dto.name;
    if (dto.widthMm !== undefined) format.widthMm = dto.widthMm;
    if (dto.heightMm !== undefined) format.heightMm = dto.heightMm;
    if (dto.isCustom !== undefined) format.isCustom = dto.isCustom;

    format.modifiedBy = currentUser.id;

    const updatedFormat = await this.formatRepository.save(format);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.FORMAT_UPDATED,
      entityType: EntityType.FORMAT,
      entityId: updatedFormat.id,
      severity: LogSeverity.INFO,
      metadata: {
        oldValues,
        newValues: {
          name: updatedFormat.name,
          widthMm: updatedFormat.widthMm,
          heightMm: updatedFormat.heightMm,
          isCustom: updatedFormat.isCustom,
        },
      },
    });

    return this.toResponseDto(updatedFormat);
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: string, currentUser: User): Promise<void> {
    const format = await this.findEntityById(id);

    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.FORMAT_DELETED,
      entityType: EntityType.FORMAT,
      entityId: format.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedFormatName: format.name,
        widthMm: format.widthMm,
        heightMm: format.heightMm,
      },
    });

    await this.formatRepository.remove(format);
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  /** Récupère l'entité - usage interne uniquement */
  private async findEntityById(id: string): Promise<Format> {
    const format = await this.formatRepository.findOne({ where: { id } });
    if (!format) {
      throw new NotFoundException(`Le format avec l'ID "${id}" n'existe pas`);
    }
    return format;
  }

  /** Transforme l'entité en DTO de réponse */
  private toResponseDto(format: Format): FormatResponseDto {
    return {
      id: format.id,
      name: format.name,
      widthMm: format.widthMm,
      heightMm: format.heightMm,
      isCustom: format.isCustom,
      createdAt: format.createdAt,
      updatedAt: format.updatedAt,
    };
  }

  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
