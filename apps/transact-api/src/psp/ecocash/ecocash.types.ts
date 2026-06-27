export interface EcocashConfig {
  username: string;
  password: string;
  merchantCode: string; // maps to short_code in API
  baseUrl: string;      // e.g. https://dt-externalproxy-1.etl.co.ls/etl/uat/ecoussd
}

export interface EcocashLoginResponse {
  message?: string;
  code?: number;
  token?: string;
  created_date?: string;
  expiry_date?: string;
}

export interface EcocashPayMerchantResponse {
  msisdn?: string;
  message?: string;
  request_id?: string;
  extra_data?: unknown;
}

export interface EcocashStatusResponse {
  message?: string;
  code?: number;
  transaction?: unknown;
}

export interface EcocashErrorResponse {
  status?: number;
  message?: string;
  status_message?: string;
  field?: string;
}
