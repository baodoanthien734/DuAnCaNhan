type GlobalModalBridge = {
  alert: (message: string, title?: string) => Promise<void>;
};

let bridge: GlobalModalBridge | null = null;

export function registerGlobalModalBridge(nextBridge: GlobalModalBridge | null) {
  bridge = nextBridge;
}

export async function showGlobalAlert(message: string, title?: string) {
  if (!bridge) return;
  await bridge.alert(message, title);
}
