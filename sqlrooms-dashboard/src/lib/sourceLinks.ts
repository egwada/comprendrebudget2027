export const PLF_SOURCE_URL =
  'https://www.assemblee-nationale.fr/dyn/17/textes/l17b3210-projet-loi.pdf';
export const PLFSS_SOURCE_URL = 'https://www.budget.gouv.fr/documentation/file-download/33499';

export const plfPageUrl = (page: number | string) => `${PLF_SOURCE_URL}#page=${page}`;
export const plfssPageUrl = (page: number | string) => `${PLFSS_SOURCE_URL}#page=${page}`;
