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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SubcategoriesService } from '../services/subcategories.service';
import {
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
  SubcategoryResponseDto,
  SubcategoryWithCategoryResponseDto,
} from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Subcategories')
@Controller()
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  // ========================================
  // CREATE (sous une catégorie)
  // ========================================
  @Post('categories/:categoryId/subcategories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une sous-catégorie dans une catégorie' })
  @ApiParam({ name: 'categoryId', description: 'UUID de la catégorie parente' })
  @ApiResponse({ status: 201, description: 'Sous-catégorie créée', type: SubcategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Catégorie parente non trouvée' })
  @ApiResponse({ status: 409, description: 'Sous-catégorie déjà existante (nom ou slug)' })
  async create(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: CreateSubcategoryDto,
    @Request() req: RequestWithUser,
  ): Promise<SubcategoryResponseDto> {
    return this.subcategoriesService.create(categoryId, dto, req.user);
  }

  // ========================================
  // READ ALL (par catégorie)
  // ========================================
  @Get('categories/:categoryId/subcategories')
  @ApiOperation({ summary: "Liste des sous-catégories d'une catégorie" })
  @ApiParam({ name: 'categoryId', description: 'UUID de la catégorie parente' })
  @ApiResponse({ status: 200, description: 'Liste des sous-catégories', type: [SubcategoryResponseDto] })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async findAllByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string): Promise<SubcategoryResponseDto[]> {
    return this.subcategoriesService.findAllByCategory(categoryId);
  }

  // ========================================
  // READ ALL (global)
  // ========================================
  @Get('subcategories')
  @ApiOperation({ summary: 'Liste de toutes les sous-catégories' })
  @ApiResponse({ status: 200, description: 'Liste des sous-catégories', type: [SubcategoryWithCategoryResponseDto] })
  async findAll(): Promise<SubcategoryWithCategoryResponseDto[]> {
    return this.subcategoriesService.findAll();
  }

  // ========================================
  // READ ONE BY ID
  // ========================================
  @Get('subcategories/:id')
  @ApiOperation({ summary: 'Récupérer une sous-catégorie par ID' })
  @ApiParam({ name: 'id', description: 'UUID de la sous-catégorie' })
  @ApiResponse({ status: 200, description: 'Sous-catégorie trouvée', type: SubcategoryWithCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Sous-catégorie non trouvée' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<SubcategoryWithCategoryResponseDto> {
    return this.subcategoriesService.findByIdWithCategory(id);
  }

  // ========================================
  // READ ONE BY SLUG
  // ========================================
  @Get('subcategories/slug/:slug')
  @ApiOperation({ summary: 'Récupérer une sous-catégorie par slug' })
  @ApiParam({ name: 'slug', description: 'Slug de la sous-catégorie' })
  @ApiResponse({ status: 200, description: 'Sous-catégorie trouvée', type: SubcategoryWithCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Sous-catégorie non trouvée' })
  async findBySlug(@Param('slug') slug: string): Promise<SubcategoryWithCategoryResponseDto> {
    return this.subcategoriesService.findBySlug(slug);
  }

  // ========================================
  // UPDATE
  // ========================================
  @Patch('subcategories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une sous-catégorie' })
  @ApiParam({ name: 'id', description: 'UUID de la sous-catégorie' })
  @ApiResponse({ status: 200, description: 'Sous-catégorie modifiée', type: SubcategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Sous-catégorie non trouvée' })
  @ApiResponse({ status: 409, description: 'Nom ou slug déjà utilisé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubcategoryDto,
    @Request() req: RequestWithUser,
  ): Promise<SubcategoryResponseDto> {
    return this.subcategoriesService.update(id, dto, req.user);
  }

  // ========================================
  // DELETE
  // ========================================
  @Delete('subcategories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une sous-catégorie' })
  @ApiParam({ name: 'id', description: 'UUID de la sous-catégorie' })
  @ApiResponse({ status: 204, description: 'Sous-catégorie supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Sous-catégorie non trouvée' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    await this.subcategoriesService.remove(id, req.user);
  }
}
