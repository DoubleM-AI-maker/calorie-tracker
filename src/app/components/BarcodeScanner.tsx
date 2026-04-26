'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        setCameras(devices);
        
        if (devices && devices.length > 0) {
          // Prefer back camera
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rück') ||
            d.label.toLowerCase().includes('umgebung')
          );
          const selectedId = backCamera ? backCamera.id : devices[0].id;
          setActiveCameraId(selectedId);
          
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [ 
              Html5QrcodeSupportedFormats.EAN_13, 
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E
            ]
          };

          await html5QrCode.start(
            selectedId,
            config,
            (decodedText) => {
              // Success
              html5QrCode.stop().then(() => {
                onScan(decodedText);
              }).catch(err => console.error(err));
            },
            () => {
              // No barcode found in frame
            }
          );
          setIsInitializing(false);
        } else {
          setError("Keine Kamera gefunden.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Kamera-Zugriff verweigert oder Fehler.");
        setIsInitializing(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error(err));
      }
    };
  }, [onScan]);

  const switchCamera = async () => {
    if (!scannerRef.current || cameras.length < 2) return;
    
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].id;
    
    await scannerRef.current.stop();
    setActiveCameraId(nextId);
    
    await scannerRef.current.start(
      nextId,
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        scannerRef.current?.stop().then(() => onScan(decodedText));
      },
      () => {}
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg aspect-[4/3] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {/* Video stream container */}
        <div id="reader" className="w-full h-full" />
        
        {/* Overlay scanning UI */}
        {!isInitializing && !error && (
          <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 m-12 rounded-xl flex items-center justify-center">
            <div className="w-full h-px bg-primary/50 absolute animate-scan-line shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
          </div>
        )}

        {isInitializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-white">
            <Camera className="w-8 h-8 animate-pulse text-outline" />
            <span className="label-md">Kamera wird gestartet...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-4 bg-zinc-900 text-white">
            <p className="text-primary font-medium">{error}</p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white/10 rounded-full text-sm font-medium"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={onClose}
          className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full shadow-lg transition-transform active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <p className="mt-4 text-white/40 text-xs text-center px-8">
        Halte den Barcode mittig in das Fenster.<br/>
        EAN-13 und UPC Formate werden unterstützt.
      </p>

      <style jsx global>{`
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        @keyframes scan-line {
          0% { transform: translateY(-75px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(75px); opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
