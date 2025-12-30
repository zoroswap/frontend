/**
 * Faucet service for minting test tokens from Zoro backend
 * Handles rate limiting and queue management on the server side
 */
import { API } from '@/lib/config';

export interface FaucetMintRequest {
  readonly address: string;
  readonly faucet_id: string;
}

export interface FaucetMintResponse {
  readonly success: boolean;
  readonly message?: string;
  readonly transaction_id?: string;
  readonly error?: string;
}

export interface FaucetMintResult {
  readonly success: boolean;
  readonly message: string;
  readonly transactionId?: string;
}

/**
 * Mint tokens from a specific faucet to the user's account
 * The server handles rate limiting (5 second guard) and queuing (up to 100 requests)
 */
export async function mintFromFaucet(
  address: string,
  faucetId: string,
): Promise<FaucetMintResult> {
  const request: FaucetMintRequest = {
    address: address,
    faucet_id: faucetId,
  };

  try {
    const response = await fetch(`${API.endpoint}/faucets/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result: FaucetMintResponse = await response.json();

    if (!result.success) {
      return {
        success: false,
        message: result.error || result.message || 'Mint request failed',
      };
    }

    return {
      success: true,
      message: result.message || 'Requested. Claim the tokens in your wallet!',
      transactionId: result.transaction_id,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        message: 'Not so fast! Wait 5 secs and try again.',
      };
    }

    return {
      success: false,
      message: 'Unknown error occurred during mint request',
    };
  }
}
