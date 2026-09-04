import { registerSlashCommands, clearGlobalCommands } from '../dist/src/commands/slash/index.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === 'dev') {
    // Register to DEV_GUILD_ID (instant update)
    await registerSlashCommands();
  } else if (command === 'global') {
    // Register globally (takes up to 1 hour to propagate)
    await registerSlashCommands(); // No guild ID = global
  } else if (command === 'clear') {
    // Clear all global commands
    await clearGlobalCommands();
  } else {
    console.log('Usage: npm run deploy:dev | npm run deploy:global | npm run deploy:clear');
    console.log('  deploy:dev   - Register commands to DEV_GUILD_ID (instant)');
    console.log('  deploy:global - Register commands globally (1 hour propagation)');
    console.log('  deploy:clear  - Clear all global commands');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
