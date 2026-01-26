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
import { FormatsService } from '../services/formats.service';
import { CreateFormatDto, UpdateFormatDto, FormatResponseDto } from '../dto/format.dto';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Formats')
@Controller('formats')
export class FormatsController {
  constructor(private readonly formatsService: FormatsService) {}

  // ========================================
  // CREATE
  // ========================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un format' })
  @ApiResponse({ status: 201, description: 'Format créé', type: FormatResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 409, description: 'Format déjà existant' })
  async create(@Body() dto: CreateFormatDto, @Request() req: RequestWithUser): Promise<FormatResponseDto> {
    return this.formatsService.create(dto, req.user);
  }

  // ========================================
  // READ ALL
  // ========================================
  @Get()
  @ApiOperation({ summary: 'Liste de tous les formats' })
  @ApiResponse({ status: 200, description: 'Liste des formats', type: [FormatResponseDto] })
  async findAll(): Promise<FormatResponseDto[]> {
    return this.formatsService.findAll();
  }

  // ========================================
  // READ ONE
  // ========================================
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un format par ID' })
  @ApiParam({ name: 'id', description: 'UUID du format' })
  @ApiResponse({ status: 200, description: 'Format trouvé', type: FormatResponseDto })
  @ApiResponse({ status: 404, description: 'Format non trouvé' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<FormatResponseDto> {
    return this.formatsService.findById(id);
  }

  // ========================================
  // UPDATE
  // ========================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un format' })
  @ApiParam({ name: 'id', description: 'UUID du format' })
  @ApiResponse({ status: 200, description: 'Format modifié', type: FormatResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Format non trouvé' })
  @ApiResponse({ status: 409, description: 'Nom déjà utilisé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormatDto,
    @Request() req: RequestWithUser,
  ): Promise<FormatResponseDto> {
    return this.formatsService.update(id, dto, req.user);
  }

  // ========================================
  // DELETE
  // ========================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un format' })
  @ApiParam({ name: 'id', description: 'UUID du format' })
  @ApiResponse({ status: 204, description: 'Format supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Format non trouvé' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    await this.formatsService.remove(id, req.user);
  }
}
