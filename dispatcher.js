import sender from './sender.js';

const gCommandTable = {
  '1:broadcast':  async function (storageLink, message) {
      if (message.intention == null) throw new Error('intention object expected');
      const textIntention = message.intention;
      if ((textIntention.type != 'Intention') && (textIntention.type != 'NetworkIntention'))
          throw new Error('type of object must be Intention or NetworkIntention');
      try {
          return await broadcast(storageLink, textIntention);
      } catch (e) {
          return null;
      }
  },
  '1:message':  async function (storageLink, message) {
      try {
          const mData = await parseMessage(storageLink, message);
          const result = await mData.intention.send(message.status, mData.target, message.data);
          await sendStatus({storageLink, status: 'OK', requestId: mData.result.requestId, result});
      } catch (e) {
          if (e instanceof Error) return;
          sendStatus({storageLink, status: 'FAILED', requestId: e.requestId, result: e});
      }
  },
  '1:ping': async function (storageLink) {
      storageLink.sendObject({
          command: 'pong',
          version: 1
      });
  },
  '1:pong': async function (storageLink) {
      storageLink.setAlive();
  },
  '1:requestStatus':  async function (storageLink, message) {
     try {
          NetworkIntention.updateRequestObject(message);
     } catch (e) {}
  },
  '1:getAccepted':  async function (storageLink, message) {
      try {
          const mData = parseStatusMessage(storageLink, message);
          const accepted = mData.intention.accepted;
          await sendStatus({storageLink, status: 'OK', requestId: mData.result.requestId, result: accepted.toObject() });
      } catch (e) {
          parseError(storageLink, e);
      }
  },
  '1:setAccepted':  async function (storageLink, message) {
      try {
          const mData = await parseMessage(storageLink, message);
          mData.intention.accepted.set(mData.target);
          await sendStatus({storageLink, status: 'OK', requestId: mData.result.requestId });
      } catch (e) {
          parseError(storageLink, e);
      }
  },
  '1:deleteAccepted':  async function (storageLink, message) {
      try {
          const mData = parseStatusMessage(storageLink, message);
          mData.target = storageLink.storage.intentions.byId(message.intention);
          if (mData.target == null) throwObject(mData.result, 'Target intention is not found');
          mData.intention.accepted.delete(message.data);
          mData.intention.send('close', mData.target, message.data);
          await sendStatus({storageLink, status: 'OK', requestId: mData.result.requestId });
      } catch (e) {
          parseError(storageLink, e);
      }
  },
};

function parseError(storageLink, e) {
  if (e instanceof Error) return;
  sendStatus({storageLink, status: 'FAILED', requestId: e.requestId, result: e}).catch(() => {});
}

function parseUrl(url) {
  const reg = /(.+):\/\/(.+):(.+)/;
  const match = reg.exec(url);
  if (match == null) throw new Error('Wrong url');
  return { scheme: match[1], origin: match[2], port: match[3] };
}

async function getStorageLink(textIntention, storageLink) {
  const tUrl = textIntention.origin;
  const sUrl = storageLink.key;
  if ((storageLink.socket == null) || (tUrl == null) || (tUrl == sUrl)) return storageLink;
  const params = parseUrl(tUrl);
  const link = storageLink.storage.addStorage({ ...params, handling: 'auto' });
  try {
      await link.waitConnection(10000);
      return link;
  } catch (e) {
      storageLink.storage.deleteStorage(link);
      throw new Error(`Connection with ${tUrl} cat't be established`);
  }
}

async function broadcast(storageLink, textIntention) {
  if (textIntention.id == null) throw new Error('Intention id must exists');
  const target =  storageLink.storage.intentions.byId(textIntention.id);
  if (target != null) return target;
  textIntention.storageLink = await getStorageLink(textIntention, storageLink);
  const intention = new NetworkIntention(textIntention);
  storageLink.storage.addNetworkIntention(intention);
  return intention;
}

async function sendStatus({storageLink, status, requestId, result}) {
  if (requestId == null) throw new Error({ message: 'requestId is null', ...result});
  await storageLink.sendObject({
      command: 'requestStatus',
      version: 1,
      status,
      requestId,
      result
  });
}

function throwObject(rObj, message) {
  rObj.messages.push(message);
  throw rObj;
}

function parseStatusMessage(storageLink, message) {
  const rObj = { messages: [] };
  rObj.requestId = message.requestId;
  if (rObj.requestId == null) rObj.messages.push('requestId field must exists');
  rObj.id = message.id;
  if (rObj.id == null) throwObject(rObj, 'Intention id field must exists');
  const intention = storageLink.storage.intentions.byId(rObj.id);
  if (intention == null) {
      rObj.operation = 'delete';
      throwObject(rObj, 'The Intention is not found at the origin')
  }
  if (intention.type != 'Intention')
      throwObject(rObj, 'Intention must be of type Intention');
  return { message, intention, result: rObj };
}

function isStream(message) {

}


async function parseMessage(storageLink, message) {
  const pStatus = parseStatusMessage(storageLink, message);
  if (message.status == null) pStatus.result.messages.push('message status field must exists');
  if (message.intention == null)
      throwObject(pStatus.result, 'intention field must exists');
  pStatus.target = await broadcast(storageLink, message.intention);
  if (pStatus.target == null)
      throwObject(pStatus.result, 'Intention is not found');
  return pStatus;
}


export async function dispatchMessage(storageLink, data) {
  const key = `${data.version}:${data.command}`;
  const func = gCommandTable[key];
  if (func == null) {
      throw new Error(`${key} command is not supported`);
  }
  return await func(storageLink, data);
}

export default {
  dispatchMessage
}