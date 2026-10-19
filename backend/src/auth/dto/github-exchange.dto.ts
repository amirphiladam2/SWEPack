import { IsString, MaxLength, MinLength } from 'class-validator';

export class GithubExchangeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code!: string;

  @IsString()
  @MinLength(40)
  @MaxLength(60)
  state!: string;
}
