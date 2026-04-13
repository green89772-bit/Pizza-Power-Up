/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Loader2,
  Trophy, 
  ChevronRight, 
  RotateCcw, 
  ShieldCheck,
  X,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Video,
  ExternalLink,
  LineChart as LineChartIcon,
  History,
  CupSoda,
  Lock,
  Map as MapIcon,
  Play,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import confetti from 'canvas-confetti';
import { initializeApp } from 'firebase/app';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { STUDENTS, StudentScript } from './constants';

// --- Types ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

let isQuotaExceededGlobal = false;

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for quota exceeded
  if (errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota exceeded')) {
    if (!isQuotaExceededGlobal) {
      console.warn('Firestore Quota Exceeded. Data will not be synced to cloud until reset.');
      isQuotaExceededGlobal = true;
    }
    // We don't want to crash the whole app for a background sync quota issue
    if (operationType === OperationType.WRITE || operationType === OperationType.CREATE || operationType === OperationType.GET) {
      return; 
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// --- Error Boundary ---
interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<EBProps, EBState> {
  public state: EBState = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const msg = error?.message || "";
        if (msg.startsWith('{')) {
          const parsed = JSON.parse(msg);
          if (parsed.error) {
            if (parsed.error.includes('resource-exhausted') || parsed.error.includes('Quota exceeded')) {
              errorMessage = "Firestore Quota Exceeded! 📊 The free limit for today has been reached. Your progress will be saved locally, but cloud sync will resume tomorrow. You can still continue practicing!";
            } else {
              errorMessage = `Firebase Error: ${parsed.error}`;
            }
          }
        } else {
          errorMessage = msg;
        }
      } catch (e) {}
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6 glass p-8 rounded-3xl border border-red-500/20">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl mx-auto flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Oops! An error occurred</h2>
            <p className="text-slate-400">{errorMessage}</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

type Level = 1 | 2 | 3 | 4;

interface GameState {
  view: 'selection' | 'game' | 'teacher' | 'task' | 'map' | 'admin';
  student: StudentScript | null;
  level: Level;
  currentPart: number;
  score: number;
  isRecording: boolean;
  transcript: string;
  maxVol: number;
  frequencyData: number[];
  adventureProgress: number;
  drinkProgress: number;
  unlockedParts: number;
  unlockedLevels: Record<number, number>; // partIndex -> maxLevelUnlocked (1-4)
  completedLevels: string[]; // "partIndex-level"
  pendingLevels: string[]; // "partIndex-level" waiting for teacher
  taskComplete: boolean;
  teacherFeedback: Record<string, string>; // studentId -> feedback text
  aiFeedback: Record<string, { pronunciation: string, grammar: string, intonation: string }>; // studentId -> AI feedback
  isMuted: boolean;
  isAnalyzingAI: boolean;
}

// --- Speech Recognition Setup ---
const getSpeechRecognition = () => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [state, setState] = useState<GameState>(() => {
    const defaultState: GameState = {
      view: 'selection',
      student: null,
      level: 1,
      currentPart: 0,
      score: 0,
      isRecording: false,
      transcript: '',
      maxVol: 0,
      frequencyData: Array(8).fill(0),
      adventureProgress: 0,
      drinkProgress: 0,
      unlockedParts: 1,
      unlockedLevels: { 0: 1, 1: 1, 2: 1, 3: 1 },
      completedLevels: [],
      pendingLevels: [],
      taskComplete: false,
      teacherFeedback: {},
      aiFeedback: {},
      isMuted: false,
      isAnalyzingAI: false,
    };
    return defaultState;
  });

  // --- Firebase Sync Logic ---
  useEffect(() => {
    if (!state.student) return;

    const studentId = state.student.id;
    const progressRef = doc(db, 'progress', studentId);

    // Listen for remote changes
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setState(prev => {
          // Only update if remote is different and we are not in a critical state
          if (prev.student?.id === studentId) {
            return {
              ...prev,
              adventureProgress: data.adventureProgress ?? prev.adventureProgress,
              drinkProgress: data.drinkProgress ?? prev.drinkProgress,
              unlockedParts: data.unlockedParts ?? prev.unlockedParts,
              unlockedLevels: data.unlockedLevels ?? prev.unlockedLevels,
              completedLevels: data.completedLevels ?? prev.completedLevels,
              pendingLevels: data.pendingLevels ?? prev.pendingLevels,
              teacherFeedback: {
                ...prev.teacherFeedback,
                [studentId]: data.teacherFeedback ?? prev.teacherFeedback[studentId]
              }
            };
          }
          return prev;
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `progress/${studentId}`);
    });

    return () => unsubscribe();
  }, [state.student?.id]);

  // Save progress to Firebase whenever it changes locally (with debounce)
  useEffect(() => {
    if (!state.student || isQuotaExceededGlobal) return;

    const studentId = state.student.id;
    const progressRef = doc(db, 'progress', studentId);

    const dataToSave = {
      studentId,
      adventureProgress: state.adventureProgress,
      drinkProgress: state.drinkProgress,
      unlockedParts: state.unlockedParts,
      unlockedLevels: state.unlockedLevels,
      completedLevels: state.completedLevels,
      pendingLevels: state.pendingLevels,
      teacherFeedback: state.teacherFeedback[studentId] || "",
      lastUpdated: serverTimestamp()
    };

    const timer = setTimeout(() => {
      if (isQuotaExceededGlobal) return;
      setDoc(progressRef, dataToSave, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `progress/${studentId}`));
    }, 3000); // 3 second debounce to save quota

    return () => clearTimeout(timer);
  }, [
    state.adventureProgress, 
    state.drinkProgress, 
    state.unlockedParts, 
    state.unlockedLevels, 
    state.completedLevels, 
    state.pendingLevels,
    state.student?.id
  ]);


  const [showRules, setShowRules] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const handleAdminLogin = () => {
    const pass = prompt("Please enter Teacher Password:");
    if (pass === "1234") { // Default password, can be changed
      setIsAdminAuthenticated(true);
      setState(prev => ({ ...prev, view: 'admin' }));
    } else {
      alert("Wrong password!");
    }
  };

  const updateStudentProgress = async (studentId: string, updates: any) => {
    try {
      const progressRef = doc(db, 'progress', studentId);
      await setDoc(progressRef, {
        ...updates,
        studentId,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      alert("Progress updated successfully! 🌟");
    } catch (error) {
      console.error("Failed to update progress", error);
      alert("Update failed. Please check connection.");
    }
  };
  
  const recordingStartTimeRef = useRef<number>(0);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // --- Ambient Soundscape Logic ---
  useEffect(() => {
    const shouldPlay = (state.view === 'selection' || state.view === 'map' || state.view === 'teacher') && !state.isMuted && hasStarted;
    
    // Grand Orchestral Adventure track (Mario Galaxy vibe)
    const soundUrl = 'Adventures in Adventureland (online-audio-converter.com).mR4'; 
    const fallbackUrl = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=game-music-7408.mp3';

    if (!ambientAudioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0.05;
      audio.crossOrigin = 'anonymous';
      
      audio.onerror = (e) => {
        console.warn("Audio error detected:", e);
        if (audio.src !== fallbackUrl && fallbackUrl) {
          console.log("Switching to fallback audio...");
          audio.src = fallbackUrl;
          if (shouldPlay) {
            audio.play().catch(err => {
              if (err.name !== 'AbortError') console.error("Fallback play failed:", err);
            });
          }
        }
      };
      
      ambientAudioRef.current = audio;
    }

    const audio = ambientAudioRef.current;
    if (!audio) return;

    if (shouldPlay) {
      // Ensure src is set
      if (!audio.src || (audio.src !== soundUrl && audio.src !== fallbackUrl)) {
        console.log("Setting audio src:", soundUrl);
        audio.src = soundUrl;
        audio.load();
      }
      
      if (audio.paused) {
        console.log("Attempting to play audio...");
        audio.play()
          .then(() => {
            console.log("Audio playing successfully");
            setAudioUnlocked(true);
          })
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.warn("Audio play failed in effect, trying fallback:", err);
              if (audio.src !== fallbackUrl) {
                audio.src = fallbackUrl;
                audio.load();
                audio.play()
                  .then(() => setAudioUnlocked(true))
                  .catch(fallbackErr => {
                    if (fallbackErr.name !== 'AbortError') console.error("Both failed in effect:", fallbackErr);
                  });
              }
            }
          });
      }
    } else {
      if (!audio.paused) {
        console.log("Pausing audio");
        audio.pause();
      }
    }

    const handleInteraction = () => {
      if (shouldPlay && audio.paused) {
        console.log("User interaction detected, playing audio...");
        audio.play()
          .then(() => setAudioUnlocked(true))
          .catch(err => {
            if (err.name !== 'AbortError') console.warn("Interaction play failed:", err);
          });
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [state.view, state.isMuted, hasStarted]);

  const MusicIndicator = () => {
    if (state.view === 'game' || state.view === 'task') return null;
    
    return (
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
        {!audioUnlocked && !state.isMuted && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 mb-2 animate-bounce"
          >
            Tap anywhere to start music 🎵
          </motion.div>
        )}
        <div className={`flex items-center gap-3 glass px-4 py-2 rounded-2xl border transition-all ${state.isMuted ? 'border-white/5 opacity-60' : 'border-blue-500/30 bg-blue-500/5'}`}>
          <div className="flex gap-1 items-end h-4">
            {[1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className={`w-1.5 rounded-full ${state.isMuted ? 'bg-slate-700' : 'bg-gradient-to-t from-blue-600 to-purple-400'}`}
                animate={audioUnlocked && !state.isMuted ? { height: [4, 16, 8, 12, 4] } : { height: 4 }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={audioUnlocked && !state.isMuted ? { rotate: 360 } : { rotate: 0 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
              <Sparkles className={`w-4 h-4 ${state.isMuted ? 'text-slate-600' : 'text-blue-500'}`} />
            </motion.div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${state.isMuted ? 'text-slate-500' : 'text-blue-400'}`}>
              {state.isMuted ? 'Muted' : (audioUnlocked ? 'Adventure On!' : 'Paused')}
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
            }}
            className={`p-1.5 rounded-lg transition-colors ${state.isMuted ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-500'}`}
            title={state.isMuted ? "Unmute" : "Mute"}
          >
            {state.isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  };

  const handleStartApp = () => {
    setHasStarted(true);
    console.log("Starting app, attempting to unlock audio...");
    
    // Initialize and play audio immediately on this user-triggered event
    const soundUrl = 'Adventures in Adventureland (online-audio-converter.com).mR4'; 
    const fallbackUrl = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=game-music-7408.mp3';
    
    if (!ambientAudioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0.05;
      audio.crossOrigin = 'anonymous';
      ambientAudioRef.current = audio;
    }
    
    const audio = ambientAudioRef.current;
    if (audio) {
      const tryPlay = (url: string) => {
        if (audio.src !== url) {
          audio.src = url;
          audio.load();
        }
        return audio.play();
      };

      tryPlay(soundUrl)
        .then(() => {
          console.log("Audio unlocked successfully via handleStartApp!");
          setAudioUnlocked(true);
        })
        .catch(err => {
          console.warn("Primary audio failed, trying fallback:", err);
          tryPlay(fallbackUrl)
            .then(() => {
              console.log("Fallback audio unlocked successfully!");
              setAudioUnlocked(true);
            })
            .catch(fallbackErr => {
              console.error("Both primary and fallback audio failed:", fallbackErr);
            });
        });
    }

    // Resume AudioContext for visualizer
    if (audioContextRef.current) audioContextRef.current.resume();
  };

  const handleGlobalClick = () => {
    if (hasStarted && !audioUnlocked && ambientAudioRef.current) {
      const audio = ambientAudioRef.current;
      const soundUrl = 'Adventures in Adventureland (online-audio-converter.com).mR4';
      const fallbackUrl = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=game-music-7408.mp3';
      
      console.log("Global click detected, unlocking audio...");
      
      const tryPlay = (url: string) => {
        // Only change src and load if it's a different URL
        if (audio.src !== url) {
          console.log(`Setting audio src to: ${url}`);
          audio.src = url;
          audio.load(); // Ensure the new source is loaded
        }
        // Attempt to play
        return audio.play();
      };

      // Always try the primary soundUrl first if it's not already set or has failed.
      tryPlay(soundUrl)
        .then(() => {
          console.log("Global click: Primary audio unlocked successfully!");
          setAudioUnlocked(true);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.warn("Global click: Primary audio failed, trying fallback:", err);
            tryPlay(fallbackUrl)
              .then(() => {
                console.log("Global click: Fallback audio unlocked successfully!");
                setAudioUnlocked(true);
              })
              .catch(fallbackErr => {
                if (fallbackErr.name !== 'AbortError') {
                  console.error("Global click: Both primary and fallback audio failed:", fallbackErr);
                }
              });
          }
        });
    }
  };

  const recognition = useMemo(() => {
    const rec = getSpeechRecognition();
    if (rec) {
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
    }
    return rec;
  }, []);

  // Mock data for Penny's dashboard
  const [mockProgress, setMockProgress] = useState<{ 
    [key: string]: { 
      level: number, 
      score: number, 
      adventure: string, 
      drink: string,
      task: string, 
      part: number,
      unlockedParts: number,
      unlockedLevels: Record<number, number>,
      completedLevels: string[],
      pendingLevels: string[],
      aiFeedback?: { pronunciation: string, grammar: string, intonation: string }
    } 
  }>(() => {
    const saved = localStorage.getItem('adventure_power_up_progress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved progress", e);
      }
    }

    const initial: { 
      [key: string]: { 
        level: number, 
        score: number, 
        adventure: string, 
        drink: string,
        task: string, 
        part: number,
        unlockedParts: number,
        unlockedLevels: Record<number, number>,
        completedLevels: string[],
        pendingLevels: string[],
        aiFeedback?: { pronunciation: string, grammar: string, intonation: string }
      } 
    } = {};
    STUDENTS.forEach(s => {
      initial[s.id] = { 
        level: 1, 
        score: 0, 
        adventure: 'Not Started', 
        drink: '0%',
        task: 'Pending', 
        part: 0,
        unlockedParts: 1,
        unlockedLevels: { 0: 1, 1: 1, 2: 1, 3: 1 },
        completedLevels: [],
        pendingLevels: []
      };
    });
    return initial;
  });

  // Persist progress to localStorage
  useEffect(() => {
    localStorage.setItem('adventure_power_up_progress', JSON.stringify(mockProgress));
  }, [mockProgress]);

  const analyzeWithGemini = async (transcript: string, targetScript: string, studentId: string, score: number, level: number, duration: number, missed: string[]) => {
    if (!transcript || transcript.length < 2) {
      console.log("Transcript too short for AI analysis");
      return;
    }

    setState(prev => ({ ...prev, isAnalyzingAI: true }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Analyze this student's English speaking practice. 
        Target Script: "${targetScript}"
        Student Transcript: "${transcript}"
        Missed Words: ${missed.join(', ')}
        
        Provide feedback in JSON format with fields: pronunciation, grammar, intonation. 
        Keep it encouraging and simple for a child (age 6-10). 
        - Pronunciation: Focus on the sounds in the missed words.
        - Grammar: Comment on sentence structure.
        - Intonation: Comment on the flow and expression.
        
        Example: {"pronunciation": "Great job! Try to say 'the' more clearly.", "grammar": "You followed the sentence perfectly!", "intonation": "You sound very happy and expressive!"}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pronunciation: { type: Type.STRING },
              grammar: { type: Type.STRING },
              intonation: { type: Type.STRING }
            },
            required: ["pronunciation", "grammar", "intonation"]
          }
        }
      });

      if (response.text) {
        try {
          const feedback = JSON.parse(response.text.trim());
          setState(prev => ({
            ...prev,
            isAnalyzingAI: false,
            aiFeedback: {
              ...prev.aiFeedback,
              [studentId]: feedback
            }
          }));

          // Update mockProgress with AI feedback
          setMockProgress(prev => ({
            ...prev,
            [studentId]: {
              ...prev[studentId],
              aiFeedback: feedback
            }
          }));

          // Send to GAS with AI feedback
          sendToGAS(
            state.student!.name, 
            level, 
            score, 
            `${Math.floor(state.adventureProgress)}%`, 
            state.currentPart + 1, 
            missed.join(', '), 
            duration,
            feedback
          );

          // Save to Firebase History
          if (!isQuotaExceededGlobal) {
            addDoc(collection(db, 'history'), {
              studentId,
              part: state.currentPart + 1,
              level,
              score,
              date: new Date().toLocaleDateString(),
              timestamp: serverTimestamp(),
              aiFeedback: feedback,
              transcript,
              missed
            }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'history'));
          }
        } catch (parseError) {
          console.error("JSON Parse error in AI feedback", parseError, response.text);
          throw parseError;
        }
      }
    } catch (e) {
      console.error("Gemini analysis failed", e);
      
      // Fallback feedback if AI fails
      const fallbackFeedback = {
        pronunciation: missed.length > 0 ? `Keep practicing these words: ${missed.slice(0, 3).join(', ')}!` : "Your pronunciation is getting better!",
        grammar: score > 80 ? "Great sentence structure!" : "Try to follow the words on the screen.",
        intonation: "Good effort! Keep speaking with confidence!"
      };

      setState(prev => ({ 
        ...prev, 
        isAnalyzingAI: false,
        aiFeedback: { ...prev.aiFeedback, [studentId]: fallbackFeedback }
      }));

      // Still send to GAS with fallback
      sendToGAS(
        state.student!.name, 
        level, 
        score, 
        `${Math.floor(state.adventureProgress)}%`, 
        state.currentPart + 1, 
        missed.join(', '), 
        duration,
        fallbackFeedback
      );

      // Save to Firebase History
      if (!isQuotaExceededGlobal) {
        addDoc(collection(db, 'history'), {
          studentId,
          part: state.currentPart + 1,
          level,
          score,
          date: new Date().toLocaleDateString(),
          timestamp: serverTimestamp(),
          transcript,
          missed,
          aiFeedback: fallbackFeedback
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'history'));
      }
    }
  };

  const [selectedId, setSelectedId] = useState<string>(state.student?.id || "");
  const [showResult, setShowResult] = useState(false);
  const [lastMissedWords, setLastMissedWords] = useState<string[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Record<string, { date: string, score: number, level: number }[]>>(() => {
    const saved = localStorage.getItem('student_history');
    return saved ? JSON.parse(saved) : {};
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');
  const hadVolumeRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // --- Audio Visualizer ---
  const startVisualizer = async () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      console.log("Visualizer already active, skipping re-init");
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        if (average > 10) hadVolumeRef.current = true;
        
        // Calculate 16 frequency bands for a more dynamic visualizer
        const bands = 16;
        const samplesPerBand = Math.floor(bufferLength / bands);
        const frequencyData = Array.from({ length: bands }, (_, i) => {
          const start = i * samplesPerBand;
          const end = start + samplesPerBand;
          const bandSum = dataArray.slice(start, end).reduce((a, b) => a + b, 0);
          return (bandSum / samplesPerBand) * 1.5; // Boost for better visuals
        });

        setState(prev => ({ 
          ...prev, 
          maxVol: average,
          frequencyData: frequencyData
        }));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setState(prev => ({ ...prev, maxVol: 0 }));
  };

  // --- Level Text Processing ---
  const getDisplayScript = (part: any, level: Level, highlightMissed: string[] = []) => {
    const text = part.text || part;
    
    if (level === 3 && !showResult) return "??? (Speak the whole script from memory!)";

    const words = text.split(' ');
    let wordCount = 0;

    return (
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
        {words.map((w: string, i: number) => {
          if (w.includes('▲') && w.length === 1) {
            return <span key={i} className="text-red-500 font-bold mx-1">▲</span>;
          }
          if (w.includes('(↑)')) {
            const cleanWord = w.replace('(↑)', '').replace(/\*\*/g, '').replace(/▲/g, '');
            const isMissed = highlightMissed.some(m => cleanWord.toLowerCase().includes(m.toLowerCase()));
            const isBold = w.includes('**');
            const hasAttachedTriangle = w.includes('▲');
            
            return (
              <span key={i} className={`flex items-center gap-0.5 ${isMissed ? 'text-red-400 font-bold underline decoration-red-500/50' : ''} ${isBold ? 'font-bold' : ''}`}>
                {level === 1 && wordCount % 3 === 2 && !showResult ? '_____' : (level === 2 && !showResult ? cleanWord[0] + '.'.repeat(cleanWord.length - 1) : cleanWord)}
                {hasAttachedTriangle && <span className="text-red-500 font-bold">▲</span>}
                <span className="text-blue-400 font-bold text-xs">↑</span>
              </span>
            );
          }
          
          wordCount++;
          const cleanW = w.replace(/[.,/#!$%^&*;:{}=\-_`~()▲↑]/g, "").replace(/\*\*/g, "");
          const isMissed = highlightMissed.some(m => cleanW.toLowerCase() === m.toLowerCase());
          
          let displayWord = level === 1 && wordCount % 3 === 0 && !showResult
            ? '_____' 
            : (level === 2 && !showResult ? w[0] + '.'.repeat(w.length - 1) : w);
            
          const isBold = displayWord.includes('**');
          if (isBold) {
            displayWord = displayWord.replace(/\*\*/g, '');
          }

          // Handle attached ▲ in normal words (e.g. "word▲!")
          if (displayWord.includes('▲')) {
            const parts = displayWord.split(/(▲)/);
            return (
              <span key={i} className={`${isMissed ? 'text-red-400 font-bold underline decoration-red-500/50' : ''} ${isBold ? 'font-bold' : ''}`}>
                {parts.map((p, pi) => p === '▲' ? <span key={pi} className="text-red-500 font-bold mx-0.5">▲</span> : p)}
              </span>
            );
          }

          return (
            <span 
              key={i} 
              className={`${isMissed ? 'text-red-400 font-bold underline decoration-red-500/50' : ''} ${isBold ? 'font-bold' : ''}`}
            >
              {displayWord}
            </span>
          );
        })}
      </div>
    );
  };

  // --- Scoring Logic (Penny's Stricter Algorithm) ---
  const calculateScore = (transcript: string, part: any) => {
    const target = part.text || part;
    // Strip markers for scoring
    const cleanTarget = target.replace(/[▲↑()]/g, "").replace(/\*\*/g, "");
    
    const spokenText = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
    const targetText = cleanTarget.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
    
    if (!spokenText) return { score: 0, missed: [] };

    const sWords = spokenText.split(/\s+/).filter(w => w.length > 0);
    const targetWords = targetText.split(/\s+/).filter(w => w.length > 0);
    
    let matches = 0;
    const usedIndices = new Set();
    const missed: string[] = [];
    
    // Levenshtein distance for fuzzy matching
    const getLevenshteinDistance = (a: string, b: string) => {
      const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
      }
      return matrix[a.length][b.length];
    };

    targetWords.forEach(tw => {
      // Try exact match first
      let idx = sWords.findIndex((sw, i) => sw === tw && !usedIndices.has(i));
      
      // If no exact match, try fuzzy match for longer words
      if (idx === -1 && tw.length > 3) {
        idx = sWords.findIndex((sw, i) => {
          if (usedIndices.has(i)) return false;
          const dist = getLevenshteinDistance(sw, tw);
          return dist <= 1; // Allow 1 character difference
        });
      }

      if (idx !== -1) {
        matches++;
        usedIndices.add(idx);
      } else {
        missed.push(tw); // Track ALL missed words now
      }
    });

    const rawScore = (matches / targetWords.length) * 100;
    
    let finalScore = Math.round(rawScore);
    if (rawScore < 30) finalScore = Math.round(rawScore * 1.5 + 10);
    else if (rawScore < 50) finalScore = Math.floor(((rawScore - 30) / 20) * 15) + 65;
    else if (rawScore < 70) finalScore = Math.floor(((rawScore - 50) / 20) * 10) + 80;
    else if (rawScore < 85) finalScore = Math.floor(((rawScore - 70) / 15) * 5) + 90;
    else if (rawScore >= 85) finalScore = Math.min(100, Math.floor(((rawScore - 85) / 15) * 5) + 95);
    
    return { score: finalScore, missed: Array.from(new Set(missed)).slice(0, 10) }; // Show up to 10 missed words
  };

  const saveAttempt = (studentId: string, score: number, level: number) => {
    const newAttempt = {
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score,
      level
    };
    
    setHistory(prev => {
      const studentHistory = prev[studentId] || [];
      const updated = {
        ...prev,
        [studentId]: [...studentHistory, newAttempt].slice(-20) // Keep last 20 attempts
      };
      localStorage.setItem('student_history', JSON.stringify(updated));
      return updated;
    });
  };

  const calculateAdventureProgress = (completedLevels: string[]) => {
    // 4 parts * 3 levels (1-3) = 12 tasks total for Adventure
    const adventureTasks = completedLevels.filter(cl => !cl.endsWith('-4')).length;
    return (Math.min(adventureTasks, 12) / 12) * 100;
  };

  const calculateDrinkProgress = (completedLevels: string[]) => {
    // 4 parts * 1 level (4) = 4 tasks total for Drink
    const drinkTasks = completedLevels.filter(cl => cl.endsWith('-4')).length;
    return (Math.min(drinkTasks, 4) / 4) * 100;
  };

  // --- Actions ---
  const toggleRecording = async () => {
    if (!recognition) {
      setFeedback("Speech Recognition not supported in this browser. 😢");
      return;
    }

    // Stop any ongoing speech synthesis
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (isRecordingRef.current) {
      // STOP LOGIC
      isRecordingRef.current = false;
      isInitializingRef.current = false;
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      
      try {
        recognition.stop();
      } catch (e) {
        console.warn("Stop error", e);
        try {
          recognition.abort();
        } catch (e2) {
          console.error("Abort error", e2);
        }
      }
      stopVisualizer();
      
      const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
      
      // Use transcriptRef + interim to get the absolute latest text
      const finalTranscript = (transcriptRef.current + ' ' + interimTranscriptRef.current).trim();
      const { score: finalScore, missed } = calculateScore(finalTranscript, state.student!.scripts[state.currentPart]);
      
      setLastMissedWords(missed);
      setLastTranscript(finalTranscript);
      setState(prev => ({ ...prev, isRecording: false, score: finalScore }));
      
      if (!finalTranscript) {
        if (hadVolumeRef.current) {
          setFeedback("I heard you speaking, but I couldn't catch the words. Please speak more clearly! 🎙️❓");
        } else {
          setFeedback("I didn't hear any sound. Please check your microphone! 🎙️❌");
        }
      }

      setShowResult(true);

      // Automatically update student progress if score is high (>= 90)
      if (finalScore >= 90 && state.student) {
        const levelKey = `${state.currentPart}-${state.level}`;
        const newCompleted = Array.from(new Set([...state.completedLevels, levelKey]));
        const newAdventure = calculateAdventureProgress(newCompleted);
        const newDrink = calculateDrinkProgress(newCompleted);
        
        // Update local state
        setState(prev => ({
          ...prev,
          completedLevels: newCompleted,
          adventureProgress: newAdventure,
          drinkProgress: newDrink,
          // Unlock next level/part if needed
          unlockedLevels: {
            ...prev.unlockedLevels,
            [state.currentPart]: Math.max(prev.unlockedLevels[state.currentPart] || 1, state.level < 3 ? state.level + 1 : state.level)
          }
        }));

        // Update mockProgress for teacher dashboard
        setMockProgress(prev => {
          const current = prev[state.student!.id];
          const nextLevels = { ...current.unlockedLevels };
          if (state.level < 3) {
            nextLevels[state.currentPart] = Math.max(nextLevels[state.currentPart] || 1, state.level + 1);
          }
          
          return {
            ...prev,
            [state.student!.id]: {
              ...current,
              score: Math.max(current.score, finalScore),
              completedLevels: newCompleted,
              unlockedLevels: nextLevels,
              adventure: `${Math.floor(newAdventure)}%`,
              drink: `${Math.floor(newDrink)}%`,
              task: state.level === 4 ? 'Reviewing' : current.task
            }
          };
        });
      }
      
      // Call Gemini for AI feedback (which will then call sendToGAS)
      analyzeWithGemini(
        finalTranscript, 
        state.student!.scripts[state.currentPart], 
        state.student!.id,
        finalScore,
        state.level,
        duration,
        missed
      );
      
      // Save to history
      saveAttempt(state.student!.id, finalScore, state.level);
      
      if (finalScore >= 90) {
        setFeedback("Amazing! You passed! 🌟");
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        
        const levelKey = `${state.currentPart}-${state.level}`;
        const isNewCompletion = !state.completedLevels.includes(levelKey);
        
        if (isNewCompletion) {
          const newCompleted = [...state.completedLevels, levelKey];
          const newAdventure = calculateAdventureProgress(newCompleted);
          const newDrink = calculateDrinkProgress(newCompleted);
          
          // Unlock Logic
          const nextLevel = state.level < 3 ? state.level + 1 : state.level;
          const currentMaxLevel = state.unlockedLevels[state.currentPart] || 1;
          
          const nextUnlockedLevels = {
            ...state.unlockedLevels,
            [state.currentPart]: Math.max(currentMaxLevel, nextLevel as number)
          };
          const nextUnlockedParts = (state.level === 3 && state.currentPart < 3) 
            ? Math.max(state.unlockedParts, state.currentPart + 2) 
            : state.unlockedParts;

          setState(prev => ({ 
            ...prev, 
            completedLevels: newCompleted,
            adventureProgress: newAdventure,
            drinkProgress: newDrink,
            unlockedLevels: nextUnlockedLevels,
            unlockedParts: nextUnlockedParts
          }));

          setFeedback("Amazing! You earned a reward! ✨");

          // Update mock progress
          setMockProgress(prev => ({
            ...prev,
            [state.student!.id]: {
              ...prev[state.student!.id],
              score: finalScore,
              adventure: `${Math.floor(newAdventure)}%`,
              drink: `${Math.floor(newDrink)}%`,
              completedLevels: newCompleted,
              unlockedLevels: nextUnlockedLevels,
              unlockedParts: nextUnlockedParts,
              missed: missed
            }
          }));
        }
      } else if (finalScore > 0) {
        setFeedback("Good try! Let's practice more! 💪");
        // Update missed words even if not passed
        setMockProgress(prev => ({
          ...prev,
          [state.student!.id]: {
            ...prev[state.student!.id],
            score: finalScore,
            missed: missed
          }
        }));
      } else {
        setFeedback("I didn't hear you clearly. Try again! 🎙️");
      }
    } else {
      // START LOGIC
      if (isInitializingRef.current) return;
      recordingStartTimeRef.current = Date.now();
      isInitializingRef.current = true;
      setIsInitializing(true);
      setFeedback("");
      transcriptRef.current = '';
      interimTranscriptRef.current = '';
      hadVolumeRef.current = false;

      // Ensure everything is stopped before starting
      stopVisualizer();
      try {
        recognition.abort();
      } catch (e) {}

      // Safety timeout: if it doesn't start in 4s, unlock
      initTimeoutRef.current = setTimeout(() => {
        if (isInitializingRef.current) {
          isInitializingRef.current = false;
          setIsInitializing(false);
          isRecordingRef.current = false;
          setFeedback("Connection slow... Try clicking again! 🐢");
          stopVisualizer();
          try { recognition.abort(); } catch(e) {}
          setState(prev => ({ ...prev, isRecording: false }));
        }
      }, 4000);

      try {
        // Step 1: Reset state
        isRecordingRef.current = true;
        setState(prev => ({ ...prev, transcript: '', isRecording: true, score: 0 }));
        
        // Step 2: Start recognition FIRST (Safari likes this)
        setTimeout(() => {
          if (!isRecordingRef.current) return; // User cancelled during delay
          try {
            recognition.start();
          } catch (e) {
            console.warn("Recognition already started or in transition", e);
            if (isRecordingRef.current) {
              startVisualizer();
              isInitializingRef.current = false;
              setIsInitializing(false);
              if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
            }
          }
        }, 100);

      } catch (err: any) {
        console.error("Mic init error", err);
        setFeedback("Microphone blocked! Please allow access in settings. 🎙️❌");
        isRecordingRef.current = false;
        isInitializingRef.current = false;
        setIsInitializing(false);
        setState(prev => ({ ...prev, isRecording: false }));
        if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          transcriptRef.current += ' ' + text;
        } else {
          interim += text;
        }
      }
      interimTranscriptRef.current = interim;
      const displayTranscript = (transcriptRef.current + ' ' + interim).trim();
      setState(prev => ({ ...prev, transcript: displayTranscript }));
    };

    recognition.onstart = () => {
      console.log("Recognition started.");
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      
      if (isRecordingRef.current) {
        // Start visualizer only AFTER recognition has successfully grabbed the mic
        startVisualizer();
        isInitializingRef.current = false;
        setIsInitializing(false);
      } else {
        // User cancelled before it started
        try { recognition.abort(); } catch(e) {}
        stopVisualizer();
        isInitializingRef.current = false;
        setIsInitializing(false);
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended.");
      isInitializingRef.current = false;
      setIsInitializing(false);
      
      // If it ended but we thought we were still recording, try to restart it
      if (isRecordingRef.current) {
        console.warn("Recognition ended unexpectedly while recording. Attempting restart...");
        setTimeout(() => {
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.error("Failed to restart recognition", e);
              // If it fails, we don't necessarily want to stop everything immediately
              // but if it keeps failing, we might have to.
            }
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      
      if (event.error === 'no-speech') {
        console.log("No speech detected. Keeping recording state alive.");
        return; // Don't kill the recording state for no-speech
      }

      isInitializingRef.current = false;
      setIsInitializing(false);
      isRecordingRef.current = false; // MUST reset this on error
      
      if (event.error === 'audio-capture') {
        setFeedback("Mic error! Please refresh or check your iPad settings. 🎙️⚠️");
      } else if (event.error === 'not-allowed') {
        setFeedback("Mic blocked! Please allow access to record. 🚫");
      } else if (event.error === 'aborted') {
        console.log("Recognition aborted, resetting UI.");
      } else {
        setFeedback(`Error: ${event.error}. Let's try again!`);
      }
      
      setState(prev => ({ ...prev, isRecording: false }));
      stopVisualizer();
    };
  }, []);

  const speak = async (part: any) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      // Also stop any HTML5 audio if playing
      const audios = document.querySelectorAll('audio');
      audios.forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
      setIsSpeaking(false);
      return;
    }

    let text = part.text || part;
    // Strip markers for TTS
    const cleanText = text.replace(/▲/g, '')
                          .replace(/\(↑\)/g, '')
                          .replace(/↑/g, '')
                          .replace(/\*\*/g, '');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Only use Gemini TTS for iOS devices where system voice is poor
    if (isIOS) {
      try {
        setIsLoadingAudio(true);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: `Read this naturally for a child: ${cleanText}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is clear and friendly
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        
        if (base64Audio) {
          const binaryString = atob(base64Audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          // Try audio/mpeg as it's more common for TTS responses
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio();
          
          audio.src = url;
          
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
          };
          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
            // Fallback to system TTS if audio playback fails
            systemSpeak(cleanText, part);
          };
          
          await audio.play();
          setIsLoadingAudio(false);
          setIsSpeaking(true);
          return;
        }
      } catch (error) {
        console.error("Gemini TTS failed, falling back to system voice:", error);
      }
    }

    setIsLoadingAudio(false);
    // Fallback to System TTS (Default for Desktop)
    systemSpeak(cleanText, part);
  };

  const systemSpeak = (cleanText: string, part: any) => {
    const ut = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Better voice selection for iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    let selectedVoice = null;
    
    if (isIOS) {
      // iOS specific: Try to find "Samantha" or "Daniel" or "Karen" which are usually better
      selectedVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'));
    } else {
      selectedVoice = voices.find(v => v.name.includes('Premium') || v.name.includes('Google US English') || v.name.includes('Samantha'));
    }
    
    if (selectedVoice) ut.voice = selectedVoice;
    ut.lang = 'en-US';
    ut.pitch = part.pitch || 1.0;
    ut.rate = part.rate || 0.85; // Slightly slower for clarity
    
    ut.onstart = () => setIsSpeaking(true);
    ut.onend = () => setIsSpeaking(false);
    ut.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(ut);
  };

  const handleNext = () => {
    // Go back to map after completion
    setState(prev => ({ ...prev, view: 'map' }));
    setShowResult(false);
  };

  const sendToGAS = (
    name: string, 
    level: number, 
    score: number, 
    adventure: string, 
    part: number, 
    missed: string = "", 
    duration: number,
    aiFeedback?: { pronunciation: string, grammar: string, intonation: string }
  ) => {
    const url = "https://script.google.com/macros/s/AKfycbyd8ogElEFB9jeZJ8MtntSS8HqI_ewIypi8kyT6s2WWL6_O9pkIEKoPb2q5mbdkN2Kd/exec";
    
    // Filter out very short or zero-score attempts to avoid "junk" data
    if (duration < 3 && score === 0) {
      console.log("Skipping GAS: Attempt too short/invalid");
      return;
    }

    const data = { 
      name, 
      level, 
      score, 
      adventure, 
      part, 
      missed, 
      duration: Math.round(duration),
      status: duration < 5 ? "Short Practice" : "Full Attempt",
      timestamp: new Date().toISOString(),
      ai_pronunciation: aiFeedback?.pronunciation || "N/A",
      ai_grammar: aiFeedback?.grammar || "N/A",
      ai_intonation: aiFeedback?.intonation || "N/A"
    };
    
    console.log("Sending data to GAS:", data);

    // Use query params for better reliability with no-cors and GAS doGet/doPost
    const queryParams = new URLSearchParams(data as any).toString();
    fetch(`${url}?${queryParams}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    })
    .then(() => console.log("GAS Data Sent via GET"))
    .catch(e => {
      console.error("GAS Log Error:", e);
      // Fallback to POST if GET fails
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data)
      }).then(() => console.log("GAS Data Sent via POST fallback"));
    });
  };

  const teacherPass = () => {
    const levelKey = `${state.currentPart}-${state.level}`;
    const newCompleted = Array.from(new Set([...state.completedLevels, levelKey]));
    const newAdventure = calculateAdventureProgress(newCompleted);
    const newDrink = calculateDrinkProgress(newCompleted);
    
    const nextLevel = state.level < 3 ? state.level + 1 : state.level;
    const currentMaxLevel = state.unlockedLevels[state.currentPart] || 1;

    const nextUnlockedLevels = {
      ...state.unlockedLevels,
      [state.currentPart]: Math.max(currentMaxLevel, nextLevel as number)
    };
    const nextUnlockedParts = (state.level === 3 && state.currentPart < 3) 
      ? Math.max(state.unlockedParts, state.currentPart + 2) 
      : state.unlockedParts;

    const newPending = state.pendingLevels.filter(pl => pl !== levelKey);

    setState(prev => ({ 
      ...prev, 
      score: 100, 
      completedLevels: newCompleted,
      pendingLevels: newPending,
      adventureProgress: newAdventure,
      drinkProgress: newDrink,
      unlockedLevels: nextUnlockedLevels,
      unlockedParts: nextUnlockedParts
    }));
    
    setFeedback("TEACHER PASS ACTIVATED! 🍎");
    setShowResult(true);
    confetti({ particleCount: 50, spread: 50 });
    
    setMockProgress(prev => ({
      ...prev,
      [state.student!.id]: {
        ...prev[state.student!.id],
        score: 100,
        adventure: `${Math.floor(newAdventure)}%`,
        drink: `${Math.floor(newDrink)}%`,
        completedLevels: newCompleted,
        pendingLevels: newPending,
        task: 'Complete',
        unlockedLevels: nextUnlockedLevels,
        unlockedParts: nextUnlockedParts
      }
    }));
  };

  // --- Renderers ---
  if (state.view === 'teacher') {
    return (
      <div 
        onClick={handleGlobalClick}
        className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden"
      >
        <AnimatePresence>
          {!hasStarted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-950 flex flex-col justify-center items-center p-6 text-center"
            >
              <div className="max-w-md space-y-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-32 h-32 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/40"
                >
                  <Sparkles className="w-16 h-16 text-white" />
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white">ADVENTURE POWER-UP</h1>
                  <p className="text-slate-400 font-medium">Get ready for a magical English adventure! 🌟</p>
                </div>
                <button
                  onClick={handleStartApp}
                  className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current" />
                  START ADVENTURE
                </button>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Click to unlock magical sounds & music</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="min-h-screen p-6 md:p-12">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'selection' }))}
              className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              <RotateCcw className="w-8 h-8" />
            </button>
            <h1 className="font-bungee text-3xl text-blue-400">Penny's Dashboard</h1>
          </div>
          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3">
            <User className="w-5 h-5 text-blue-400" />
            <span className="font-bold">ESL Teacher Penny</span>
          </div>
        </header>

        <div className="glass-dark rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-slate-400 uppercase text-[10px] tracking-[0.2em]">
                  <th className="px-8 py-6">Student</th>
                  <th className="px-8 py-6">Topic</th>
                  <th className="px-8 py-6">Current Level</th>
                  <th className="px-8 py-6">Level Progress</th>
                  <th className="px-8 py-6">Best Score</th>
                  <th className="px-8 py-6">Difficult Words</th>
                  <th className="px-8 py-6">Task Status</th>
                  <th className="px-8 py-6">Adventure Status</th>
                  <th className="px-8 py-6">Drink Status</th>
                  <th className="px-8 py-6">AI Analysis</th>
                  <th className="px-8 py-6">Teacher Feedback</th>
                  <th className="px-8 py-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {STUDENTS.map(s => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${s.id}&backgroundColor=b6e3f4`} 
                          alt={s.name}
                          className="w-10 h-10 rounded-full bg-blue-500/10"
                        />
                        <span className="font-bold text-lg">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-400">{s.topic}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bungee">
                        LVL {mockProgress[s.id].level}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] mb-1 uppercase tracking-widest text-slate-500">
                          <span>Part {mockProgress[s.id].part + 1}/4</span>
                          <span>{Math.round((mockProgress[s.id].part / 4) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(mockProgress[s.id].part / 4) * 100}%` }}
                            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono text-xl text-blue-300">
                      {mockProgress[s.id].score}%
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {(mockProgress[s.id] as any).missed?.length > 0 ? (
                          (mockProgress[s.id] as any).missed.map((w: string, i: number) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                              {w}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">None yet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {mockProgress[s.id].task === 'Reviewing' ? (
                        <button 
                          onClick={() => {
                            const studentProgress = mockProgress[s.id];
                            // Find the pending level for this student
                            const pendingLevel = studentProgress.pendingLevels?.find(pl => pl.startsWith(`${studentProgress.part}-`)) || `${studentProgress.part}-4`;
                            const newCompleted = Array.from(new Set([...studentProgress.completedLevels, pendingLevel]));
                            const newPending = studentProgress.pendingLevels?.filter(pl => pl !== pendingLevel) || [];
                            const newDrink = calculateDrinkProgress(newCompleted);
                            const newAdventure = calculateAdventureProgress(newCompleted);

                            setMockProgress(prev => ({
                              ...prev,
                              [s.id]: {
                                ...prev[s.id],
                                task: 'Complete',
                                completedLevels: newCompleted,
                                pendingLevels: newPending,
                                drink: `${Math.floor(newDrink)}%`,
                                adventure: `${Math.floor(newAdventure)}%`
                              }
                            }));
                            confetti({ particleCount: 50, spread: 50 });
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                        >
                          <RotateCcw className="w-3 h-3 animate-spin-slow" />
                          APPROVE TASK
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            mockProgress[s.id].task === 'Complete' ? 'bg-green-500' : 'bg-slate-700'
                          }`} />
                          <span className={`text-sm font-medium ${
                            mockProgress[s.id].task === 'Complete' ? 'text-green-400' : 'text-slate-500'
                          }`}>
                            {mockProgress[s.id].task}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          parseFloat(mockProgress[s.id].adventure) >= 100 ? 'bg-green-500 animate-pulse' :
                          parseFloat(mockProgress[s.id].adventure) > 0 ? 'bg-blue-500' : 'bg-slate-700'
                        }`} />
                        <span className={`text-sm font-medium ${
                          parseFloat(mockProgress[s.id].adventure) >= 100 ? 'text-green-400' :
                          parseFloat(mockProgress[s.id].adventure) > 0 ? 'text-blue-400' : 'text-slate-500'
                        }`}>
                          {mockProgress[s.id].adventure}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          parseFloat(mockProgress[s.id].drink) >= 100 ? 'bg-blue-500 animate-pulse' :
                          parseFloat(mockProgress[s.id].drink) > 0 ? 'bg-purple-500' : 'bg-slate-700'
                        }`} />
                        <span className={`text-sm font-medium ${
                          parseFloat(mockProgress[s.id].drink) >= 100 ? 'text-blue-400' :
                          parseFloat(mockProgress[s.id].drink) > 0 ? 'text-purple-400' : 'text-slate-500'
                        }`}>
                          {mockProgress[s.id].drink}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {mockProgress[s.id].aiFeedback ? (
                        <div className="space-y-1 min-w-[200px]">
                          <div className="text-[9px] text-blue-400 uppercase font-bold">Pronunciation</div>
                          <p className="text-[10px] text-slate-300 line-clamp-1">{mockProgress[s.id].aiFeedback?.pronunciation}</p>
                          <div className="text-[9px] text-purple-400 uppercase font-bold">Grammar</div>
                          <p className="text-[10px] text-slate-300 line-clamp-1">{mockProgress[s.id].aiFeedback?.grammar}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">No analysis yet</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <textarea 
                        placeholder="Feedback..."
                        value={state.teacherFeedback[s.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState(prev => ({
                            ...prev,
                            teacherFeedback: {
                              ...prev.teacherFeedback,
                              [s.id]: val
                            }
                          }));
                        }}
                        className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full min-w-[150px] h-12 resize-none"
                      />
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => setState(prev => ({ ...prev, view: 'game', student: s, level: mockProgress[s.id].level as Level }))}
                        className="p-2 glass rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <MusicIndicator />
      </div>
    </div>
    );
  }

  if (state.view === 'admin') {
    return (
      <AdminPanel 
        onBack={() => setState(prev => ({ ...prev, view: 'selection' }))}
        onUpdate={updateStudentProgress}
      />
    );
  }

  if (state.view === 'selection' || !state.student) {
    const selectedStudent = STUDENTS.find(s => s.id === selectedId);

    return (
      <div 
        onClick={handleGlobalClick}
        className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden"
      >
        <AnimatePresence>
          {!hasStarted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-950 flex flex-col justify-center items-center p-6 text-center"
            >
              <div className="max-w-md space-y-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-32 h-32 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/40"
                >
                  <Sparkles className="w-16 h-16 text-white" />
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white">ADVENTURE POWER-UP</h1>
                  <p className="text-slate-400 font-medium">Get ready for a magical English adventure! 🌟</p>
                </div>
                <button
                  onClick={handleStartApp}
                  className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current" />
                  START ADVENTURE
                </button>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Click to unlock magical sounds & music</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-[3rem] max-w-md w-full text-center relative"
        >
          {/* Dashboard Access for Penny */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'teacher' }))}
              className="p-2 glass rounded-xl hover:bg-blue-500/20 text-blue-400 transition-colors"
              title="Teacher Dashboard"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
            <button 
              onClick={handleAdminLogin}
              className="p-2 glass rounded-xl hover:bg-yellow-500/20 text-yellow-400 transition-colors"
              title="Teacher Backend"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>

          <h1 className="font-bungee text-4xl mb-1 text-blue-400 tracking-wider">Adventure Power-Up</h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-8">Created by Teacher Penny</p>
          
          <div className="flex flex-col gap-6">
            <div className="relative">
              <select 
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full p-4 bg-black/30 border border-white/20 rounded-2xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer"
              >
                <option value="" disabled>Select your name...</option>
                <optgroup label="BOYS 👦">
                  {STUDENTS.filter(s => s.gender === 'boy').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
                <optgroup label="GIRLS 👧">
                  {STUDENTS.filter(s => s.gender === 'girl').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none rotate-90" />
            </div>

            <AnimatePresence mode="wait">
              {selectedStudent ? (
                <motion.div 
                  key={selectedStudent.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-4 p-6 glass-dark rounded-[2rem]"
                >
                  <img 
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedStudent.id}&backgroundColor=b6e3f4`} 
                    alt={selectedStudent.name}
                    className="w-32 h-32 rounded-full bg-white/10 p-2 shadow-2xl shadow-blue-500/20 border-4 border-blue-500/30"
                  />
                  <div>
                    <h2 className="font-bungee text-2xl text-blue-400">{selectedStudent.title}</h2>
                    <p className="text-sm text-slate-400 uppercase tracking-widest">{selectedStudent.topic}</p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => {
                        const progress = mockProgress[selectedStudent.id];
                        const adventureVal = parseFloat(progress.adventure);
                        const drinkVal = parseFloat(progress.drink);
                        setState(prev => ({ 
                          ...prev, 
                          student: selectedStudent, 
                          view: 'map',
                          level: progress.level as Level,
                          currentPart: progress.part,
                          adventureProgress: isNaN(adventureVal) ? 0 : adventureVal,
                          drinkProgress: isNaN(drinkVal) ? 0 : drinkVal,
                          unlockedParts: progress.unlockedParts,
                          unlockedLevels: progress.unlockedLevels,
                          completedLevels: progress.completedLevels,
                          pendingLevels: progress.pendingLevels || []
                        }));
                        setShowRules(true);
                      }}
                      className="flex-1 py-4 bg-blue-600 rounded-2xl font-bold text-xl hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                    >
                      SUMMON HERO
                    </button>
                    <button 
                      onClick={() => {
                        setState(prev => ({ ...prev, student: selectedStudent }));
                        setShowHistory(true);
                      }}
                      className="p-4 glass rounded-2xl hover:bg-white/20 text-blue-400 transition-colors"
                      title="View Progress"
                    >
                      <LineChartIcon className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-3 gap-2 opacity-30">
                  {STUDENTS.slice(0, 6).map(s => (
                    <img 
                      key={s.id}
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${s.id}&backgroundColor=b6e3f4`} 
                      alt={s.name}
                      className="w-full aspect-square rounded-xl bg-white/5 p-1"
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <MusicIndicator />
      </div>
    </div>
    );
  }

  if (state.view === 'map' && state.student) {
    return (
      <div 
        onClick={handleGlobalClick}
        className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden relative"
      >
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6"
              >
                <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-bungee text-2xl text-blue-400">Game Rules</h2>
                  <div className="text-left space-y-4 text-slate-300 text-sm">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold shrink-0">1</div>
                      <p>Listen to the script by clicking the speaker icon.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold shrink-0">2</div>
                      <p>Click the microphone and speak the script clearly.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold shrink-0">3</div>
                      <p>Earn 90+ points to unlock the next level and get rewards!</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRules(false);
                    const progress = mockProgress[state.student!.id];
                    const adventureVal = parseFloat(progress.adventure);
                    const drinkVal = parseFloat(progress.drink);
                    setState(prev => ({ 
                      ...prev, 
                      level: progress.level as Level,
                      currentPart: progress.part,
                      adventureProgress: isNaN(adventureVal) ? 0 : adventureVal,
                      drinkProgress: isNaN(drinkVal) ? 0 : drinkVal,
                      unlockedParts: progress.unlockedParts,
                      unlockedLevels: progress.unlockedLevels,
                      completedLevels: progress.completedLevels,
                      pendingLevels: progress.pendingLevels || []
                    }));
                  }}
                  className="w-full py-4 bg-blue-600 rounded-2xl font-bold text-lg text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-transform"
                >
                  LET'S GO!
                </button>
              </motion.div>
            </motion.div>
          )}

          {!hasStarted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-950 flex flex-col justify-center items-center p-6 text-center"
            >
              <div className="max-w-md space-y-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-32 h-32 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/40"
                >
                  <Sparkles className="w-16 h-16 text-white" />
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white">ADVENTURE POWER-UP</h1>
                  <p className="text-slate-400 font-medium">Get ready for a magical English adventure! 🌟</p>
                </div>
                <button
                  onClick={handleStartApp}
                  className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current" />
                  START ADVENTURE
                </button>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Click to unlock magical sounds & music</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="min-h-screen p-4 md:p-8 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'selection', student: null }))}
              className="relative group"
            >
              <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${state.student.id}&backgroundColor=b6e3f4`} 
                alt="Avatar"
                className="w-16 h-16 rounded-full bg-white/10 border-2 border-blue-500/50 group-hover:scale-110 transition-transform"
              />
              <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-slate-950">
                <RotateCcw className="w-3 h-3 text-white" />
              </div>
            </button>
            <div>
              <h2 className="font-bungee text-2xl text-blue-400 leading-none">{state.student.title}</h2>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Hero Mission: {state.student.topic}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="glass p-3 rounded-2xl flex items-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <Sparkles className={`w-6 h-6 transition-all duration-500 ${state.adventureProgress >= 100 ? 'text-amber-400 animate-bounce' : 'text-amber-400/20'}`} />
                <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
                  <motion.circle 
                    cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" 
                    strokeDasharray="88" 
                    initial={{ strokeDashoffset: 88 }}
                    animate={{ strokeDashoffset: 88 - (88 * state.adventureProgress) / 100 }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    className="text-amber-400" strokeLinecap="round" 
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bungee text-xl leading-none">{Math.floor(state.adventureProgress)}%</span>
                <span className="text-[8px] uppercase tracking-tighter text-slate-500">Adventure XP</span>
              </div>
            </div>

            {/* Drink Progress */}
            <div className="glass p-3 rounded-2xl flex items-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <CupSoda className={`w-6 h-6 transition-all duration-500 ${state.drinkProgress >= 100 ? 'text-purple-400 animate-bounce' : 'text-purple-400/20'}`} />
                <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
                  <motion.circle 
                    cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" 
                    strokeDasharray="88" 
                    initial={{ strokeDashoffset: 88 }}
                    animate={{ strokeDashoffset: 88 - (88 * state.drinkProgress) / 100 }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    className="text-purple-400" strokeLinecap="round" 
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bungee text-xl leading-none">{Math.floor(state.drinkProgress)}%</span>
                <span className="text-[8px] uppercase tracking-tighter text-slate-500">Drink Bonus</span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowHistory(true)}
              className="p-4 glass rounded-2xl hover:bg-blue-500/20 text-blue-400 transition-colors"
            >
              <LineChartIcon className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Map Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto w-full relative">
          {/* Connecting Path */}
          <div className="absolute top-1/2 left-0 w-full h-2 bg-blue-600/20 -translate-y-1/2 hidden lg:block z-0" />
          
          {[0, 1, 2, 3].map((partIdx) => {
            // Force all parts to be unlocked for everyone
            const isUnlocked = true;
            const maxLevel = partIdx === 0 ? 4 : Math.max(1, state.unlockedLevels[partIdx] || 1);
            
            return (
              <motion.div 
                key={partIdx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: partIdx * 0.1 }}
                className="relative flex flex-col rounded-[2.5rem] p-8 border-4 transition-all z-10 border-blue-500/50 bg-slate-900/80 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
              >
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="font-bungee text-2xl text-blue-400">PART {partIdx + 1}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Adventure Path</p>
                  </div>
                  {isUnlocked && (
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  {[1, 2, 3].map((lv) => {
                    const isLvUnlocked = lv <= maxLevel;
                    const isCompleted = state.completedLevels.includes(`${partIdx}-${lv}`);
                    
                    return (
                      <button
                        key={lv}
                        disabled={!isUnlocked || !isLvUnlocked}
                        onClick={() => setState(prev => ({ ...prev, view: 'game', currentPart: partIdx, level: lv as Level }))}
                        className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${
                          isCompleted 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : isLvUnlocked && isUnlocked
                              ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 border border-blue-500/20'
                              : 'bg-black/20 text-slate-600 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isCompleted ? 'bg-green-500 text-white' : 'bg-blue-900/50 text-blue-400'
                          }`}>
                            {lv}
                          </div>
                          <span className="font-bold text-sm">LEVEL {lv}</span>
                        </div>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : (isLvUnlocked && isUnlocked ? <Play className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
                      </button>
                    );
                  })}

                  {/* Level 4: Bonus Teacher Task */}
                  {(() => {
                    const levelKey = `${partIdx}-4`;
                    const isCompleted = state.completedLevels.includes(levelKey);
                    const isPending = state.pendingLevels.includes(levelKey);
                    
                    return (
                      <button
                        disabled={!isUnlocked}
                        onClick={() => setState(prev => ({ ...prev, view: 'task', currentPart: partIdx, level: 4 }))}
                        className={`w-full p-4 mt-2 rounded-2xl flex items-center justify-between transition-all border-2 border-dashed ${
                          isCompleted
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : isPending
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : isUnlocked
                                ? 'bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-black/20 text-slate-600 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-blue-600' : isPending ? 'bg-blue-500' : 'bg-purple-600'}`}>
                            {isPending ? <RotateCcw className="w-4 h-4 text-white animate-spin-slow" /> : <CupSoda className="w-5 h-5 text-white" />}
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-sm block">BONUS TASK</span>
                            <span className="text-[8px] uppercase tracking-tighter opacity-70">
                              {isCompleted ? 'MISSION COMPLETE' : isPending ? 'WAITING FOR REVIEW' : 'TEACHER REVIEW'}
                            </span>
                          </div>
                        </div>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isPending ? <AlertCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            );
          })}
        </div>
        <MusicIndicator />
      </div>
    </div>
    );
  }

  return (
    <div 
      onClick={handleGlobalClick}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden"
    >
      <AnimatePresence>
        {!hasStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col justify-center items-center p-6 text-center"
          >
            <div className="max-w-md space-y-8">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/40"
              >
                <Sparkles className="w-16 h-16 text-white" />
              </motion.div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tighter text-white">ADVENTURE POWER-UP</h1>
                <p className="text-slate-400 font-medium">Get ready for a magical English adventure! 🌟</p>
              </div>
              <button
                onClick={handleStartApp}
                className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" />
                START ADVENTURE
              </button>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">Click to unlock magical sounds & music</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen p-4 md:p-8 flex flex-col">
        {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass p-6 md:p-10 rounded-[3rem] max-w-4xl w-full h-[80vh] flex flex-col relative overflow-hidden"
            >
              <button 
                onClick={() => setShowHistory(false)}
                className="absolute top-6 right-6 p-3 glass rounded-full hover:bg-white/20 z-10 shadow-lg"
                title="Back"
              >
                <ArrowLeft className="w-6 h-6 text-blue-400" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-blue-600/20 rounded-2xl">
                  <LineChartIcon className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bungee text-3xl text-blue-400">PROGRESS TREND</h2>
                  <p className="text-slate-400 uppercase tracking-widest text-sm">Hero: {state.student?.name}</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 mb-8">
                {history[state.student?.id || '']?.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history[state.student?.id || '']}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickFormatter={(val) => val.split(' ')[0]} 
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        domain={[0, 100]} 
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#1e293b', 
                          borderRadius: '1rem',
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: '#60a5fa' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3b82f6" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 glass-dark rounded-3xl">
                    <History className="w-12 h-12 opacity-20" />
                    <p className="font-bold uppercase tracking-widest">Not enough data yet!</p>
                    <p className="text-xs">Practice more to see your progress trend.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {[...(history[state.student?.id || ''] || [])].reverse().map((attempt, i) => (
                  <div key={i} className="glass-dark p-4 rounded-2xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        attempt.score >= 90 ? 'bg-green-500/20 text-green-400' : 
                        attempt.score >= 75 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {attempt.score}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-300">LEVEL {attempt.level}</div>
                        <div className="text-[10px] text-slate-500">{attempt.date}</div>
                      </div>
                    </div>
                    {attempt.score >= 90 && <Trophy className="w-4 h-4 text-yellow-500" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, view: 'map' }))}
            className="relative group"
          >
            <img 
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${state.student.id}&backgroundColor=b6e3f4`} 
              alt="Avatar"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-blue-500/50 group-hover:scale-110 transition-transform"
            />
            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border border-slate-950">
              <MapIcon className="w-3 h-3 text-white" />
            </div>
          </button>
          <div>
            <h2 className="font-bungee text-xl text-blue-400 leading-none">{state.student.title}</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{state.student.topic}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
            className={`p-3 glass rounded-xl transition-all ${state.isMuted ? 'text-slate-500' : 'text-blue-400'}`}
            title={state.isMuted ? "Unmute Ambience" : "Mute Ambience"}
          >
            {state.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="glass px-3 py-2 rounded-xl flex items-center gap-2">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <Sparkles className={`w-4 h-4 ${state.adventureProgress >= 100 ? 'text-amber-400' : 'text-amber-400/20'}`} />
              <svg className="absolute inset-0 w-6 h-6 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="88" strokeDashoffset={88 - (88 * state.adventureProgress) / 100} className="text-amber-400" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bungee text-sm">{Math.floor(state.adventureProgress)}%</span>
          </div>

          <div className="glass px-3 py-2 rounded-xl flex items-center gap-2">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <CupSoda className={`w-4 h-4 ${state.drinkProgress >= 100 ? 'text-purple-400' : 'text-purple-400/20'}`} />
              <svg className="absolute inset-0 w-6 h-6 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="88" strokeDashoffset={88 - (88 * state.drinkProgress) / 100} className="text-purple-400" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bungee text-sm">{Math.floor(state.drinkProgress)}%</span>
          </div>

          <button 
            onClick={() => setShowHistory(true)}
            className="p-3 glass rounded-xl hover:bg-blue-500/20 text-blue-400 transition-colors"
          >
            <LineChartIcon className="w-5 h-5" />
          </button>

          {/* Hidden Teacher Pass */}
          <button 
            onClick={teacherPass}
            className="opacity-0 hover:opacity-10 transition-opacity p-2"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </header>

      {state.view === 'task' ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-8 md:p-12 rounded-[3rem] w-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CupSoda className="w-32 h-32 text-purple-400" />
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-purple-600 rounded-2xl shadow-lg shadow-purple-500/40">
                <Video className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="font-bungee text-3xl text-purple-400">BONUS MISSION</h2>
                <p className="text-slate-400 uppercase tracking-widest text-sm">Part {state.currentPart + 1} Teacher Task</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 shrink-0">1</div>
                  <div>
                    <p className="text-slate-300">Watch Tr. Lee's Loom video for Part {state.currentPart + 1}.</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">看完外師錄製的影片</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 shrink-0">2</div>
                  <div>
                    <p className="text-slate-300">Find 3 actions to imitate and highlight them on your paper script.</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">在紙本稿找出3個要模仿的動作 (用螢光筆劃線)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 shrink-0">3</div>
                  <div>
                    <p className="text-slate-300">Record a video of yourself performing Part {state.currentPart + 1} without the script.</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">不看稿子演講一次並錄製影片</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 shrink-0">4</div>
                  <div>
                    <p className="text-slate-300">Upload your video to the Drive folder for teacher review!</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">錄影傳到DRIVE給老師審核</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {state.student?.loomUrl && (
                  <a 
                    href={state.student.loomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-6 glass-dark rounded-3xl hover:bg-white/10 transition-all group border-2 border-purple-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-600/20 rounded-xl">
                        <Video className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-white block">Tr. Lee's Loom</span>
                        <span className="text-xs text-slate-500">Watch Demo Video</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}

                <a 
                  href="https://drive.google.com/drive/u/0/folders/1ObZu4WBWPxO8X31qTexNcelYsGVaUO5r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-6 glass-dark rounded-3xl hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/20 rounded-xl">
                      <ExternalLink className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-white block">Teacher's Drive</span>
                      <span className="text-xs text-slate-500">Upload Video Here</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
                </a>

                <button 
                  disabled={state.pendingLevels.includes(`${state.currentPart}-4`) || state.completedLevels.includes(`${state.currentPart}-4`)}
                  onClick={() => {
                    const levelKey = `${state.currentPart}-4`;
                    const newPending = Array.from(new Set([...state.pendingLevels, levelKey]));
                    setState(prev => ({ 
                      ...prev, 
                      pendingLevels: newPending
                    }));

                    setMockProgress(prev => ({
                      ...prev,
                      [state.student!.id]: {
                        ...prev[state.student!.id],
                        pendingLevels: newPending,
                        task: 'Reviewing'
                      }
                    }));

                    setFeedback("Video submitted for review! 🕒");
                    setState(prev => ({ ...prev, view: 'map' }));
                  }}
                  className={`flex items-center justify-center gap-3 p-6 rounded-3xl font-bold text-xl transition-all shadow-lg ${
                    state.pendingLevels.includes(`${state.currentPart}-4`) || state.completedLevels.includes(`${state.currentPart}-4`)
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                  {state.pendingLevels.includes(`${state.currentPart}-4`) ? 'SUBMITTED' : 'SUBMIT FOR REVIEW'}
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setState(prev => ({ ...prev, view: 'map' }))}
                className="text-slate-500 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
              >
                Back to Map
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full gap-8">
          
          {/* Level Indicator */}
          <div className="flex gap-4 w-full justify-center">
            {[1, 2, 3].map(l => (
              <div 
                key={l}
                className={`px-6 py-2 rounded-full font-bungee text-sm transition-all ${
                  state.level === l 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' 
                    : state.completedLevels.includes(`${state.currentPart}-${l}`)
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-800/50 text-slate-500'
                }`}
              >
                LEVEL {l}
              </div>
            ))}
          </div>

        {/* Script Card */}
        <motion.div 
          key={`${state.level}-${state.currentPart}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-dark p-8 md:p-12 rounded-[2.5rem] w-full relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
          
          <div className="flex justify-between items-start mb-6">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Part {state.currentPart + 1} of 4</span>
            <div className="flex gap-2">
              {state.student?.loomUrl && (
                <a 
                  href={state.student.loomUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 glass rounded-xl hover:bg-purple-500/20 text-purple-400 transition-colors flex items-center gap-2"
                  title="Watch Tr. Lee's Demo"
                >
                  <Video className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Tr. Lee's Demo</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              )}
              <button 
                onClick={() => speak(state.student!.scripts[state.currentPart])}
                disabled={isLoadingAudio}
                className={`p-2 glass rounded-xl transition-colors ${isSpeaking ? 'bg-red-500/20 text-red-400' : isLoadingAudio ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500/20 text-blue-400'}`}
                title={isSpeaking ? "Stop Listening" : isLoadingAudio ? "Loading Voice..." : "Listen to AI Demo"}
              >
                {isSpeaking ? (
                  <div className="w-6 h-6 flex items-center justify-center font-bold">■</div>
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>

              {/* Pizza Teacher Loading Overlay */}
              <AnimatePresence>
                {isLoadingAudio && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Speech Bubble */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6 relative bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-orange-400"
                      >
                        <p className="text-orange-600 font-bold text-lg whitespace-nowrap">
                          Have you memorized your speech? 🍕✨
                        </p>
                        <p className="text-slate-400 text-xs text-center mt-1">
                          (Remember to memorize before playing!)
                        </p>
                        {/* Triangle pointer */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-orange-400" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white" />
                      </motion.div>

                      {/* Dancing Pizza */}
                      <div className="text-8xl pizza-dance drop-shadow-2xl">
                        🍕
                      </div>
                      
                      <div className="mt-8 flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                        </div>
                        <span className="text-white font-medium tracking-widest uppercase text-xs">AI Generating Voice...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="text-2xl md:text-4xl font-medium leading-relaxed text-center mb-8">
            {getDisplayScript(state.student.scripts[state.currentPart], state.level, showResult ? lastMissedWords : [])}
          </div>

          {/* Detailed Feedback Section */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full max-w-2xl mx-auto mb-8 space-y-4"
              >
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${state.score >= 90 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {state.score >= 90 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <h3 className="text-lg font-bold text-white">Analysis Report</h3>
                  </div>

                  <div className="space-y-4">
                    {lastMissedWords.length > 0 ? (
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Words to focus on:</p>
                        <div className="flex flex-wrap gap-2">
                          {lastMissedWords.map((word, i) => (
                            <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-sm font-medium">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-green-400 text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Perfect pronunciation! All words detected.
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-700/50">
                      <p className="text-slate-400 text-sm mb-2">What I heard:</p>
                      <p className="text-slate-300 italic text-sm leading-relaxed">
                        "{lastTranscript || '(Silence)'}"
                      </p>
                    </div>

                    {/* Teacher Feedback Section */}
                    {state.teacherFeedback[state.student!.id] && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-2">Teacher Penny's Feedback:</p>
                        <p className="text-white text-sm italic">"{state.teacherFeedback[state.student!.id]}"</p>
                      </div>
                    )}

                    {/* AI Feedback Section */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">AI Analysis Feedback:</p>
                        </div>
                        {state.isAnalyzingAI && (
                          <div className="flex items-center gap-2 text-[10px] text-blue-400">
                            <span className="pizza-dance text-sm">🍕</span>
                            Analyzing...
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-slate-400 text-[10px] uppercase font-bold">Pronunciation</p>
                          <p className="text-white text-xs leading-relaxed">
                            {state.aiFeedback[state.student!.id]?.pronunciation || (state.isAnalyzingAI ? "Waiting for AI..." : "N/A")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 text-[10px] uppercase font-bold">Grammar</p>
                          <p className="text-white text-xs leading-relaxed">
                            {state.aiFeedback[state.student!.id]?.grammar || (state.isAnalyzingAI ? "Waiting for AI..." : "N/A")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 text-[10px] uppercase font-bold">Intonation</p>
                          <p className="text-white text-xs leading-relaxed">
                            {state.aiFeedback[state.student!.id]?.intonation || (state.isAnalyzingAI ? "Waiting for AI..." : "N/A")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Scoring Criteria Section */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Scoring Criteria:</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-white font-medium">Pass Threshold</p>
                          <p className="text-green-400 font-bold text-lg">90+ Points</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-white font-medium">Detection Method</p>
                          <p className="text-slate-300">AI Word Matching</p>
                        </div>
                      </div>
                      <p className="text-slate-500 text-[10px] mt-2 leading-tight">
                        * Errors are detected when words are missed, mispronounced, or skipped. Ending sounds (t, d, s, z) are critical for AI detection!
                      </p>
                    </div>

                    {/* Intonation/Emphasis Tips */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                      <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Teacher Penny's Tips:</p>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">▲</span>
                          <span>Remember to put more energy into the words with the red triangle!</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">↑</span>
                          <span>Make your voice go up at the end of words with the blue arrow.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcript Box */}
          <AnimatePresence>
            {state.isRecording && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-center"
              >
                <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-1">AI Listening...</div>
                <p className="text-blue-200 italic">"{state.transcript || '...'}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recording Controls */}
        <div 
          className="flex flex-col items-center gap-6 cursor-pointer group" 
          onClick={toggleRecording}
        >
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Dynamic Frequency Rings */}
            {state.isRecording && state.frequencyData.map((val, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-blue-400/20"
                style={{
                  width: `${60 + i * 8}%`,
                  height: `${60 + i * 8}%`,
                  opacity: Math.max(0.05, val / 255),
                  borderColor: i % 2 === 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(168, 85, 247, 0.4)'
                }}
                animate={{
                  scale: 1 + (val / 255) * 0.4,
                  borderWidth: 1 + (val / 255) * 4,
                  rotate: i % 2 === 0 ? (val / 255) * 15 : -(val / 255) * 15
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            ))}

            {/* Core Energy Ball */}
            <motion.div 
              className={`energy-ball flex items-center justify-center relative z-10 ${state.maxVol > 15 ? 'loud' : ''}`}
              animate={state.isRecording ? { 
                scale: 1 + (state.frequencyData[0] / 255) * 0.4,
                filter: `brightness(${1 + (state.maxVol / 255)}) hue-rotate(${(state.maxVol / 255) * 45}deg)`,
                boxShadow: `0 0 ${20 + (state.maxVol / 255) * 60}px rgba(59, 130, 246, 0.6)`
              } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              {state.isRecording ? <Mic className="w-12 h-12 text-white" /> : <MicOff className="w-12 h-12 text-white/50" />}
            </motion.div>
            
            {/* Pulsing Outer Ring */}
            {state.isRecording && (
              <motion.div 
                className="absolute -inset-4 rounded-full border-2 border-blue-400/30 z-0"
                animate={{ 
                  scale: [1, 1.5 + (state.maxVol / 255)], 
                  opacity: [1, 0] 
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}

            {/* Frequency Bars (Radial) */}
            {state.isRecording && state.frequencyData.map((val, i) => (
              <motion.div
                key={`bar-${i}`}
                className="absolute w-1 rounded-full origin-bottom"
                style={{
                  height: `${10 + (val / 255) * 40}px`,
                  bottom: '50%',
                  left: '50%',
                  transform: `translateX(-50%) rotate(${i * (360 / state.frequencyData.length)}deg) translateY(-80px)`,
                  background: `linear-gradient(to top, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.8))`
                }}
                animate={{
                  height: `${15 + (val / 255) * 80}px`,
                  opacity: 0.2 + (val / 255) * 0.8,
                  scaleX: 1 + (val / 255) * 2
                }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              />
            ))}
          </div>
          
          <p className="font-bungee text-xl tracking-widest text-slate-400 group-hover:text-blue-400 transition-colors">
            {isInitializing ? 'INITIALIZING...' : (state.isRecording ? 'TAP TO FINISH' : 'TAP TO RECORD')}
          </p>
        </div>
      </div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass p-8 rounded-[3rem] max-w-sm w-full text-center relative"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/50">
                <Trophy className="w-12 h-12 text-white" />
              </div>

              <div className="mt-12 mb-6">
                <div className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Your Score</div>
                <div className="text-7xl font-bungee text-blue-400">{state.score}</div>
              </div>

              <div className={`p-4 rounded-2xl mb-4 flex items-center gap-3 justify-center ${state.score >= 90 ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {state.score >= 90 ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                <span className="font-bold">{feedback}</span>
              </div>

              {state.score >= 90 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex items-center justify-center gap-2 font-bold mb-6 p-3 rounded-2xl border ${
                    state.level === 4 
                      ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' 
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  {state.level === 4 ? (
                    <CupSoda className="w-6 h-6 animate-bounce" />
                  ) : (
                    <Sparkles className="w-6 h-6 animate-bounce" />
                  )}
                  <span>{state.level === 4 ? "DRINK EARNED!" : "PART EARNED!"}</span>
                </motion.div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowResult(false)}
                  className="flex-1 px-6 py-4 glass-dark rounded-2xl font-bold hover:bg-white/10 transition-colors"
                >
                  RETRY
                </button>
                {state.score >= 90 && (
                  <button 
                    onClick={handleNext}
                    className="flex-1 px-6 py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30"
                  >
                    NEXT
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 flex justify-between items-center text-slate-500 text-[10px] uppercase tracking-[0.2em]">
        <div>Created by Teacher Penny</div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          Powered by Adventure Power-Up Engine
        </div>
      </footer>
      <MusicIndicator />
    </div>
  );
}

// --- Admin Panel Component ---
interface AdminPanelProps {
  onBack: () => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
}

function AdminPanel({ onBack, onUpdate }: AdminPanelProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const loadStudentData = async (id: string) => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'progress', id));
      if (snap.exists()) {
        setEditData(snap.data());
      } else {
        setEditData({
          adventureProgress: 0,
          drinkProgress: 0,
          unlockedParts: 1,
          unlockedLevels: { 0: 1, 1: 1, 2: 1, 3: 1 },
          completedLevels: []
        });
      }
    } catch (err) {
      alert("Failed to load data. Check network.");
    }
    setLoading(false);
  };

  const toggleLevel = (part: number, level: number) => {
    const key = `${part}-${level}`;
    const completed = editData.completedLevels || [];
    const newCompleted = completed.includes(key) 
      ? completed.filter((k: string) => k !== key)
      : [...completed, key];
    
    setEditData({ ...editData, completedLevels: newCompleted });
  };

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);

  const handleBulkUnlock = async () => {
    setBulkLoading(true);
    setBulkSuccess(false);
    try {
      const batch = STUDENTS.map(async (s) => {
        const docRef = doc(db, 'progress', s.id);
        const snap = await getDoc(docRef);
        const currentData = snap.exists() ? snap.data() : {
          adventureProgress: 0,
          drinkProgress: 0,
          unlockedParts: 1,
          unlockedLevels: { 0: 1, 1: 1, 2: 1, 3: 1 },
          completedLevels: []
        };
        
        const newCompletedLevels = Array.from(new Set([
          ...(currentData.completedLevels || []),
          '0-1', '0-2', '0-3'
        ]));
        
        const adventureTasks = newCompletedLevels.filter(cl => !cl.endsWith('-4')).length;
        const newAdventureProgress = (Math.min(adventureTasks, 12) / 12) * 100;

        const updates = {
          ...currentData,
          completedLevels: newCompletedLevels,
          adventureProgress: newAdventureProgress,
          unlockedParts: 4, // Unlock all parts (1-4)
          unlockedLevels: {
            ...(currentData.unlockedLevels || {}),
            0: 4, // Part 1: All levels
            1: 1, // Part 2: Level 1
            2: 1, // Part 3: Level 1
            3: 1  // Part 4: Level 1
          }
        };
        return setDoc(docRef, updates);
      });
      await Promise.all(batch);
      setBulkSuccess(true);
      setTimeout(() => setBulkSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setBulkLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-slate-900 p-6 text-white overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Lock className="text-yellow-500" /> Teacher Backend
          </h1>
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-blue-400">Select Student</h2>
              <button 
                onClick={handleBulkUnlock}
                disabled={bulkLoading}
                className={`text-[10px] px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${
                  bulkSuccess 
                    ? 'bg-green-600/20 text-green-400 border-green-500/30' 
                    : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border-blue-500/30'
                }`}
              >
                {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (bulkSuccess ? <CheckCircle2 className="w-3 h-3" /> : null)}
                {bulkLoading ? 'Updating...' : (bulkSuccess ? 'Done!' : 'Bulk Unlock All Parts (Lv 1)')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
              {STUDENTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    loadStudentData(s.id);
                  }}
                  className={`p-3 rounded-xl text-left transition-all ${selectedStudentId === s.id ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <p className="font-bold">{s.name}</p>
                  <p className="text-[10px] opacity-50 uppercase">{s.topic}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-6 rounded-3xl space-y-6">
            <h2 className="text-xl font-bold text-purple-400">Adjust Progress</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin w-12 h-12" /></div>
            ) : editData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Adventure %</label>
                    <input 
                      type="number" 
                      value={editData.adventureProgress} 
                      onChange={e => setEditData({...editData, adventureProgress: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Energy Drink %</label>
                    <input 
                      type="number" 
                      value={editData.drinkProgress} 
                      onChange={e => setEditData({...editData, drinkProgress: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Unlocked Parts (1-4)</label>
                  <input 
                    type="number" 
                    min="1" max="4"
                    value={editData.unlockedParts} 
                    onChange={e => setEditData({...editData, unlockedParts: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-2">Completed Stars (Click to toggle)</label>
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map(part => (
                      <div key={part} className="flex items-center gap-2">
                        <span className="text-[10px] w-12 opacity-50 uppercase">Part {part + 1}</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].map(lvl => {
                            const isDone = (editData.completedLevels || []).includes(`${part}-${lvl}`);
                            return (
                              <button
                                key={lvl}
                                onClick={() => toggleLevel(part, lvl)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isDone ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-500'}`}
                              >
                                {lvl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4">
                  <button 
                    onClick={() => onUpdate(selectedStudentId, editData)}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-bold shadow-lg shadow-green-600/30 transition-all"
                  >
                    Save Changes to Cloud
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">Select a student to begin editing</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
