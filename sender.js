function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getID() {
  return new Uint32Array([getRandomInt(0, 0xFFFFFFFF), getRandomInt(0, 0xFFFFFFFF), getRandomInt(0, 0xFFFFFFFF), getRandomInt(0, 0xFFFFFFFF)]);
}

function allocateBuffer(chunkSize) {
  return new Uint8Array(chunkSize);
}

function setBufferId(buffer) {
  try {
      const id = getID();
      const header = new Uint8Array(id.buffer);
      buffer.set(header, 0);
      return id.byteLength;
  } catch (e) {
      console.log(e);
  }
}

function getChunkSize(data, offset, chunkSize) {
  const left = data.byteLength - offset;
  const eChunkSize = getEffectiveChunkSize(chunkSize);
  return (left > eChunkSize) ? eChunkSize : left;
}

function getEffectiveChunkSize(id, chunkSize) {
  return chunkSize - (id.byteLength + 12);
}

export function send(channel, message, chunkSize = 65535) {
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

export default { 
  send
}