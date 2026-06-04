const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");

export function backendApiUrl(path: string) {
  if (!backendUrl) {
    throw new Error("Configure NEXT_PUBLIC_BACKEND_URL para chamar a API do backend.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${backendUrl}${normalizedPath}`;
}
