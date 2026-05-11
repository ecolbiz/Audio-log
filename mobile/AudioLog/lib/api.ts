import Constants from 'expo-constants';

function getHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri.split(':')[0];
  return 'localhost';
}

const host = getHost();
export const BASE_URL = `http://${host}:3000/api`;
export const SERVER_URL = `http://${host}:3000`;
