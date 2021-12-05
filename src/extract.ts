import fs from 'fs';
import path from 'path';

import cheerio from 'cheerio';
import { Command } from 'commander';

import buildCourseObject from './buildCourseObject';
import type { CommandOption, CoursePage, Locales } from './types';
import { allSettled, printErrors } from './util/allSettled';
import { createDirectoryIfNotExist, listFiles, removeDirectoryIfExist } from './util/file';

const locales = ['ja', 'en'] as Locales[];

const extractCourseIds = async (filepath: string) => {
  const dom = await fs.promises.readFile(filepath, { encoding: 'utf-8' });
  const $ = cheerio.load(dom);
  const detailButtons = $('.detail-btn');
  const courseIds = Array.from(detailButtons).map((detailButton) => {
    const href = $(detailButton).attr('href') || '';

    const { courseId } = href.match(/^\/courses\/(?<courseId>.*?)\?/)?.groups || {};

    return courseId || '';
  });
  const filename = path.basename(filepath);
  const courseLinkCount = courseIds.length;
  console.log(`${filename} contains ${courseLinkCount} course links`);

  return courseIds;
};

const extractCourse = async (courseId: string, coursePageDirectory: string) => {
  const readLocaleFiles = locales.map(async (locale) => {
    const filename = `${courseId}-${locale}.html`;
    const filepath = path.resolve(coursePageDirectory, filename);
    const dom = await fs.promises.readFile(filepath, { encoding: 'utf-8' });

    return { locale, dom };
  });

  const { fulfilled: localeFiles, rejected: readFileErrors } = await allSettled(readLocaleFiles);

  const coursePages = localeFiles.reduce((acc, { locale, dom }) => {
    acc[locale] = dom;

    return acc;
  }, {} as CoursePage);

  const course = buildCourseObject(courseId, coursePages);

  if (readFileErrors.length) throw readFileErrors;

  return course;
};

const createExtractCommand = () => {
  const extract = new Command('extract');

  extract.description('extract data from all or specified downloaded pages');

  const optionDescriptions = {
    ids: {
      inDir: 'directory path that contains saved search result pages',
      outDir: 'directory path to save course ids',
    },
    course: {
      inDir: 'directory path that contains saved course syllabus pages',
      outDir: 'directory path to save course data',
    },
  };

  extract.command('ids')
    .description('extract course ids from syllabus search result pages')
    .argument('[<page-number>...]', 'specify which search result pages to extract')
    .option('-v, --verbose', 'verbose mode', false)
    .option('-r, --rm', 'remove course ids', false)
    .option('-a, --all', 'extract all pages', false)
    .option('-i, --inDir <search-result-pages-path>', optionDescriptions.ids.inDir, './data/search-result-pages')
    .option('-o, --outDir <output-directory>', optionDescriptions.ids.outDir, './data/ids')
    .action(async (pages: string[], options: CommandOption) => {
      const {
        verbose, rm, all, inDir, outDir,
      } = options;

      if (rm) {
        await removeDirectoryIfExist(outDir);
        return;
      }

      if (!inDir) throw Error(`please provide a ${optionDescriptions.ids.inDir}`);
      if (!outDir) throw Error(`please provide a ${optionDescriptions.ids.outDir}`);

      const pageNumbers = pages.map(Number);
      let filenames = pageNumbers.map((pageNumber) => `${pageNumber}.html`);

      if (all) filenames = await listFiles(inDir);

      const filepaths = filenames.map((file) => path.resolve(inDir, file));
      const extractIds = filepaths.map(extractCourseIds);

      const {
        fulfilled: extractedIds,
        rejected: extractErrors,
      } = await allSettled(extractIds);

      printErrors(extractErrors, 'extract error', { debug: verbose });

      const uniqueCourseIds = Array.from(new Set(extractedIds.flat()));

      await createDirectoryIfNotExist(outDir);

      const filename = 'ids.json';
      const filepath = path.resolve(outDir, filename);

      await fs.promises.writeFile(filepath, JSON.stringify(uniqueCourseIds));
      console.log(`saved ${filename}`);
    });

  extract.command('course')
    .description('extract course data from course syllabus pages')
    .argument('[<course-id>...]', 'specify which course syllabus pages to extract')
    .option('-v, --verbose', 'verbose mode', false)
    .option('-r, --rm', 'remove all course data', false)
    .option('-a, --all', 'extract all courses', false)
    .option('-i, --inDir <course-syllabus-pages-path>', optionDescriptions.course.inDir, './data/course-syllabus-pages')
    .option('-o, --outDir <output-directory>', optionDescriptions.course.outDir, './data/courses')
    .action(async (courses: string[], options: CommandOption) => {
      const {
        verbose, rm, all, inDir, outDir,
      } = options;

      if (rm) {
        await removeDirectoryIfExist(outDir);
        return;
      }

      if (!inDir) throw Error(`please provide a ${optionDescriptions.course.inDir}`);
      if (!outDir) throw Error(`please provide a ${optionDescriptions.course.outDir}`);

      let courseIds = courses;

      if (all) {
        const files = await listFiles(inDir);
        const courseIdPattern = new RegExp(`(?<courseId>.*)-(${locales.join('|')}).html$`);
        courseIds = files.map((file) => {
          const { courseId } = file.match(courseIdPattern)?.groups || {};
          return courseId;
        });
      }

      const uniqueCourseIds = Array.from(new Set(courseIds.flat()));
      const extractCourses = uniqueCourseIds.map((courseId) => extractCourse(courseId, inDir));

      const {
        fulfilled: extractedCourses,
        rejected: extractErrors,
      } = await allSettled(extractCourses);

      printErrors(extractErrors, 'extract error', { debug: verbose });

      await createDirectoryIfNotExist(outDir);

      const saveCourses = extractedCourses.map(async (course) => {
        const courseId = course.id;
        const filename = `${courseId}.json`;
        const filepath = path.resolve(outDir, filename);

        await fs.promises.writeFile(filepath, JSON.stringify(course));
        console.log(`Done writing ${courseId}`);
      });

      const { rejected: saveErrors } = await allSettled(saveCourses);

      printErrors(saveErrors, 'save error', { debug: verbose });
    });

  return extract;
};

export default createExtractCommand;
