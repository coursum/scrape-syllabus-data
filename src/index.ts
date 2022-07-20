import './loadEnv';

import { Command } from 'commander';

import createExtractCommand from './commands/extract';
import createFetchCommand from './commands/fetch';
import createInspectCommand from './commands/inspect';

const program = new Command('scrape');

program.version('0.0.1')
  .addCommand(createFetchCommand())
  .addCommand(createExtractCommand())
  .addCommand(createInspectCommand())
  .parse();
