import { send } from './sender.js';
import { dispatchMessage } from './dispatcher.js';
import IntentionInterface from './IntentionInterface.js';
import IntentionStorageClass from './IntentionStorage.js';

const gMsgHash = {};
let cancelTime = 5000;

function getHeader(message) {
  const data = new Uint8Array(message);
  const idA = new Uint32Array(data.buffer, 0, 4);
  const id = idA.join('-');
  const start = new Uint32Array(data.buffer, 16, 1)[0];
  const end = new Uint32Array(data.buffer, 20, 1)[0];
  const length = new Uint32Array(data.buffer, 24, 1)[0];
  const buffer = new Uint8Array(data.buffer, 28, end - start);
  return  { id, buffer, length, start, end }
}

function parseStreaming(message) {
  const header = getHeader(message);
  const msg = getMessage(header);
  checkMessage(msg);
  return msg.ready;
}

export function parse(message) {
  const res = tryJSON(message);
  if (res != null) return message;
  return parseStreaming(message);
}

function createMessage(length) {
  return {
    length: length,
    offsets: [],
    buffer: new Uint8Array(length)
};
}

function renewCancelTimeout(msgData) {
  if (msgData.cancelTimeout != null) clearTimeout(msgData.cancelTimeout);
  msgData.cancelTimeout = setTimeout(function () {
      msgData.reject(new Error('Time is out'));
  }, cancelTime);
}

function checkMessage(msgData) {
  let oldOffset = null;
  for (const offset of msgData.offsets) {
      if ((oldOffset != null) && (oldOffset[1] != offset[0])) return false;
      if (offset[1] == msgData.length) {
          msgData.resolve();
          return true;
      }
      if (offset[1] > msgData.length) {
          msgData.reject(new Error('The offset of message is bigger than message length'));
          return false;
      }
      oldOffset = offset;
  }
}

function addOffset(msg, start, end) {
  const elemIndex = msg.offsets.findIndex(([tStart]) => tStart == start);
  if (elemIndex != -1) {
      const [, tEnd] = msg.offsets[elemIndex];
      if (tEnd != end)
          msg.reject(new Error('Invalid chunk'));
      return;
  }
  msg.offsets.push([start, end]);
  msg.offsets.sort((a, b) => {
     const aStart = a[0];
     const bStart = b[1];
     if (aStart < bStart) return -1;
     if (aStart > bStart) return 1;
     return 0;
  });
}


function toJSON(data) {
  const dec = new TextDecoder();
  const message = dec.decode(data);  
  return JSON.parse(message);
}

function tryJSON(message) {
  try {
    return JSON.parse(message)
  } catch (e) {
    return null
  }
}


function getMessage({id, buffer, length, start, end}) {
  if (gMsgHash[id] == null) {
      const mData = createMessage(length);
      gMsgHash[id] = mData;
      mData.ready = new Promise((resolve, reject) => {
        mData.reject = reject;
        mData.resolve = resolve;
      }).then(() => {
        delete gMsgHash[id];
        return mData.buffer;
      }).catch((e) => {
        delete gMsgHash[id];
        return Promise.reject(e);
      });
  }
  const msg = gMsgHash[id];
  const b8 = new Uint8Array(buffer);
  msg.buffer.set(b8, start);
  renewCancelTimeout(msg);
  addOffset(msg, start, end);
  return msg;
}

export function setCancelTime(value) {
  cancelTime = value;
}

export const IntentionStorage = IntentionStorageClass;

export default {
  parse,
  toJSON,
  send,
  setCancelTime,
  dispatchMessage,  
  IntentionStorage: IntentionStorageClass,
  IntentionInterface
}