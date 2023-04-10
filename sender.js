import uuid from "./core/uuid.js";

function allocateBuffer(chunkSize) {
  return new Uint8Array(chunkSize);
}

function setBufferId(buffer) {
  try {
      const id = uuid.generate();
      const header = new Uint8Array(id.buffer);
      buffer.set(header, 0);
      return id.byteLength;
  } catch (e) {
      console.log(e);
  }
}

function getChunkSize(data, offset, chunkSize) {
  const left = data.byteLength - offset;
  const eChunkSize = chunkSize - getHeaderSize(chunkSize);
  return (left > eChunkSize) ? eChunkSize : left;
}

function getHeaderSize() {
  return (16 + 12); //uuid size + offset
}

function sendStreaming(channel, message, chunkSize = 65535){
 const enc = new TextEncoder();
  const data = enc.encode(message);
  let index = 0;
  const buffer = allocateBuffer(chunkSize);
  const offset = setBufferId(buffer);
  while (index < data.byteLength) {
    const cs = getChunkSize(data, index, chunkSize);
    const dw = new Uint8Array(data.buffer, index, cs);
    const position = new Uint32Array([index, index + cs, data.byteLength]);
    buffer.set(new Uint8Array(position.buffer), offset);
    const pOffset = offset + position.byteLength;
    buffer.set(dw, pOffset);
    index += dw.byteLength;
    const eLength = pOffset + dw.byteLength;
    const bw = new Uint8Array(buffer.buffer, 0, eLength);
    channel.send(bw);
  }
}

function canSendAsIs(mode) {
  const lmode = mode.toLowerCase();
  if (lmode.toLowerCase() == 'json')
    return true;
  if (lmode.toLowerCase() == 'binary')
    return false;
  throw new Error(`Invalid mode ${mode}. Must be json or binary`);
}

export function send({ channel, message, mode = 'json', chunkSize = 65535 }) {
  if (canSendAsIs(mode)) 
    return channel.send(message);
  else
    return sendStreaming(channel, message, chunkSize); 
}

export default { 
  send
}