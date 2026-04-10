// Rule-based gesture classification using MediaPipe hand landmarks
// Landmark indices: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker

export type GestureName = "Hello" | "Yes" | "No" | "Help" | "Stop" | "Thank You" | "I Love You" | "Peace" | "Call Me" | "OK" | "Unknown";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Check if a finger is extended by comparing tip to PIP joint
function isFingerExtended(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y < landmarks[pip].y;
}

function isThumbExtended(landmarks: Landmark[], isRightHand: boolean): boolean {
  if (isRightHand) {
    return landmarks[4].x > landmarks[3].x;
  }
  return landmarks[4].x < landmarks[3].x;
}

function fingersCurled(landmarks: Landmark[]): boolean {
  return (
    !isFingerExtended(landmarks, 8, 6) &&
    !isFingerExtended(landmarks, 12, 10) &&
    !isFingerExtended(landmarks, 16, 14) &&
    !isFingerExtended(landmarks, 20, 18)
  );
}

function allFingersExtended(landmarks: Landmark[]): boolean {
  return (
    isFingerExtended(landmarks, 8, 6) &&
    isFingerExtended(landmarks, 12, 10) &&
    isFingerExtended(landmarks, 16, 14) &&
    isFingerExtended(landmarks, 20, 18)
  );
}

function distance(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function classifyGesture(landmarks: Landmark[], handedness: string = "Right"): GestureName {
  const isRight = handedness === "Right";
  const thumb = isThumbExtended(landmarks, isRight);
  const index = isFingerExtended(landmarks, 8, 6);
  const middle = isFingerExtended(landmarks, 12, 10);
  const ring = isFingerExtended(landmarks, 16, 14);
  const pinky = isFingerExtended(landmarks, 20, 18);
  const allUp = allFingersExtended(landmarks);

  // STOP: All fingers extended, palm open, fingers spread
  if (allUp && thumb) {
    const spread = distance(landmarks[8], landmarks[20]);
    if (spread > 0.12) {
      return "Stop";
    }
  }

  // HELLO: All fingers extended, fingers together (wave-like)
  if (allUp && thumb) {
    return "Hello";
  }

  // YES: Fist with thumb up
  if (thumb && fingersCurled(landmarks)) {
    return "Yes";
  }

  // NO: Index and middle extended, others curled (peace sign variation / wagging finger)
  if (index && middle && !ring && !pinky) {
    return "No";
  }

  // HELP: Fist on open palm - simplified to fist (all curled including thumb)
  if (!thumb && fingersCurled(landmarks)) {
    return "Help";
  }

  // THANK YOU: Flat hand touching chin then moving out - simplified to all fingers extended, hand tilted
  if (allUp && !thumb) {
    return "Thank You";
  }

  return "Unknown";
}

// Stabilize detections - require N consecutive same classifications
export class GestureStabilizer {
  private history: GestureName[] = [];
  private threshold: number;
  private lastStable: GestureName = "Unknown";

  constructor(threshold = 5) {
    this.threshold = threshold;
  }

  update(gesture: GestureName): GestureName {
    this.history.push(gesture);
    if (this.history.length > this.threshold) {
      this.history.shift();
    }

    if (this.history.length >= this.threshold) {
      const allSame = this.history.every((g) => g === this.history[0]);
      if (allSame && this.history[0] !== "Unknown") {
        this.lastStable = this.history[0];
        return this.lastStable;
      }
    }

    return this.lastStable;
  }

  reset() {
    this.history = [];
    this.lastStable = "Unknown";
  }
}
