import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThreeDsReturnDto {
  @ApiProperty()
  @IsString()
  MerchantReference: string;

  @ApiPropertyOptional() @IsOptional() @IsString() ResultCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ResultDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ElectronicCommerceIndicator?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() CardHolderAuthenticationData?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() CardHolderAuthenticationID?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ThreeDSecure_DSTransID?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ThreeDSecure_ProtocolVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() Amount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() Currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() PAN?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ExpiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() JWT?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() SessionID?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ApplicationID?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ThreeDSecure_RequestID?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ThreeDSecure_VEResEnrolled?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ThreeDSecure_AuthenticationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ScreenWidth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ScreenHeight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() TimeZone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() Language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ColorDepth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() JavaEnabled?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() UserAgent?: string;
}
