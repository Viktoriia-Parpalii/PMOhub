import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessDto } from '../../common/dto/api-response.dto';
import { RequirePermissions, RequireRoles } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/auth/auth-user';
import { AppError } from '../../common/errors/app-error';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdatePermissionDto } from './access-control.dto';

@ApiTags('access-control') @ApiBearerAuth() @ApiOkResponse({ type: ApiSuccessDto }) @RequirePermissions('canAccessAdmin') @Controller('role-permissions')
export class AccessControlController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list() { return { success: true, data: await this.prisma.rolePermission.findMany({ orderBy: { role: 'asc' } }) }; }
  @RequireRoles('SUPER_ADMIN') @Patch(':role') async update(@Param('role') role: string, @Body() dto: UpdatePermissionDto, @CurrentUser() actor: AuthUser) {
    if (!['SUPER_ADMIN', 'ADMIN', 'USER'].includes(role)) throw new AppError('INVALID_ROLE', 'Некоректна роль', HttpStatus.BAD_REQUEST);
    if (role === 'SUPER_ADMIN' && (dto.canAccessAdmin === false || dto.isReadOnly === true)) throw new AppError('SUPER_ADMIN_INVARIANT', 'SUPER_ADMIN повинен зберігати адміністративний доступ', HttpStatus.CONFLICT);
    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.rolePermission.update({ where: { role }, data: dto });
      await tx.auditEvent.create({ data: { aggregateType: 'ROLE_PERMISSION', aggregateId: role, actionCode: 'ROLE_PERMISSION_UPDATED', message: `Оновлено права ролі ${role}`, actorUserId: actor.id, actorName: actor.name } });
      return updated;
    });
    return { success: true, message: 'Права оновлено', data };
  }
}
