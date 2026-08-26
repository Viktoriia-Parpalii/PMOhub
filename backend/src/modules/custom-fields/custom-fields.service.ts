import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CustomFieldDto } from './custom-field.dto';

const normalize = (value: string) => value.trim().toLocaleLowerCase('uk-UA');
const map = (item: any) => ({ id: item.id, entityType: item.entityType, name: item.name, type: item.fieldType, isRequired: item.isRequired, options: item.options.map((option: any) => option.value), showInTable: item.showInTable, showInCards: item.showInCards, isActive: item.isActive });

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}
  async list() { return (await this.prisma.customFieldDefinition.findMany({ include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { name: 'asc' } })).map(map); }
  async create(dto: CustomFieldDto) {
    const item = await this.prisma.customFieldDefinition.create({ data: { entityType: dto.entityType, name: dto.name.trim(), normalizedName: normalize(dto.name), fieldType: dto.type, isRequired: dto.isRequired, showInTable: dto.showInTable ?? false, showInCards: dto.showInCards ?? false, isActive: dto.isActive ?? true,
      options: { create: dto.type === 'SELECT' ? [...new Set(dto.options ?? [])].map((value, sortOrder) => ({ value, sortOrder })) : [] } }, include: { options: { orderBy: { sortOrder: 'asc' } } } });
    return { success: true, message: 'Поле додано', data: map(item) };
  }
  async update(id: string, dto: CustomFieldDto) {
    const item = await this.prisma.$transaction(async (tx) => {
      await tx.customFieldOption.deleteMany({ where: { definitionId: id } });
      return tx.customFieldDefinition.update({ where: { id }, data: { entityType: dto.entityType, name: dto.name.trim(), normalizedName: normalize(dto.name), fieldType: dto.type, isRequired: dto.isRequired, showInTable: dto.showInTable, showInCards: dto.showInCards, isActive: dto.isActive,
        options: { create: dto.type === 'SELECT' ? [...new Set(dto.options ?? [])].map((value, sortOrder) => ({ value, sortOrder })) : [] } }, include: { options: { orderBy: { sortOrder: 'asc' } } } });
    });
    return { success: true, message: 'Поле оновлено', data: map(item) };
  }
  async remove(id: string) {
    if (await this.prisma.customFieldValue.count({ where: { definitionId: id } })) throw new AppError('CUSTOM_FIELD_IN_USE', 'Поле використовується у збережених паспортах', HttpStatus.CONFLICT);
    await this.prisma.customFieldDefinition.delete({ where: { id } });
    return { success: true, message: 'Поле видалено' };
  }
}
