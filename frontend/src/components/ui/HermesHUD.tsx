import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  Waves,
} from "lucide-react";
import type { HermesAvatarState } from "../canvas/HermesAvatar";
import {
  fetchRecommendations,
  type Recommendation,
} from "../../services/recommendationApi";
import { PerfumeBottle, type BottleVariant } from "./PerfumeBottle";
import { formatPerfumeName } from "../../services/perfumeDisplay";
import { resolvePerfumeReference } from "../../services/perfumeReference";

interface HermesHUDProps {
  aiState: HermesAvatarState;
  accentColor: string;
  onStateChange: (state: HermesAvatarState) => void;
  onAccentChange: (color: string) => void;
}

interface Choice {
  label: string;
  color?: string;
  shape?: "sphere" | "tetrahedron" | "dodecahedron" | "spiral";
  texture?: string;
  symbol?: string;
}

interface StoryStep {
  id: number;
  phase: string;
  title: string;
  message: string;
  kind: "intro" | "choice" | "text" | "hybrid" | "summary" | "results";
  choices?: Choice[];
  placeholder?: string;
  quickLabel?: string;
  questionLabel?: string;
}

function placeholderImage(choice: Choice) {
  const label = choice.label;
  const isWater = /lac|mare|plajă|coastă|albastru|acvatic|sea|beach/i.test(label);
  const isForest = /pădure|forest|măslin|natură|olive|verde/i.test(label);
  const isField = /câmp|zi|vară|primăvară|field|day/i.test(label);
  const isVolcanic = /vulcan|pompei|roșu|toamnă|volcano|red/i.test(label);
  const isMusic = /muzică|clasic|jazz|rock|electronic|pop|hip-hop|blues|ambient|r&b/i.test(label);
  const isWinter = /iarnă|noapte|munte|winter|night/i.test(label);
  const isUrban = /oraș|interior|birou|facultate|serviciu|metropolă|urban/i.test(label);
  const isPerfume = /ron|buget|parfum|miros|dulce|moscat|intensitate/i.test(label);
  const isEvent = /nuntă|eveniment|întâlnire|seară/i.test(label);
  const palette = choice.color
    ? [choice.color, "#f7e7b0"]
    : choice.texture === "suede"
      ? ["#926c50", "#d2ae87"]
      : choice.texture === "velvet"
        ? ["#87465f", "#e0a4ad"]
        : choice.texture === "cotton"
          ? ["#90a69d", "#e8e4d7"]
          : choice.texture === "wool"
            ? ["#9b7952", "#e0c397"]
            : choice.texture === "silk"
              ? ["#997da8", "#f0d7b2"]
              : choice.shape
                ? ["#8492a1", "#ded3b6"]
                : isForest
                  ? ["#47664f", "#c5c58b"]
                  : isWater
                    ? ["#397e91", "#d9c99e"]
                    : isVolcanic
                      ? ["#915b4d", "#e1a56f"]
                      : isField
                        ? ["#9a8a4c", "#e5d38e"]
                        : isMusic
                          ? ["#65527f", "#f0c77e"]
                          : isWinter
                            ? ["#536582", "#c5d9e8"]
                            : isUrban
                              ? ["#53616d", "#e0b87f"]
                              : isPerfume
                                ? ["#72594a", "#e0c995"]
                                : /violet|purpuriu/i.test(label)
                  ? ["#536582", "#c5a6c8"]
                                  : ["#897451", "#e2c995"];
  const [base, glow] = palette;
  const scene = choice.shape === "sphere"
    ? '<circle cx="160" cy="111" r="66" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2"/><ellipse cx="160" cy="111" rx="29" ry="66" fill="none" stroke="#fff" stroke-opacity=".52" stroke-width="2"/><ellipse cx="160" cy="111" rx="66" ry="25" fill="none" stroke="#fff" stroke-opacity=".52" stroke-width="2"/>'
    : choice.shape === "tetrahedron"
      ? '<path d="M160 40 77 176h166L160 40Z" fill="none" stroke="#fff" stroke-opacity=".78" stroke-width="3"/><path d="m160 40 3 136M77 176l86-58 80 58" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>'
      : choice.shape === "dodecahedron"
        ? '<path d="m160 38 47 21 29 44-17 55-47 34-51-13-31-45 16-55 54-41Z" fill="none" stroke="#fff" stroke-opacity=".76" stroke-width="3"/><path d="m113 59 47 30 47-30m29 44-76-14-77 14m127 55-50-55-51 76m51-76v-51" fill="none" stroke="#fff" stroke-opacity=".44" stroke-width="2"/>'
        : choice.shape === "spiral"
          ? '<path d="M160 111c0-15 24-15 24 3 0 23-38 26-47 3-12-35 39-62 73-33M209 69c31 34 25 86-9 114m-3 0c-42 28-94-6-94-57 0-51 51-77 88-62" fill="none" stroke="#fff" stroke-opacity=".78" stroke-width="3"/><circle cx="160" cy="111" r="4" fill="#fff"/>'
          : choice.shape
            ? '<path d="M92 154 158 42l68 112H92Z" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="2"/><path d="M158 42v112m-66 0 66-49 68 49" fill="none" stroke="#fff" stroke-opacity=".32"/>'
    : choice.texture
      ? '<path d="M0 130Q80 66 160 128t160 0v92H0Z" fill="#fff" fill-opacity=".12"/><path d="M0 148Q90 90 170 150t150-2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>'
      : isWater
        ? '<circle cx="240" cy="65" r="25" fill="#fff" fill-opacity=".6"/><path d="M0 111Q45 94 82 112t78 0 78 0 82 0v109H0Z" fill="#10232c" fill-opacity=".42"/><path d="M0 132q30-15 60 0t60 0 60 0 60 0 80 0M0 157q30-15 60 0t60 0 60 0 60 0 80 0M0 181q30-15 60 0t60 0 60 0 60 0 80 0" fill="none" stroke="#fff" stroke-opacity=".58" stroke-width="2"/>'
        : isForest
          ? '<circle cx="241" cy="55" r="20" fill="#fff" fill-opacity=".28"/><path d="m22 174 38-79 38 79Zm60 13 48-102 48 102Zm88-5 41-89 41 89Zm75 10 34-71 34 71Z" fill="#14231d" fill-opacity=".62"/><path d="M0 190q80-18 160 0t160 0" fill="none" stroke="#e1e4c7" stroke-opacity=".58" stroke-width="2"/>'
          : isVolcanic
            ? '<circle cx="237" cy="61" r="23" fill="#ffd7a0" fill-opacity=".72"/><path d="m15 176 69-87 43 54 49-83 99 116Z" fill="#241918" fill-opacity=".72"/><path d="m98 118 29 25 49-83 27 49-27-15-24 34-26-12-25 20Z" fill="#ffb05e" fill-opacity=".75"/><path d="M0 190q80-22 160 0t160 0" fill="none" stroke="#ffcc87" stroke-opacity=".56" stroke-width="3"/>'
            : isField
              ? '<circle cx="238" cy="62" r="32" fill="#fff4c4" fill-opacity=".75"/><path d="M0 144q65-52 126 0t96-3 98 0v79H0Z" fill="#4a4930" fill-opacity=".5"/><path d="M0 164q64-41 126 0t96-2 98 0M45 218l25-74m32 74 9-81m104 81-13-67m47 67-28-76" fill="none" stroke="#fff0b0" stroke-opacity=".54" stroke-width="2"/>'
              : isMusic
                ? '<path d="M56 115v39m18-61v83m18-69v54m18-93v129m18-81v38m18-59v81m18-112v143m18-98v53m18-71v90m18-123v155m18-88v22m18-63v102" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/><circle cx="160" cy="110" r="76" fill="none" stroke="#fff" stroke-opacity=".18"/><path d="M0 181q80-40 160 0t160 0" fill="none" stroke="#fff" stroke-opacity=".46" stroke-width="2"/>'
                : isWinter
                  ? '<circle cx="245" cy="61" r="22" fill="#fff" fill-opacity=".75"/><path d="m0 173 79-74 44 43 65-69 132 103v44H0Z" fill="#192433" fill-opacity=".58"/><path d="m69 109 10-10 10 10m89-26 20-20 20 20M0 191q80-17 160 0t160 0" fill="none" stroke="#f4f4f1" stroke-opacity=".72" stroke-width="2"/>'
                  : isUrban
                    ? '<path d="M37 188V91h47v97m15 0V57h62v131m14 0v-74h46v74m15 0V82h54v106" fill="#10131b" fill-opacity=".54" stroke="#fff" stroke-opacity=".48" stroke-width="2"/><path d="M53 109h14m-14 17h14m44-48h17m-17 20h17m-17 20h17m63 13h12m-12 17h12m36-50h16m-16 20h16" stroke="#ffe2a6" stroke-opacity=".75" stroke-width="4"/><path d="M0 190q80-20 160 0t160 0" fill="none" stroke="#fff" stroke-opacity=".44" stroke-width="2"/>'
                    : isEvent
                      ? '<path d="M0 160q80-36 160 0t160 0v60H0Z" fill="#17131b" fill-opacity=".48"/><path d="M45 0v69m58-69v69m58-69v69m58-69v69m58-69v69" stroke="#fff" stroke-opacity=".34" stroke-width="2"/><circle cx="45" cy="72" r="5" fill="#ffe5aa"/><circle cx="103" cy="72" r="5" fill="#ffe5aa"/><circle cx="161" cy="72" r="5" fill="#ffe5aa"/><circle cx="219" cy="72" r="5" fill="#ffe5aa"/><circle cx="277" cy="72" r="5" fill="#ffe5aa"/><path d="M0 190q80-20 160 0t160 0" fill="none" stroke="#fff" stroke-opacity=".46" stroke-width="2"/>'
                    : isPerfume
                      ? '<path d="M141 63h38v20l20 18v91q0 12-12 12h-54q-12 0-12-12v-91l20-18Z" fill="#13151b" fill-opacity=".54" stroke="#fff" stroke-opacity=".7" stroke-width="2"/><path d="M145 63h30m-34 40h38v57h-38Z" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-opacity=".52"/><circle cx="159" cy="134" r="10" fill="${glow}" fill-opacity=".7"/><path d="M0 191q80-26 160 0t160 0" fill="none" stroke="#fff" stroke-opacity=".46" stroke-width="2"/>'
                      : '<circle cx="224" cy="69" r="31" fill="#fff" fill-opacity=".58"/><path d="M0 150Q62 111 126 145t92 0 102 2v73H0Z" fill="#10131b" fill-opacity=".38"/><path d="M0 170Q78 127 160 165t160 0" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="a" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${base}"/><stop offset="1" stop-color="#131522"/></linearGradient><radialGradient id="b"><stop stop-color="${glow}" stop-opacity=".85"/><stop offset="1" stop-color="${base}" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="19"/></filter></defs><rect width="320" height="220" fill="url(#a)"/><ellipse cx="145" cy="86" rx="120" ry="78" fill="url(#b)" filter="url(#blur)"/>${scene}<path d="M20 28h36M20 28v22M300 192h-36m36 0v-22" fill="none" stroke="#fff" stroke-opacity=".46"/><text x="20" y="202" fill="#fff" fill-opacity=".72" font-family="Arial,sans-serif" font-size="8" letter-spacing="2">HERMES · VISUAL PREVIEW</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const colors: Choice[] = [
  { label: "Galben-Portocaliu Citric", color: "#F59E0B", symbol: "citrus" },
  { label: "Roz Pastel / Floral", color: "#F472B6", symbol: "floral" },
  { label: "Albastru Egee / Azur", color: "#2563EB", symbol: "sea" },
  { label: "Verde Smarald / Botanic", color: "#10B981", symbol: "botanic" },
  { label: "Purpuriu / Violet Nocturn", color: "#8B5CF6", symbol: "purple" },
  { label: "Auriu Chihlimbar / Rășinos", color: "#D97706", symbol: "amber" },
];

