import { Component, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaSceneBridge } from "@/hooks/usePersonaSceneBridge";
import { PersonaCard } from "./PersonaCard";

function PlaceholderPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "bg-white border border-gray-200",
        className
      )}
    >
      <div className="relative flex flex-col items-center justify-center gap-3 py-6 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <Sparkles className="h-6 w-6 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">Choose a tradition to meet your guide</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Select a faith tradition from the navigation panel
          </p>
        </div>
      </div>
    </div>
  );
}

interface PersonaSurfaceInnerProps {
  className?: string;
}

function PersonaSurfaceInner({ className }: PersonaSurfaceInnerProps) {
  const { persona, voiceState, mood, transcript } = usePersonaSceneBridge();

  if (!persona) {
    return <PlaceholderPanel className={className} />;
  }

  return (
    <PersonaCard
      persona={persona}
      voiceState={voiceState}
      mood={mood}
      transcript={transcript}
      className={className}
    />
  );
}

interface BoundaryState {
  hasError: boolean;
}

class PersonaSurfaceBoundary extends Component<
  { children: ReactNode; className?: string },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <PlaceholderPanel className={this.props.className} />;
    }
    return this.props.children;
  }
}

interface PersonaSurfaceProps {
  className?: string;
}

export function PersonaSurface({ className }: PersonaSurfaceProps) {
  return (
    <PersonaSurfaceBoundary className={className}>
      <PersonaSurfaceInner className={className} />
    </PersonaSurfaceBoundary>
  );
}
