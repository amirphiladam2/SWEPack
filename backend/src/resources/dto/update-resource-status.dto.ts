
import { IsEnum } from 'class-validator';
import { ResourceStatus } from '../../prisma/enums';

export class UpdateResourceStatusDto {
  @IsEnum(ResourceStatus)
  status!: ResourceStatus;
}
