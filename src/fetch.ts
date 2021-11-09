import fs from 'fs';
import path from 'path';

import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import cheerio from 'cheerio';
import { Command } from 'commander';

import type { CommandOption, Locales } from './types';
import { allSettled, printErrors } from './util/allSettled';
import { createDirectoryIfNotExist, removeDirectoryIfExist } from './util/file';

const locales = ['ja', 'en'] as Locales[];

const defaultMaxRPS = 10;
const http = rateLimit(axios.create(), { maxRPS: defaultMaxRPS });

const host = 'https://syllabus.sfc.keio.ac.jp/courses';

const { SESSION } = process.env;

if (!SESSION) {
  console.error('Doesn\'t provide session in .env');
  process.exit();
}

const createDefaultQuery = () => {
  const defaultQuery = new URLSearchParams({
    locale: 'ja',
    'search[title]': '',
    'search[year]': '2021',
    'search[semester]': '',
    'search[sub_semester]': '',
    'search[teacher_name]': '',
    'search[summary]': '',
    button: '',
  });

  return defaultQuery;
};

const getPageCount = async () => {
  const query = createDefaultQuery();
  const url = `${host}?${query.toString()}`;
  let pageCount: number;

  try {
    const response = await http.get(url);
    const dom = response.data;
    const $ = cheerio.load(dom);
    const UrlLastPage = new URL(host + $('.pager .pagination .last a').attr('href'));
    const queryPage = UrlLastPage.searchParams.get('page');

    pageCount = Number(queryPage);
  } catch (error) {
    console.error('Error: failed to get page count');

    throw error;
  }

  return pageCount;
};

const fetchSearchResultPage = async (pageNumber: number, savingDirectory: string) => {
  const query = createDefaultQuery();
  query.set('page', String(pageNumber));

  const url = `${host}?${query.toString()}`;
  let dom = '';

  try {
    const response = await http.get(url);
    dom = response.data;
  } catch (error) {
    console.error(`Error: failed to fetch search result page ${pageNumber}`);

    throw error;
  }

  const filename = `${pageNumber}.html`;
  const filepath = path.resolve(savingDirectory, filename);

  await fs.promises.writeFile(filepath, dom);
  console.log(`saved ${filename}`);
};

const fetchCourseSyllabusPage = async (courseId: string, locale: 'ja' | 'en', savingDirectory: string) => {
  const url = `https://syllabus.sfc.keio.ac.jp/courses/${courseId}?locale=${locale}`;

  const Cookie = `_sfc_open_syllabus_session=${SESSION};`;

  let dom = '';
  try {
    const response = await http.get(url, { headers: { Cookie } });
    dom = response.data;

    if (dom.includes('シラバスを更に閲覧するにはCNSアカウントでログインが必要です')
    || dom.includes('To view more information, you need to log in with your CNS account.')) {
      throw Error('Need to login, maybe session is wrong');
    }
  } catch (error) {
    console.error(`Error: failed to fetch ${locale.toUpperCase()} page of the course (id: ${courseId})`);
    throw error;
  }

  const filename = `${courseId}-${locale}.html`;
  const filepath = path.resolve(savingDirectory, filename);

  await fs.promises.writeFile(filepath, dom);
  console.log(`saved ${filename}`);
};

const createFetchCommand = () => {
  const fetch = new Command('fetch');

  fetch.description('download syllabus pages');

  const optionDescriptions = {
    page: {
      outDir: 'directory path to save search result pages',
    },
    course: {
      inFile: 'file path that contains extracted id',
      outDir: 'directory path to save course syllabus pages',
    },
  };

  fetch.command('page')
    .description('download syllabus search result pages')
    .argument('[<page-number>...]', 'specify which search result pages to download')
    .option('-v, --verbose', 'verbose mode', false)
    .option('-r, --rm', 'remove all syllabus search result pages', false)
    .option('-a, --all', 'download all syllabus search result pages', false)
    .option('-o, --outDir <output-directory>', optionDescriptions.page.outDir, './data/search-result-pages')
    .option('-r, --maxRPS <max-requests-per-second>', 'the max amount requests that can be sent per second', String(defaultMaxRPS))
    .action(async (pages: string[], options: CommandOption) => {
      const {
        verbose, rm, all, outDir, maxRPS,
      } = options;

      if (rm) {
        await removeDirectoryIfExist(outDir);
        return;
      }

      if (!outDir) throw Error(`please provide a ${optionDescriptions.page.outDir}`);

      const parsedMaxRPS = parseInt(maxRPS || '', 10);
      const validMaxRPS = !Number.isNaN(parsedMaxRPS) || parsedMaxRPS > 0;
      if (validMaxRPS) http.setMaxRPS(parsedMaxRPS);

      let pageNumbers = pages.map(Number);

      if (all) {
        const pageCount = await getPageCount();
        pageNumbers = Array(pageCount).fill(undefined).map((_, index) => index + 1);
      }

      if (pageNumbers.length === 0) return;

      await createDirectoryIfNotExist(outDir);

      const fetchPages = pageNumbers.map((page) => fetchSearchResultPage(page, outDir));
      const { rejected: fetchErrors } = await allSettled(fetchPages);

      printErrors(fetchErrors, 'fetch error', { debug: verbose });

      if (validMaxRPS) http.setMaxRPS(defaultMaxRPS);
    });

  fetch.command('course')
    .description('download course syllabus pages')
    .argument('[<course-id>...]', 'specify which course syllabus pages to download')
    .option('-v, --verbose', 'verbose mode', false)
    .option('-r, --rm', 'remove all course syllabus pages', false)
    .option('-a, --all', 'download all course syllabus pages', false)
    .option('-i, --inFile <id-file-path>', optionDescriptions.course.inFile, './data/ids/ids.json')
    .option('-o, --outDir <output-directory>', optionDescriptions.course.outDir, './data/course-syllabus-pages')
    .option('-r, --maxRPS <max-requests-per-second>', 'the max amount requests that can be sent per second', String(defaultMaxRPS))
    .action(async (courses: string[], options: CommandOption) => {
      const {
        verbose, rm, all, inFile, outDir, maxRPS,
      } = options;

      if (rm) {
        await removeDirectoryIfExist(outDir);
        return;
      }

      if (!outDir) throw Error(`please provide a ${optionDescriptions.course.outDir}`);

      const parsedMaxRPS = parseInt(maxRPS || '', 10);
      const validMaxRPS = !Number.isNaN(parsedMaxRPS) || parsedMaxRPS > 0;
      if (validMaxRPS) http.setMaxRPS(parsedMaxRPS);

      let courseIds = courses;

      if (all) {
        if (!inFile) throw Error(`please provide a ${optionDescriptions.course.inFile}`);

        const json = await fs.promises.readFile(inFile, { encoding: 'utf-8' });
        courseIds = JSON.parse(json);
      }

      if (courseIds.length === 0) return;

      await createDirectoryIfNotExist(outDir);

      const fetchPages = courseIds.map(async (courseId) => {
        console.log(`fetching course (id: ${courseId})`);

        const fetchLocalePages = locales.map((locale) => (
          fetchCourseSyllabusPage(courseId, locale, outDir)
        ));

        const { rejected: fetchLocaleErrors } = await allSettled(fetchLocalePages);

        if (fetchLocaleErrors.length > 0) throw fetchLocaleErrors;
      });

      const { rejected: fetchErrors } = await allSettled(fetchPages);

      printErrors(fetchErrors, 'fetch error', { debug: verbose });

      if (validMaxRPS) http.setMaxRPS(defaultMaxRPS);
    });

  return fetch;
};

export default createFetchCommand;