export const storySteps: StoryStep[] = [
  {
    id: 0,
    phase: "INTRODUCERE",
    title: "O călătorie spre parfumul tău",
    message:
      "Salut, sunt Hermes, un asistent AI complex, gata să te ajut să găsești parfumul ideal pentru tine într-un mod neconvențional. Ești gata să începem?",
    kind: "intro",
  },
  {
    id: 1,
    phase: "ASOCIERI · 01 / 05",
    title: "Alege o culoare",
    message:
      "După cum reiese și din numele meu, sunt inspirat după mesagerul zeilor din Grecia Antică, așa că o să te ajut să alegi un parfum divin, printr-o tehnică străveche, uitată de mulți ani. Pentru început, alege una din culorile puse la dispoziție, gândește-te cu care rezonezi cel mai tare și alege-o.",
    kind: "choice",
    choices: colors,
    questionLabel: "CULOARE · 10%",
  },
  {
    id: 2,
    phase: "ASOCIERI · 02 / 05",
    title: "Ce formă geometrică te atrage?",
    message:
      "Perfect, o alegere înțeleaptă. Vreau să te induc puțin în atmosfera Greciei de acum mii de ani. Pitagora, Arhimede, Euclid, toți acești genii ai matematicii trăiau în acele vremuri și au găsit formula pentru parfumul perfect, așa că te rog să alegi o formă geometrică.",
    kind: "choice",
    questionLabel: "FORMĂ · 8%",
    choices: [
      { label: "Sferă Organică Rotunjită (Bouba)", shape: "sphere" },
      { label: "Piramidă / Muchii Ascuțite (Kiki)", shape: "tetrahedron" },
      { label: "Cub / Arhitectură Hexagonală", shape: "dodecahedron" },
      { label: "Spirală / Vârtej Fluid", shape: "spiral" },
    ],
  },
  {
    id: 3,
    phase: "ASOCIERI · 03 / 05",
    title: "Alege o textură",
    message:
      "Artemis era considerată cea mai pricepută dintre zei la a vâna, iar prăzile ei erau mereu de invidiat, se obțineau haine incredibile din ele. Așa că următorul nostru obstacol e să alegi o textură care ți se pare plăcută.",
    kind: "choice",
    questionLabel: "TEXTURĂ · 8%",
    choices: [
      { label: "In răcoros (Pânză aerată)", texture: "cotton" },
      { label: "Catifea regală", texture: "velvet" },
      { label: "Mătase fluidă", texture: "silk" },
      { label: "Bumbac proaspăt călcat", texture: "cotton" },
      { label: "Piele întoarsă (Suede)", texture: "suede" },
    ],
  },
  {
    id: 4,
    phase: "ASOCIERI · 04 / 05",
    title: "Unde te poartă natura?",
    message: "Natura era mult mai sălbatică și mai diversă. Care din mediile prezentate ți se pare cel mai atractiv?",
    kind: "choice",
    questionLabel: "MEDIU · 7%",
    choices: [
      { label: "Pădure de conifere după ploaie", symbol: "forest" },
      { label: "Plajă stâncoasă cu briză sărată", symbol: "beach" },
      { label: "Grădină mediteraneană cu citrice", symbol: "lake" },
      { label: "Tărâm vulcanic / Foc nocturn", symbol: "volcano" },
      { label: "Câmp nesfârșit uscat de soare", symbol: "field" },
    ],
  },
  {
    id: 5,
    phase: "ASOCIERI · 05 / 05",
    title: "Ce muzică te definește?",
    message:
      "Grecia Antică este celebră pentru muzica de calitate. Fratele meu Apollo este un muzician excelent, să nu mai zic de cele 9 Muze care îi sunt mereu alături. Care e stilul tău de muzică preferat?",
    kind: "choice",
    questionLabel: "MUZICĂ · 7%",
    choices: [
      { label: "Pop / R&B", symbol: "pop" },
      { label: "Rap / Trap urban", symbol: "hiphop" },
      { label: "Clasic / Instrumental", symbol: "classical" },
      { label: "Jazz / Blues", symbol: "jazz" },
      { label: "Rock / Alternativ", symbol: "rock" },
      { label: "Electronic / Synth", symbol: "electronic" },
      { label: "Acoustic / Folk", symbol: "classical" },
    ],
  },
  ...[
    { label: "Moment", choices: ["Zi", "Noapte"] },
    { label: "Spațiu", choices: ["Interior", "Exterior"] },
    {
      label: "Ocazie",
      choices: ["Nuntă / Eveniment special", "Școală / Facultate", "Serviciu / Birou", "Întâlnire / Seară în oraș", "Zilnic"],
    },
    { label: "Anotimp", choices: ["Iarnă", "Toamnă", "Vară", "Primăvară"] },
    { label: "Regiune", choices: ["Mare / Coastă", "Munte", "Oraș mare (Metropolă)", "Oraș mic / Natură"] },
  ].map((context, index): StoryStep => ({
    id: 6 + index,
    phase: `CONTEXT · 0${index + 1} / 05`,
    title: context.label,
    message: "Destul despre perioada din care provin, spune-mi mai multe despre tine. În ce circumstanțe ai de gând să porți acest parfum?",
    kind: "choice",
    questionLabel: `${context.label.toUpperCase()} · 5%`,
    choices: context.choices.map((label) => ({ label })),
  })),
  {
    id: 11,
    phase: "AMINTIRI · 01 / 04",
    title: "O amintire dragă",
    message:
      "Am înțeles, se pare că nu ești așa de simplu pe cum mă așteptam, muritorule. Vreau să intru mai adânc în această discuție, spune-mi care e amintirea ta preferată? Cum miroase în capul tău?",
    kind: "text",
    questionLabel: "AMINTIREA PREFERATĂ · 5%",
    placeholder: "Povestește-mi amintirea și mirosul ei...",
  },
  {
    id: 12,
    phase: "AMINTIRI · 02 / 04",
    title: "Mirosul copilăriei",
    message:
      "Ai zice că acest miros îți definește copilăria? Dacă nu, alege sau descrie alt miros care îți aduce aminte de copilărie.",
    kind: "hybrid",
    questionLabel: "COPILĂRIE · 5%",
    placeholder: "Descrie mirosul care îți amintește de copilărie...",
    quickLabel: "Da, același miros îmi definește copilăria",
  },
  {
    id: 13,
    phase: "AMINTIRI · 03 / 04",
    title: "Un miros de evitat",
    message: "Există vreun miros care îți aduce amintiri neplăcute? Care este acela?",
    kind: "text",
    questionLabel: "FILTRU NEGATIV · 5%",
    placeholder: "Poți descrie mirosul sau poți scrie «niciunul»...",
  },
  {
    id: 14,
    phase: "AMINTIRI · 04 / 04",
    title: "Parfumurile tale de până acum",
    message: "Spune-mi te rog, cum miroseau parfumurile tale anterioare?",
    kind: "text",
    questionLabel: "PARFUMURI ANTERIOARE · 5%",
    placeholder: "Numește parfumurile sau descrie-le aromele...",
  },
  {
    id: 15,
    phase: "CHIMIA PIELII · 01 / 02",
    title: "Cum evoluează un parfum fresh?",
    message:
      "O să îți pun două întrebări mai complexe pentru a-ți afla aproximativ histocompatibilitatea genetică. Dacă aplici un parfum fresh/citric pe piele, după două ore tinde să devină mai dulce, mai acrișor sau își pierde complet intensitatea?",
    kind: "hybrid",
    questionLabel: "HISTOCOMPATIBILITATE · 12,5%",
    placeholder: "Descrie cum evoluează parfumul pe pielea ta...",
    choices: [
      { label: "Devine mai dulce" },
      { label: "Devine mai acrișor" },
      { label: "Își pierde complet intensitatea" },
    ],
  },
  {
    id: 16,
    phase: "CHIMIA PIELII · 02 / 02",
    title: "Mirosul natural al pielii",
    message:
      "Care este reacția ta când simți mirosul curat al propriei tale pieli într-o zi relaxată? Îl percepi ca fiind mai degrabă dulce, sărat/moscat sau complet neutru?",
    kind: "hybrid",
    questionLabel: "CHIMIA PIELII · 12,5%",
    placeholder: "Descrie mirosul natural al pielii tale...",
    choices: [{ label: "Dulce" }, { label: "Sărat / Moscat" }, { label: "Complet neutru" }],
  },
  {
    id: 17,
    phase: "ULTIMUL DETALIU",
    title: "Bugetul tău",
    message:
      "Mulțumesc, muritorule, pentru toate aceste informații. O să calculez și îți voi oferi parfumul ideal pentru tine, dar ca ultimă întrebare, care este bugetul tău?",
    kind: "choice",
    questionLabel: "BUGET",
    choices: [
      { label: "100 - 200 RON" },
      { label: "250 - 400 RON" },
      { label: "450 - 850 RON" },
      { label: "900 - 1500 RON" },
      { label: "1700+ RON" },
    ],
  },
  {
    id: 18,
    phase: "ANALIZĂ OLF ACTIVĂ",
    title: "Armonizez indiciile tale",
    message: "Perfect, acum procesez informațiile...",
    kind: "summary",
  },
  {
    id: 19,
    phase: "REVELAȚIA TA OLFACTIVĂ",
    title: "Trei parfumuri, alese pentru tine",
    message: "Am cântărit alegerile, amintirile și preferințele tale. Iată ce am descoperit.",
    kind: "results",
  },
];

