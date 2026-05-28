import { API } from './config';

export interface SubmitPositionSwap {
  position_id: string;
  asset_in: string;
  asset_out: string;
  amount_in: number;
  min_amount_out: number;
}

export interface AddPositionResponse {
  success: boolean;
  position_id: string;
  message: string;
}

export interface SubmitOrderResponse {
  success: boolean;
  order_id: string;
  message: string;
}

export interface PositionGetNoteResponse {
  success: boolean;
  note_data: string;
  message: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function registerPosition(noteData: string): Promise<AddPositionResponse> {
  const response = await fetch(`${API.endpoint}/positions/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note_data: noteData }),
  });
  const result = await parseJson<AddPositionResponse>(response);
  if (!result.success) {
    throw new Error(result.message || 'Failed to register position');
  }
  return result;
}

export async function submitPositionSwap(
  payload: SubmitPositionSwap,
): Promise<SubmitOrderResponse> {
  const response = await fetch(`${API.endpoint}/positions/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<SubmitOrderResponse>(response);
  if (!result.success) {
    throw new Error(result.message || 'Failed to submit position swap');
  }
  return result;
}

export async function getPositionNote(positionId: string): Promise<PositionGetNoteResponse> {
  const url = new URL(`${API.endpoint}/positions/get_note`);
  url.searchParams.set('position_id', positionId);
  const response = await fetch(url.toString());
  const result = await parseJson<PositionGetNoteResponse>(response);
  if (!result.success) {
    throw new Error(result.message || 'Failed to get position note');
  }
  return result;
}
