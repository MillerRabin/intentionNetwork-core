
import intentionRequest from "./intentionRequest.js";

const gCommandTable = {
  '1:broadcast': async function (storageLink, message) {
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
  '1:message': async function (storageLink, message) {
    try {
      const mData = await parseMessage(storageLink, message);
      try {
        if (message.status == null) throw new Error(`message status can't be null`);
        const result = await mData.intention.send(message.status, mData.target, message.data);
        return await sendStatus({ storageLink, status: 'OK', requestId: mData.result.requestId, result });
      } catch(e) {
        console.log('message error', e);
        throwObject(mData.result, e.message);
      }      
    } catch (e) {            
      return await parseError(storageLink, e);
    }
  },
  '1:ping': async function (storageLink) {
    return await storageLink.sendObject({
      command: 'pong',
      version: 1
    });
  },
  '1:pong': async function (storageLink) {
    return await storageLink.setAlive();
  },
  '1:requestStatus': async function (storageLink, message) {
    try {
      return await intentionRequest.update(message);
    } catch (e) {
      console.error('RequestStatusError', e);
    }
  },
  '1:getAccepted': async function (storageLink, message) {
    try {
      const mData = await parseStatusMessage(storageLink, message);
      try {
        const accepted = mData.intention.accepted;
        return await sendStatus({ storageLink, status: 'OK', requestId: mData.result.requestId, result: accepted.toObject() });
      } catch (e) {
        throwObject(mData.result, e.message);
      }      
    } catch (e) {
      return await parseError(storageLink, e);
    }
  },
  '1:setAccepting': async function (storageLink, message) {
    try {
      const mData = await parseMessage(storageLink, message);
      try {
        await mData.intention.accepted.setAccepting(mData.target);
        return await sendStatus({ storageLink, status: 'OK', requestId: mData.result.requestId });
      } catch (e) {
        throwObject(mData.result, e.message);
      }      
    } catch (e) {
      return await parseError(storageLink, e);
    }
  },
  '1:setAccepted': async function (storageLink, message) {
    try {
      const mData = await parseMessage(storageLink, message);
      try {
        await mData.intention.accepted.setAccepted(mData.target);
        return await sendStatus({ storageLink, status: 'OK', requestId: mData.result.requestId });
      } catch (e) {
        throwObject(mData.result, e.message);
      }      
    } catch (e) {
      return await parseError(storageLink, e);
    }
  },
  '1:deleteAccepting': async function (storageLink, message) {
    try {
      const mData = await parseStatusMessage(storageLink, message);  
      mData.target = await storageLink.storage.intentions.byId(mData.intention.id);
      if (mData.target == null) throwObject(mData.result, 'Target intention is not found');
      try {        
        await mData.intention.accepted.deleteAccepting(mData.target);
        await mData.intention.send('close', mData.target, message.data);
        await sendStatus({ storageLink, status: 'OK', requestId: mData.result.requestId });
      } catch (e) {
        throwObject(mData.result, e.message);
      }        
    } catch (e) {
      await parseError(storageLink, e);
    }
  },
  '1:deleteAccepted': async function (storageLink, message) {
    try {
      const mData = await parseStatusMessage(storageLink, message);
      mData.target = await storageLink.storage.intentions.byId(mData.intention.id);
      if (mData.target == null) throwObject(mData.result, 'Target intention is not found');
      try {        
        await mData.intention.accepted.deleteAccepted(mData.target, message.data);
        await mData.intention.send('close', mData.target, message.data);
        await sendStatus({ storageLink, status: 'OK', requestId: mData.result.requestId });
      } catch (e) {
        throwObject(mData.result, e.message);
      }
    } catch (e) {
      await parseError(storageLink, e);
    }
  }
};

async function parseError(storageLink, e) { 
  console.log('parse error', e); 
  await sendStatus({ storageLink, status: 'FAILED', requestId: e.requestId, result: e }).catch(() => {});
  throw e;
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
  const link = await storageLink.storage.addStorage({ ...params, handling: 'auto' });
  try {
    await link.waitConnection(10000);
    return link;
  } catch (e) {
    await storageLink.storage.deleteStorage(link);
    throw new Error(`Connection with ${tUrl} cat't be established`);
  }
}

async function broadcast(storageLink, textIntention) {
  if (textIntention.id == null) throw new Error('Intention id must exists');
  const target = await storageLink.storage.intentions.byId(textIntention.id);
  if (target != null) return target;
  textIntention.storage = await getStorageLink(textIntention, storageLink);
  const intention = await storageLink.storage.addNetworkIntention(textIntention);
  return intention;
}

async function sendStatus({ storageLink, status, requestId, result }) {
  if (requestId == null) throw new Error('requestId is null');
  return await storageLink.sendObject({
    command: 'requestStatus',
    version: 1,
    status,
    requestId,
    result
  });
}

function throwObject(rObj, message, operation) {
  rObj.messages.push(message);
  rObj.operation = operation;
  throw rObj;
}

async function parseStatusMessage(storageLink, message) {
  const rObj = { messages: [], requestId: message.requestId };  
  if (rObj.requestId == null)
    throw new Error('requestId field must exists');
  try {
    rObj.id = message.id;
    if (rObj.id == null) 
      throw new Error('Intention id field must exists');
    const intention = await storageLink.storage.intentions.byId(rObj.id);  
    if (intention == null) {    
      const err = new Error('The Intention is not found at the origin');
      err.operation = 'delete';
      throw err;
    }
    if (intention.type != 'Intention')
      throw new Error('Intention must be of type Intention');
    return { message, intention, result: rObj };
  } catch (e) {
    throwObject(rObj, e.message, e.operation);
  }
  
}

async function parseMessage(storageLink, message) {
  const pStatus = await parseStatusMessage(storageLink, message);
  try {    
    if (message.intention == null)
      throw new Error('intention field must exists');
    pStatus.target = await broadcast(storageLink, message.intention);
    if (pStatus.target == null)
      throw new Error('Intention is not found');
    return pStatus;
  } catch (e) {
    throwObject(pStatus.result, e.message, e.operation)
  }  
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