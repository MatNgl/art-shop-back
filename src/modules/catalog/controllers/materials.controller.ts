import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MaterialsService } from '../services/materials.service';
import { CreateMaterialDto, UpdateMaterialDto, MaterialResponseDto } from '../dto/material.dto';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // ========================================
  // CREATE
  // ========================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un matériau' })
  @ApiResponse({ status: 201, description: 'Matériau créé', type: MaterialResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 409, description: 'Matériau déjà existant' })
  async create(@Body() dto: CreateMaterialDto, @Request() req: RequestWithUser): Promise<MaterialResponseDto> {
    return this.materialsService.create(dto, req.user);
  }

  // ========================================
  // READ ALL
  // ========================================
  @Get()
  @ApiOperation({ summary: 'Liste de tous les matériaux' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filtrer uniquement les actifs' })
  @ApiResponse({ status: 200, description: 'Liste des matériaux', type: [MaterialResponseDto] })
  async findAll(@Query('activeOnly') activeOnly?: string | boolean): Promise<MaterialResponseDto[]> {
    if (activeOnly === true || activeOnly === 'true') {
      return this.materialsService.findAllActive();
    }
    return this.materialsService.findAll();
  }

  // ========================================
  // READ ONE
  // ========================================
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un matériau par ID' })
  @ApiParam({ name: 'id', description: 'UUID du matériau' })
  @ApiResponse({ status: 200, description: 'Matériau trouvé', type: MaterialResponseDto })
  @ApiResponse({ status: 404, description: 'Matériau non trouvé' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<MaterialResponseDto> {
    return this.materialsService.findById(id);
  }

  // ========================================
  // UPDATE
  // ========================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un matériau' })
  @ApiParam({ name: 'id', description: 'UUID du matériau' })
  @ApiResponse({ status: 200, description: 'Matériau modifié', type: MaterialResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Matériau non trouvé' })
  @ApiResponse({ status: 409, description: 'Nom déjà utilisé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialDto,
    @Request() req: RequestWithUser,
  ): Promise<MaterialResponseDto> {
    return this.materialsService.update(id, dto, req.user);
  }

  // ========================================
  // DELETE
  // ========================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un matériau' })
  @ApiParam({ name: 'id', description: 'UUID du matériau' })
  @ApiResponse({ status: 204, description: 'Matériau supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Matériau non trouvé' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    await this.materialsService.remove(id, req.user);
  }
}
