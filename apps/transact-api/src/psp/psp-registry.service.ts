import { Injectable } from '@nestjs/common';
import type { PaymentProvider, PspRail } from './payment-provider.interface';
import { IveriPaymentProvider } from './iveri/iveri.provider';
import { MpesaPaymentProvider } from './mpesa/mpesa.provider';
import { EcocashPaymentProvider } from './ecocash/ecocash.provider';
import { CpsPaymentProvider } from './cps/cps.provider';

@Injectable()
export class PspRegistryService {
  private readonly providers: Record<PspRail, PaymentProvider>;

  constructor(
    iveri: IveriPaymentProvider,
    mpesa: MpesaPaymentProvider,
    ecocash: EcocashPaymentProvider,
    cps: CpsPaymentProvider,
  ) {
    this.providers = {
      CARD: iveri,
      MPESA: mpesa,
      ECOCASH: ecocash,
      EFT: cps,
    };
  }

  get(rail: PspRail): PaymentProvider {
    return this.providers[rail];
  }
}
