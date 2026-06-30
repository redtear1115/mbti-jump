export type Dimension = 'EI' | 'SN' | 'TF' | 'JP';
export type Letter = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export interface Choice {
  /** 台階上顯示的文字 */
  label: string;
  /** 跳到這個台階加給哪個字母 */
  side: Letter;
}

export interface Question {
  dimension: Dimension;
  text: string;
  /** 左側台階 */
  yes: Choice;
  /** 右側台階 */
  no: Choice;
}

export const DIMENSIONS: Dimension[] = ['EI', 'SN', 'TF', 'JP'];

export const LETTERS_OF: Record<Dimension, [Letter, Letter]> = {
  EI: ['E', 'I'],
  SN: ['S', 'N'],
  TF: ['T', 'F'],
  JP: ['J', 'P'],
};

export const QUESTIONS: Question[] = [
  // 關 1 — E/I
  { dimension: 'EI', text: '週末你比較想…', yes: { label: '揪一群人出去', side: 'E' }, no: { label: '在家充電', side: 'I' } },
  { dimension: 'EI', text: '派對上你通常…', yes: { label: '主動找人聊', side: 'E' }, no: { label: '等別人來找我', side: 'I' } },
  { dimension: 'EI', text: '想事情時你習慣…', yes: { label: '說出來邊講邊想', side: 'E' }, no: { label: '自己先想清楚', side: 'I' } },
  { dimension: 'EI', text: '一整天獨處讓你…', yes: { label: '覺得無聊', side: 'E' }, no: { label: '感到放鬆', side: 'I' } },
  { dimension: 'EI', text: '認識新朋友你覺得…', yes: { label: '興奮有趣', side: 'E' }, no: { label: '有點累', side: 'I' } },

  // 關 2 — S/N
  { dimension: 'SN', text: '你比較相信…', yes: { label: '看得到的事實', side: 'S' }, no: { label: '背後的可能性', side: 'N' } },
  { dimension: 'SN', text: '學東西你偏好…', yes: { label: '具體步驟', side: 'S' }, no: { label: '整體概念', side: 'N' } },
  { dimension: 'SN', text: '你更常注意…', yes: { label: '當下細節', side: 'S' }, no: { label: '未來想像', side: 'N' } },
  { dimension: 'SN', text: '描述一件事你會…', yes: { label: '照實況講', side: 'S' }, no: { label: '加上比喻', side: 'N' } },
  { dimension: 'SN', text: '你欣賞的人通常…', yes: { label: '務實可靠', side: 'S' }, no: { label: '充滿點子', side: 'N' } },

  // 關 3 — T/F
  { dimension: 'TF', text: '做決定時你先看…', yes: { label: '邏輯對錯', side: 'T' }, no: { label: '對人的影響', side: 'F' } },
  { dimension: 'TF', text: '朋友訴苦你會先…', yes: { label: '幫忙分析解法', side: 'T' }, no: { label: '同理他的感受', side: 'F' } },
  { dimension: 'TF', text: '被批評時你在意…', yes: { label: '有沒有道理', side: 'T' }, no: { label: '語氣好不好', side: 'F' } },
  { dimension: 'TF', text: '你覺得公平是…', yes: { label: '一視同仁', side: 'T' }, no: { label: '看情況體諒', side: 'F' } },
  { dimension: 'TF', text: '別人說你…', yes: { label: '太理性', side: 'T' }, no: { label: '太心軟', side: 'F' } },

  // 關 4 — J/P
  { dimension: 'JP', text: '出門旅行你習慣…', yes: { label: '排好行程', side: 'J' }, no: { label: '隨興走走', side: 'P' } },
  { dimension: 'JP', text: '面對截止日你…', yes: { label: '提早完成', side: 'J' }, no: { label: '最後衝刺', side: 'P' } },
  { dimension: 'JP', text: '你的桌面通常…', yes: { label: '整齊分類', side: 'J' }, no: { label: '亂中有序', side: 'P' } },
  { dimension: 'JP', text: '計畫改變時你…', yes: { label: '有點不安', side: 'J' }, no: { label: '覺得無所謂', side: 'P' } },
  { dimension: 'JP', text: '你喜歡事情…', yes: { label: '有定論', side: 'J' }, no: { label: '保持彈性', side: 'P' } },
];

export function questionsForDimension(d: Dimension): Question[] {
  return QUESTIONS.filter((q) => q.dimension === d);
}
