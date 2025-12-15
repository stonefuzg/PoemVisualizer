import React, { useState } from 'react';
import { analyzePoem, generateSceneImage, generateSceneAudio } from './services/geminiService';
import { PoemAnalysis, PoemScene, AppState, GenerationProgress } from './types';
import { Player } from './components/Player';
import { Button } from './components/Button';
import { VoiceRecorder } from './components/VoiceRecorder';
import { Scroll, Sparkles, BookOpen } from 'lucide-react';

const PRESETS = [
  "静夜思 (李白)",
  "春晓 (孟浩然)",
  "登鹳雀楼 (王之涣)",
  "江雪 (柳宗元)"
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [voiceSample, setVoiceSample] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<PoemAnalysis | null>(null);
  const [scenes, setScenes] = useState<PoemScene[]>([]);
  const [progress, setProgress] = useState<GenerationProgress>({ step: '', completed: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setScenes([]);
    setAnalysis(null);

    try {
      // 1. Analyze Poem
      setProgress({ step: 'Analyzing poem structure and mood...', completed: 0, total: 100 });
      const analysisResult = await analyzePoem(inputText);
      setAnalysis(analysisResult);
      
      // Initialize empty scenes with SFX Categories
      const initialScenes: PoemScene[] = analysisResult.scenes.map((s, i) => ({
        id: `scene-${i}`,
        originalText: s.text,
        visualPrompt: s.visualDescription,
        sfxDescription: s.sfxDescription,
        sfxCategory: s.sfxCategory // Pass the category
      }));
      setScenes(initialScenes);

      setAppState(AppState.GENERATING_MEDIA);
      const totalSteps = initialScenes.length * 2; 
      let completedSteps = 0;

      // 2. Generate Media
      const updatedScenes = [...initialScenes];

      for (let i = 0; i < updatedScenes.length; i++) {
        // A. Generate Image
        setProgress({ 
          step: `Painting scene ${i + 1}/${initialScenes.length} (Era: ${analysisResult.dynasty})...`, 
          completed: completedSteps, 
          total: totalSteps 
        });
        
        try {
          const imageBase64 = await generateSceneImage(updatedScenes[i].visualPrompt);
          updatedScenes[i].imageBase64 = imageBase64;
          setScenes([...updatedScenes]); 
        } catch (e) {
          console.error(`Failed to generate image for scene ${i}`, e);
        }
        completedSteps++;

        // B. Generate Audio (Voice)
        setProgress({ 
          step: `Reciting scene ${i + 1}/${initialScenes.length}...`, 
          completed: completedSteps, 
          total: totalSteps 
        });

        try {
           const audioBase64 = await generateSceneAudio(updatedScenes[i].originalText, voiceSample || undefined);
           updatedScenes[i].audioBase64 = audioBase64;
           setScenes([...updatedScenes]);
        } catch (e) {
           console.error(`Failed to generate audio for scene ${i}`, e);
        }
        completedSteps++;
      }

      setAppState(AppState.READY);

    } catch (error: any) {
      console.error(error);
      setAppState(AppState.ERROR);
      setErrorMsg(error.message || "Something went wrong during generation.");
    }
  };

  return (
    <div className="min-h-screen font-sans text-ink-900 pb-20">
      {/* Header */}
      <header className="bg-ink-900 text-paper-100 py-6 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-seal-red text-white p-2 rounded-lg">
                <Scroll size={24} />
             </div>
             <div>
               <h1 className="text-2xl font-serif font-bold tracking-widest">古诗映画</h1>
               <p className="text-xs text-stone-400 uppercase tracking-widest">GuShi Visualizer</p>
             </div>
          </div>
          <div className="hidden md:block text-sm text-stone-400 font-serif italic">
             Bringing Ancient Poetry to Life with AI
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        
        {/* Input Section */}
        {appState === AppState.IDLE || appState === AppState.ERROR ? (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-xl border border-stone-200">
            <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
              <BookOpen className="text-jade-500" />
              Start Teaching
            </h2>
            <p className="text-stone-600 mb-6">
              Enter a poem title or the full text. The AI will analyze the dynasty, generate era-accurate visuals, and create a narrated animation with ambient sound.
            </p>
            
            <textarea
              className="w-full p-4 border-2 border-stone-200 rounded-lg focus:border-ink-800 focus:ring-0 transition-colors font-serif text-lg bg-paper-100 resize-none h-32 mb-4"
              placeholder="e.g. 静夜思 (Li Bai) or paste a poem here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            {/* Voice Settings */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-paper-100 rounded-lg border border-stone-200 mb-6 w-full opacity-60">
              <div>
                <span className="block font-bold text-ink-800 text-sm mb-1">Voice Settings (Currently Unavailable)</span>
                <p className="text-xs text-stone-500">Voice cloning is temporarily disabled. Standard narration will be used.</p>
              </div>
              <div className="pointer-events-none grayscale">
                 <VoiceRecorder onRecordingComplete={setVoiceSample} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              <span className="text-sm text-stone-500 py-2">Suggested:</span>
              {PRESETS.map(preset => (
                <button 
                  key={preset}
                  onClick={() => setInputText(preset)}
                  className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-sm transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
               <Button 
                 onClick={handleGenerate} 
                 disabled={!inputText.trim()}
                 className="w-full md:w-auto"
               >
                 <Sparkles size={18} />
                 Generate Lesson
               </Button>
            </div>

            {appState === AppState.ERROR && (
              <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">
                Error: {errorMsg}
              </div>
            )}
          </div>
        ) : null}

        {/* Loading / Generating State */}
        {(appState === AppState.ANALYZING || appState === AppState.GENERATING_MEDIA) && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 border-4 border-stone-200 border-t-seal-red rounded-full animate-spin mx-auto mb-8"></div>
            <h3 className="text-2xl font-serif font-bold mb-2 animate-pulse">{progress.step}</h3>
            <p className="text-stone-500 font-serif italic">Creating immersive experience...</p>
            
            {appState === AppState.GENERATING_MEDIA && (
              <div className="w-full bg-stone-200 h-2 rounded-full mt-6 overflow-hidden">
                <div 
                  className="bg-jade-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* Player State */}
        {(appState === AppState.READY || appState === AppState.PLAYING) && analysis && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-end border-b border-stone-300 pb-4 mb-6">
                <div>
                   <h2 className="text-4xl font-cursive text-ink-900 mb-1">{analysis.title}</h2>
                   <p className="text-lg font-serif text-stone-600">
                     {analysis.dynasty} · {analysis.author}
                   </p>
                </div>
                <Button variant="outline" onClick={() => {
                  setAppState(AppState.IDLE);
                  setVoiceSample(null); 
                }}>
                   Create New
                </Button>
             </div>

             <Player 
              scenes={scenes} 
              title={analysis.title}
              author={analysis.author}
              dynasty={analysis.dynasty}
             />

             {/* Educational Context Card */}
             <div className="max-w-4xl mx-auto bg-paper-100 p-6 rounded-lg border border-stone-200 mt-8 shadow-inner">
               <h3 className="font-serif font-bold text-lg mb-3 text-ink-800 border-b border-stone-300 pb-2 inline-block">
                 Historical Context & Visual Design
               </h3>
               <p className="text-stone-700 leading-relaxed font-serif">
                 {analysis.eraDescription}
               </p>
               <div className="mt-4 text-xs text-stone-400">
                 *Visuals generated based on historical data from the {analysis.dynasty} Dynasty.
               </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;