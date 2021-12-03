import type { CheerioAPI } from 'cheerio';
import cheerio from 'cheerio';
import type { CourseV2 } from 'coursum-types';

import type { CoursePage } from './types';

console.clear();

const getDD = (label: string, dom: CheerioAPI) => (
  dom('dt')
    .filter((_index, elem) => dom(elem).text().includes(label))
    .first()
    .next('dd')
    .text()
    .trim()
);

const getDL = (label: string, dom: CheerioAPI) => (
  dom('h3')
    .filter((_index, elem) => dom(elem).text().includes(label))
    .first()
    .next('dl')
    .text()
    .trim()
);

const getLecturers = (dom: CheerioAPI, domEn: CheerioAPI) => {
  const namesJa = getDD('授業教員名', dom).split(',');
  const namesEn = getDD('Lecturer Name', domEn).split(',');

  return namesJa.map((_, i) => ({
    name: {
      ja: namesJa[i],
      en: namesEn[i],
    },
  }));
};

const getSchedule = (dom: CheerioAPI, domEn: CheerioAPI) => {
  const year = parseInt(getDD('開講年度・学期', dom), 10);

  const semesterJa = getDD('開講年度・学期', dom).split(' ')[1];

  const semester = {
    ja: semesterJa,
    en: semesterJa === '春学期' ? 'Spring' : 'Fall',
  };

  const dayRegJa = /[月火水木金土日]/;
  const dayRegEn = /Mon|Tue|Wed|Thu|Fri|Sat|Sun/;

  const getDayPeriod = (dayPeriodStr: string, dayReg: RegExp) => (
    dayPeriodStr.split(',')
      .map((time) => time.trim())
      .map((time) => [time.match(dayReg)?.[0] ?? '', time.match(/\d/)?.[0] ?? ''])
      .map(([day, period]) => day + period)
  );

  const times = {
    ja: getDayPeriod(getDD('曜日・時限', dom), dayRegJa),
    en: getDayPeriod(getDD('Day of Week・Period', domEn), dayRegEn),
  };

  // TODO: type
  const span: any = {
    ja: null,
    en: null,
  };

  const titleJa = dom('h2 .title').text();

  if (titleJa.includes('学期前半')) {
    span.ja = '前半';
    span.en = 'First half';
  } else if (titleJa.includes('学期後半')) {
    span.ja = '後半';
    span.en = 'Second half';
  }

  const schedule = {
    year,
    semester,
    times,
    span,
  };

  return schedule;
};

const buildCourseObject = (id: string, coursePages: CoursePage) => {
  const bodyJa = coursePages.ja;
  const bodyEn = coursePages.en;

  const dom = cheerio.load(bodyJa);
  const domEn = cheerio.load(bodyEn);

  // Extracting

  const title = {
    ja: dom('h2 .title').text().trim(),
    en: domEn('h2 .title').text().trim(),
  };

  // If multiple departments are available, undergraduate department is preferred
  const department = {
    ja: getDD('学部・研究科', dom),
    en: getDD('Department Name', domEn),
  };

  const lecturers = getLecturers(dom, domEn);

  const schedule = getSchedule(dom, domEn);

  const location = {
    ja: getDD('開講場所', dom),
    en: getDD('Location', dom),
  };

  const credit = parseInt(getDD('単位', dom), 10);

  const englishSupport = {
    ja: getDD('授業で英語サポート', dom),
    en: getDD('English Support', domEn),
  };

  const url = {
    ja: getDD('授業URL', dom),
    en: getDD('Class URL', domEn),
  };

  const tools = {
    ja: getDD('学生が利用する予定機材/ソフト等', dom), // TODO
    en: getDD('Equipments & Software', domEn), // TODO
  };

  const teachingMaterials = {
    ja: getDD('参考文献', dom), // TODO
    en: getDD('Materials & Reading List', domEn), // TODO
  };

  const summary = {
    ja: getDD('講義概要', dom),
    en: getDD('Course Summary', domEn),
  };

  const objectives = {
    ja: getDD('主題と目標', dom),
    en: getDD('Objectives / Intended Learning Outcome', domEn),
  };
  const grading = {
    ja: getDD('提出課題・試験・成績評価の方法など', dom),
    en: getDD('Assignments, Examination & Grade Evaluation', domEn),
  };
  const plan = {
    ja: getDL('授業計画', dom),
    en: getDL('Class Schedule', domEn),
  };

  const registrationPrerequisiteMandatory = undefined; // TODO
  const registrationPrerequisiteRecommended = undefined; // TODO
  const registrationRequirement = {
    ja: undefined, // TODO
    en: undefined, // TODO
  };
  const registrationSuggestion = {
    ja: undefined, // TODO
    en: undefined, // TODO
  };
  const advice = {
    ja: getDD('履修上の注意・留意事項', dom), // TODO
    en: getDD('Advice', domEn), // TODO
  };
  const duplicateCourses = {
    ja: getDD('同一科目', dom),
    en: getDD('Duplicate Course', domEn),
  };

  const needScreening = getDD('Student Screening', domEn) !== 'No student screening to be done';
  const screening = {
    ja: getDD('履修制限', dom),
    en: getDD('Student Screening', domEn),
  };
  const quota = getDD('Expected Number of Students', domEn)
    ? parseInt(getDD('Expected Number of Students', domEn), 10) : undefined;
  const assignment = {
    ja: getDD('課題提出タイプ', dom),
    en: getDD('Screening Assignment', domEn),
  };

  const related = undefined; // TODO

  const syllabusURL = undefined; // TODO

  const aspect = {
    en: getDD('アスペクト', dom),
    ja: getDD('Aspect name', domEn),
  };

  const category = {
    ja: getDD('分野', dom),
    en: getDD('Field (Undergraduate) ', domEn),
  };

  const classFormat = {
    ja: getDD('実施形態', dom),
    en: getDD('Class Format', domEn),
  };

  const types = {
    ja: getDD('授業形態', dom).split(', '),
    en: getDD('Class Style', domEn).split(', '),
  };

  const language = {
    ja: getDD('授業で使う言語', dom),
    en: getDD('Language', domEn),
  };

  const tagCurriculumCode = getDD('科目ソート', dom);

  const tagGiga = getDD('GIGAサティフィケート対象', dom) === '対象';

  const course: CourseV2 = {
    id,
    title,
    department,
    lecturers,
    schedule,
    location,
    credit,
    englishSupport,
    url,
    tools,
    teachingMaterials,
    summary,
    objectives,
    grading,
    plan,
    registration: {
      prerequisite: {
        mandatory: registrationPrerequisiteMandatory,
        recommended: registrationPrerequisiteRecommended,
      },
      requirement: registrationRequirement,
      suggestion: registrationSuggestion,
      advice,
      duplicateCourses,
    },
    screening: {
      needScreening,
      screening,
      quota,
      assignment,
    },
    related,
    syllabusURL,
    tag: {
      aspect,
      category,
      classFormat,
      types,
      language,
      curriculumCode: tagCurriculumCode,
      giga: tagGiga,
    },
    version: 2,
  };

  return course;
};

export default buildCourseObject;
