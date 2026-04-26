import { headers } from 'next/headers';

export async function getUserId(): Promise<string> {
  const headersList = await headers();
  
  // Try various common header names from proxies
  const userId = 
    headersList.get('x-remote-user') || 
    headersList.get('remote-user') || 
    headersList.get('x-forwarded-user') ||
    'local-admin';

  return userId;
}

export async function getUserEmail(): Promise<string> {
  const headersList = await headers();
  const email = 
    headersList.get('x-remote-email') || 
    headersList.get('remote-email') || 
    'admin@localhost';

  return email;
}
