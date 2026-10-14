/** Build a URL for a file in Vite's public directory, including the deployment base path. */
export function publicUrl(path: string): string {
  const relativePath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${relativePath}`;
}
