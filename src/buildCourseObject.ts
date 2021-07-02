import type { CheerioAPI } from 'cheerio';
import cheerio from 'cheerio';
import type { Course } from 'coursum-types';

import type { CoursePage } from './types';

const getDD = (label: string, dom: CheerioAPI) => (
  dom('dt')
    .filter((_index, elem) => dom(elem).text().includes(label))
    .first()
    .next('dd')
    .text()
    .trim()
);

const getLecturers = (dom: CheerioAPI, domEn: CheerioAPI) => {
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
};

const getSchedule = (dom: CheerioAPI, domEn: CheerioAPI) => {
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
};

const buildCourseObject = (id: string, coursePages: CoursePage) => {
  const bodyJa = coursePages.ja;
  const bodyEn = coursePages.en;

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

  const tagGiga = getDD('GIGAサティフィケート対象', dom) === '対象';

  const course: Course = {
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
      giga: tagGiga,
    },
  };

  return course;
};

export default buildCourseObject;
