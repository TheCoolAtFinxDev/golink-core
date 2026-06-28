import { Module } from '@nestjs/common';
import { IveriPaymentProvider } from './iveri/iveri.provider';
import { MpesaPaymentProvider } from './mpesa/mpesa.provider';
import { EcocashPaymentProvider } from './ecocash/ecocash.provider';
import { CpsPaymentProvider } from './cps/cps.provider';
import { CpayPaymentProvider } from './cpay/cpay.provider';
import { PayslipPaymentProvider } from './payslip/payslip.provider';
import { PspSessionCacheService } from './psp-session-cache.service';
import { PspRegistryService } from './psp-registry.service';

@Module({
  providers: [
    PspSessionCacheService,
    IveriPaymentProvider,
    MpesaPaymentProvider,
    EcocashPaymentProvider,
    CpsPaymentProvider,
    CpayPaymentProvider,
    PayslipPaymentProvider,
    PspRegistryService,
  ],
  exports: [PspRegistryService, PspSessionCacheService],
})
export class PspModule {}
