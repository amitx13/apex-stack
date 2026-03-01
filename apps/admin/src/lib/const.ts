const VITE_BASE_URL = import.meta.env.VITE_BASE_URL!;
export const getImageUrl = (path: string) => `${VITE_BASE_URL}${path}`;