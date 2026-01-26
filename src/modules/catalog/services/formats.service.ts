import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActionType, ActivityLogService, ActorType, EntityType, LogSeverity } from 'src/modules/activity-logs';
import { Repository } from 'typeorm';
import { CreateFormatDto, UpdateFormatDto } from '../dto/index';
import { User } from 'src/modules/users';
import { Format } from '../entities';

@Injectable()
export class FormatsService {
  constructor(
    @InjectRepository(Format)
    private readonly formatRepository: Repository<Format>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // CREATE

  async create(dto: CreateFormatDto, currentUser: User): Promise<Format> {
    // Vérifie si le nom existe déjà
    const existingFormat = await this.formatRepository.findOne({
      where: { name: dto.name },
    });

    if (existingFormat) {
      throw new ConflictException(`Le format "${dto.name}" existe déjà`);
    }

    // Crée le format
    const format = this.formatRepository.create({
      ...dto,
      createdBy: currentUser.id,
    });

    const savedFormat = await this.formatRepository.save(format);

    // Log l'action
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

    return savedFormat;
  }

  // Read all

  async findAll(): Promise<Format[]> {
    return this.formatRepository.find({
      order: { name: 'ASC' },
    });
  }

  // Read one

  async findById(id: string): Promise<Format> {
    const format = await this.formatRepository.findOne({
      where: { id },
    });

    if (!format) {
      throw new ConflictException(`Le format avec l'ID "${id}" n'existe pas`);
    }
    return format;
  }

  // Update
  async update(id: string, dto: UpdateFormatDto, currentUser: User): Promise<Format> {
    const format = await this.findById(id);

    // Si le nom change, vérifie s'il est déjà utilisé
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

    // Traçabilité
    format.modifiedBy = currentUser.id;

    const updatedFormat = await this.formatRepository.save(format);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.FORMAT_UPDATED,
      entityType: EntityType.FORMAT,
      entityId: updatedFormat.id,
      severity: LogSeverity.INFO,
      metadata: {
        formatName: updatedFormat.name,
        updatedFields: Object.keys(dto),
      },
    });

    return updatedFormat;
  }

  // Delete
  async remove(id: string, currentUser: User): Promise<void> {
    const format = await this.findById(id);

    //Log AVANT suppression
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.FORMAT_DELETED,
      entityType: EntityType.FORMAT,
      entityId: format.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedFormatName: format.name,
        dimensions: `${format.widthMm}x${format.heightMm}mm`,
      },
    });

    await this.formatRepository.remove(format);
  }

  // Helpers
  private getActorType(user: User): ActorType {
    if (user.role.code === 'SUPER_ADMIN') return ActorType.SUPERADMIN;
    if (user.role.code === 'ADMIN') return ActorType.ADMIN;
    return ActorType.USER;
  }
}
