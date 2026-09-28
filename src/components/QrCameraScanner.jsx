import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function QrCameraScanner({ onScanSuccess, onScanError }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef(null);
  const containerId = 'qr-reader-container';

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        setErrorMessage('');
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Success callback
            if (onScanSuccess) {
              onScanSuccess(decodedText);
            }
          },
          (error) => {
            // Continuous scanning error (can be ignored)
            if (onScanError) onScanError(error);
          }
        );
        setCameraActive(true);
      } catch (err) {
        console.warn('QR camera start error:', err);
        setCameraActive(false);
        setErrorMessage(
          err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in your browser settings.'
            : 'Camera could not be accessed. Use the instant check-in button below.'
        );
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(console.error);
          }
          scannerRef.current.clear();
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="flex flex-col items-center justify-center space-y-3 w-full">
      <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/50 shadow-inner flex items-center justify-center">
        <div id={containerId} className="w-full h-full" />
        
        {!cameraActive && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-300 text-xs gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Initializing Camera...</span>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-4 text-center text-xs text-rose-300 gap-2">
            <AlertCircle className="w-7 h-7 text-rose-400 shrink-0" />
            <p className="text-[11px] leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Camera className="w-3.5 h-3.5 text-emerald-400" />
        <span>Align the Gym Gate QR code inside the frame</span>
      </div>
    </div>
  );
}
