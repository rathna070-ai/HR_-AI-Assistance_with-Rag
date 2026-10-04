import { Blend, KeyRound, Sparkles } from "lucide-react";
import { BotBubble } from "./BotBubble";

export function WelcomeMessage() {
  return (
    // Shown on first paint, so it is not animated in.
    <BotBubble animate={false}>
      <div data-testid="welcome-message">
        <p className="font-medium">Hi, I&apos;m RecruitBot. Describe the candidate you&apos;re looking for.</p>
        <p className="mt-2 text-text-muted">Pick a search mode in the sidebar:</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-text-muted">
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-score-vector" aria-hidden />
            <span>
              <span className="text-text-primary">Vector</span>: finds resumes with a similar meaning
            </span>
          </li>
          <li className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-score-bm25" aria-hidden />
            <span>
              <span className="text-text-primary">BM25</span>: matches your exact keywords
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Blend className="h-4 w-4 text-score-hybrid" aria-hidden />
            <span>
              <span className="text-text-primary">Hybrid</span>: combines both, with adjustable weights
            </span>
          </li>
        </ul>
      </div>
    </BotBubble>
  );
}
