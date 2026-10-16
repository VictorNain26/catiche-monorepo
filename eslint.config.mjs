import { nodeConfig } from '@repo/eslint-config/node';

// The root's own scripts (`lint:scripts`); each workspace has its own configuration.
/** @type {import("eslint").Linter.Config[]} */
export default nodeConfig;
