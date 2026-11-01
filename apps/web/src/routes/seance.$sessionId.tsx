import { useChat } from '@ai-sdk/react';
import { Banner, Button, Input } from '@repo/ui';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { DefaultChatTransport } from 'ai';
import { useEffect, useId, useRef, useState } from 'react';
import { BackLink, Page } from '../components/page';
import { TomHead } from '../components/tom';
import { TomText } from '../components/tom-text';
import { api, isProblem } from '../lib/api';
import type { TurnStep } from '@repo/server/contract';
import { chatMessage, isTurnStep, messagesQuery, textOf, toUIMessage, waitingText, type ChatMessage, type TurnBody } from '../lib/chat';
import { meQuery } from '../lib/me';

/** A session with Tom: what was said, then the chat. */
export const Route = createFileRoute('/seance/$sessionId')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (me?.role !== 'student') throw redirect({ to: '/' });
  },
  loader: ({ context, params }) => context.queryClient.query(messagesQuery(params.sessionId)),
  component: Session,
});

function Session() {
  const { sessionId } = Route.useParams();
  const { sessionLost } = Route.useRouteContext();
  const { data: stored } = useSuspenseQuery(messagesQuery(sessionId));
  const [text, setText] = useState('');
  const aiNoticeId = useId();
  const [step, setStep] = useState<TurnStep | null>(null);
  // The server keeps the conversation: a turn sends the new message only, to the chat's session.
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        prepareSendMessagesRequest: ({ id, messages: shown }) => ({
          api: api.sessions[':id'].messages.$path({ param: { id } }),
          body: { text: textOf(shown.at(-1)) } satisfies TurnBody,
        }),
      }),
  );
  const { messages, setMessages, sendMessage, status, error } = useChat<ChatMessage>({
    id: sessionId,
    messages: stored.map(toUIMessage),
    transport,
    onData: (part) => {
      if (isTurnStep(part.data)) setStep(part.data);
    },
    // A refused or failed turn stored nothing: its message leaves the conversation and comes back
    // to the field, to be sent again.
    onError: (failure) => {
      if (isProblem(failure, 'UNAUTHENTICATED')) {
        sessionLost();
        return;
      }
      setMessages((shown) => {
        const last = shown.at(-1);
        if (last?.role !== 'user') return shown;
        setText(textOf(last));
        return shown.slice(0, -1);
      });
    },
  });

  // The field stays in sight up in the conversation: what a send brings comes into sight with it.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, status, error]);

  const busy = status === 'submitted' || status === 'streaming';
  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setText('');
    setStep(null);
    void sendMessage({ text: trimmed });
  };

  return (
    <Page title="Séance avec Tom" back={<BackLink to="/">Tes devoirs du soir</BackLink>}>
      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        <TomHead />
        Tom t’aide à trouver, il ne fait pas à ta place.
      </p>
      <ol aria-label="Conversation" className="flex flex-col gap-5">
        {messages.map((message) =>
          message.role === 'user' ? (
            <li key={message.id} className="max-w-[85%] self-end rounded-2xl bg-secondary px-4 py-3 whitespace-pre-wrap text-secondary-foreground">
              <span className="sr-only">Toi : </span>
              {textOf(message)}
            </li>
          ) : (
            <li key={message.id} className="flex max-w-full gap-3 self-start text-lg leading-relaxed text-foreground">
              <TomHead className="mt-0.5" />
              <div className="min-w-0">
                <span className="sr-only">Tom : </span>
                <TomText>{textOf(message)}</TomText>
              </div>
            </li>
          ),
        )}
      </ol>
      {/* In the page before the wait, so that what it says is read out as it comes. */}
      <div role="status">{status === 'submitted' && <Banner tone="info" title={waitingText(step)} />}</div>
      {error && <Banner tone="error" title={chatMessage(error)} />}
      <div ref={endRef} />
      <div className="sticky bottom-0 flex flex-col gap-2 bg-background pt-2 pb-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label htmlFor="message" className="sr-only">
            Ton message
          </label>
          <Input
            id="message"
            autoComplete="off"
            aria-describedby={aiNoticeId}
            placeholder="Ta question, ou ton essai"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
          <Button type="submit" disabled={busy || text.trim() === ''}>
            Envoyer
          </Button>
        </form>
        <p id={aiNoticeId} className="text-sm text-muted-foreground">
          Tom est une IA : il peut se tromper, vérifie avec ton cours.
        </p>
      </div>
    </Page>
  );
}
