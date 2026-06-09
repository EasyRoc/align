import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    await video.play();
    setCameraReady(true);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream =
        streamRef.current ??
        (await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        }));
      streamRef.current = stream;
      await attachStream(stream);
    } catch (error) {
      setCameraReady(false);
      setCameraError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? '摄像头权限被拒绝，请在系统设置中允许访问。'
          : '无法打开摄像头，请检查设备连接。',
      );
    }
  }, [attachStream]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, cameraReady, cameraError, startCamera, stopCamera };
}
