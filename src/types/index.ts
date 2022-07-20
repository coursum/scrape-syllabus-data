import type { CourseV3 } from 'coursum-types';

export type Locales = 'ja' | 'en'

export type CoursePage = Record<Locales, string>

export interface CommandOption {
  verbose: boolean;
  rm: boolean;
  all: boolean;
  inDir?: string;
  inFile?: string;
  outDir: string;
  maxRPS?: string;
}

export interface Inspection<ExtractedType = unknown, InspectedType = unknown> {
  output: string;
  ids: CourseV3['id'][];
  extractor: (id: CourseV3['id'], coursePages: CoursePage) => ExtractedType;
  inspector: (extractedData: ExtractedType[]) => InspectedType;
}
