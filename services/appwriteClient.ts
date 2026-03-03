import 'react-native-url-polyfill/auto';
import { Client, Account, Databases } from 'react-native-appwrite';
import { Platform } from 'react-native';

const client = new Client();

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

// Validate configuration
if (!endpoint || !projectId || 
    projectId === 'your-project-id-here' || 
    endpoint === 'https://cloud.appwrite.io/v1' && projectId.length < 10) {
  console.error('⚠️ APPWRITE CONFIGURATION ERROR ⚠️');
  console.error('Please update your .env file with actual Appwrite project details:');
  console.error('1. EXPO_PUBLIC_APPWRITE_PROJECT_ID - Get from Appwrite Console → Settings');
  console.error('2. EXPO_PUBLIC_APPWRITE_ENDPOINT - Your Appwrite server URL');
  console.error('3. Database and Collection IDs');
  console.error('\nSee FIX_INVALID_ORIGIN.md for complete setup instructions.');
}

client
  .setEndpoint(endpoint || 'https://cloud.appwrite.io/v1')
  .setProject(projectId || '')
  .setPlatform('com.tally.app'); // Android package name

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '';

export const COLLECTIONS = {
  USERS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_USERS || '',
  ACCOUNTS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ACCOUNTS || '',
  TRANSACTIONS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_TRANSACTIONS || '',
  SNAPSHOTS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_SNAPSHOTS || '',
  ALERT_LOG: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ALERT_LOG || '',
};

// Atomic operators for safe concurrent updates
export const Operator = {
  increment: (value: number) => ({ $increment: value }),
  decrement: (value: number) => ({ $decrement: value }),
  multiply: (value: number) => ({ $multiply: value }),
  divide: (value: number) => ({ $divide: value }),
  arrayAppend: (value: any) => ({ $arrayAppend: value }),
  arrayRemove: (value: any) => ({ $arrayRemove: value }),
  dateSetNow: () => ({ $dateSetNow: true }),
  toggle: () => ({ $toggle: true }),
};

export default client;
