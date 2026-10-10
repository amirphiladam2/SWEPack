
import { IsString, MinLength } from 'class-validator';

export class AddResourceDto {
  @IsString()
  @MinLength(1)
  resourceId!: string;
}
