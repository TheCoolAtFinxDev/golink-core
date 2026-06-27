import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsBooleanString, IsEmail, IsInt,
  IsNotEmpty, IsOptional, IsString, Min, MinLength, ValidateNested,
} from 'class-validator';

export class MembershipInputDto {
  @ApiProperty({ example: 'merchant-id' })
  @IsString() @IsNotEmpty() organizationId!: string;

  @ApiPropertyOptional({ example: 'OPERATOR' })
  @IsOptional() @IsString() role?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateUserDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ minLength: 8 }) @IsOptional() @IsString() @MinLength(8) password?: string;

  @ApiPropertyOptional({ type: () => [MembershipInputDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MembershipInputDto)
  memberships?: MembershipInputDto[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class ListUsersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsBooleanString() isActive?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
}
