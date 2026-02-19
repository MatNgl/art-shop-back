import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProductVariantsService } from '../services';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  UpdateStockDto,
  ProductVariantResponseDto,
} from '../dto/product-variant.dto';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Product Variants')
@Controller('products/:productId/variants')
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  // ========================================
  // CREATE — POST /products/:productId/variants
  // ========================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une variante pour un produit' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiResponse({ status: 201, description: 'Variante créée', type: ProductVariantResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Produit, format ou matériau non trouvé' })
  @ApiResponse({ status: 409, description: 'Cette combinaison format/matériau existe déjà' })
  async create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductVariantDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantResponseDto> {
    return this.variantsService.create(productId, dto, req.user);
  }

  // ========================================
  // READ ALL — GET /products/:productId/variants
  // ========================================
  @Get()
  @ApiOperation({ summary: "Liste toutes les variantes d'un produit" })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Liste des variantes', type: [ProductVariantResponseDto] })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async findAllByProduct(@Param('productId', ParseUUIDPipe) productId: string): Promise<ProductVariantResponseDto[]> {
    return this.variantsService.findAllByProduct(productId);
  }

  // ========================================
  // READ ONE — GET /products/:productId/variants/:id
  // ========================================
  @Get(':id')
  @ApiOperation({ summary: 'Récupère une variante par son ID' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'id', description: 'UUID de la variante' })
  @ApiResponse({ status: 200, description: 'Variante trouvée', type: ProductVariantResponseDto })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  async findById(
    @Param('productId', ParseUUIDPipe) _productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductVariantResponseDto> {
    return this.variantsService.findById(id);
  }

  // ========================================
  // UPDATE — PATCH /products/:productId/variants/:id
  // ========================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Met à jour une variante' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'id', description: 'UUID de la variante' })
  @ApiResponse({ status: 200, description: 'Variante mise à jour', type: ProductVariantResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Variante, format ou matériau non trouvé' })
  @ApiResponse({ status: 409, description: 'Cette combinaison format/matériau existe déjà' })
  async update(
    @Param('productId', ParseUUIDPipe) _productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVariantDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantResponseDto> {
    return this.variantsService.update(id, dto, req.user);
  }

  // ========================================
  // UPDATE STOCK — PATCH /products/:productId/variants/:id/stock
  // ========================================
  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ajuste le stock d'une variante (+/-)" })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'id', description: 'UUID de la variante' })
  @ApiResponse({ status: 200, description: 'Stock mis à jour', type: ProductVariantResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  @ApiResponse({ status: 409, description: 'Stock insuffisant' })
  async updateStock(
    @Param('productId', ParseUUIDPipe) _productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantResponseDto> {
    return this.variantsService.updateStock(id, dto.quantityChange, req.user);
  }

  // ========================================
  // ARCHIVE — PATCH /products/:productId/variants/:id/archive
  // ========================================
  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archiver une variante (soft delete)' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'id', description: 'UUID de la variante' })
  @ApiResponse({ status: 200, description: 'Variante discontinuée', type: ProductVariantResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  async archive(
    @Param('productId', ParseUUIDPipe) _productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantResponseDto> {
    return this.variantsService.archive(id, req.user);
  }

  // ========================================
  // DELETE — DELETE /products/:productId/variants/:id
  // ========================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprime une variante' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'id', description: 'UUID de la variante' })
  @ApiResponse({ status: 204, description: 'Variante supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  @ApiResponse({ status: 409, description: 'La variante doit être discontinuée avant suppression' })
  async remove(
    @Param('productId', ParseUUIDPipe) _productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.variantsService.remove(id, req.user);
  }
}
