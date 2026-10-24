import { Banner, Button, toast } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useConfirmation } from '../lib/confirmation';
import { historyQuery } from '../lib/history';
import {
  cancelDeletion,
  deleteStudent,
  deletionAsked,
  deletionDay,
  deletionWarning,
  householdMessage,
  studentsQuery,
  type Student,
} from '../lib/household';

/** The child's list and history read again, after a deletion asked or cancelled. */
function useRefresh(studentId: string) {
  const queryClient = useQueryClient();
  return () => Promise.all([studentsQuery, historyQuery(studentId)].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })));
}

/**
 * The deletion another parent asked, or this one, at the top of « Gérer » (A7): who asked it, the
 * day it is done, and its cancelling, for any parent.
 */
export function DeletionAsked({ child, deletion }: { child: Student; deletion: NonNullable<Student['deletion']> }) {
  const refresh = useRefresh(child.id);
  const cancel = useMutation({
    mutationFn: () => cancelDeletion(child.id),
    onSuccess: () => {
      toast('La suppression est annulée.');
      return refresh();
    },
  });

  return (
    <>
      <Banner tone="warning" title={deletionAsked(child.name, deletion.by)}>
        {deletionDay(deletion.dueAt)}
      </Banner>
      {cancel.error && <Banner tone="error" title={householdMessage(cancel.error)} />}
      <Button
        disabled={cancel.isPending}
        className="sm:self-start"
        onClick={() => {
          cancel.mutate();
        }}
      >
        Annuler la suppression
      </Button>
    </>
  );
}

/**
 * The deletion of the child's account (`app-cible.md`, question tranchée 1): at once when no other
 * parent follows them, back to the home; else asked, which the other parents may cancel for 7 days.
 */
export function DeleteStudent({ child }: { child: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = useRefresh(child.id);
  const deletion = useConfirmation();
  const alone = child.parents.length === 0;
  const remove = useMutation({
    mutationFn: () => deleteStudent(child.id),
    onSuccess: async (asked) => {
      if (asked) {
        deletion.close();
        await refresh();
        return;
      }
      await navigate({ to: '/foyer' });
      await queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey });
    },
  });

  return deletion.confirming ? (
    <>
      <Banner
        tone="warning"
        focusOnMount
        title={alone ? 'Ses séances seront effacées et ses appareils déconnectés. C’est définitif.' : deletionWarning(child.parents)}
      />
      {remove.error && <Banner tone="error" title={householdMessage(remove.error)} />}
      <Button
        disabled={remove.isPending}
        onClick={() => {
          remove.mutate();
        }}
      >
        {alone ? 'Supprimer définitivement' : 'Demander la suppression'}
      </Button>
      <Button variant="outline" onClick={deletion.cancel}>
        Annuler
      </Button>
    </>
  ) : (
    <Button
      ref={deletion.opener('confirm')}
      variant="outline"
      onClick={() => {
        deletion.open('confirm');
      }}
    >
      Supprimer le compte de {child.name}
    </Button>
  );
}
