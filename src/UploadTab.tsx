import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Film, Music, Tag, AlertCircle, Play, Sparkles, Check, Trash2, Pause } from 'lucide-react';
import { uploadVideo } from '../storageService';

interface UploadTabProps {
  onUploadSuccess: () => void;
}

export default function UploadTab({ onUploadSuccess }: UploadTabProps) {
  const [activeMode, setActiveMode] = useState<'file' | 'camera'>('file');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [music, setMusic] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Custom audio file upload states
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [customAudioName, setCustomAudioName] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Camera recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'allowed' | 'denied'>('idle');

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  // Clean up stream & audio on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Start Camera Stream for preview
  const startCamera = async () => {
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 640 },
        audio: true,
      });
      setCameraStream(stream);
      setCameraStatus('allowed');
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;
        cameraPreviewRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraStatus('denied');
      setErrorMessage("Could not access camera/microphone. Please upload an existing file instead!");
    }
  };

  const handleModeChange = (mode: 'file' | 'camera') => {
    setActiveMode(mode);
    setVideoUrl('');
    setRecordedChunks([]);
    setErrorMessage('');
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCameraStream();
    }
  };

  // Handle Video File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid short video file (MP4, WebM, etc.)');
      return;
    }

    setErrorMessage('');
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
  };

  // Recording Controls
  const startRecording = () => {
    if (!cameraStream) return;
    setRecordedChunks([]);
    setRecordingDuration(0);
    setIsRecording(true);

    const recorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    recorder.onstop = () => {
      setIsRecording(false);
    };

    recorder.start(10); // collect data chunks every 10ms

    // Start duration timer
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => {
        if (prev >= 15) { // Auto-stop at 15 seconds (ideal short video length)
          stopRecording();
          return 15;
        }
        return prev + 1;
      });
    }, 1000) as unknown as number;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Process recorded pieces to videoURL
  useEffect(() => {
    if (recordedChunks.length > 0 && !isRecording) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const objectUrl = URL.createObjectURL(blob);
      setVideoUrl(objectUrl);
      stopCameraStream();
    }
  }, [recordedChunks, isRecording]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
      setErrorMessage('Please select a valid audio file (MP3 format recommended).');
      return;
    }

    setErrorMessage('');
    
    // Stop any existing playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }

    const objectUrl = URL.createObjectURL(file);
    const cleanedName = file.name.replace(/\.[^/.]+$/, ""); // remove extension

    setCustomAudioUrl(objectUrl);
    setCustomAudioName(cleanedName);
    setMusic(cleanedName); // automatically set current background track text

    // Initialize new audio object for preview
    const audio = new Audio(objectUrl);
    audio.onended = () => setIsPlayingAudio(false);
    audioRef.current = audio;
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlayingAudio(true))
        .catch((err) => {
          console.error("Audio playback failed:", err);
          setErrorMessage("Failed to play preview audio. Make sure your browser permissions allow it.");
        });
    }
  };

  const removeCustomAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCustomAudioUrl('');
    setCustomAudioName('');
    setIsPlayingAudio(false);
    if (music === customAudioName) {
      setMusic(''); // revert to original sound
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) {
      setErrorMessage('Please upload or record a short video first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }

    try {
      // Process tags
      const parsedTags = tagsInput
        .split(',')
        .map((tag) => tag.trim().toLowerCase().replace('#', ''))
        .filter((tag) => tag.length > 0);

      await uploadVideo(videoUrl, caption, music, parsedTags);
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setVideoUrl('');
        setCaption('');
        setMusic('');
        setTagsInput('');
        setCustomAudioUrl('');
        setCustomAudioName('');
        onUploadSuccess(); // Switch to feed to see the published video
      }, 1500);
    } catch (err: any) {
      setErrorMessage('Failed to publish video. Please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearCurrentVideo = () => {
    setVideoUrl('');
    setRecordedChunks([]);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col text-white">
      {/* Sticky Top Header */}
      <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold tracking-wider flex items-center gap-1.5">
          <Film size={16} className="text-indigo-400" />
          Create Reel
        </h2>
        {/* Tab Selection */}
        <div className="flex bg-neutral-900 rounded-lg p-0.5">
          <button
            onClick={() => handleModeChange('file')}
            className={`text-[10px] font-bold py-1.5 px-3 rounded-md transition ${
              activeMode === 'file' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => handleModeChange('camera')}
            className={`text-[10px] font-bold py-1.5 px-3 rounded-md transition ${
              activeMode === 'camera' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Camera Rec
          </button>
        </div>
      </div>

      {/* Main Form & Preview panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-16">
        {isSuccess ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-3">
            <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center animate-bounce">
              <Check size={30} />
            </div>
            <h3 className="text-sm font-semibold text-white">Published Successfully!</h3>
            <p className="text-xs text-neutral-400 max-w-[200px]">
              Your reel has been added to the feed. Redirecting you home...
            </p>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="space-y-4">
            
            {/* Visual Error messages */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-red-400 text-[11px] flex items-center gap-1.5 leading-snug">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Video Canvas Box / Camera Stream */}
            <div className="aspect-[9/16] max-h-[290px] mx-auto bg-neutral-900 rounded-2xl overflow-hidden relative border border-neutral-800 flex items-center justify-center">
              
              {videoUrl ? (
                /* Saved Video Preview */
                <div className="w-full h-full relative">
                  <video
                    ref={videoPreviewRef}
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={clearCurrentVideo}
                    className="absolute top-2.5 right-2.5 bg-black/60 p-2 rounded-full text-red-400 hover:text-red-500 hover:bg-black/80 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : activeMode === 'camera' ? (
                /* Live Camera Screen */
                <div className="w-full h-full relative flex items-center justify-center">
                  <video
                    ref={cameraPreviewRef}
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  
                  {/* Overlay Recording HUD */}
                  <div className="absolute top-3 inset-x-3 flex justify-between items-center z-10">
                    <div className="flex items-center gap-1.5 bg-black/60 py-1 px-2.5 rounded-full">
                      <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-neutral-500'}`} />
                      <span className="text-[10px] font-mono">00:{recordingDuration.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="text-[9px] bg-black/60 py-1 px-2.5 rounded-full text-indigo-300">Max 15s</span>
                  </div>

                  {/* Shutter Button container */}
                  <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-4 z-10">
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-14 h-14 bg-neutral-950 border-4 border-white rounded-full flex items-center justify-center hover:scale-95 transition"
                      >
                        <div className="w-6 h-6 bg-red-500 rounded" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={cameraStatus !== 'allowed'}
                        className="w-14 h-14 bg-red-600 border-4 border-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition disabled:opacity-40"
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Drag & Drop File Upload Area */
                <label className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-neutral-800/20 transition group">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Upload size={22} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-300 group-hover:text-white">
                    Select video from device
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-1">
                    MP4 or WebM (vertical recommended)
                  </span>
                </label>
              )}
            </div>

            {/* Inputs & Settings */}
            <div className="space-y-3.5 bg-neutral-900/40 p-3.5 rounded-2xl border border-neutral-900">
              
              {/* Caption field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Reel Description / Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell your viewers what this is about..."
                  maxLength={150}
                  rows={2}
                  className="w-full bg-neutral-900 border-none outline-none text-xs text-white p-2.5 rounded-xl placeholder:text-neutral-600 resize-none focus:ring-1 focus:ring-neutral-700"
                />
              </div>

              {/* Music field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block flex items-center gap-1">
                  <Music size={10} /> Background Music Track
                </label>
                
                {/* Scrollable Presets Grid/List */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                  {[
                    { name: 'Original Sound', artist: 'Creator' },
                    { name: 'Sunset Lofi Vibes', artist: 'Chillhop Beats' },
                    { name: 'Phonk Bassline', artist: 'Neon Drift' },
                    { name: 'Summer Synthwave', artist: 'Retro Rider' },
                    { name: 'Acoustic Chill', artist: 'Acoustic Waves' },
                    { name: 'Epic Future Bass', artist: 'DJ Solar' },
                  ].map((track) => {
                    const trackString = track.name === 'Original Sound' ? 'Original Audio' : `${track.name} - ${track.artist}`;
                    const isSelected = music === trackString || (track.name === 'Original Sound' && music === '');
                    return (
                      <button
                        key={track.name}
                        type="button"
                        onClick={() => {
                          setMusic(track.name === 'Original Sound' ? '' : trackString);
                          // Stop custom audio if user selects preset
                          if (audioRef.current) {
                            audioRef.current.pause();
                            setIsPlayingAudio(false);
                          }
                        }}
                        className={`shrink-0 flex flex-col text-left p-2 rounded-xl border text-[10px] w-28 transition ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="font-semibold truncate block">{track.name}</span>
                        <span className="text-[8px] opacity-60 truncate block">{track.artist}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom MP3 File Upload Option */}
                {customAudioUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={toggleAudioPlayback}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition active:scale-95 shrink-0 flex items-center justify-center"
                      >
                        {isPlayingAudio ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Custom MP3 Track Attached
                        </span>
                        <p className="text-xs text-white truncate font-medium">{customAudioName}</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={removeCustomAudio}
                      className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800/50 transition active:scale-95 ml-2 shrink-0"
                      title="Remove audio track"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-2.5 bg-neutral-900/40 border border-dashed border-neutral-800/80 hover:border-neutral-700 rounded-xl cursor-pointer hover:bg-neutral-900/60 transition group text-xs text-neutral-400 hover:text-white"
                  >
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                    <Upload size={12} className="text-indigo-400 group-hover:scale-110 transition shrink-0" />
                    <span className="text-[11px] font-semibold">Upload your own custom MP3 track</span>
                  </button>
                )}

                <input
                  type="text"
                  value={music}
                  onChange={(e) => setMusic(e.target.value)}
                  placeholder="Or enter a custom track name here..."
                  className="w-full bg-neutral-900 border-none outline-none text-xs text-white p-2.5 rounded-xl placeholder:text-neutral-600 focus:ring-1 focus:ring-neutral-700"
                />
              </div>

              {/* Tags field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block flex items-center gap-1">
                  <Tag size={10} /> Hashtags
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., skater, modularsynth, tokyo (comma separated)"
                  className="w-full bg-neutral-900 border-none outline-none text-xs text-white p-2.5 rounded-xl placeholder:text-neutral-600 focus:ring-1 focus:ring-neutral-700"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!videoUrl || isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:hover:bg-indigo-600 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading assets...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Publish Reel</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
