import React, { useEffect, useRef, useState } from 'react';
import { PoemScene } from '../types';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface PlayerProps {
  scenes: PoemScene[];
  autoPlay?: boolean;
  title: string;
  author: string;
  dynasty: string;
}

export const Player: React.FC<PlayerProps> = ({ scenes, autoPlay = true, title, author, dynasty }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          // Hint sample rate to match typical output if possible
          sampleRate: 24000 
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  /**
   * VOICE PLAYBACK
   * Manually decodes raw PCM data from Gemini API
   */
  const playVoice = async (base64Data: string) => {
    if (!audioContextRef.current) return;
    
    // Clean up previous source strictly to avoid race conditions with onended
    if (voiceSourceRef.current) {
        voiceSourceRef.current.onended = null;
        try { voiceSourceRef.current.stop(); } catch(e){}
    }

    try {
        // DECODE PCM MANUALLY
        // Gemini returns raw Int16 Little Endian PCM at 24kHz
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const sampleRate = 24000;
        const numChannels = 1;
        // Ensure even byte length for Int16
        const safeLen = len % 2 === 0 ? len : len - 1;
        
        // Create Int16 view
        const int16Data = new Int16Array(bytes.buffer.slice(0, safeLen));
        
        const audioBuffer = audioContextRef.current.createBuffer(numChannels, int16Data.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert Int16 to Float32 [-1.0, 1.0]
        for (let i = 0; i < int16Data.length; i++) {
            channelData[i] = int16Data[i] / 32768.0;
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 1.0; 
        
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        voiceSourceRef.current = source;
        source.start(0);

        source.onended = () => {
             // Logic to proceed to next scene or end
             if (currentIndex < scenes.length - 1) {
                 setTimeout(() => {
                     // Check isPlaying ref or state? 
                     // Since we are in a closure, we rely on the fact that if we stopped manually, onended was nulled.
                     // So if we are here, we finished naturally.
                     setCurrentIndex(prev => prev + 1);
                 }, 1000); // 1s pause between lines
             } else {
                 // End of poem
                 setIsPlaying(false);
                 setHasEnded(true);
             }
        };

    } catch (e) {
        console.error("Error creating voice source", e);
    }
  };

  // Trigger Voice on scene change
  useEffect(() => {
    if (!isPlaying) return;
    if (!audioContextRef.current) initAudio();

    // Handle Mute logic
    if (isMuted) {
        if (audioContextRef.current?.state === 'running') {
            audioContextRef.current.suspend();
        }
        return;
    } else {
         if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    }

    const scene = scenes[currentIndex];
    if (scene && scene.audioBase64) {
        playVoice(scene.audioBase64);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isPlaying, isMuted]);


  // Initial Autoplay
  useEffect(() => {
    if (autoPlay && scenes.length > 0 && !isPlaying) {
      setIsPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = () => {
    initAudio();
    if (isPlaying) {
      setIsPlaying(false);
      if (audioContextRef.current) audioContextRef.current.suspend();
    } else {
      if (hasEnded) {
          // Restart if ended
          setHasEnded(false);
          setCurrentIndex(0);
          setIsPlaying(true);
          if (audioContextRef.current) audioContextRef.current.resume();
          return;
      }

      setIsPlaying(true);
      if (audioContextRef.current) audioContextRef.current.resume();
      
      // Resume or restart voice if needed
      if (voiceSourceRef.current && voiceSourceRef.current.context.state === 'running') {
         // resumed via context
      } else {
         const scene = scenes[currentIndex];
         if (scene.audioBase64) playVoice(scene.audioBase64);
      }
    }
  };

  const handleNext = () => {
    setHasEnded(false);
    if (currentIndex < scenes.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    setHasEnded(false);
    if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setIsPlaying(true);
    }
  };

  const handleReplay = () => {
      setHasEnded(false);
      setCurrentIndex(0);
      setIsPlaying(true);
      if (audioContextRef.current) audioContextRef.current.resume();
  };

  if (!scenes[currentIndex] && scenes.length === 0) return <div className="text-center p-8">Loading Scene...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      
      {/* Visual Display */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border-4 border-ink-800"
      >
        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {scene.imageBase64 && (
              <img 
                src={scene.imageBase64} 
                alt={scene.visualPrompt}
                className="w-full h-full object-cover animate-ken-burns"
              />
            )}
          </div>
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-20"></div>

        {/* Full Poem Overlay (End Screen) */}
        {hasEnded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/60 backdrop-blur-sm animate-fade-in px-8">
                 <div className="relative text-center p-8 border-y-2 border-white/20 bg-white/5 backdrop-blur-md rounded-lg max-w-2xl max-h-[90%] overflow-y-auto no-scrollbar">
                     
                     <div className="mb-6 border-b border-white/20 pb-4">
                        <h1 className="text-4xl md:text-6xl font-cursive text-white drop-shadow-[0_4px_8px_rgba(0,0,0,1)] mb-2 tracking-widest">{title}</h1>
                        <p className="text-xl md:text-2xl font-serif text-white/90 drop-shadow-md">
                            <span className="bg-seal-red/80 px-2 py-0.5 rounded mr-2 text-sm md:text-base align-middle">{dynasty}</span>
                            {author}
                        </p>
                     </div>

                     <h2 className="text-3xl md:text-5xl font-cursive text-white drop-shadow-[0_4px_8px_rgba(0,0,0,1)] leading-loose whitespace-pre-wrap tracking-widest">
                        {scenes
                          .map(s => s.originalText)
                          .join('') // Join all scenes
                          .replace(/([，。！？；])/g, '$1\n') // Insert newline after Chinese punctuation
                          .split('\n')
                          .filter(line => line.trim() !== '') // Remove empty lines
                          .join('\n')
                        }
                     </h2>
                 </div>
                 <button 
                    onClick={handleReplay}
                    className="mt-6 flex items-center gap-2 text-white/90 hover:text-white bg-seal-red hover:bg-red-700 px-6 py-2 rounded-full font-serif transition-all shadow-lg hover:scale-105"
                 >
                    <RotateCcw size={18} /> Replay
                 </button>
            </div>
        )}

        {/* Subtitles (Only if not ended) */}
        {!hasEnded && (
            <div className="absolute bottom-8 left-0 right-0 px-4 text-center z-30">
                <div className="inline-block bg-black/30 backdrop-blur-sm px-6 py-4 rounded-xl border border-white/10 shadow-2xl max-w-[90%]">
                    <p 
                    key={scenes[currentIndex]?.id} 
                    className="text-3xl md:text-5xl font-cursive text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-widest leading-relaxed animate-fade-in" 
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.5)' }}
                    >
                    {scenes[currentIndex]?.originalText}
                    </p>
                </div>
            </div>
        )}

        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-serif backdrop-blur-sm z-30 border border-white/10">
          Scene {currentIndex + 1} / {scenes.length}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 bg-paper-200 px-8 py-3 rounded-full shadow-lg border border-stone-300">
        <button onClick={() => setIsMuted(!isMuted)} className={`text-ink-800 hover:text-seal-red transition ${isMuted ? 'text-red-500' : ''}`}>
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        <div className="h-6 w-px bg-stone-400"></div>

        <button onClick={handlePrev} disabled={currentIndex === 0} className="text-ink-800 hover:text-seal-red disabled:opacity-30 transition">
          <SkipBack size={24} />
        </button>

        <button 
          onClick={handlePlayPause} 
          className="bg-seal-red text-white p-3 rounded-full hover:bg-red-700 transition shadow-md active:scale-95"
        >
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>

        <button onClick={handleNext} disabled={currentIndex === scenes.length - 1} className="text-ink-800 hover:text-seal-red disabled:opacity-30 transition">
          <SkipForward size={24} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto w-full py-2 px-1 justify-center no-scrollbar">
        {scenes.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => {
              setCurrentIndex(idx);
              setIsPlaying(true);
              setHasEnded(false);
            }}
            className={`relative w-16 h-16 md:w-24 md:h-24 rounded-md overflow-hidden flex-shrink-0 transition-all duration-300 border-2 ${idx === currentIndex ? 'border-seal-red scale-110 z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
          >
            {scene.imageBase64 ? (
              <img src={scene.imageBase64} alt={`Scene ${idx}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-stone-300 animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};