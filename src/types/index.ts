export interface RegisterRequest {
  username: string;
  email?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface VerifyTOTPRequest {
  username: string;
  token: string;
}

export interface VerifyTOTPResponse {
  success: boolean;
  message: string;
  sessionToken?: string;
  user?: {
    username: string;
  };
}

export interface GetSecretRequest {
  username: string;
}

export interface GetSecretResponse {
  success: boolean;
  qrCodeUrl?: string;
  manualEntryKey?: string;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
