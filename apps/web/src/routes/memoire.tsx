import { Banner, Button, Card } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { BackLink, Page } from '../components/page';
import { meQuery, parentsOfMe } from '../lib/me';
import {
  accountDeletion,
  eraseMemory,
  forgetNotion,
  memoryActive,
  memoryMessage,
  memoryOff,
  memoryQuery,
  notionSummary,
  useMemoryAnswer,
} from '../lib/memory';

/**
 * E7, « Ce que Tom retient »: the offer, the student's yes or no; once active, each lesson Tom keeps,
 * theirs to see, correct and erase; otherwise what Tom knows, and who may offer it. Always, at the
 * foot, whom to ask for everything to go.
 */
export const Route = createFileRoute('/memoire')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (me?.role !== 'student') throw redirect({ to: '/' });
  },
  loader: ({ context }) => context.queryClient.query(memoryQuery),
  component: Memory,
});

function Memory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: memory } = useSuspenseQuery(memoryQuery);
  const parents = parentsOfMe(me);
  const refresh = () => queryClient.invalidateQueries({ queryKey: memoryQuery.queryKey });
  const understood = useMutation({ mutationFn: forgetNotion, onSettled: refresh });
  const erase = useMutation({ mutationFn: eraseMemory, onSettled: refresh });
  const answer = useMemoryAnswer();
  const failure = understood.error ?? erase.error ?? answer.error;
  const busy = understood.isPending || erase.isPending || answer.isPending;
  const footer = <p className="text-sm text-muted-foreground">{accountDeletion(parents)}</p>;
  const error = failure && <Banner tone="error" title={memoryMessage(failure)} />;

  // The offer, from « Ce soir » the first time it is made, from « Règle ton espace » after a « Non merci ».
  if (memory.state !== 'active' && memory.mayAnswer) {
    return (
      <Page
        title={
          <>
            Tom peut se souvenir de ce qui était <span className="highlighter">difficile</span>
          </>
        }
        back={memory.state === 'asked' ? <BackLink to="/">Tes devoirs du soir</BackLink> : <BackLink to="/espace">Règle ton espace</BackLink>}
        display
      >
        <p>
          Si tu es d’accord, Tom retient d’un soir à l’autre les leçons où tu as bloqué : combien de fois tu les as travaillées, si tu les as
          réussies, et le genre d’erreur qui revient. Il ne garde aucun de tes messages. Tu peux tout voir et tout effacer.
        </p>
        {error}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            disabled={busy}
            onClick={() => {
              answer.mutate('accepted');
            }}
          >
            D’accord
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => {
              answer.mutate('declined', {
                onSuccess: () => {
                  void navigate({ to: '/' });
                },
              });
            }}
          >
            Non merci
          </Button>
        </div>
        {footer}
      </Page>
    );
  }

  const back = <BackLink to="/espace">Règle ton espace</BackLink>;
  if (memory.state !== 'active') {
    return (
      <Page title="Ce que Tom retient" back={back} display>
        <p>{memoryOff(parents)}</p>
        {footer}
      </Page>
    );
  }

  return (
    <Page title="Ce que Tom retient" back={back} display wide>
      {/* On a computer, the lessons on the right, beside what is said of them and the two buttons. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:content-start lg:gap-x-10">
        <p className="lg:col-span-5">{memoryActive(parents)}</p>
        {error && <div className="lg:col-span-5">{error}</div>}
        <div className="lg:col-span-7 lg:col-start-6 lg:row-span-4 lg:row-start-1">
          {memory.notions.length === 0 ? (
            <p className="text-muted-foreground">Rien pour l’instant : Tom retiendra les leçons où tu bloques.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {memory.notions.map((notion) => (
                <Card
                  render={<li />}
                  key={notion.notionId}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:p-5"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-bold">{notion.label}</p>
                    <p className="text-sm text-muted-foreground">{notionSummary(notion)}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 self-start sm:self-center"
                    disabled={busy}
                    onClick={() => {
                      understood.mutate(notion.notionId);
                    }}
                  >
                    J’ai compris
                  </Button>
                </Card>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-5 border-t border-border pt-6 lg:col-span-5">
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              variant="outline"
              className="lg:self-start"
              disabled={busy}
              onClick={() => {
                erase.mutate();
              }}
            >
              Effacer et recommencer
            </Button>
            <p className="text-sm text-muted-foreground">Tom efface ce qu’il a retenu. Il retiendra de nouveau les leçons où tu bloques.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              variant="outline"
              className="border-destructive text-destructive lg:self-start"
              disabled={busy}
              onClick={() => {
                answer.mutate('declined');
              }}
            >
              Ne plus rien retenir
            </Button>
            <p className="text-sm text-muted-foreground">Tom efface ce qu’il a retenu, et ne retient plus rien d’un soir à l’autre.</p>
          </div>
        </div>
        <div className="lg:col-span-5">{footer}</div>
      </div>
    </Page>
  );
}
