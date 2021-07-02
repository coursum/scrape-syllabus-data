import { Command } from 'commander';

import createExtractCommand from './extract';
import createFetchCommand from './fetch';

const program = new Command('scrape');

program.version('0.0.1')
  .addCommand(createFetchCommand())
  .addCommand(createExtractCommand())
  .parse();
