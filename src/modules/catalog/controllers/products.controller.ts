import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/modules/auth/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/modules/auth/guards';
import { User } from 'src/modules/users';
import { ProductResponseDto, CreateProductDto, UpdateProductDto } from '../dto';
import { ProductsService } from '../services/products.service';
import { ProductStatus } from '../entities';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // CREATE
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un produit' })
  @ApiResponse({ status: 201, description: 'Produit créé', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 409, description: 'Produit déjà existant' })
  async create(@Body() dto: CreateProductDto, @Request() req: RequestWithUser): Promise<ProductResponseDto> {
    return this.productsService.create(dto, req.user);
  }

  // ========================================
  // READ ALL (Admin - avec filtre optionnel)
  // ========================================
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste de tous les produits (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ProductStatus,
    description: 'Filtrer par statut',
  })
  @ApiResponse({ status: 200, description: 'Liste des produits', type: [ProductResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async findAll(@Query('status') status?: ProductStatus): Promise<ProductResponseDto[]> {
    return this.productsService.findAll(status);
  }

  // ========================================
  // READ ALL PUBLISHED (Public)
  // ========================================
  @Get('published')
  @ApiOperation({ summary: 'Liste des produits publiés (public)' })
  @ApiResponse({ status: 200, description: 'Liste des produits publiés', type: [ProductResponseDto] })
  async findAllPublished(): Promise<ProductResponseDto[]> {
    return this.productsService.findAllPublished();
  }

  // ========================================
  // READ FEATURED (Public)
  // ========================================
  @Get('featured')
  @ApiOperation({ summary: 'Produits mis en avant (public)' })
  @ApiResponse({ status: 200, description: 'Liste des produits en avant', type: [ProductResponseDto] })
  async findFeatured(): Promise<ProductResponseDto[]> {
    return this.productsService.findFeatured();
  }

  // ========================================
  // READ ONE BY SLUG (Public) - AVANT :id pour éviter conflit
  // ========================================
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Récupérer un produit par slug (public)' })
  @ApiParam({ name: 'slug', description: 'Slug du produit', example: 'coucher-de-soleil-sur-tokyo' })
  @ApiResponse({ status: 200, description: 'Produit trouvé', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async findBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    return this.productsService.findBySlug(slug);
  }

  // ========================================
  // READ ONE BY ID (Admin)
  // ========================================
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un produit par ID (admin)' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Produit trouvé', type: ProductResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }

  // ========================================
  // UPDATE
  // ========================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un produit' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Produit modifié', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Produit ou tag non trouvé' })
  @ApiResponse({ status: 409, description: 'Nom ou slug déjà utilisé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto, req.user);
  }

  // ========================================
  // DELETE
  // ========================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un produit' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 204, description: 'Produit supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    await this.productsService.remove(id, req.user);
  }
}
