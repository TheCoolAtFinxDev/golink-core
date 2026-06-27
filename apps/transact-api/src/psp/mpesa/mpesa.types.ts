export interface MpesaConfig {
  apiKey: string;
  rsaPublicKey: string;
  shortCode: string;
  baseUrl: string;
  callbackBaseUrl: string;
}

export interface MpesaAuthResponse {
  output_SessionID?: string;
  output_ResponseCode?: string;
  output_ResponseDesc?: string;
}

export interface MpesaC2bResponse {
  output_TransactionID?: string;
  output_ConversationID?: string;
  output_ResponseCode?: string;
  output_ResponseDesc?: string;
  output_ThirdPartyConversationID?: string;
}
