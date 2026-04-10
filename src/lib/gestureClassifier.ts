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

  // I LOVE YOU: Index, pinky and thumb extended, middle and ring curled (ASL ILY)
  if (thumb && index && !middle && !ring && pinky) {
    return "I Love You";
  }

  // CALL ME: Thumb and pinky extended, others curled (shaka/phone)
  if (thumb && !index && !middle && !ring && pinky) {
    return "Call Me";
  }

  // YES: Fist with thumb up
  if (thumb && fingersCurled(landmarks)) {
    return "Yes";
  }

  // PEACE: Index and middle extended, spread apart, others curled
  if (index && middle && !ring && !pinky) {
    const fingerSpread = distance(landmarks[8], landmarks[12]);
    if (fingerSpread > 0.06) {
      return "Peace";
    }
  }

  // NO: Index and middle extended, others curled (peace sign variation)
  if (index && middle && !ring && !pinky) {
    return "No";
  }

  // OK: Thumb and index form a circle, others extended
  if (middle && ring && pinky) {
    const thumbIndexDist = distance(landmarks[4], landmarks[8]);
    if (thumbIndexDist < 0.06) {
      return "OK";
    }
  }

  // HELP: Fist (all curled including thumb)
  if (!thumb && fingersCurled(landmarks)) {
    return "Help";
  }

  // THANK YOU: All fingers extended, thumb tucked
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
