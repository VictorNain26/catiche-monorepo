import {
  AppShell,
  Banner,
  BarChart,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DrawerContent,
  EmptyState,
  Fold,
  Input,
  List,
  ListItem,
  NativeSelect,
  NativeSelectOption,
  Section,
  Skeleton,
  Toaster,
  toast,
  type Destination,
} from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { BookOpenIcon, CalendarDaysIcon, CopyIcon, HouseIcon, MessagesSquareIcon, PlusIcon, UserRoundIcon } from 'lucide-react';

/**
 * Every component of @repo/ui in its states, on invented data and without the API: what the e2e
 * suite visits (tooling/playwright-web/tests/catalogue.spec.ts), and where a screen starts from.
 * Linked from nowhere.
 */
export const Route = createFileRoute('/catalogue')({ component: Catalogue });

const DESTINATIONS: readonly [Destination, Destination, Destination, Destination] = [
  { icon: HouseIcon, label: 'Accueil', link: <a href="#accueil" aria-current="page" /> },
  { icon: MessagesSquareIcon, label: 'Séances', link: <a href="#seances" /> },
  { icon: BookOpenIcon, label: 'Programme', link: <a href="#programme" /> },
  { icon: CalendarDaysIcon, label: 'Semaine', link: <a href="#semaine" /> },
];

const DAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const minutes = (value: number) => `${String(value)} min`;

function Catalogue() {
  return (
    <AppShell
      logo={<span className="font-heading text-2xl font-extrabold text-primary">Catiche</span>}
      profile={
        <Button asChild variant="ghost" size="sm">
          <a href="#profil">
            <UserRoundIcon aria-hidden="true" nonScalingStroke className="size-6" />
            Léa
          </a>
        </Button>
      }
      navigationLabel="Navigation principale"
      destinations={DESTINATIONS}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl text-foreground">Catalogue des composants</h1>
          <p className="max-w-prose text-muted-foreground">
            Chaque composant de <code className="font-mono">@repo/ui</code> dans ses états, sur des données inventées. Le mode clair ou sombre suit le
            réglage de l’appareil.
          </p>
        </header>
        <div className="grid gap-10 lg:grid-cols-2">
          <Buttons />
          <Fields />
          <Lists />
          <Cards />
          <Empty />
          <Loading />
          <Banners />
          <Overlays />
          <Toasts />
        </div>
        <Charts />
        <Section title="Repli">
          <Fold title="Ce que Tom retient">
            <p className="text-muted-foreground">Ce qui a résisté d’une séance à l’autre, que tu peux effacer.</p>
          </Fold>
        </Section>
      </div>
      <Toaster />
    </AppShell>
  );
}

function Buttons() {
  return (
    <Section title="Boutons" description="Un seul bouton principal par écran ; un libellé qui dit ce qu’il fait.">
      <div className="flex flex-wrap gap-3">
        <Button>Ouvrir une séance</Button>
        <Button variant="outline">Annuler</Button>
        <Button variant="ghost">Plus tard</Button>
        <Button size="lg">
          <PlusIcon aria-hidden="true" nonScalingStroke className="size-6" />
          Ajouter un enfant
        </Button>
        <Button disabled>Envoi en cours</Button>
      </div>
    </Section>
  );
}

