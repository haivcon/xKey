export type SensitivePinPromptRequest = {
  reason?: string;
  title?: string;
};

export type SensitivePinPromptRequester = (request?: SensitivePinPromptRequest | string) => Promise<boolean>;

let requester: SensitivePinPromptRequester | null = null;

export function setSensitivePinPromptRequester(next: SensitivePinPromptRequester | null): void {
  requester = next;
}

export function requestSensitivePinPrompt(request?: SensitivePinPromptRequest | string): Promise<boolean> | null {
  return requester?.(request) ?? null;
}