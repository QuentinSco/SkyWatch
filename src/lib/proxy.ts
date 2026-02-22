export function proxied(url: string): string {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }
  