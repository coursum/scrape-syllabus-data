const axios = require('axios');
const cheerio = require('cheerio');

function getDD(label, dom) {
  return dom('dt').filter((index, elem) => dom(elem).text().includes(label))
    .first()
    .next('dd')
    .text()
    .trim();
}

function getLecturers(dom, domEn) {
  const namesJa = getDD('授業教員名', dom).split(',');
  const namesEn = getDD('Lecturer Name', domEn).split(',');

  // TODO: check if namesJa.length === namesEn.length
  const lecturers = namesJa.map((_, i) => ({
    id: null,
    imgUrl: null,
    name: {
      ja: namesJa[i],
      en: namesEn[i],
    },
    email: '',
    inCharge: true,
  }));

  return lecturers;
}

function getSchedule(dom, domEn) {
  const scheduleYear = parseInt(getDD('開講年度・学期', dom), 10);
  const titleJa = dom('h2 .title').text();

  const scheduleSemesterJa = getDD('開講年度・学期', dom).split(' ')[1];
  const scheduleSemesterEn = scheduleSemesterJa === '春学期' ? 'Spring' : 'Fall';

  const scheduleTimesJa = getDD('曜日・時限', dom);
  const scheduleTimesEn = getDD('Day of Week・Period', domEn);

  let scheduleSpanJa = null;
  let scheduleSpanEn = null;

  if (titleJa.includes('学期前半')) {
    scheduleSpanJa = '前半';
    scheduleSpanEn = 'First half';
  } else if (titleJa.includes('学期後半')) {
    scheduleSpanJa = '後半';
    scheduleSpanEn = 'Second half';
  }

  const schedule = {
    year: scheduleYear,
    semester: {
      ja: scheduleSemesterJa,
      en: scheduleSemesterEn,
    },
    times: {
      ja: scheduleTimesJa,
      en: scheduleTimesEn,
    },
    span: {
      ja: scheduleSpanJa,
      en: scheduleSpanEn,
    },
  };

  return schedule;
}

function buildCourseObject(id, bodyJa = '', bodyEn = '') {
  const dom = cheerio.load(bodyJa);
  const domEn = cheerio.load(bodyEn);

  const titleNameJa = dom('h2 .title').text();
  const titleNameEn = domEn('h2 .title').text();
  const titlePostscriptJa = null;
  const titlePostscriptEn = null;

  const lecturers = getLecturers(dom, domEn);

  const schedule = getSchedule(dom, domEn);

  const classroom = getDD('開講場所', dom);

  const credit = parseInt(getDD('単位', dom), 10);

  const languageJa = getDD('言語', dom);
  const languageEn = getDD('Language', domEn);

  const categoryJa = getDD('分野', dom);
  const categoryEn = getDD('Field (Undergraduate) ', domEn);

  const summaryJa = getDD('講義概要', dom);
  const summaryEn = getDD('Course Summary', domEn);

  const typesJa = null;
  const typesEn = null;

  const registrationNumber = null;
  const registrationPrerequisiteMandatory = null;
  const registrationPrerequisiteRecommended = null;
  const registrationRequirementJa = null;
  const registrationRequirementEn = null;
  const registrationSuggestionJa = null;
  const registrationSuggestionEn = null;

  const related = null;

  const curriculumCode = getDD('科目ソート', dom);
  const yearClassId = id;

  const syllabusURL = null;

  const tagIsGiga = getDD('GIGAサティフィケート対象', dom) === '対象';

  const course = {
    title: {
      name: {
        ja: titleNameJa,
        en: titleNameEn,
      },
      postscript: {
        ja: titlePostscriptJa,
        en: titlePostscriptEn,
      },
    },
    lecturers,
    schedule,
    classroom,
    credit,
    language: {
      ja: languageJa,
      en: languageEn,
    },
    summary: {
      ja: summaryJa,
      en: summaryEn,
    },
    types: {
      ja: typesJa,
      en: typesEn,
    },
    registration: {
      number: registrationNumber,
      prerequisite: {
        mandatory: registrationPrerequisiteMandatory,
        recommended: registrationPrerequisiteRecommended,
      },
      requirement: {
        ja: registrationRequirementJa,
        en: registrationRequirementEn,
      },
      suggestion: {
        ja: registrationSuggestionJa,
        en: registrationSuggestionEn,
      },
    },
    related,
    yearClassId,
    syllabusURL,
    tag: {
      curriculumCode,
      category: {
        ja: categoryJa,
        en: categoryEn,
      },
      isGIGA: tagIsGiga,
    },
  };

  return course;
}

async function getCourse(id) {
  const url = `https://syllabus.sfc.keio.ac.jp/courses/${id}`;

  console.log(`fetching course  (id: ${id})`);

  let bodyJa;
  try {
    bodyJa = (await axios.get(url)).data;
  } catch (errorJa) {
    console.error(`Error: failed to fetch JP page of course (id: ${id})`);
    console.error(errorJa);
  }

  let bodyEn;
  try {
    bodyEn = (await axios.get(`${url}?locale=en`)).data;
  } catch (errorEn) {
    console.error(`Error: failed to fetch EN page of course (id: ${id})`);
    console.error(errorEn);
  }

  const course = buildCourseObject(id, bodyJa, bodyEn);

  return course;
}

module.exports = getCourse;
