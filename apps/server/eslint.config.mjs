import boundaries from 'eslint-plugin-boundaries';
import { NO_MOCK_MODULE } from '@repo/eslint-config/base';
import { nodeConfig } from '@repo/eslint-config/node';

// The dependency rules of the server, held here and nowhere else: what is not allowed is refused.
const elements = [
  { type: 'platform', pattern: 'src/platform/*', partialMatch: false, capture: ['part'] },
  { type: 'domain', pattern: 'src/domain', partialMatch: false },
  { type: 'module', pattern: 'src/modules/*', partialMatch: false, capture: ['module'] },
  { type: 'referential', pattern: 'src/referential', partialMatch: false },
  { type: 'eval', pattern: 'src/eval', partialMatch: false },
  { type: 'testing', pattern: 'src/testing', partialMatch: false },
];

// Single files are classified by file descriptors, folders by elements (jsboundaries.dev, « Elements »).
const files = [
  { pattern: '**/*.test.ts', category: 'test' },
  { pattern: ['src/main.ts', 'src/migrate.ts', 'src/invite.ts', 'src/evaluate.ts', 'src/app.ts', 'src/contract.ts'], category: 'root' },
  // The harness plays through the tests' client and inbox, nothing else of src/testing: its calls are the web's.
  { pattern: 'src/evaluate.ts', category: 'harness' },
  { pattern: ['src/testing/http.ts', 'src/testing/mailer.ts'], category: 'client' },
  { pattern: 'src/eval/judge.ts', category: 'judge' },
  // The app a test wires, as main.ts does.
  { pattern: 'src/app.ts', category: 'app' },
  // A module's fixtures, for its tests only.
  { pattern: 'src/modules/*/testing.ts', category: 'test' },
  { pattern: 'src/config.ts', category: 'config' },
  // In a module, routes → service → repository, and only the repository and the schema touch the database.
  { pattern: 'src/modules/*/index.ts', category: 'module-index' },
  { pattern: 'src/modules/*/routes.ts', category: 'routes' },
  { pattern: 'src/modules/*/service.ts', category: 'service' },
  // The tutor's turn, which the service opens and runs: the repository, core/ and the platform, not the referential.
  { pattern: 'src/modules/*/turn-pipeline.ts', category: 'pipeline' },
  { pattern: 'src/modules/*/repository.ts', category: 'repository' },
  // A repository too long for one file keeps its parts in repository/, which only it imports.
  { pattern: 'src/modules/*/repository/*.ts', category: 'repository-part' },
  { pattern: 'src/modules/*/schema.ts', category: 'schema' },
  // A module's core/: its pure decisions and the model steps they call, which the service
  // composes. They may read the referential, the data of the programmes.
  { pattern: 'src/modules/*/core/*.ts', category: 'core' },
];

// Only the entry points read the environment: everything else receives the config.
const ENTRY_POINTS = ['src/main.ts', 'src/migrate.ts', 'src/invite.ts', 'src/evaluate.ts'];
const NO_ENVIRONMENT = ['Bun', 'process'].map((object) => ({
  object,
  property: 'env',
  message: `L'environnement ne se lit que dans ${ENTRY_POINTS.join(', ')} : recevoir la config en paramètre.`,
}));

const element = (type) => ({ element: { type } });
const file = (categories) => ({ file: { categories } });
const allow = (from, ...to) => ({ from, allow: { to } });
const sameModule = (categories) => ({
  element: { type: 'module', captured: { module: '{{ from.element.captured.module }}' } },
  file: { categories },
});
const inModule = (categories) => ({ element: { type: 'module' }, file: { categories } });

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  ...nodeConfig,
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': elements,
      'boundaries/files': files,
      'import/resolver': { node: { extensions: ['.ts'] } },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Also between files of one element: the layers inside a module are checked too.
          checkInternals: true,
          policies: [
            // The harness (src/evaluate.ts) wires the app as main.ts does, and plays the evaluation set.
            allow(file('root'), file(['root', 'config']), element(['platform', 'domain', 'eval']), inModule(['module-index'])),
            // Another module is reached by its index.ts only.
            allow(
              inModule(['module-index']),
              sameModule(['routes', 'service', 'pipeline', 'repository']),
              inModule(['module-index']),
              element('platform'),
            ),
            allow(inModule(['routes']), sameModule(['service', 'core']), element(['platform', 'domain'])),
            // The referential is the programmes' data: the service checks a notion it is given against it.
            allow(
              inModule(['service']),
              sameModule(['pipeline', 'repository', 'core']),
              inModule(['module-index']),
              element(['platform', 'domain', 'referential']),
            ),
            allow(inModule(['pipeline']), sameModule(['repository', 'core']), inModule(['module-index']), element(['platform', 'domain'])),
            allow(inModule(['core']), sameModule(['core']), element(['platform', 'domain', 'referential'])),
            // The tables store the shapes core/ decides.
            allow(inModule(['repository', 'repository-part']), sameModule(['repository-part', 'schema', 'core']), element(['platform', 'domain'])),
            allow(inModule(['schema']), sameModule(['core']), element(['platform', 'domain'])),
            // The domain imports nothing: the platform may read its value lists (a reasoning effort).
            allow(element('platform'), element(['platform', 'domain']), file('config')),
            allow(element('domain'), element('domain')),
            allow(element('referential'), element(['referential', 'domain'])),
            allow(element('eval'), element(['eval', 'referential', 'domain'])),
            // The judge calls the model through the platform's client; the rest of eval stays without I/O.
            allow(file('judge'), element('platform')),
            allow(file('harness'), file('client')),
            // A test's app is wired as main.ts wires it.
            allow(element('testing'), element(['testing', 'platform']), file(['app', 'config']), inModule(['module-index'])),
            allow(file('test'), file(['root', 'config']), element(['platform', 'domain', 'module', 'referential', 'eval', 'testing'])),
          ],
        },
      ],
      // A file outside every element and descriptor would escape the rules above.
      'boundaries/no-unknown-files': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSTypeReference[typeName.type='ImportExpression']",
          message: 'Les imports dynamiques dans les types sont interdits. Utilisez des imports statiques en haut de fichier.',
        },
        {
          // A duration: now minus a start kept in a variable. The wall clock jumps (NTP, WSL
          // resyncing): a test once measured 5.6 s for 2.7 s. A date computed from now minus a
          // constant (`Date.now() - DAY_MS`) is no duration.
          selector:
            "BinaryExpression[operator='-'][right.type='Identifier'][right.name=/^[a-z]/] > CallExpression.left[callee.object.name='Date'][callee.property.name='now']",
          message: 'Une durée se mesure sur une horloge monotone : performance.now(), pas Date.now().',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [...ENTRY_POINTS, 'src/testing/**'],
    rules: {
      'no-restricted-properties': ['error', NO_MOCK_MODULE, ...NO_ENVIRONMENT],
    },
  },
];
