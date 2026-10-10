
import { IsEnum } from 'class-validator';
import { ResourceStatus } from 'generated/prisma/enums';

export class UpdateResourceStatusDto {
  @IsEnum(ResourceStatus)
  status!: ResourceStatus;
}
