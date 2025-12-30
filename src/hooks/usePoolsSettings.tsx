import { API } from '@/lib/config';
import { bech32ToAccountId } from '@/lib/utils';
import type { AccountId } from '@demox-labs/miden-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface PoolSettings {
  swapFee: number;
  protocolFee: number;
  backstopFee: number;
  faucetId: AccountId;
}

export interface RawPoolSettings {
  swap_fee: string;
  backstop_fee: string;
  protocol_fee: string;
  faucet_id: string;
}

export const usePoolsSettings = () => {
  const info = useQuery({
    queryKey: ['pools-settings'],
    queryFn: fetchPoolSettings,
    staleTime: 3600000,
  });
  const res = useMemo(() => {
    if (info.data) {
      return ({
        ...info,
        data: info.data.data.map(
          p => ({
            faucetId: bech32ToAccountId(p.faucet_id),
            swapFee: Number(p.swap_fee ?? 0),
            protocolFee: Number(p.protocol_fee ?? 0),
            backstopFee: Number(p.backstop_fee ?? 0),
          } as PoolSettings),
        ),
      });
    } else return info;
  }, [info]);
  return res;
};

export interface PoolsInfo {
  poolAccountId: string;
  liquidityPools: PoolSettings;
}

export interface PoolSettingsResponse {
  data: RawPoolSettings[];
}

export async function fetchPoolSettings() {
  try {
    const response = await fetch(`${API.endpoint}/pools/settings`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch pool settings: ${response.status} ${response.statusText}`,
      );
    }
    const data: PoolSettingsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pools settings:', error);
    throw error;
  }
}
