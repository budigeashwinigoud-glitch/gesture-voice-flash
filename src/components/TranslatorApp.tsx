import { useEffect, useRef, useState } from "react";
import { useHandDetection } from "@/hooks/useHandDetection";
import { speak, replayLast } from "@/lib/speechService";
import { StatusBadge } from "@/components/StatusBadge";
import { GestureGuide } from "@/components/GestureGuide";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Volume2, RotateCcw, Zap } from "lucide-react";

const DEMO_GESTURES = ["Hello", "Yes", "Thank You", "Stop", "No", "Help"] as const;

export function TranslatorApp() {
  const { videoRef, canvasRef, status, gesture, isRunning, start, stop, fps } = useHandDetection();
  const [history, setHistory] = useState<string[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [demoGesture, setDemoGesture] = useState("");
  const demoIntervalRef = useRef<number>(0);
  const lastGestureRef = useRef("");

  const activeGesture = demoMode ? demoGesture : gesture;
  const displayGesture = activeGesture === "Unknown" ? "" : activeGesture;

  // Speak when gesture changes
  useEffect(() => {
    if (displayGesture && displayGesture !== lastGestureRef.current) {
      lastGestureRef.current = displayGesture;
      speak(displayGesture);
      setHistory((prev) => [displayGesture, ...prev.slice(0, 9)]);
    }
  }, [displayGesture]);

  // Demo mode cycling
  useEffect(() => {
    if (demoMode) {
      let i = 0;
      setDemoGesture(DEMO_GESTURES[0]);
      demoIntervalRef.current = window.setInterval(() => {
        i = (i + 1) % DEMO_GESTURES.length;
        setDemoGesture(DEMO_GESTURES[i]);
      }, 3000);
    } else {
      clearInterval(demoIntervalRef.current);
      setDemoGesture("");
    }
    return () => clearInterval(demoIntervalRef.current);
  }, [demoMode]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-mono font-bold tracking-tight text-foreground">
            SignSpeak<span className="text-primary">.ai</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="text-xs font-mono text-muted-foreground">{fps} FPS</span>
          )}
          <StatusBadge status={demoMode ? "recognized" : status} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Left column - Camera + Output */}
          <div className="space-y-6">
            {/* Camera */}
            <div className={`camera-frame relative ${isRunning ? "active" : ""}`}>
              <video
                ref={videoRef}
                className="hidden"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="w-full aspect-video bg-muted/50"
              />
              {!isRunning && !demoMode && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/80 backdrop-blur-sm">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground font-mono text-sm">Camera feed will appear here</p>
                </div>
              )}
              {demoMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Demo Mode</p>
                    <p className="text-6xl">{
                      { Hello: "👋", Yes: "👍", No: "✌️", Help: "✊", Stop: "🖐️", "Thank You": "🤚" }[demoGesture] || "👋"
                    }</p>
                  </div>
                </div>
              )}
            </div>

            {/* Output */}
            <div className="card-glow text-center space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Detected Gesture</p>
              <p className="gesture-text min-h-[80px] flex items-center justify-center">
                {displayGesture || "—"}
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => replayLast()}
                  disabled={!displayGesture}
                  className="font-mono"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Replay Audio
                </Button>
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="card-glow space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">History</p>
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-sm font-mono rounded-md bg-secondary text-secondary-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Controls + Guide */}
          <div className="space-y-6">
            {/* Controls */}
            <div className="card-glow space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Controls</p>
              <div className="space-y-3">
                {!isRunning ? (
                  <Button onClick={start} className="w-full font-mono" disabled={demoMode}>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stop} variant="destructive" className="w-full font-mono">
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                )}
                <Button
                  variant={demoMode ? "default" : "outline"}
                  className="w-full font-mono"
                  onClick={() => {
                    if (!demoMode && isRunning) stop();
                    setDemoMode(!demoMode);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {demoMode ? "Exit Demo" : "Demo Mode"}
                </Button>
              </div>
            </div>

            {/* Gesture Guide */}
            <div className="card-glow space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Gesture Reference</p>
              <GestureGuide currentGesture={displayGesture} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
