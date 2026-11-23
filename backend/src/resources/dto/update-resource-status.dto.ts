
import { IsEnum } from 'class-validator';
import { ResourceStatus } from '../common/prisma-enums';

export class UpdateResourceStatusDto {
  @IsEnum(ResourceStatus)
  status!: ResourceStatus;
}