function ProductBottle({
  bottleVariant,
  size,
}: {
  bottleVariant: BottleVariant;
  size: "featured" | "alternative";
}) {
  return (
    <div
      className={`product-image flex items-center justify-center ${
        size === "featured" ? "h-48" : "h-24"
      }`}
    >
      <PerfumeBottle
        variant={bottleVariant}
        className={`bottle-icon bottle-icon-${size}`}
      />
    </div>
  );
}

export function HermesHUD({
  aiState,
  accentColor,
  onStateChange,
  onAccentChange,
}: HermesHUDProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationSource, setRecommendationSource] = useState("");
  const [recommendationError, setRecommendationError] = useState("");
  const [recommendationDisclaimer, setRecommendationDisclaimer] = useState("");
  const [revelation, setRevelation] = useState("");
  const [displayedRevelation, setDisplayedRevelation] = useState("");
  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const isProcessing = aiState === "processing";
  const step = storySteps[currentStep];
  const messageKey = currentStep >= 6 && currentStep <= 10 ? "context" : String(currentStep);
  const typedMessage = step.message;
  const progress = currentStep === 0 ? 0 : Math.min(Math.round((currentStep / 19) * 100), 100);
  const perfume = recommendations[0];
  const profileLink = perfume ? resolvePerfumeReference(perfume) : null;

  useEffect(() => {
    setDisplayedRevelation("");
    if (!revelation) return;

    let character = 0;
    const timer = window.setInterval(() => {
      character += 1;
      setDisplayedRevelation(revelation.slice(0, character));
      if (character >= revelation.length) window.clearInterval(timer);
    }, 25);
    return () => window.clearInterval(timer);
  }, [revelation]);

  useEffect(() => {
    setDisplayedMessage("");
    let character = 0;
    const timer = window.setInterval(() => {
      character += 2;
      setDisplayedMessage(typedMessage.slice(0, character));
      if (character >= typedMessage.length) window.clearInterval(timer);
    }, 16);
    return () => window.clearInterval(timer);
  }, [messageKey, typedMessage]);

  useEffect(
    () => () => {
      if (processingTimer.current) clearTimeout(processingTimer.current);
      if (completionTimer.current) clearTimeout(completionTimer.current);
      requestController.current?.abort();
    },
    [],
  );

  const brieflyProcess = (duration = 380) => {
    onStateChange("processing");
    if (processingTimer.current) clearTimeout(processingTimer.current);
    processingTimer.current = setTimeout(() => {
      onStateChange("idle");
      processingTimer.current = null;
    }, duration);
  };

  const saveAnswer = (answer: string) => {
    setAnswers((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([key]) => Number(key) < currentStep),
      );
      next[currentStep] = answer;
      return next;
    });
  };

  const requestRecommendations = async (profile: Record<number, string>) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setRecommendationError("");
    setRevelation("");
    setFinished(false);
    setCurrentStep(18);
    onStateChange("processing");

    const minimumProcessingTime = new Promise<void>((resolve) => {
      completionTimer.current = setTimeout(resolve, 3000);
    });

    try {
      const [response] = await Promise.all([
        fetchRecommendations(profile, controller.signal),
        minimumProcessingTime,
      ]);
      if (controller.signal.aborted) return;
      setRecommendations(response.recommendations);
      setRecommendationSource(response.data_source);
      setRecommendationDisclaimer(response.disclaimer_ro);
      setRevelation(response.revelation);
      setCurrentStep(19);
      setFinished(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      setRecommendationError(
        error instanceof Error
          ? error.message
          : "Nu am putut calcula recomandările. Verifică dacă serverul Hermes este pornit și încearcă din nou.",
      );
    } finally {
      if (completionTimer.current) clearTimeout(completionTimer.current);
      completionTimer.current = null;
      if (requestController.current === controller) requestController.current = null;
      if (!controller.signal.aborted) onStateChange("idle");
    }
  };

  const choose = (answer: string, color?: string) => {
    setDraft("");
    saveAnswer(answer);
    if (currentStep === 1 && color) onAccentChange(color);

    if (currentStep === 17) {
      void requestRecommendations({ ...answers, [currentStep]: answer });
      return;
    }

    brieflyProcess();
    setCurrentStep((previous) => Math.min(previous + 1, 17));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = draft.trim();
    if (!answer) return;
    choose(answer);
  };

  const goBack = () => {
    if (currentStep >= 18) {
      requestController.current?.abort();
      if (completionTimer.current) clearTimeout(completionTimer.current);
      completionTimer.current = null;
      setRecommendationError("");
      setFinished(false);
      setCurrentStep(17);
      onStateChange("idle");
      return;
    }
    if (currentStep <= 0) return;
    if (processingTimer.current) clearTimeout(processingTimer.current);
    onStateChange("idle");
    setCurrentStep((previous) => previous - 1);
  };

  const summaryEntries = Object.entries(answers)
    .map(([id, answer]) => ({ step: storySteps[Number(id)], answer }))
    .filter(({ step: answerStep }) => answerStep && answerStep.id > 0 && answerStep.id < 18);

  const restartJourney = () => {
    requestController.current?.abort();
    if (processingTimer.current) clearTimeout(processingTimer.current);
    if (completionTimer.current) clearTimeout(completionTimer.current);
    setAnswers({});
    setDraft("");
    setRecommendations([]);
    setRecommendationSource("");
    setRecommendationError("");
    setRecommendationDisclaimer("");
    setRevelation("");
    setFinished(false);
    setCurrentStep(0);
    onStateChange("idle");
    onAccentChange("#f7e7b0");
  };

  return (
    <div className="hud-overlay">
      <header className="journey-header">
        <a className="brand-mark" href="#" aria-label="Hermes AI — început">
          <span className="brand-glyph">
            <Waves size={20} strokeWidth={1.4} />
          </span>
          <span>
            <span className="brand-title">HERMES</span>
            <span className="brand-subtitle">NEURO-OLFACTORY JOURNEY</span>
          </span>
        </a>

        <div className="journey-progress" aria-label={`Progres ${progress}%`}>
          <span className="journey-progress-label">
            {currentStep === 0 ? "O EXPERIENȚĂ PERSONALĂ" : finished ? "RECOMANDARE GATA" : `PASUL ${currentStep} / 19`}
          </span>
          <span className="journey-progress-track">
            <motion.span
              className="journey-progress-fill"
              animate={{ width: `${finished ? 100 : progress}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ backgroundColor: accentColor }}
            />
          </span>
        </div>
      </header>

      <main className="story-stage">
        <div className="story-step-label">
          <span className="story-step-dot" />
          {step.phase}
        </div>
      </main>

      <footer className="story-dock">
        <motion.section
          className="hermes-dialogue"
          key={`dialogue-${messageKey}-${finished ? "finished" : "active"}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          aria-live="polite"
        >
          <div className="dialogue-emblem" style={{ color: accentColor }}>
            <Sparkles size={19} strokeWidth={1.45} />
          </div>
          <div className="dialogue-copy">
            <div className="dialogue-byline">
              <span>HERMES</span>
              <span className="dialogue-divider">/</span>
              <span>{aiState === "processing" ? "PROCESEZ" : "GHIDUL TĂU"}</span>
              {currentStep > 0 && currentStep < 18 && step.questionLabel ? (
                <span className="dialogue-weight">{step.questionLabel}</span>
              ) : null}
            </div>
            <h1 className="dialogue-title">{step.title}</h1>
            <p className="dialogue-message">
              {displayedMessage}
              {displayedMessage.length < typedMessage.length ? (
                <span className="typewriter-cursor" aria-hidden="true" />
              ) : null}
            </p>
          </div>
        </motion.section>

        <AnimatePresence mode="wait">
          {finished && recommendations.length === 3 ? (
            <motion.section
              className="recommendation-results"
              key="recommendation-results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              aria-label="Top trei recomandări de parfum"
            >
              <p className="catalog-source">
                {recommendationSource === "supabase"
                  ? "CATALOG CONECTAT · SUPABASE"
                  : "CATALOG LOCAL"}
              </p>
              <article className="featured-perfume">
                <div className="featured-perfume-art">
                  <ProductBottle
                    bottleVariant="square"
                    size="featured"
                  />
                  <span className="featured-rank">#01 · PARFUMUL TĂU IDEAL</span>
                </div>
                <div className="featured-perfume-copy">
                  <span className="recommendation-kicker">{recommendations[0].brand}</span>
                  <h2>{formatPerfumeName(recommendations[0].name)}</h2>
                  <div className="featured-score-line">
                    <strong>{recommendations[0].compatibility_score.toFixed(1)}%</strong>
                    <span>compatibilitate estimată</span>
                    <span className="featured-price">{recommendations[0].price_ron.toLocaleString("ro-RO")} RON</span>
                  </div>
                  <p className="featured-description">{recommendations[0].description_ro}</p>
                  <div className="notes-pyramid" aria-label="Piramida notelor">
                    {[
                      ["VÂRF", recommendations[0].top_notes],
                      ["INIMĂ", recommendations[0].heart_notes],
                      ["BAZĂ", recommendations[0].base_notes],
                    ].map(([label, notes]) => (
                      <div className="notes-layer" key={label as string}>
                        <span>{label as string}</span>
                        <strong>{(notes as string[]).join(" · ") || "—"}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="pillar-breakdown">
                    {[
                      ["Asocieri Sinestezice (Cross-Modal)", recommendations[0].scores.cross_modal_score],
                      ["Context & Ocazie", recommendations[0].scores.context_score],
                      ["Memorie Autobiografică", recommendations[0].scores.memory_score],
                      ["Chimia Pielii & Biologie", recommendations[0].scores.bio_score],
                    ].map(([label, score]) => (
                      <div className="pillar-row" key={label as string}>
                        <span>{label as string}</span>
                        <div className="pillar-track">
                          <motion.span
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <strong>{Number(score).toFixed(0)}%</strong>
                      </div>
                    ))}
                  </div>
                  <div className="hermes-revelation" aria-live="polite">
                    <span className="revelation-label">HERMES · REVELAȚIE</span>
                    <blockquote className="hermes-verdict">
                      {displayedRevelation}
                      {displayedRevelation.length < revelation.length ? (
                        <span className="typewriter-cursor" aria-hidden="true" />
                      ) : null}
                    </blockquote>
                  </div>
                  <blockquote className="hermes-verdict">{recommendations[0].explanation_ro}</blockquote>
                  <a
                    className="parfumo-link"
                    href={profileLink?.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profileLink?.label}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </article>

              <div className="alternative-recommendations">
                {recommendations.slice(1).map((recommendation, index) => (
                  <article className="alternative-card" key={recommendation.id}>
                    <div className="alternative-art">
                      <ProductBottle
                        bottleVariant={index === 0 ? "round" : "tall"}
                        size="alternative"
                      />
                      <span>#{index + 2}</span>
                    </div>
                    <div className="alternative-copy">
                      <span className="recommendation-kicker">{recommendation.brand}</span>
                      <h3>{formatPerfumeName(recommendation.name)}</h3>
                      <div className="alternative-meta">
                        <strong>{recommendation.compatibility_score.toFixed(1)}%</strong>
                        <span>{recommendation.price_ron.toLocaleString("ro-RO")} RON</span>
                      </div>
                      <p>{recommendation.accords.join(" · ")}</p>
                    </div>
                  </article>
                ))}
              </div>

              <p className="recommendation-disclaimer">{recommendationDisclaimer}</p>
              <details className="profile-details">
                <summary>Răspunsurile profilului tău</summary>
                <div className="summary-list">
                  {summaryEntries.map(({ step: answerStep, answer }) => (
                    <div className="summary-entry" key={answerStep.id}>
                      <span>{answerStep.title}</span>
                      <strong>{answer}</strong>
                    </div>
                  ))}
                </div>
              </details>
              <button className="journey-start restart-journey" onClick={restartJourney} type="button">
                <RotateCcw size={15} /> REIA CĂLĂTORIA
              </button>
              <button className="back-button summary-back" onClick={goBack} type="button">
                <ArrowDownLeft size={14} /> Înapoi la buget
              </button>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!finished && step.kind === "intro" ? (
            <motion.div
              className="story-actions intro-actions"
              key="intro"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <button className="journey-start" onClick={() => setCurrentStep(1)} type="button">
                ÎNCEPE CĂLĂTORIA <ArrowUpRight size={17} />
              </button>
            </motion.div>
          ) : null}

          {!finished && step.kind === "choice" ? (
            <motion.div
              className={`story-actions choice-actions${currentStep === 1 ? " color-choices" : ""}`}
              key={`choices-${currentStep}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32 }}
              role="group"
              aria-label={step.questionLabel ?? step.title}
            >
              {step.choices?.map((choice, index) => {
                const selected = answers[currentStep] === choice.label;
                return (
                  <motion.button
                    className={`story-choice${selected ? " is-selected" : ""}${choice.color ? " color-choice" : ""}`}
                    key={choice.label}
                    onClick={() => choose(choice.label, choice.color)}
                    disabled={isProcessing}
                    style={{ "--choice-color": choice.color ?? accentColor } as CSSProperties}
                    type="button"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    aria-pressed={selected}
                  >
                    <img className="choice-image" src={placeholderImage(choice)} alt="" />
                    <span className="choice-label">{choice.label}</span>
                    <span className="choice-index">0{index + 1}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : null}

          {!finished && (step.kind === "text" || step.kind === "hybrid") ? (
            <motion.div
              className="story-actions response-actions"
              key={`response-${currentStep}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {step.choices ? (
                <div className="quick-choices" role="group" aria-label="Răspuns rapid">
                  {step.choices.map((choice) => (
                    <button
                      className="quick-choice"
                      key={choice.label}
                      onClick={() => choose(choice.label)}
                      disabled={isProcessing}
                      type="button"
                    >
                      <img className="quick-choice-image" src={placeholderImage(choice)} alt="" />
                      {choice.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {step.quickLabel ? (
                <button className="quick-confirmation" onClick={() => choose(step.quickLabel!)} disabled={isProcessing} type="button">
                  <img className="quick-choice-image" src={placeholderImage({ label: step.quickLabel })} alt="" />
                  {step.quickLabel}
                </button>
              ) : null}
              <form className="story-input" onSubmit={handleSubmit}>
                <input
                  aria-label="Răspuns pentru Hermes"
                  autoComplete="off"
                  disabled={isProcessing}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={step.placeholder}
                  type="text"
                  value={draft}
                />
                <button aria-label="Trimite răspunsul" disabled={isProcessing || !draft.trim()} type="submit">
                  <ArrowUpRight size={18} />
                </button>
              </form>
            </motion.div>
          ) : null}

          {!finished && step.kind === "summary" ? (
            <motion.div
              className="final-processing"
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <span className="processing-orbit" />
              <span>{recommendationError ? "Recomandarea nu a putut fi calculată." : "Armonizez indiciile tale olfactive"}</span>
              {recommendationError ? (
                <div className="recommendation-error">
                  <p>{recommendationError}</p>
                  <button
                    className="quick-choice"
                    onClick={() => void requestRecommendations(answers)}
                    type="button"
                  >
                    Încearcă din nou
                  </button>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {currentStep > 0 && currentStep < 18 && !finished ? (
          <button className="back-button" onClick={goBack} type="button">
            <ArrowDownLeft size={14} /> Înapoi
          </button>
        ) : null}
      </footer>
    </div>
  );
}
