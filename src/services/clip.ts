import { ART_STYLES } from '../config/index.js';

export interface ClipArguments {
  style: string;
  directorsNote: string;
}

export function parseClipArguments(args: string[]): ClipArguments {
  const firstArg = args[0]?.toLowerCase();
  if (firstArg && ART_STYLES.includes(firstArg)) {
    return {
      style: firstArg,
      directorsNote: args.slice(1).join(' '),
    };
  }

  return {
    style: 'anime',
    directorsNote: args.join(' '),
  };
}