import { useId } from "react";

import {
  Arrow,
  Diagram,
  DiagramCard,
  IconBadge,
  IrisGradient,
  Lines,
  Panel,
  ResponsivePair,
  type IconName,
} from "./primitives";

type Step = {
  icon: IconName;
  /** Who does this step. */
  who: string;
  ours: boolean;
  title: string[];
  note: string[];
  /** Same text on one line per sentence, for the narrow layout. */
  noteNarrow: string[];
};

const STEPS: Step[] = [
  {
    icon: "artwork",
    who: "You",
    ours: false,
    title: ["Your original"],
    note: ["Stays private,", "never published"],
    noteNarrow: ["Stays private, never published"],
  },
  {
    icon: "protected",
    who: "You",
    ours: false,
    title: ["Protected copy"],
    note: ["Invisible mark inside.", "This is the one", "you share"],
    noteNarrow: ["Invisible mark inside.", "This is the one you share"],
  },
  {
    icon: "online",
    who: "On the web",
    ours: false,
    title: ["Copies appear", "online"],
    note: ["On pages, shops", "and marketplaces"],
    noteNarrow: ["On pages, shops and marketplaces"],
  },
  {
    icon: "search",
    who: "We do",
    ours: true,
    title: ["We search", "the web"],
    note: ["Standard and", "Deep scans"],
    noteNarrow: ["Standard and Deep scans"],
  },
  {
    icon: "compare",
    who: "We do",
    ours: true,
    title: ["Every result is", "compared"],
    note: ["With your original:", "how it looks,", "and the mark"],
    noteNarrow: ["With your original: how it looks,", "and whether the mark is inside"],
  },
  {
    icon: "review",
    who: "You",
    ours: false,
    title: ["You review", "and decide"],
    note: ["We never contact", "anyone for you"],
    noteNarrow: ["We never contact anyone for you"],
  },
];

const DESCRIPTION =
  "Six steps in order. You upload your original, which stays private. You get a protected copy with an invisible mark and share that copy. Copies may appear online. TraceMyAssets searches the web and compares every result with your original by how it looks and by the mark. You review the result and decide what to do.";

const W_NODE = 150;
const W_GAP = 36;
const W_TOTAL = STEPS.length * W_NODE + (STEPS.length - 1) * W_GAP;
const W_HEIGHT = 250;

function Wide({ uid }: { uid: string }) {
  return (
    <Diagram
      viewBox={[W_TOTAL, W_HEIGHT]}
      title="How TraceMyAssets works"
      description={DESCRIPTION}
      titleId={`${uid}-w`}
    >
      <defs>
        <IrisGradient id={`${uid}-iris`} />
      </defs>
      {STEPS.map((step, i) => {
        const x = i * (W_NODE + W_GAP);
        return (
          <g key={step.title.join(" ")}>
            <Panel
              x={x}
              y={0}
              width={W_NODE}
              height={W_HEIGHT - 2}
              tone={step.ours ? "iris" : "plain"}
              irisId={`${uid}-iris`}
            />
            <rect
              aria-hidden="true"
              x={x}
              y={0}
              width={W_NODE}
              height={W_HEIGHT - 2}
              rx={18}
              className="tma-step-glow fill-[var(--primary-soft)]"
              style={{ animationDelay: `${i * 1.5}s` }}
            />
            <Lines x={x + W_NODE / 2} y={28} lines={[`${i + 1} · ${step.who}`]} size={12} muted={!step.ours} caps anchor="middle" weight={500} />
            <IconBadge cx={x + W_NODE / 2} cy={72} icon={step.icon} tone={step.ours ? "iris" : "plain"} irisId={`${uid}-iris`} r={25} />
            <Lines x={x + W_NODE / 2} y={124} lines={step.title} size={16} weight={500} anchor="middle" lineHeight={20} />
            <Lines
              x={x + W_NODE / 2}
              y={step.title.length > 1 ? 176 : 156}
              lines={step.note}
              size={14}
              anchor="middle"
              muted={!step.ours}
              lineHeight={18}
            />
            {i < STEPS.length - 1 && (
              <>
                <Arrow from={[x + W_NODE + 5, 72]} to={[x + W_NODE + W_GAP - 5, 72]} />
                <circle
                  aria-hidden="true"
                  cx={x + W_NODE + 4}
                  cy={72}
                  r={3.5}
                  className="tma-dot-x fill-[var(--text)]"
                  style={{ animationDelay: `${i * 1.5}s` }}
                />
              </>
            )}
          </g>
        );
      })}
    </Diagram>
  );
}

const N_W = 340;
const N_H = 100;
const N_GAP = 26;
const N_TOTAL = STEPS.length * N_H + (STEPS.length - 1) * N_GAP;

function Narrow({ uid }: { uid: string }) {
  return (
    <Diagram
      viewBox={[N_W, N_TOTAL]}
      title="How TraceMyAssets works"
      description={DESCRIPTION}
      titleId={`${uid}-n`}
    >
      <defs>
        <IrisGradient id={`${uid}-iris-n`} />
      </defs>
      {STEPS.map((step, i) => {
        const y = i * (N_H + N_GAP);
        return (
          <g key={step.title.join(" ")}>
            <Panel
              x={0}
              y={y}
              width={N_W - 2}
              height={N_H}
              tone={step.ours ? "iris" : "plain"}
              irisId={`${uid}-iris-n`}
              radius={16}
            />
            <rect
              aria-hidden="true"
              x={0}
              y={y}
              width={N_W - 2}
              height={N_H}
              rx={16}
              className="tma-step-glow fill-[var(--primary-soft)]"
              style={{ animationDelay: `${i * 1.5}s` }}
            />
            <IconBadge cx={42} cy={y + N_H / 2} icon={step.icon} tone={step.ours ? "iris" : "plain"} irisId={`${uid}-iris-n`} r={24} />
            <Lines x={80} y={y + 28} lines={[`${i + 1} · ${step.who}`]} size={12} muted={!step.ours} caps weight={500} />
            <Lines x={80} y={y + 50} lines={[step.title.join(" ")]} size={16} weight={500} />
            <Lines x={80} y={y + 71} lines={step.noteNarrow} size={14} muted={!step.ours} lineHeight={17} />
            {i < STEPS.length - 1 && (
              <>
                <Arrow from={[42, y + N_H + 3]} to={[42, y + N_H + N_GAP - 3]} />
                <circle
                  aria-hidden="true"
                  cx={42}
                  cy={y + N_H + 3}
                  r={3.5}
                  className="tma-dot-y fill-[var(--text)]"
                  style={{ animationDelay: `${i * 1.5}s` }}
                />
              </>
            )}
          </g>
        );
      })}
    </Diagram>
  );
}

/** Original -> protected copy -> copies online -> scans -> comparison -> you decide. */
export function HowItWorksDiagram() {
  const uid = useId().replace(/:/g, "");
  return (
    <DiagramCard className="mt-10">
      <ResponsivePair
        breakpoint="lg"
        wideMax={W_TOTAL}
        narrowMax={440}
        wide={<Wide uid={uid} />}
        narrow={<Narrow uid={uid} />}
      />
      <figcaption className="mt-5 text-center text-[13px] text-[var(--text-muted)]">
        The path of one artwork, from upload to your decision.
      </figcaption>
    </DiagramCard>
  );
}
