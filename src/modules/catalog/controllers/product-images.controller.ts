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
import { ProductImagesService } from '../services/product-images.service';
import { CreateProductImageDto, UpdateProductImageDto, ProductImageResponseDto } from '../dto';
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

@ApiTags('Product Images')
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly imagesService: ProductImagesService) {}

  // UPLOAD
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload une image pour un produit' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier image' },
        altText: { type: 'string', description: 'Texte alternatif', example: 'Coucher de soleil' },
        position: { type: 'integer', description: 'Position dans le carrousel', example: 0 },
        isPrimary: { type: 'boolean', description: 'Image principale ?', example: false },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploadée', type: ProductImageResponseDto })
  @ApiResponse({ status: 400, description: 'Fichier invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async upload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file: UploadedFileType,
    @Body() dto: CreateProductImageDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductImageResponseDto> {
    return this.imagesService.upload(productId, file, dto, req.user);
  }

  // LIST
  @Get()
  @ApiOperation({ summary: "Liste toutes les images d'un produit" })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Liste des images', type: [ProductImageResponseDto] })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async findAll(@Param('productId', ParseUUIDPipe) productId: string): Promise<ProductImageResponseDto[]> {
    return this.imagesService.findAllByProductId(productId);
  }

  // GET ONE
  @Get(':imageId')
  @ApiOperation({ summary: 'Récupère une image par son ID' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 200, description: 'Image trouvée', type: ProductImageResponseDto })
  @ApiResponse({ status: 404, description: 'Image ou produit non trouvé' })
  async findOne(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<ProductImageResponseDto> {
    return this.imagesService.findOne(productId, imageId);
  }

  // UPDATE
  @Patch(':imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Met à jour les métadonnées d'une image" })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 200, description: 'Image mise à jour', type: ProductImageResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Image ou produit non trouvé' })
  async update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductImageDto,
    @Request() req: RequestWithUser,
  ): Promise<ProductImageResponseDto> {
    return this.imagesService.update(productId, imageId, dto, req.user);
  }

  // SET PRIMARY
  @Patch(':imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Définit une image comme image principale' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 200, description: 'Image définie comme principale', type: ProductImageResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Image ou produit non trouvé' })
  async setPrimary(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Request() req: RequestWithUser,
  ): Promise<ProductImageResponseDto> {
    return this.imagesService.setPrimary(productId, imageId, req.user);
  }

  // DELETE
  @Delete(':imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprime une image' })
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiParam({ name: 'imageId', description: "UUID de l'image" })
  @ApiResponse({ status: 204, description: 'Image supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Image ou produit non trouvé' })
  async delete(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.imagesService.delete(productId, imageId, req.user);
  }
}
