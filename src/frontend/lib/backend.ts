const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");

export function backendApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return backendUrl ? `${backendUrl}${normalizedPath}` : normalizedPath;
}
