import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductVariantImagesService } from '../services/product-variant-images.service';
import { CreateProductVariantImageDto, UpdateProductVariantImageDto, ProductVariantImageResponseDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { User } from '../../users/entities/user.entity';

interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Product Variant Images')
@Controller('products/:productId/variants/:variantId/images')
export class ProductVariantImagesController {
  constructor(private readonly imagesService: ProductVariantImagesService) {}

  // UPLOAD
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload une image pour une variante' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'variantId', description: 'UUID de la variante' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier image' },
        altText: { type: 'string', description: 'Texte alternatif', example: 'Format A3 sur toile' },
        position: { type: 'integer', description: 'Position dans le carrousel', example: 1 },
        isPrimary: { type: 'boolean', description: 'Image principale ?', example: false },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploadée', type: ProductVariantImageResponseDto })
  @ApiResponse({ status: 400, description: 'Fichier invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Produit ou variante non trouvé' })
  async upload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @UploadedFile() file: UploadedFileType,
    @Body() dto: CreateProductVariantImageDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantImageResponseDto> {
    return this.imagesService.upload(productId, variantId, file, dto, req.user);
  }

  // LIST
  @Get()
  @ApiOperation({ summary: "Liste toutes les images d'une variante" })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'variantId', description: 'UUID de la variante' })
  @ApiResponse({ status: 200, description: 'Liste des images', type: [ProductVariantImageResponseDto] })
  @ApiResponse({ status: 404, description: 'Produit ou variante non trouvé' })
  async findAll(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<ProductVariantImageResponseDto[]> {
    return this.imagesService.findAllByVariantId(productId, variantId);
  }

  // GET ONE
  @Get(':imageId')
  @ApiOperation({ summary: 'Récupère une image par son ID' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'variantId', description: 'UUID de la variante' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 200, description: 'Image trouvée', type: ProductVariantImageResponseDto })
  @ApiResponse({ status: 404, description: 'Image, variante ou produit non trouvé' })
  async findOne(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<ProductVariantImageResponseDto> {
    return this.imagesService.findOne(productId, variantId, imageId);
  }

  // UPDATE
  @Patch(':imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Met à jour les métadonnées d'une image" })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'variantId', description: 'UUID de la variante' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 200, description: 'Image mise à jour', type: ProductVariantImageResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Image, variante ou produit non trouvé' })
  async update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductVariantImageDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantImageResponseDto> {
    return this.imagesService.update(productId, variantId, imageId, dto, req.user);
  }

  // SET PRIMARY
  @Patch(':imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Définit une image comme image principale de la variante' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'variantId', description: 'UUID de la variante' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 200, description: 'Image définie comme principale', type: ProductVariantImageResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Image, variante ou produit non trouvé' })
  async setPrimary(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Request() req: RequestWithUser,
  ): Promise<ProductVariantImageResponseDto> {
    return this.imagesService.setPrimary(productId, variantId, imageId, req.user);
  }

  // DELETE
  @Delete(':imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprime une image' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'variantId', description: 'UUID de la variante' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 204, description: 'Image supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Image, variante ou produit non trouvé' })
  async delete(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.imagesService.delete(productId, variantId, imageId, req.user);
  }
}
