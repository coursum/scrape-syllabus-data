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
