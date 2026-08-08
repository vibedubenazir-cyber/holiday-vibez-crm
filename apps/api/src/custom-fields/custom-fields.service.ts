import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomFieldDefinition } from '@prisma/client';
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
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { entityType: dto.entityType, id: { in: dto.values.map((v) => v.definitionId) } },
    });
    const definitionById = new Map(definitions.map((d) => [d.id, d]));

    for (const { definitionId, value } of dto.values) {
      const definition = definitionById.get(definitionId);
      if (!definition) {
        throw new BadRequestException(`Unknown custom field definition for entity type ${dto.entityType}`);
      }
      this.assertValueMatchesType(definition, value);
    }

    // required:true is otherwise purely decorative — enforce it here, checking
    // both values submitted in this call and values already on file (a caller
    // updating only some fields shouldn't be blocked by required fields they
    // already set previously).
    const requiredDefs = await this.prisma.customFieldDefinition.findMany({
      where: { entityType: dto.entityType, required: true, active: true },
    });
    if (requiredDefs.length > 0) {
      const existing = await this.prisma.customFieldValue.findMany({
        where: { entityId: dto.entityId, definitionId: { in: requiredDefs.map((d) => d.id) } },
      });
      const existingById = new Map(existing.map((v) => [v.definitionId, v.value]));
      const submittedById = new Map(dto.values.map((v) => [v.definitionId, v.value]));
      for (const def of requiredDefs) {
        const value = submittedById.get(def.id) ?? existingById.get(def.id);
        if (!value) {
          throw new BadRequestException(`"${def.label}" is required`);
        }
      }
    }

    for (const { definitionId, value } of dto.values) {
      await this.prisma.customFieldValue.upsert({
        where: { definitionId_entityId: { definitionId, entityId: dto.entityId } },
        create: { definitionId, entityId: dto.entityId, value },
        update: { value },
      });
    }
    return this.findValues(dto.entityType, dto.entityId);
  }

  private assertValueMatchesType(definition: CustomFieldDefinition, value: string) {
    if (value === '') return; // empty is only a problem if the field is required, checked separately
    switch (definition.fieldType) {
      case 'NUMBER':
        if (Number.isNaN(Number(value))) throw new BadRequestException(`"${definition.label}" must be a number`);
        break;
      case 'DATE':
        if (Number.isNaN(Date.parse(value))) throw new BadRequestException(`"${definition.label}" must be a valid date`);
        break;
      case 'BOOLEAN':
        if (value !== 'true' && value !== 'false') throw new BadRequestException(`"${definition.label}" must be true or false`);
        break;
      case 'SELECT':
        if (!definition.options.includes(value)) {
          throw new BadRequestException(`"${definition.label}" must be one of: ${definition.options.join(', ')}`);
        }
        break;
    }
  }
}
