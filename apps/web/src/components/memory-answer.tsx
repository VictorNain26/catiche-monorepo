import { Banner, Button, Card } from '@repo/ui';
import { memoryMessage, type MemoryChoice, type useMemoryAnswer } from '../lib/memory';

/**
 * What the memory is, and the student's yes or no. The mutation belongs to the screen, which
 * outlives this offer: it says the answer back once the offer is gone.
 */
export function MemoryAnswer({
  answer,
  onAnswered,
}: {
  answer: ReturnType<typeof useMemoryAnswer>;
  /** Where the offer leaves nothing in its place, the answer is said back. */
  onAnswered?: (choice: MemoryChoice) => void;
}) {
  const choose = (choice: MemoryChoice) => {
    answer.mutate(choice, {
      onSuccess: () => {
        onAnswered?.(choice);
      },
    });
  };
  return (
    <Card render={<section aria-labelledby="memory-offer" />} className="flex flex-col gap-3">
      <h2 id="memory-offer" className="text-lg font-bold">
        Tom peut retenir ce qui a résisté
      </h2>
      <p className="text-sm">
        D’une séance à l’autre, Tom se souviendrait des notions que tu as travaillées et de ce qui a été difficile, pour mieux t’aider. Il ne garde
        rien de ce que tu écris, et tu pourras tout voir et tout effacer.
      </p>
      {answer.error && <Banner tone="error" title={memoryMessage(answer.error)} />}
      <div className="flex gap-2">
        <Button
          disabled={answer.isPending}
          onClick={() => {
            choose('accepted');
          }}
        >
          D’accord
        </Button>
        <Button
          variant="outline"
          disabled={answer.isPending}
          onClick={() => {
            choose('declined');
          }}
        >
          Non merci
        </Button>
      </div>
    </Card>
  );
}
