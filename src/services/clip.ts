import { ART_STYLES } from '../config/index.js';

export interface ClipArguments {
  style: string;
  directorsNote: string;
  fromMessageId?: string;
  toMessageId?: string;
}

export function parseClipArguments(args: string[]): ClipArguments {
  const firstArg = args[0]?.toLowerCase();

  // Check if first arg is a style
  if (firstArg && ART_STYLES.includes(firstArg)) {
    const remainingArgs = args.slice(1);

    // Check if next args are message IDs (snowflakes are numeric strings)
    let fromMessageId: string | undefined;
    let toMessageId: string | undefined;
    let directorsNoteStart = 0;

    if (remainingArgs.length >= 2 && /^\d+$/.test(remainingArgs[0]) && /^\d+$/.test(remainingArgs[1])) {
      fromMessageId = remainingArgs[0];
      toMessageId = remainingArgs[1];
      directorsNoteStart = 2;
    } else if (remainingArgs.length >= 1 && /^\d+$/.test(remainingArgs[0])) {
      // Single ID - treat as from ID, fetch up to limit
      fromMessageId = remainingArgs[0];
      directorsNoteStart = 1;
    }

    return {
      style: firstArg,
      fromMessageId,
      toMessageId,
      directorsNote: remainingArgs.slice(directorsNoteStart).join(' '),
    };
  }

  // No style specified, check if args are message IDs
  if (args.length >= 2 && /^\d+$/.test(args[0]) && /^\d+$/.test(args[1])) {
    return {
      style: 'anime',
      fromMessageId: args[0],
      toMessageId: args[1],
      directorsNote: args.slice(2).join(' '),
    };
  } else if (args.length >= 1 && /^\d+$/.test(args[0])) {
    return {
      style: 'anime',
      fromMessageId: args[0],
      directorsNote: args.slice(1).join(' '),
    };
  }

  // Default: no message IDs, use last 60 messages
  return {
    style: 'anime',
    directorsNote: args.join(' '),
  };
}