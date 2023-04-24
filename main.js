import { send } from './sender.js';
import { dispatchMessage } from './dispatcher.js';
import IntentionInterface from './IntentionInterface.js';
import IntentionStorageClass from './IntentionStorage.js';
import { parse, setCancelTime } from './messages.js';
import safe from './core/safe.js';
import createPromiseState from './core/state.js';
import uuid from './core/uuid.js';

export const IntentionStorage = IntentionStorageClass;

export default {
  safe,
  createPromiseState,
  uuid,
  parse,  
  send,
  setCancelTime,
  dispatchMessage,  
  IntentionStorage: IntentionStorageClass,
  IntentionInterface
}