function Fields() {
  return (
    <Section title="Champs">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-bold">Votre adresse e-mail</span>
          <Input type="email" autoComplete="off" defaultValue="parent@example.fr" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-bold">Le code reçu</span>
          <Input variant="error" inputMode="numeric" defaultValue="12" aria-invalid="true" aria-describedby="code-erreur" />
          <span id="code-erreur" className="text-sm text-destructive">
            Le code a six chiffres : vérifiez l’e-mail reçu.
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-bold">Classe</span>
          <NativeSelect defaultValue="5e">
            {['6e', '5e', '4e', '3e'].map((grade) => (
              <NativeSelectOption key={grade} value={grade}>
                {grade}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-bold">Prénom (désactivé)</span>
          <Input disabled defaultValue="Léa" />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <Checkbox defaultChecked />
          Recevoir le point de la semaine
        </label>
        <label className="flex min-h-11 items-center gap-3 text-disabled-foreground">
          <Checkbox disabled />
          Une option indisponible
        </label>
      </div>
    </Section>
  );
}

function Lists() {
  return (
    <Section title="Section et liste" description="Une section nomme une partie de l’écran ; une liste range ce qui se ressemble.">
      <Section level={3} title="Tes séances" description="Les plus récentes d’abord." action={<Button variant="outline">Tout voir</Button>}>
        <List>
          <ListItem asChild title="Les fractions égales" meta="Mathématiques · mardi">
            <a href="#seance-1" />
          </ListItem>
          <ListItem asChild title="Le passé composé" meta="Français · lundi">
            <a href="#seance-2" />
          </ListItem>
          <ListItem title="Un appareil relié" meta="iPhone · depuis le 3 octobre" />
        </List>
      </Section>
    </Section>
  );
}

function Cards() {
  return (
    <Section title="Carte" description="Un bloc à part, qui mène à un détail ; son contenu suit sa propre largeur.">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        {['Léa', 'Noé'].map((name) => (
          <Card key={name}>
            <div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg text-foreground">{name}</h3>
                <p className="text-muted-foreground">5e · 3 séances cette semaine</p>
              </div>
              <Button asChild variant="outline">
                <a href={`#fiche-${name}`}>Voir la fiche</a>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Empty() {
  return (
    <Section title="État vide">
      <EmptyState
        icon={MessagesSquareIcon}
        title="Tes séances viendront ici"
        description="Un exercice qui résiste ? Ouvre une séance avec Tom ; elle s’ajoute à cette liste."
        action={<Button>Ouvrir une séance</Button>}
      />
    </Section>
  );
}

function Loading() {
  return (
    <Section title="Squelette" description="Rien pendant une seconde, puis la forme de ce qui vient.">
      <p className="sr-only">Chargement des séances…</p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-2/3" />
      </div>
    </Section>
  );
}

function Banners() {
  return (
    <Section title="Bandeaux" description="Un seul par page, en haut ; ici, chacun de ses tons.">
      <div className="flex flex-col gap-3">
        <Banner tone="info" title="La bêta est fermée">
          Les inscriptions ouvrent avec les premières familles invitées.
        </Banner>
        <Banner tone="success" title="C’est noté" />
        <Banner tone="warning" title="Encore une séance aujourd’hui">
          Le quota du jour revient demain matin.
        </Banner>
        <Banner tone="error" title="La séance n’a pas pu s’ouvrir">
          Réessaie dans un instant.
        </Banner>
      </div>
    </Section>
  );
}

function Overlays() {
  return (
    <Section title="Dialogue et tiroir">
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Ouvrir le dialogue</Button>
          </DialogTrigger>
          <DialogContent title="Supprimer cette séance ?" description="Elle disparaît de ton historique. Ce que Tom retient reste.">
            <div className="flex flex-wrap justify-end gap-3">
              <DialogClose asChild>
                <Button variant="outline">Garder la séance</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Supprimer</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Ouvrir le tiroir</Button>
          </DialogTrigger>
          <DrawerContent title="Trier les séances">
            <div className="flex flex-col gap-2">
              {['Les plus récentes', 'Par matière'].map((order) => (
                <DialogClose key={order} asChild>
                  <Button variant="outline">{order}</Button>
                </DialogClose>
              ))}
            </div>
          </DrawerContent>
        </Dialog>
      </div>
    </Section>
  );
}

function Toasts() {
  return (
    <Section title="Toast" description="Un mot bref sur ce qui vient de se faire ; jamais une erreur de champ.">
      <div>
        <Button
          variant="outline"
          onClick={() => {
            toast('Le lien est copié.', { description: 'Collez-le sur l’appareil de votre enfant.' });
          }}
        >
          <CopyIcon aria-hidden="true" nonScalingStroke className="size-6" />
          Afficher un toast
        </Button>
      </div>
    </Section>
  );
}

function Charts() {
  return (
    <Section title="Graphiques" description="La phrase d’abord, des barres depuis zéro étiquetées, un tableau des valeurs pour les lecteurs d’écran.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <BarChart
            message="Léa a travaillé 2 h 10 cette semaine, surtout le mercredi."
            orientation="vertical"
            categoryLabel="Jour"
            categories={DAYS}
            series={[{ label: 'Temps', values: [20, 0, 45, 25, 15, 25, 0] }]}
            format={minutes}
          />
        </Card>
        <Card>
          <BarChart
            message="Les mathématiques prennent la moitié de son temps cette semaine, contre un tiers la semaine dernière."
            orientation="horizontal"
            categoryLabel="Matière"
            categories={['Français', 'Mathématiques', 'Anglais', 'Histoire-géographie']}
            series={[
              { label: 'Cette semaine', values: [30, 65, 20, 15] },
              { label: 'Semaine dernière', values: [45, 35, 20, 5] },
            ]}
            format={minutes}
          />
        </Card>
      </div>
    </Section>
  );
}
