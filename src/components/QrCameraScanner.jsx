import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function QrCameraScanner({ onScanSuccess, onScanError }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef(null);
  const isStopping = useRef(false);
  // Use a stable unique id to avoid DOM conflicts on re-renders
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let html5QrCode = null;
    isStopping.current = false;

    const startScanner = async () => {
      try {
        setErrorMessage('');
        html5QrCode = new Html5Qrcode(containerId.current);
        scannerRef.current = html5QrCode;

        // iOS Safari: use smaller qrbox to avoid layout overflow
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const boxSize = isIOS ? 180 : 220;

        const config = {
          fps: isIOS ? 8 : 10, // lower fps on iOS for stability
          qrbox: { width: boxSize, height: boxSize },
          aspectRatio: 1.0,
          // Safari needs explicit video constraints
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
        };

        await html5QrCode.start(
          { facingMode: { ideal: 'environment' } },
          config,
          (decodedText) => {
            if (onScanSuccess) {
              onScanSuccess(decodedText);
            }
          },
          (_error) => {
            // Continuous scanning frames — normal, ignore
            if (onScanError) onScanError(_error);
          }
        );
        setCameraActive(true);
      } catch (err) {
        console.warn('QR camera start error:', err);
        setCameraActive(false);

        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          setErrorMessage('Camera permission denied. On iPhone: tap "AA" or Settings icon in Safari address bar → allow Camera access, then reload.');
        } else if (err?.name === 'NotFoundError' || err?.message?.includes('camera')) {
          setErrorMessage('No camera found. Please use the Instant Check-In button below.');
        } else if (err?.message?.includes('https')) {
          setErrorMessage('Camera requires a secure (HTTPS) connection. Please access this app via https://');
        } else {
          setErrorMessage('Camera unavailable on this device/browser. Use the Instant Check-In button below.');
        }
      }
    };

    startScanner();

    return () => {
      isStopping.current = true;
      const scanner = scannerRef.current;
      if (scanner) {
        // Safe stop — html5-qrcode isScanning can throw on Safari
        try {
          const stopPromise = scanner.stop();
          if (stopPromise && typeof stopPromise.then === 'function') {
            stopPromise
              .then(() => { try { scanner.clear(); } catch (_) {} })
              .catch(() => { try { scanner.clear(); } catch (_) {} });
          } else {
            try { scanner.clear(); } catch (_) {}
          }
        } catch (_) {
          try { scanner.clear(); } catch (__) {}
        }
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-3 w-full">
      {/* Camera viewfinder */}
      <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/50 shadow-inner flex items-center justify-center">
        <div id={containerId.current} className="w-full h-full" />

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

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 text-center">
        <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Align the Gym Gate QR code inside the frame</span>
      </div>

      {/* iOS Safari tip */}
      {!cameraActive && !errorMessage && (
        <p className="text-[10px] text-slate-500 text-center max-w-[240px] leading-relaxed">
          iPhone users: Allow camera access in Safari when prompted
        </p>
      )}
    </div>
  );
}
