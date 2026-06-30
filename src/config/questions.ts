export type Dimension = 'EI' | 'SN' | 'TF' | 'JP';
export type Letter = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export interface QuestionDef {
  /** 穩定 id，對應 i18n 字串 q.<id>.text/yes/no */
  id: string;
  dimension: Dimension;
  yes: { side: Letter }; // 左台階（維度第一字母）
  no: { side: Letter }; // 右台階（維度第二字母）
}

export const DIMENSIONS: Dimension[] = ['EI', 'SN', 'TF', 'JP'];

export const LETTERS_OF: Record<Dimension, [Letter, Letter]> = {
  EI: ['E', 'I'],
  SN: ['S', 'N'],
  TF: ['T', 'F'],
  JP: ['J', 'P'],
};

const def = (id: string, dimension: Dimension, yes: Letter, no: Letter): QuestionDef => ({
  id,
  dimension,
  yes: { side: yes },
  no: { side: no },
});

export const QUESTIONS: QuestionDef[] = [
  def('ei_1', 'EI', 'E', 'I'),
  def('ei_2', 'EI', 'E', 'I'),
  def('ei_3', 'EI', 'E', 'I'),
  def('ei_4', 'EI', 'E', 'I'),
  def('ei_5', 'EI', 'E', 'I'),
  def('sn_1', 'SN', 'S', 'N'),
  def('sn_2', 'SN', 'S', 'N'),
  def('sn_3', 'SN', 'S', 'N'),
  def('sn_4', 'SN', 'S', 'N'),
  def('sn_5', 'SN', 'S', 'N'),
  def('tf_1', 'TF', 'T', 'F'),
  def('tf_2', 'TF', 'T', 'F'),
  def('tf_3', 'TF', 'T', 'F'),
  def('tf_4', 'TF', 'T', 'F'),
  def('tf_5', 'TF', 'T', 'F'),
  def('jp_1', 'JP', 'J', 'P'),
  def('jp_2', 'JP', 'J', 'P'),
  def('jp_3', 'JP', 'J', 'P'),
  def('jp_4', 'JP', 'J', 'P'),
  def('jp_5', 'JP', 'J', 'P'),
];

export function questionsForDimension(d: Dimension): QuestionDef[] {
  return QUESTIONS.filter((q) => q.dimension === d);
}
