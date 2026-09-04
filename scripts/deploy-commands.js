import { syncCommands, clearGlobalCommands } from '../dist/src/commands/slash/index.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === 'dev') {
    // Sync for development: guild = current commands, global = cleared
    await syncCommands('dev');
  } else if (command === 'global') {
    // Sync for production: global = current commands, guild = cleared
    await syncCommands('global');
  } else if (command === 'sync') {
    // Run sync to clear duplicates and set proper state
    await syncCommands('dev');
  } else if (command === 'clear') {
    // Clear all global commands (legacy, kept for compatibility)
    await clearGlobalCommands();
  } else {
    console.log('Usage: npm run deploy:dev | npm run deploy:global | npm run deploy:sync | npm run deploy:clear');
    console.log('  deploy:dev   - Sync for development (guild=current, global=cleared)');
    console.log('  deploy:global - Sync for production (global=current, guild=cleared)');
    console.log('  deploy:sync  - Run sync to clear duplicates and set proper state');
    console.log('  deploy:clear  - Clear all global commands (legacy)');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
