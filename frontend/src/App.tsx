import { useState, type CSSProperties } from "react";
import { HermesHUD } from "./components/ui/HermesHUD";
import { LaboratoryScene } from "./components/canvas/LaboratoryScene";
import type { HermesAvatarState } from "./components/canvas/HermesAvatar";

function App() {
  const [aiState, setAiState] = useState<HermesAvatarState>("idle");
  const [accentColor, setAccentColor] = useState("#f7e7b0");
  const accentRgb = accentColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16))
    .join(" ");
  const themeStyle = {
    "--accent-color": accentColor,
    "--accent-rgb": accentRgb ?? "247 231 176",
  } as CSSProperties;

  return (
    <main className="laboratory-shell" style={themeStyle}>
      <LaboratoryScene aiState={aiState} accentColor={accentColor} />
      <HermesHUD
        aiState={aiState}
        accentColor={accentColor}
        onStateChange={setAiState}
        onAccentChange={setAccentColor}
      />
    </main>
  );
}

export default App;
