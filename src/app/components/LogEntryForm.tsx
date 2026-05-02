'use client';
import { useActionState, useState, useRef, useMemo } from 'react';
import { processLogEntry, saveMealEntry, transcribeAudioAction } from '../actions';
import { Loader2, Plus, Check, Mic, Camera, Square, X, Scan, Search, CalendarDays } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatBerlinDate } from '@/lib/date';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });
const FoodSearch = dynamic(() => import('./FoodSearch'), { ssr: false });

export default function LogEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, submitAction, isPending] = useActionState(processLogEntry, undefined);

  const { todayStr, yesterdayStr } = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { todayStr: formatBerlinDate(now), yesterdayStr: formatBerlinDate(yesterday) };
  }, []);
  const initialDate = searchParams.get('date') || todayStr;
  const [targetDate, setTargetDate] = useState(initialDate);

  // Local state for items if we use manual search or want to override the action state
  const [manualItems, setManualItems] = useState<any[] | null>(null);

  // Local state for the text field so we can update it from Whisper
  const [logText, setLogText] = useState('');

  // Media states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Image states
  const [imageStr, setImageStr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const displayItems = manualItems || state?.items;

  const handleBarcodeScan = (ean: string) => {
    setLogText(ean);
    setIsScanning(false);
    // Auto-submit after scan
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 100);
  };

  const handleManualSelect = (product: any) => {
    const kcal = product.nutriments?.energy_kcal_100g || product.nutriments?.energy_value || 0;
    const name = product.product_name_de || product.product_name || 'Unbekannt';
    const brand = product.brands || '';
    
    const newItem = {
      canonical_de: `${brand ? brand + ' ' : ''}${name}`.trim(),
      estimated_grams: 100,
      quantity: 100,
      unit: 'g',
      resolution: {
        source: 'off',
        source_id: product.code,
        nutrients: {
          kcal: Math.round(kcal),
          protein_g: Number((product.nutriments?.proteins_100g || 0).toFixed(1)),
          fat_g: Number((product.nutriments?.fat_g || 0).toFixed(1)),
          carbs_g: Number((product.nutriments?.carbohydrates_100g || 0).toFixed(1)),
          fiber_g: Number((product.nutriments?.fiber_100g || 0).toFixed(1)),
        }
      }
    };
    
    setManualItems([newItem]);
    setIsSearching(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // Send to server to transcribe
        setIsTranscribing(true);
        const formData = new FormData();
        // Fallback type for Whisper API if needed
        formData.append('audio', audioBlob, 'recording.webm');
        
        const res = await transcribeAudioAction(formData);
        if (res.success && res.text) {
          setLogText((prev) => (prev ? prev + ' ' + res.text : res.text));
        } else {
          alert('Spracherkennung fehlgeschlagen: ' + res.error);
        }
        setIsTranscribing(false);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Konnte nicht auf das Mikrofon zugreifen.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress image via Canvas before sending to Claude
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 800; // Resize to max 800px on long edge to save LLM tokens

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setImageStr(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      {!displayItems && (
        <form ref={formRef} action={submitAction} className="flex flex-col gap-4">

        {/* Date Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="w-4 h-4 text-outline shrink-0" />
          {[
            { label: 'Heute', value: todayStr },
            { label: 'Gestern', value: yesterdayStr },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTargetDate(value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                targetDate === value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            value={targetDate}
            max={todayStr}
            onChange={(e) => setTargetDate(e.target.value)}
            className="px-3 py-1 rounded-full text-xs bg-surface-container-high text-on-surface border-none focus:outline-none focus:ring-1 focus:ring-outline/30 cursor-pointer"
          />
        </div>

        {/* Hidden inputs to pass data to FormAction */}
        {imageStr && <input type="hidden" name="imageStr" value={imageStr} />}

        <div className="relative">
          <textarea 
            name="logText"
            id="logText"
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            placeholder="z.B. Zwei Spiegeleier mit einer Scheibe Vollkornbrot..."
            rows={3}
            className="w-full bg-surface-container-low text-on-surface p-4 rounded-xl resize-none
                       focus:outline-none focus:ring-1 focus:ring-outline/30 placeholder:text-outline pb-14"
            disabled={isPending || isTranscribing}
          />
          
          {/* Action Toolbar Inside Text Area */}
          <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center">
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isPending || isTranscribing}
                className={`p-2 rounded-full transition-colors flex items-center justify-center 
                  ${isRecording ? 'bg-error text-on-error animate-pulse' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}
              >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || isTranscribing || isRecording}
                className="p-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsScanning(true)}
                disabled={isPending || isTranscribing || isRecording}
                className="p-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
                title="Barcode scannen"
              >
                <Scan className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsSearching(true)}
                disabled={isPending || isTranscribing || isRecording}
                className="p-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
                title="Suchen"
              >
                <Search className="w-5 h-5" />
              </button>
              
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef}
                onChange={handleImageCapture}
                className="hidden" 
              />

              {/* Sub-label for status */}
              {isTranscribing && <span className="text-sm text-outline animate-pulse ml-2">Audio wird transkribiert...</span>}
            </div>

            {imageStr && (
              <div className="relative w-10 h-10 border border-outline-variant rounded shadow-ambient overflow-hidden">
                <img src={imageStr} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  type="button"
                  onClick={() => setImageStr(null)}
                  className="absolute -top-1 -right-1 bg-surface-container rounded-full shadow"
                >
                  <X className="w-3 h-3 text-on-surface" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isPending || isTranscribing || isRecording}
            className="flex items-center gap-2 gradient-primary px-8 py-3 rounded-full font-medium transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-ambient"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>Erfassen</span>
          </button>
        </div>
      </form>
    )}

      {/* Results Confirmation Dialog */}
      {displayItems && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500 bg-surface-bright p-6 rounded-xl shadow-ambient border border-outline-variant/30">
          <h3 className="title-md mb-4 border-b border-surface-container-high pb-2">Ist das korrekt?</h3>
          <div className="flex flex-col gap-4 mb-6">
            {displayItems.map((item: any, idx: number) => {
              const nut = item.resolution?.nutrients;
              return (
                <div key={idx} className="bg-surface-container-lowest rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-medium text-lg">{item.canonical_de}</span>
                      <span className="label-sm text-outline">{item.quantity} {item.unit} {item.estimated_grams ? `(~${item.estimated_grams}g)` : ''}</span>
                    </div>
                    {item.resolution?.source && (
                      <span className="label-sm px-2 py-1 bg-surface-container-high rounded text-on-surface uppercase text-xs font-bold font-mono tracking-wider opacity-80">
                        Quelle: {item.resolution.source}
                      </span>
                    )}
                  </div>
                  {nut && (
                    <div className="grid grid-cols-5 gap-2 mt-2 pt-2 border-t border-surface-container">
                      <div className="flex flex-col"><span className="label-sm text-outline">Kcal</span><span className="font-medium">{nut.kcal}</span></div>
                      <div className="flex flex-col"><span className="label-sm" style={{ color: 'var(--tertiary)' }}>🥩 Protein</span><span className="font-medium">{nut.protein_g}g</span></div>
                      <div className="flex flex-col"><span className="label-sm" style={{ color: '#0d9488' }}>🥑 Fett</span><span className="font-medium">{nut.fat_g}g</span></div>
                      <div className="flex flex-col"><span className="label-sm" style={{ color: '#d97706' }}>🥖 Carbs</span><span className="font-medium">{nut.carbs_g}g</span></div>
                      <div className="flex flex-col"><span className="label-sm" style={{ color: '#16a34a' }}>🥬 Ballaststoffe</span><span className="font-medium">{nut.fiber_g ?? 0}g</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
               type="button"
               onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
               className="text-primary font-medium hover:underline px-2 py-2"
            >
              Abbrechen
            </button>
            <button 
              type="button" 
              onClick={async () => {
                await saveMealEntry({
                  items: displayItems,
                  rawInput: logText || (manualItems ? 'manual search' : 'ai extraction'),
                  targetDate,
                });
                const destination = targetDate !== todayStr
                  ? `/tagebuch?date=${targetDate}`
                  : '/tagebuch';
                router.push(destination);
              }}
              className="flex items-center gap-2 bg-on-surface text-surface px-6 py-2 rounded-full font-medium transition-transform hover:scale-[1.02] shadow-ambient"
            >
              <Check className="w-4 h-4" />
              <span>Bestätigen & Speichern</span>
            </button>
          </div>
        </div>
      )}

      {state?.success === false && (
        <div className="p-4 bg-primary/10 text-primary rounded-xl text-sm font-medium border border-primary/20">
          {state.message}
        </div>
      )}
      {isScanning && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setIsScanning(false)} 
        />
      )}
      {isSearching && (
        <FoodSearch 
          onSelect={handleManualSelect}
          onClose={() => setIsSearching(false)}
        />
      )}
    </div>
  );
}
