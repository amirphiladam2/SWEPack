import { IsUrl } from 'class-validator';

export class ResourceMetadataDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;
}
