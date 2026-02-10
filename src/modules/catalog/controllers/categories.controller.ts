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
import { CategoriesService } from '../services/categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryWithSubcategoriesResponseDto,
} from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ========================================
  // CREATE
  // ========================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une catégorie' })
  @ApiResponse({ status: 201, description: 'Catégorie créée', type: CategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 409, description: 'Catégorie déjà existante (nom ou slug)' })
  async create(@Body() dto: CreateCategoryDto, @Request() req: RequestWithUser): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto, req.user);
  }

  // ========================================
  // READ ALL
  // ========================================
  @Get()
  @ApiOperation({ summary: 'Liste de toutes les catégories' })
  @ApiQuery({
    name: 'includeSubcategories',
    required: false,
    type: Boolean,
    description: 'Inclure les sous-catégories dans la réponse',
  })
  @ApiResponse({ status: 200, description: 'Liste des catégories', type: [CategoryResponseDto] })
  async findAll(
    @Query('includeSubcategories') includeSubcategories?: string | boolean,
  ): Promise<CategoryResponseDto[] | CategoryWithSubcategoriesResponseDto[]> {
    if (includeSubcategories === true || includeSubcategories === 'true') {
      return this.categoriesService.findAllWithSubcategories();
    }
    return this.categoriesService.findAll();
  }

  // ========================================
  // READ ONE BY ID
  // ========================================
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une catégorie par ID' })
  @ApiParam({ name: 'id', description: 'UUID de la catégorie' })
  @ApiQuery({
    name: 'includeSubcategories',
    required: false,
    type: Boolean,
    description: 'Inclure les sous-catégories dans la réponse',
  })
  @ApiResponse({ status: 200, description: 'Catégorie trouvée', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeSubcategories') includeSubcategories?: string | boolean,
  ): Promise<CategoryResponseDto | CategoryWithSubcategoriesResponseDto> {
    if (includeSubcategories === true || includeSubcategories === 'true') {
      return this.categoriesService.findByIdWithSubcategories(id);
    }
    return this.categoriesService.findById(id);
  }

  // ========================================
  // READ ONE BY SLUG
  // ========================================
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Récupérer une catégorie par slug' })
  @ApiParam({ name: 'slug', description: 'Slug de la catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie trouvée', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }

  // ========================================
  // UPDATE
  // ========================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une catégorie' })
  @ApiParam({ name: 'id', description: 'UUID de la catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie modifiée', type: CategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  @ApiResponse({ status: 409, description: 'Nom ou slug déjà utilisé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Request() req: RequestWithUser,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto, req.user);
  }

  // ========================================
  // DELETE
  // ========================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  @ApiParam({ name: 'id', description: 'UUID de la catégorie' })
  @ApiResponse({ status: 204, description: 'Catégorie supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    await this.categoriesService.remove(id, req.user);
  }
}
