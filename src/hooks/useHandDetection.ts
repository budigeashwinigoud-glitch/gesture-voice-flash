import { useRef, useState, useCallback, useEffect } from "react";
import { classifyGesture, GestureStabilizer, type GestureName, type Landmark } from "@/lib/gestureClassifier";

export type DetectionStatus = "idle" | "detecting" | "recognized" | "no-hand";

interface UseHandDetectionReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  status: DetectionStatus;
  gesture: GestureName;
  isRunning: boolean;
  start: () => Promise<void>;
  stop: () => void;
  fps: number;
}

export function useHandDetection(): UseHandDetectionReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [gesture, setGesture] = useState<GestureName>("Unknown");
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);

  const handLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const stabilizerRef = useRef(new GestureStabilizer(4));
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const streamRef = useRef<MediaStream | null>(null);

  const drawLandmarks = useCallback((landmarks: Landmark[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Connections between landmarks
    const connections = [
      [0,1],[1,2],[2,3],[3,4], // thumb
      [0,5],[5,6],[6,7],[7,8], // index
      [5,9],[9,10],[10,11],[11,12], // middle
      [9,13],[13,14],[14,15],[15,16], // ring
      [13,17],[17,18],[18,19],[19,20], // pinky
      [0,17]
    ];

    ctx.strokeStyle = "hsl(160, 84%, 45%)";
    ctx.lineWidth = 2;
    for (const [a, b] of connections) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
      ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
      ctx.stroke();
    }

    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "hsl(200, 80%, 50%)";
      ctx.fill();
    }
  }, []);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the canvas
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Process every frame for responsiveness
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    try {
      const results = handLandmarker.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0] as Landmark[];
        const handedness = results.handedness?.[0]?.[0]?.categoryName || "Right";

        // Draw landmarks (mirrored)
        const mirroredLandmarks = landmarks.map((lm: Landmark) => ({
          ...lm,
          x: 1 - lm.x,
        }));
        drawLandmarks(mirroredLandmarks, ctx, canvas.width, canvas.height);

        const raw = classifyGesture(landmarks, handedness);
        const stable = stabilizerRef.current.update(raw);

        if (stable !== "Unknown") {
          setStatus("recognized");
          setGesture(stable);
        } else {
          setStatus("detecting");
        }
      } else {
        setStatus("no-hand");
        stabilizerRef.current.reset();
      }
    } catch (e) {
      // skip frame on error
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [drawLandmarks]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Dynamically import MediaPipe
      const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      setIsRunning(true);
      setStatus("detecting");
      stabilizerRef.current.reset();
      animFrameRef.current = requestAnimationFrame(detect);
    } catch (err) {
      console.error("Failed to start hand detection:", err);
      setStatus("idle");
    }
  }, [detect]);

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (handLandmarkerRef.current) {
      handLandmarkerRef.current.close();
      handLandmarkerRef.current = null;
    }
    setIsRunning(false);
    setStatus("idle");
    setGesture("Unknown");
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, canvasRef, status, gesture, isRunning, start, stop, fps };
}
