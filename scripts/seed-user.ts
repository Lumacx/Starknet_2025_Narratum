
import { config } from 'dotenv';
config({ path: '.env.local' });

import { context } from '../src/context/context';

async function main() {
  const usersToCreate = [
    {
      uid: "user-1",
      displayName: "Test Author",
    },
    {
      uid: "user-2",
      displayName: "Test Reader",
    }
  ];

  for (const userData of usersToCreate) {
      try {
        const user = await context.auth.createUser(userData);
        console.log(`User ${userData.uid} created successfully:`, user.displayName);
      } catch (error: any) {
        if (error.code === 'auth/uid-already-exists') {
            console.log(`User ${userData.uid} already exists. Skipping.`);
        } else {
            console.error(`Error creating user ${userData.uid}:`, error);
        }
      }
  }
}

main();
