import { Module } from '@nestjs/common';
import { AccessControlController } from './access-control.controller';

@Module({ controllers: [AccessControlController] })
export class AccessControlModule {}
