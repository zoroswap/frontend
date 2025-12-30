import { NetworkId } from '@demox-labs/miden-sdk';

export interface NetworkConfig {
  readonly rpcEndpoint: string;
}

export interface OracleConfig {
  readonly endpoint: string;
  readonly cacheTtlSeconds: number;
}

export interface ApiConfig {
  readonly endpoint: string;
  readonly wsEndpoint: string;
}

export interface UiConfig {
  readonly defaultSlippage: number;
}

/**
 * Get environment variable with fallback and validation
 */
function getEnvVar(key: string, fallback?: string): string {
  const value = import.meta.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Parse and validate numeric environment variable
 */
function getNumericEnvVar(key: string, fallback: number): number {
  const value = import.meta.env[key];
  if (value === undefined) return fallback;

  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${key}: ${value}`);
  }
  return parsed;
}

// Network Configuration
export const NETWORK: NetworkConfig = {
  rpcEndpoint: getEnvVar('VITE_RPC_ENDPOINT'),
} as const;

// Oracle Configuration
export const ORACLE: OracleConfig = {
  endpoint: getEnvVar(
    'VITE_PRICE_ORACLE_ENDPOINT',
    'https://oracle.zoroswap.com/v1/updates/price/latest',
  ),
  cacheTtlSeconds: getNumericEnvVar('VITE_PRICE_CACHE_TTL_SECONDS', 3000),
} as const;

// API Configuration
const apiEndpoint = getEnvVar('VITE_API_ENDPOINT', 'https://api.zoroswap.com');
export const API: ApiConfig = {
  endpoint: apiEndpoint,
  wsEndpoint: getEnvVar(
    'VITE_WS_ENDPOINT',
    apiEndpoint.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:'),
  ),
} as const;

// UI Configuration
export const DEFAULT_SLIPPAGE = getNumericEnvVar('VITE_DEFAULT_SLIPPAGE', 0.5);

export const NETWORK_ID = import.meta.env.VITE_NETWORK_ID === 'mainnet'
  ? NetworkId.Mainnet
  : NetworkId.Testnet;

/**
 * Validate all configurations on module load
 */
function validateConfig(): void {
  // Validate slippage bounds
  if (DEFAULT_SLIPPAGE < 0 || DEFAULT_SLIPPAGE > 100) {
    throw new Error(`Invalid slippage configuration: default=${DEFAULT_SLIPPAGE}`);
  }

  // Validate URLs
  const urlFields = [
    NETWORK.rpcEndpoint,
    ORACLE.endpoint,
    API.endpoint,
  ];
  for (const url of urlFields) {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL in configuration: ${url}`);
    }
  }
}

// Run validation
validateConfig();
