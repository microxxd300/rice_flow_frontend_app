import { ApiError, ApiResponse } from './common';

export type { ApiError, ApiResponse };

// Shape of the errors thrown by services/api.ts (fetch-based client)
export type ApiErrorType = Error & { response?: { status: number; data: ApiError } };

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
