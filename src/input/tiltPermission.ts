type OrientationPermissionApi = {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** iOS 13+ 需在使用者手勢中請求體感權限；其他平台略過。 */
export async function requestTiltPermission(): Promise<void> {
  const api = window.DeviceOrientationEvent as unknown as OrientationPermissionApi | undefined;
  if (api && typeof api.requestPermission === 'function') {
    try {
      await api.requestPermission();
    } catch {
      /* 被拒：交給點擊左右半邊備援 */
    }
  }
}
