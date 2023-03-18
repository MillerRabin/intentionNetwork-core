import { send } from './sender.js';
import { dispatchMessage } from './dispatcher.js';
import { parse, toJSON, setCancelTime } from './receiver.js';


export default {
  parse,
  toJSON,
  send,
  setCancelTime,
  dispatchMessage
}