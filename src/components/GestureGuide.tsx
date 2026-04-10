const gestures = [
  { name: "Hello", desc: "Open hand, fingers together", icon: "👋" },
  { name: "Yes", desc: "Thumbs up, fist closed", icon: "👍" },
  { name: "No", desc: "Index + middle together", icon: "✌️" },
  { name: "Help", desc: "Closed fist, thumb tucked", icon: "✊" },
  { name: "Stop", desc: "Open hand, fingers spread", icon: "🖐️" },
  { name: "Thank You", desc: "Fingers up, thumb tucked", icon: "🤚" },
  { name: "I Love You", desc: "Index, pinky & thumb up (ASL)", icon: "🤟" },
  { name: "Peace", desc: "Index + middle spread apart", icon: "✌️" },
  { name: "Call Me", desc: "Thumb & pinky extended", icon: "🤙" },
  { name: "OK", desc: "Thumb & index circle, rest up", icon: "👌" },
];

export function GestureGuide({ currentGesture }: { currentGesture: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {gestures.map((g) => (
        <div
          key={g.name}
          className={`card-glow flex items-center gap-3 p-3 transition-all ${
            currentGesture === g.name ? "border-primary ring-1 ring-primary/30" : ""
          }`}
        >
          <span className="text-2xl">{g.icon}</span>
          <div>
            <p className="font-mono text-sm font-semibold text-foreground">{g.name}</p>
            <p className="text-xs text-muted-foreground">{g.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
