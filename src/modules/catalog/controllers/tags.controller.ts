import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateTagDto, TagResponseDto, UpdateTagDto } from '../dto';
import { Roles } from 'src/modules/auth/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/modules/auth/guards';
import { User } from 'src/modules/users';
import { TagsService } from '../services';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // CREATE
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un tag' })
  @ApiResponse({ status: 201, description: 'Le tag a été créé avec succès.', type: TagResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 409, description: 'Conflit - Le tag ou le slug existe déjà' })
  async create(@Body() dto: CreateTagDto, @Request() req: RequestWithUser): Promise<TagResponseDto> {
    return this.tagsService.create(dto, req.user);
  }

  // READ ALL
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les tags' })
  @ApiResponse({ status: 200, description: 'Liste des tags', type: [TagResponseDto] })
  async findAll(): Promise<TagResponseDto[]> {
    return this.tagsService.findAll();
  }

  // READ BY ID
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un tag par son ID' })
  @ApiParam({ name: 'id', description: 'ID du tag' })
  @ApiResponse({ status: 200, description: 'Détails du tag', type: TagResponseDto })
  @ApiResponse({ status: 404, description: 'Tag non trouvé' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<TagResponseDto> {
    return this.tagsService.findById(id);
  }

  // READ BY SLUG
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Récupérer un tag par son slug' })
  @ApiParam({ name: 'slug', description: 'Slug du tag' })
  @ApiResponse({ status: 200, description: 'Détails du tag', type: TagResponseDto })
  @ApiResponse({ status: 404, description: 'Tag non trouvé' })
  async findBySlug(@Param('slug') slug: string): Promise<TagResponseDto> {
    return this.tagsService.findBySlug(slug);
  }

  // UPDATE

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un tag' })
  @ApiParam({ name: 'id', description: 'ID du tag à mettre à jour' })
  @ApiResponse({ status: 200, description: 'Le tag a été mis à jour avec succès.', type: TagResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Tag non trouvé' })
  @ApiResponse({ status: 409, description: 'Conflit - Le tag ou le slug existe déjà' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
    @Request() req: RequestWithUser,
  ): Promise<TagResponseDto> {
    return this.tagsService.update(id, dto, req.user);
  }

  // DELETE
  @Post(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un tag' })
  @ApiParam({ name: 'id', description: 'ID du tag à supprimer' })
  @ApiResponse({ status: 200, description: 'Le tag a été supprimé avec succès.' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Tag non trouvé' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    return this.tagsService.remove(id, req.user);
  }
}
