import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  BankAccountDto,
  CreateCustomerDto,
  CustomersService,
  UpdateCustomerDto,
} from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer (with optional profile, address, employer)' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers' })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.customers.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer with all profile data' })
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer, KYC profile, address or employer (all upserted)' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Post(':id/bank-accounts')
  @ApiOperation({ summary: 'Add a bank account for a customer' })
  addBankAccount(@Param('id') id: string, @Body() dto: BankAccountDto) {
    return this.customers.addBankAccount(id, dto);
  }

  @Get(':id/bank-accounts')
  @ApiOperation({ summary: 'List bank accounts for a customer' })
  getBankAccounts(@Param('id') id: string) {
    return this.customers.getBankAccounts(id);
  }

  @Delete(':id/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Remove a bank account' })
  deleteBankAccount(@Param('id') id: string, @Param('accountId') accountId: string) {
    return this.customers.deleteBankAccount(id, accountId);
  }
}
