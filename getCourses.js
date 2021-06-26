const axios = require('axios');
const cheerio = require('cheerio');
const getCourseData = require('./getCourse');

const host = 'https://syllabus.sfc.keio.ac.jp/courses';
const defaultQuery = new URLSearchParams('locale=ja&search%5Btitle%5D=&search%5Byear%5D=2021&search%5Bsemester%5D=&search%5Bsub_semester%5D=&search%5Bteacher_name%5D=&search%5Bsummary%5D=&button=');

async function allSettled(promises) {
  return (await Promise.allSettled(promises)).reduce(
    (result, { status, value, reason }) => {
      result[status].push(value ?? reason);
      return result;
    },
    { fulfilled: [], rejected: [] },
  );
}

async function getPageCount() {
  const url = `${host}?${defaultQuery.toString()}`;
  let pageCount;

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

async function getCourseIdsInPage(pageNumber) {
  defaultQuery.set('page', pageNumber);
  const url = `${host}?${defaultQuery.toString()}`;

  let courseIds;
  try {
    const dom = cheerio.load((await axios.get(url)).data);
    const detailButtons = dom('.detail-btn');

    console.log(`Page ${pageNumber}: ${detailButtons.length} courses have a link`);

    courseIds = Array.from(detailButtons).map((detailButton) => (
      dom(detailButton).attr('href')
        .match(/^\/courses\/(?<courseId>.*?)\?/)
        ?.groups
        .courseId
    ));
  } catch (error) {
    console.error(`Error: failed to get course ids in page ${pageNumber}`);

    throw error;
  }

  return courseIds;
}

async function getCourses() {
  const pageCount = await getPageCount();

  const scanAllPages = (
    Array(pageCount).fill()
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
      const course = await getCourseData(courseId);
      courses.push([courseId, course]);
    } catch (error) {
      errors.push(error);
    }
  }

  return { fulfilled: courses, rejected: errors };
}

module.exports = getCourses;
