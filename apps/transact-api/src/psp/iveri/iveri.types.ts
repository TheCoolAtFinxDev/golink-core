export interface IveriConfig {
  certId: string;
  appIdCit: string;
  appIdMit: string;
  merchantProfileId: string;
  mode: string;
  url: string;
}

export interface IveriTransactionResult {
  Transaction?: {
    Result?: {
      Code?: number | string;
      Status?: number | string;
      Description?: string;
    };
    TransactionIndex?: string;
    MaskedPAN?: string;
    ExpiryDate?: string;
  };
}
