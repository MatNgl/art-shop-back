import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../entities/material.entity';
import { CreateMaterialDto, MaterialResponseDto, UpdateMaterialDto } from '../dto/material.dto';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../../activity-logs';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateMaterialDto, currentUser: User): Promise<MaterialResponseDto> {
    // Vérifie si le nom existe déjà
    const existingMaterial = await this.materialRepository.findOne({
      where: { name: dto.name },
    });

    if (existingMaterial) {
      throw new ConflictException(`Le matériau "${dto.name}" existe déjà`);
    }

    // Crée le matériau
    const material = this.materialRepository.create({
      ...dto,
      createdBy: currentUser.id,
    });

    const savedMaterial = await this.materialRepository.save(material);

    // Log l'action
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.MATERIAL_CREATED,
      entityType: EntityType.MATERIAL,
      entityId: savedMaterial.id,
      severity: LogSeverity.INFO,
      metadata: {
        materialName: savedMaterial.name,
        description: savedMaterial.description,
        isActive: savedMaterial.isActive,
      },
    });

    return savedMaterial;
  }

  // ========================================
  // READ ALL
  // ========================================
  async findAll(): Promise<Material[]> {
    return this.materialRepository.find({
      order: { name: 'ASC' },
    });
  }

  // ========================================
  // READ ALL ACTIVE (pour les formulaires front)
  // ========================================
  async findAllActive(): Promise<Material[]> {
    return this.materialRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  // ========================================
  // READ ONE
  // ========================================
  async findById(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException(`Matériau avec l'ID "${id}" non trouvé`);
    }

    return material;
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: string, dto: UpdateMaterialDto, currentUser: User): Promise<Material> {
    const material = await this.findById(id);

    // Stocke les anciennes valeurs AVANT modification
    const oldValues = {
      name: material.name,
      description: material.description,
      isActive: material.isActive,
    };

    // Si le nom change, vérifie l'unicité
    if (dto.name && dto.name !== material.name) {
      const existingMaterial = await this.materialRepository.findOne({
        where: { name: dto.name },
      });

      if (existingMaterial && existingMaterial.id !== id) {
        throw new ConflictException(`Le matériau "${dto.name}" existe déjà`);
      }
    }

    // Applique les modifications
    if (dto.name !== undefined) material.name = dto.name;
    if (dto.description !== undefined) material.description = dto.description;
    if (dto.isActive !== undefined) material.isActive = dto.isActive;

    // Traçabilité
    material.modifiedBy = currentUser.id;

    const updatedMaterial = await this.materialRepository.save(material);

    // Log l'action avec oldValues/newValues
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.MATERIAL_UPDATED,
      entityType: EntityType.MATERIAL,
      entityId: updatedMaterial.id,
      severity: LogSeverity.INFO,
      metadata: {
        oldValues,
        newValues: {
          name: updatedMaterial.name,
          description: updatedMaterial.description,
          isActive: updatedMaterial.isActive,
        },
      },
    });

    return updatedMaterial;
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: string, currentUser: User): Promise<void> {
    const material = await this.findById(id);

    // Log AVANT suppression
    await this.activityLogService.log({
      actorType: this.getActorType(currentUser),
      actorUserId: currentUser.id,
      actionType: ActionType.MATERIAL_DELETED,
      entityType: EntityType.MATERIAL,
      entityId: material.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedMaterialName: material.name,
        description: material.description,
      },
    });

    await this.materialRepository.remove(material);
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
