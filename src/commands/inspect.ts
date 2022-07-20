import fs from 'fs';
import path from 'path';

import { Command } from 'commander';

import type { CommandOption, CoursePage, Inspection } from '../types';
import { createDirectoryIfNotExist, removeDirectoryIfExist } from '../util/file';

const createInspectCommand = () => {
  const inspect = new Command('inspect');

  const optionDescriptions = {
    inDir: 'directory path that contains saved course syllabus pages',
    outDir: 'directory path to save inspection data',
  };

  inspect.description('inspect course data from course syllabus pages')
    .argument('<inspection-filepath>', 'specify which course syllabus pages to inspect')
    .option('-r, --rm', 'remove all inspection files', false)
    .option('-o, --outDir <output-directory>', optionDescriptions.outDir, './data/inspection')
    .action(async (inspectionFilepath: string, options: CommandOption) => {
      const { rm, outDir } = options;

      if (rm) {
        await removeDirectoryIfExist(outDir);
        return;
      }

      if (!outDir) throw Error(`please provide a ${optionDescriptions.outDir}`);

      const courses: Record<string, CoursePage> = (
        JSON.parse(await fs.promises.readFile('./data/courses.json', { encoding: 'utf-8' }))
      );

      const inspection: Inspection = (
        await import(path.resolve(process.cwd(), inspectionFilepath))
      ).default;

      inspection.ids = (
        inspection.ids.length === 0
          ? Object.keys(courses)
          : Array.from(new Set(inspection.ids))
      );

      const extractedData = inspection.ids.map((courseId) => (
        inspection.extractor(courseId, courses[courseId])
      ));

      await createDirectoryIfNotExist(outDir);

      const inspectionResult = inspection.inspector(extractedData);
      const filename = inspection.output;
      const filepath = path.resolve(outDir, filename);

      await fs.promises.writeFile(filepath, JSON.stringify(inspectionResult, null, 2));
      console.log(`saved ${filename}`);
    });

  return inspect;
};

export default createInspectCommand;
