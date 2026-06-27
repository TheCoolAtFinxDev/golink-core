import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

// ─── Nested DTOs ─────────────────────────────────────────────────────────────

export class KycProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalIdNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passportNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idDocumentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idDocumentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idDocumentCountry?: string;
}

export class AddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() province?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
}

export class EmployerDto {
  @ApiPropertyOptional({ enum: EmploymentType }) @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @ApiPropertyOptional() @IsOptional() @IsString() employerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() occupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}

export class BankAccountDto {
  @ApiProperty() @IsString() bankName!: string;
  @ApiProperty() @IsString() accountName!: string;
  @ApiProperty() @IsString() accountNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

// ─── Top-level DTOs ───────────────────────────────────────────────────────────

export class CreateCustomerDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternativePhoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalRef?: string;
  @ApiPropertyOptional({ type: KycProfileDto }) @IsOptional() @ValidateNested() @Type(() => KycProfileDto) kycProfile?: KycProfileDto;
  @ApiPropertyOptional({ type: AddressDto }) @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;
  @ApiPropertyOptional({ type: EmployerDto }) @IsOptional() @ValidateNested() @Type(() => EmployerDto) employer?: EmployerDto;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternativePhoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalRef?: string;
  @ApiPropertyOptional({ type: KycProfileDto }) @IsOptional() @ValidateNested() @Type(() => KycProfileDto) kycProfile?: KycProfileDto;
  @ApiPropertyOptional({ type: AddressDto }) @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;
  @ApiPropertyOptional({ type: EmployerDto }) @IsOptional() @ValidateNested() @Type(() => EmployerDto) employer?: EmployerDto;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const CUSTOMER_INCLUDE = {
  kycProfile: true,
  address: true,
  employer: true,
  bankAccounts: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        email: dto.email,
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        alternativePhoneNumber: dto.alternativePhoneNumber,
        organizationId: dto.organizationId,
        externalRef: dto.externalRef,
        kycProfile: dto.kycProfile
          ? { create: { ...dto.kycProfile, dateOfBirth: dto.kycProfile.dateOfBirth ? new Date(dto.kycProfile.dateOfBirth) : undefined } }
          : undefined,
        address: dto.address ? { create: dto.address } : undefined,
        employer: dto.employer ? { create: dto.employer } : undefined,
      },
      include: CUSTOMER_INCLUDE,
    });
  }

  findAll(organizationId?: string) {
    return this.prisma.customer.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: CUSTOMER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        ...CUSTOMER_INCLUDE,
        bills: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        alternativePhoneNumber: dto.alternativePhoneNumber,
        externalRef: dto.externalRef,
        kycProfile: dto.kycProfile
          ? {
              upsert: {
                create: { ...dto.kycProfile, dateOfBirth: dto.kycProfile.dateOfBirth ? new Date(dto.kycProfile.dateOfBirth) : undefined },
                update: { ...dto.kycProfile, dateOfBirth: dto.kycProfile.dateOfBirth ? new Date(dto.kycProfile.dateOfBirth) : undefined },
              },
            }
          : undefined,
        address: dto.address
          ? { upsert: { create: dto.address, update: dto.address } }
          : undefined,
        employer: dto.employer
          ? { upsert: { create: dto.employer, update: dto.employer } }
          : undefined,
      },
      include: CUSTOMER_INCLUDE,
    });
  }

  addBankAccount(customerId: string, dto: BankAccountDto) {
    return this.prisma.customerBankAccount.create({
      data: { ...dto, customerId },
    });
  }

  getBankAccounts(customerId: string) {
    return this.prisma.customerBankAccount.findMany({ where: { customerId } });
  }

  async deleteBankAccount(customerId: string, accountId: string) {
    const account = await this.prisma.customerBankAccount.findFirst({
      where: { id: accountId, customerId },
    });
    if (!account) throw new NotFoundException(`Bank account ${accountId} not found`);
    await this.prisma.customerBankAccount.delete({ where: { id: accountId } });
  }
}
