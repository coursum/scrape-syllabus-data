import type { Inspection, Locales } from '../types';

type ExtractedType = Record<string, Record<Locales, string>>
type InspectedType = ExtractedType

const inspection: Inspection<ExtractedType, InspectedType> = {
  output: 'courses.json',
  ids: [],
  extractor(id, coursePages) {
    const bodyJa = coursePages.ja;
    const bodyEn = coursePages.en;

    return {
      [id]: {
        ja: bodyJa,
        en: bodyEn,
      },
    };
  },
  inspector(extractedCourses) {
    const merged = extractedCourses.reduce((obj, cur) => Object.assign(obj, cur), {});

    return merged;
  },
};

export default inspection;
