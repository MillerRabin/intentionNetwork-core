import { send } from './sender.js';
import { dispatchMessage } from './dispatcher.js';
import IntentionInterface from './IntentionInterface.js';
import IntentionStorageClass from './IntentionStorage.js';
import { parse, setCancelTime } from './messages.js';

export const IntentionStorage = IntentionStorageClass;

export default {
  parse,  
  send,
  setCancelTime,
  dispatchMessage,  
  IntentionStorage: IntentionStorageClass,
  IntentionInterface
}