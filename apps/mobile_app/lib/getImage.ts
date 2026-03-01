const apiUrl = process.env.EXPO_PUBLIC_API_URL;
export const getImageUrl = (path: string): string => `${apiUrl}${path}`;