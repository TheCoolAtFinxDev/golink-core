import { Injectable } from '@nestjs/common';
import type { PaymentProvider, PspRail } from './payment-provider.interface';
import { IveriPaymentProvider } from './iveri/iveri.provider';
import { MpesaPaymentProvider } from './mpesa/mpesa.provider';
import { EcocashPaymentProvider } from './ecocash/ecocash.provider';
import { CpsPaymentProvider } from './cps/cps.provider';
import { CpayPaymentProvider } from './cpay/cpay.provider';
import { PayslipPaymentProvider } from './payslip/payslip.provider';

@Injectable()
export class PspRegistryService {
  private readonly providers: Record<PspRail, PaymentProvider>;

  constructor(
    iveri: IveriPaymentProvider,
    mpesa: MpesaPaymentProvider,
    ecocash: EcocashPaymentProvider,
    cps: CpsPaymentProvider,
    cpay: CpayPaymentProvider,
    payslip: PayslipPaymentProvider,
  ) {
    this.providers = {
      CARD: iveri,
      MPESA: mpesa,
      ECOCASH: ecocash,
      EFT: cps,
      CPAY: cpay,
      PAYSLIP: payslip,
    };
  }

  get(rail: PspRail): PaymentProvider {
    return this.providers[rail];
  }
}
