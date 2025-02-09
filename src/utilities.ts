import Line from './chord_sheet/line';
import ChordLyricsPair from './chord_sheet/chord_lyrics_pair';
import Item from './chord_sheet/item';
import { GRADE_TO_KEY } from './scales';
import SUFFIX_MAPPING from './normalize_mappings/suffix-normalize-mapping';

import {
  ChordType, MAJOR, MINOR, Modifier, ModifierMaybe, NO_MODIFIER, NUMERAL, SHARP,
} from './constants';

export const hasChordContents = (line: Line): boolean => (
  line.items.some((item) => (item instanceof ChordLyricsPair) && !!item.chords)
);

export const isEvaluatable = (item: Item): boolean => ('evaluate' in item) && (typeof item.evaluate === 'function');

export const padLeft = (string: string, length: number): string => {
  let paddedString = string;
  for (let l = string.length; l < length; l += 1, paddedString += ' ');
  return paddedString;
};

type ObjectWithLength = any[] | string | null;

export const isPresent = (object: ObjectWithLength): boolean => !!object && object.length > 0;
export const isString = (obj: any): boolean => (typeof obj === 'string');

function dasherize(string: string): string {
  return string.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

type CssObject = Record<string, Record<string, string>>;

export function scopeCss(css: CssObject, scope = ''): string {
  return Object
    .entries(css)
    .map(([selector, styles]) => {
      const rules = Object
        .entries(styles)
        .map(([property, value]) => `${dasherize(property)}: ${value};`)
        .join('\n  ');

      const scopedSelector = `${scope} ${selector}`.trim();

      return `
${scopedSelector} {
  ${rules}
}`.substring(1);
    })
    .join('\n\n');
}

export function deprecate(message: string): void {
  try {
    throw new Error(`DEPRECATION: ${message}`);
  } catch (e) {
    const error = (e as Error);
    const proc = globalThis.process;

    if (typeof proc === 'object' && typeof proc.emitWarning === 'function') {
      proc.emitWarning(`${message}\n${error.stack}`);
    } else {
      console.warn(`${message}\n${error.stack}`);
    }
  }
}

export function isEmptyString(string: string | null | undefined): boolean {
  return (string === null || string === undefined || string === '');
}

export function isMinor(key: string | number, keyType: ChordType, suffix: any): boolean {
  switch (keyType) {
    case NUMERAL:
      return typeof key === 'string' && key.toLowerCase() === key;
    default:
      return typeof suffix === 'string'
        && suffix[0] === 'm'
        && suffix.substring(0, 2).toLowerCase() !== 'ma'
        && suffix.substring(0, 3).toLowerCase() !== 'maj';
  }
}

export function normalizeLineEndings(string: string): string {
  return string.replace(/\r\n?/g, '\n');
}

class GradeSet {
  grades: Record<ModifierMaybe, Record<number, string>>;

  constructor(grades: Record<ModifierMaybe, Record<number, string>>) {
    this.grades = grades;
  }

  determineGrade(modifier: ModifierMaybe | null, preferredModifier: Modifier | null, grade: number) {
    return this.getGradeForModifier(modifier, grade)
      || this.getGradeForModifier(NO_MODIFIER, grade)
      || this.getGradeForModifier(preferredModifier, grade)
      || this.getGradeForModifier(SHARP, grade);
  }

  getGradeForModifier(modifier: ModifierMaybe | null, grade: number) {
    if (modifier) {
      return this.grades[modifier][grade];
    }

    return null;
  }
}

function determineKey({
  type,
  modifier,
  preferredModifier,
  grade,
  minor,
}: {
  type: ChordType,
  modifier: ModifierMaybe | null,
  preferredModifier: Modifier | null,
  grade: number,
  minor: boolean,
}) {
  const mode = (minor ? MINOR : MAJOR);
  const grades = GRADE_TO_KEY[type][mode];
  return new GradeSet(grades).determineGrade(modifier, preferredModifier, grade);
}

export function gradeToKey(
  {
    type,
    modifier,
    preferredModifier,
    grade,
    minor,
  }: {
    type: ChordType,
    modifier: ModifierMaybe | null,
    preferredModifier: Modifier | null,
    grade: number,
    minor: boolean,
  },
): string {
  let key = determineKey({
    type, modifier, preferredModifier, grade, minor,
  });

  if (!key) {
    throw new Error(
      `Could not resolve 
      type=${type} 
      modifier=${modifier} 
      grade=${grade} 
      preferredModifier=${preferredModifier} 
      minor=${minor}
to a key`,
    );
  }

  if (minor && type === NUMERAL) {
    key = key.toLowerCase();
  }

  return key;
}

export function normalizeChordSuffix(suffix: string | null): string | null {
  if (suffix === null) {
    return null;
  }

  if (SUFFIX_MAPPING[suffix] === '[blank]') {
    return null;
  }

  return SUFFIX_MAPPING[suffix] || suffix;
}
