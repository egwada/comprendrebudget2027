export type View = 'accueil' | 'budget' | 'dette' | 'contexte';

const ALL_VIEWS: View[] = ['accueil', 'budget', 'dette', 'contexte'];

export function isView(value: string): value is View {
  return ALL_VIEWS.includes(value as View);
}
