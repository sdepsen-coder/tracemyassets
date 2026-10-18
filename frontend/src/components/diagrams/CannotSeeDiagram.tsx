import { useId } from "react";

import { Diagram, DiagramCard, IconBadge, IrisGradient, Lines, Panel, ResponsivePair } from "./primitives";

const DESCRIPTION =
  "Two areas. Inside our reach: public web pages that a search engine has indexed, including shop pages when they are indexed. Out of reach: private groups, closed apps, some social networks and pages nobody has indexed. A match is a possible match, never proof.";

const INSIDE = ["Public web pages that", "a search engine has indexed,", "shop pages too when indexed"];
const OUTSIDE = ["Private groups", "Closed apps", "Some social networks", "Pages nobody has indexed"];

const W = 720;
const W_H = 262;

function Wide({ uid }: { uid: string }) {
  const iris = `${uid}-iris`;
  return (
    <Diagram viewBox={[W, W_H]} title="What we can and cannot see" description={DESCRIPTION} titleId={`${uid}-w`}>
      <defs>
        <IrisGradient id={iris} />
      </defs>

      <Panel x={0} y={0} width={340} height={176} tone="iris" irisId={iris} />
      <IconBadge cx={44} cy={44} icon="globe" tone="plain" irisId={iris} r={22} />
      <Lines x={78} y={50} lines={["We can look here"]} size={16} weight={500} />
      <Lines x={26} y={102} lines={INSIDE} size={14} lineHeight={20} />

      <Panel x={380} y={0} width={340} height={176} tone="dashed" />
      <IconBadge cx={424} cy={44} icon="lock" tone="plain" irisId={iris} r={22} />
      <Lines x={458} y={50} lines={["We cannot look here"]} size={16} weight={500} />
      <Lines x={406} y={102} lines={OUTSIDE} size={14} lineHeight={20} muted />

      <Panel x={0} y={196} width={720} height={64} />
      <Lines x={360} y={234} lines={["A match is a possible match, never proof."]} size={16} weight={500} anchor="middle" />
    </Diagram>
  );
}

const N_W = 340;
const N_H = 428;

function Narrow({ uid }: { uid: string }) {
  const iris = `${uid}-iris-n`;
  return (
    <Diagram viewBox={[N_W, N_H]} title="What we can and cannot see" description={DESCRIPTION} titleId={`${uid}-n`}>
      <defs>
        <IrisGradient id={iris} />
      </defs>

      <Panel x={0} y={0} width={338} height={146} tone="iris" irisId={iris} radius={16} />
      <IconBadge cx={38} cy={38} icon="globe" tone="plain" irisId={iris} r={20} />
      <Lines x={68} y={44} lines={["We can look here"]} size={16} weight={500} />
      <Lines x={20} y={88} lines={INSIDE} size={14} lineHeight={20} />

      <Panel x={0} y={162} width={338} height={170} tone="dashed" radius={16} />
      <IconBadge cx={38} cy={200} icon="lock" tone="plain" irisId={iris} r={20} />
      <Lines x={68} y={206} lines={["We cannot look here"]} size={16} weight={500} />
      <Lines x={20} y={250} lines={OUTSIDE} size={14} lineHeight={20} muted />

      <Panel x={0} y={348} width={338} height={74} radius={16} />
      <Lines x={169} y={380} lines={["A match is a possible match,", "never proof."]} size={16} weight={500} anchor="middle" lineHeight={22} />
    </Diagram>
  );
}

/** Public indexed pages (in reach) versus private places (out of reach). */
export function CannotSeeDiagram({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <DiagramCard className={className}>
      <ResponsivePair
        breakpoint="sm"
        wideMax={W}
        narrowMax={400}
        wide={<Wide uid={uid} />}
        narrow={<Narrow uid={uid} />}
      />
    </DiagramCard>
  );
}
