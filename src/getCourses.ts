import axios from 'axios';
import cheerio from 'cheerio';

import getCourse from './getCourse';

const host = 'https://syllabus.sfc.keio.ac.jp/courses';
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

interface SettledResult<T> {
  status: PromiseSettledResult<T>['status'];
  value?: T;
  reason?: any;
}

interface AggregatedSettledPromises<T> {
  fulfilled: T[];
  rejected: any[];
}

async function allSettled<T>(promises: Promise<T>[]) {
  return (await Promise.allSettled(promises)).reduce(
    (result, { status, value, reason }: SettledResult<T>) => {
      result[status].push(value ?? reason);

      return result;
    },
    { fulfilled: [], rejected: [] } as AggregatedSettledPromises<T>,
  );
}

async function getPageCount() {
  const url = `${host}?${defaultQuery.toString()}`;
  let pageCount: number;

  try {
    const dom = cheerio.load((await axios.get(url)).data);
    const UrlLastPage = new URL(host + dom('.pager .pagination .last a').attr('href'));
    const queryPage = UrlLastPage.searchParams.get('page');

    pageCount = Number(queryPage);
  } catch (error) {
    console.error('Error: failed to get page count');

    throw error;
  }

  return pageCount;
}

async function getCourseIdsInPage(pageNumber: number) {
  defaultQuery.set('page', String(pageNumber));
  const url = `${host}?${defaultQuery.toString()}`;

  let courseIds: string[];
  try {
    const dom = cheerio.load((await axios.get(url)).data);
    const detailButtons = dom('.detail-btn');

    console.log(`Page ${pageNumber}: ${detailButtons.length} courses have a link`);

    courseIds = Array.from(detailButtons).map((detailButton) => {
      const href = dom(detailButton).attr('href') || '';

      const { courseId } = href.match(/^\/courses\/(?<courseId>.*?)\?/)?.groups || {};

      return courseId || '';
    });
  } catch (error) {
    console.error(`Error: failed to get course ids in page ${pageNumber}`);

    throw error;
  }

  return courseIds;
}

async function getCourses() {
  const pageCount = await getPageCount();

  const scanAllPages = (
    Array(pageCount).fill(undefined)
      .map((_, index) => index + 1)
      .map((page) => getCourseIdsInPage(page))
  );

  const { fulfilled: allCourseIds, rejected: pageErrors } = await allSettled(scanAllPages);
  if (pageErrors.length > 0) {
    console.log(`${pageErrors.length} page errors`);
    pageErrors.forEach((error) => console.error(error));
  }

  const uniqueCourseIds = Array.from(new Set(allCourseIds.flat()));

  const courses = [];
  const errors = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const courseId of uniqueCourseIds) {
    try {
      const course = await getCourse(courseId);
      courses.push([courseId, course] as [string, typeof course]);
    } catch (error) {
      errors.push(error);
    }
  }

  return {
    fulfilled: courses,
    rejected: errors,
  };
}

export default getCourses;
