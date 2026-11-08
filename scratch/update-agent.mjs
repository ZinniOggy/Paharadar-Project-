import fs from "node:fs";

let code = fs.readFileSync("src/components/agent/FlyingAgent.tsx", "utf8");

code = code.replace(
  'import { SPEEDS } from "./agent.config";',
  'import { SPEEDS, SPEED_CONFIG } from "./agent.config";'
);

code = code.replace(
  'y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },',
  'y: { duration: SPEED_CONFIG[speed]?.bobDuration ?? 2.0, repeat: Infinity, ease: "easeInOut" },'
);

// Enhance instant acceleration on speed or follow change
const oldEffect = `  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = sim.current;
    if (s.ready) {
      const tx = follow ? s.px + 32 : window.innerWidth - 130;
      const ty = follow ? s.py - 50 : window.innerHeight - 150;
      // Instantly accelerate and update position on click
      s.cx += (tx - s.cx) * 0.45;
      s.cy += (ty - s.cy) * 0.45;
      x.set(s.cx);
      y.set(s.cy);
    }
  }, [speed, follow, x, y]);`;

const newEffect = `  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = sim.current;
    if (s.ready) {
      const tx = follow ? s.px + 32 : window.innerWidth - 130;
      const ty = follow ? s.py - 50 : window.innerHeight - 150;
      // Instantly accelerate with impulse proportional to speed setting
      const boost = speed === "zippy" ? 0.9 : speed === "normal" ? 0.45 : 0.2;
      s.cx += (tx - s.cx) * boost;
      s.cy += (ty - s.cy) * boost;
      x.set(s.cx);
      y.set(s.cy);
    }
  }, [speed, follow, x, y]);`;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync("src/components/agent/FlyingAgent.tsx", code, "utf8");
console.log("Updated FlyingAgent.tsx");
