/** 英文為譯文權威來源；其他語言以相同 key 對應。 */
export const EN = {
  // --- 通用 / 開始 ---
  'start.title': 'MBTI Jump',
  'start.tagline': 'Jump up — left = Yes, right = No.\nFour levels reveal your type.',
  'start.cta': 'Start ▶',
  'start.language': 'Language',

  // --- 維度名稱 ---
  'dim.EI': 'Extraversion / Introversion',
  'dim.SN': 'Sensing / Intuition',
  'dim.TF': 'Thinking / Feeling',
  'dim.JP': 'Judging / Perceiving',

  // --- 關卡 HUD ---
  'level.label': 'Level {0} · {1}', // {0}=關號, {1}=維度名稱

  // --- 過關 ---
  'transition.title': 'Level {0} complete!',
  'transition.next': 'Next level ▶',
  'transition.seeResult': 'See result ▶',

  // --- 失敗 ---
  'gameover.title': 'You fell!',
  'gameover.subtitle': 'Replay level {0} — progress kept',
  'gameover.retry': 'Replay level ↻',

  // --- 結算 ---
  'result.heading': 'Your personality type',
  'result.copy': 'Copy result ⎘',
  'result.copied': 'Copied ✓',
  'result.copyFail': 'Copy failed — select manually',
  'result.again': 'Play again ↻',
  'result.share': 'My MBTI is {0}! {1} Play MBTI Jump: {2}',

  // --- 人格字母特質（組句用）---
  'trait.E': 'draw energy from people',
  'trait.I': 'recharge in solitude',
  'trait.S': 'trust what is concrete',
  'trait.N': 'chase possibilities',
  'trait.T': 'weigh things by logic',
  'trait.F': 'lead with the heart',
  'trait.J': 'like plans and closure',
  'trait.P': 'enjoy staying flexible',
  'personality.template': 'You {0}, {1}, {2}, and {3}.',

  // --- 題目（EI）---
  'q.ei_1.text': 'On a free weekend, you would rather…',
  'q.ei_1.yes': 'Go out with a group',
  'q.ei_1.no': 'Recharge at home',
  'q.ei_2.text': 'At a party, you usually…',
  'q.ei_2.yes': 'Start conversations',
  'q.ei_2.no': 'Wait for others to come',
  'q.ei_3.text': 'You think best by…',
  'q.ei_3.yes': 'Talking it out loud',
  'q.ei_3.no': 'Sorting it out in your head',
  'q.ei_4.text': 'A whole day alone leaves you…',
  'q.ei_4.yes': 'A bit restless',
  'q.ei_4.no': 'Relaxed and refreshed',
  'q.ei_5.text': 'Meeting new people feels…',
  'q.ei_5.yes': 'Exciting',
  'q.ei_5.no': 'A little draining',

  // --- 題目（SN）---
  'q.sn_1.text': 'You trust more…',
  'q.sn_1.yes': 'What you can see and touch',
  'q.sn_1.no': 'Patterns and possibilities',
  'q.sn_2.text': 'You would rather learn through…',
  'q.sn_2.yes': 'Concrete steps',
  'q.sn_2.no': 'The big-picture concept',
  'q.sn_3.text': 'You pay more attention to…',
  'q.sn_3.yes': 'Present details',
  'q.sn_3.no': 'Future what-ifs',
  'q.sn_4.text': 'When describing something, you…',
  'q.sn_4.yes': 'Stick to the facts',
  'q.sn_4.no': 'Reach for metaphors',
  'q.sn_5.text': 'You admire people who are…',
  'q.sn_5.yes': 'Practical and reliable',
  'q.sn_5.no': 'Full of ideas',

  // --- 題目（TF）---
  'q.tf_1.text': 'When deciding, you look first at…',
  'q.tf_1.yes': 'The logical pros and cons',
  'q.tf_1.no': 'How people will feel',
  'q.tf_2.text': 'A friend venting wants you to…',
  'q.tf_2.yes': 'Help find a fix',
  'q.tf_2.no': 'Understand their feelings',
  'q.tf_3.text': 'Facing criticism, you care most that it is…',
  'q.tf_3.yes': 'Fair and correct',
  'q.tf_3.no': 'Kindly worded',
  'q.tf_4.text': 'To you, fairness means…',
  'q.tf_4.yes': 'Treating everyone the same',
  'q.tf_4.no': 'Allowing for circumstances',
  'q.tf_5.text': 'People sometimes call you…',
  'q.tf_5.yes': 'Too rational',
  'q.tf_5.no': 'Too soft-hearted',

  // --- 題目（JP）---
  'q.jp_1.text': 'For a trip, you prefer to…',
  'q.jp_1.yes': 'Plan the itinerary',
  'q.jp_1.no': 'Wander spontaneously',
  'q.jp_2.text': 'With a deadline, you…',
  'q.jp_2.yes': 'Finish early',
  'q.jp_2.no': 'Sprint at the end',
  'q.jp_3.text': 'Your desk is usually…',
  'q.jp_3.yes': 'Neatly organized',
  'q.jp_3.no': 'Organized chaos',
  'q.jp_4.text': 'When plans change, you feel…',
  'q.jp_4.yes': 'A bit unsettled',
  'q.jp_4.no': 'Totally fine',
  'q.jp_5.text': 'You like things to be…',
  'q.jp_5.yes': 'Settled and decided',
  'q.jp_5.no': 'Open and flexible',
} as const;

export type StringKey = keyof typeof EN;
