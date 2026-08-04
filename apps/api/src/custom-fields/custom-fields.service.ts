import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  UpsertCustomFieldValuesDto,
} from './dto/custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  findDefinitions(entityType?: string) {
    return this.prisma.customFieldDefinition.findMany({
      where: { entityType },
      orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  createDefinition(dto: CreateCustomFieldDefinitionDto, createdBy: string) {
    return this.prisma.customFieldDefinition.create({
      data: {
        entityType: dto.entityType,
        label: dto.label,
        fieldKey: dto.fieldKey,
        fieldType: dto.fieldType,
        options: dto.options ?? [],
        required: dto.required ?? false,
        sortOrder: dto.sortOrder ?? 0,
        createdBy,
      },
    });
  }

  async updateDefinition(id: string, dto: UpdateCustomFieldDefinitionDto) {
    const existing = await this.prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Custom field definition not found');
    return this.prisma.customFieldDefinition.update({ where: { id }, data: dto });
  }

  findValues(entityType: string, entityId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { entityId, definition: { entityType } },
      include: { definition: true },
    });
  }

  // One call upserts every field on an entity at once — the form submits a full
  // set of {definitionId, value} pairs rather than one request per field.
  async upsertValues(dto: UpsertCustomFieldValuesDto) {
    for (const { definitionId, value } of dto.values) {
      await this.prisma.customFieldValue.upsert({
        where: { definitionId_entityId: { definitionId, entityId: dto.entityId } },
        create: { definitionId, entityId: dto.entityId, value },
        update: { value },
      });
    }
    return this.findValues(dto.entityType, dto.entityId);
  }
}
