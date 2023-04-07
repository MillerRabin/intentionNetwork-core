import safe from "./core/safe.mjs";
import uuid from "./core/uuid.mjs";
import IntentionAbstract from "./IntentionAbstract.js";

const gRequestTransactions = {};

async function processError(networkIntention, error) {
  const id = error.id;
  const operation = error.operation;
  if ((id == null) || (operation == null)) return;
  if (operation == 'delete')
    await networkIntention.storage.storage.deleteIntention(networkIntention.id);
}

export default class NetworkIntention extends IntentionAbstract {
  #origin;  
  #type = 'NetworkIntention';
  #messageTimeout = 30000;
  
  constructor({
    id,
    createTime,
    title,
    description,
    origin,
    input,
    output,
    parameters = [],
    value,
    storage,    
    accepted,
    storageInterface,
    onData,
    dataPath,
    messageTimeout
  }) {
    if (safe.isEmpty(id)) throw new Error('Network Intention must have an id');
    if (safe.isEmpty(createTime)) throw new Error('Network Intention must have createTime');    
    super({ id, createTime, title, description, input, output, parameters, value, accepted, storageInterface, storage, onData, dataPath });
    this.#origin = origin;
    this.#messageTimeout = messageTimeout ?? this.#messageTimeout;
  }

  static createRequestObject(networkIntention, intention, data) {
    const requestId = uuid.generate();
    const request = { intention, id: requestId };
    request.promise = new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      request.timeout = setTimeout(() => {
        reject({ message: `Request ${requestId} time is out`, data });
        NetworkIntention.deleteRequestObject(requestId);
      }, networkIntention.messageTimeout);
    }).then((result) => {
      NetworkIntention.deleteRequestObject(requestId);
      return result;
    }).catch((error) => {
      NetworkIntention.deleteRequestObject(requestId);
      processError(networkIntention, error);
      throw error;
    });
    gRequestTransactions[requestId] = request;
    return request;
  }

  static deleteRequestObject(requestId, error) {
    if (gRequestTransactions[requestId] == null) return;
    clearTimeout(gRequestTransactions[requestId].timeout);
    error = (error == null) ? new Error(`Request ${requestId} is deleted`) : error;
    const req = gRequestTransactions[requestId];
    delete gRequestTransactions[requestId];
    req.reject(error);
  }

  static updateRequestObject(message) {
    if (message.requestId == null) throw new Error('message requestId is null');
    const request = gRequestTransactions[message.requestId];
    if (request == null) {
      console.error(`request is not found: ${message.requestId}`);
      return;
    }
    if (message.status != 'FAILED') {
      clearTimeout(request.timeout);
      return request.resolve(message.result);      
    }
    clearTimeout(request.timeout);
    return request.reject(message.result);
  }

  get origin() {
    return this.#origin;
  }

  get type() {
    return this.#type;
  }

  send(status, intention, data) {
    if (intention.toObject == null) throw new Error('Intention must not be null');
    const request = NetworkIntention.createRequestObject(this, intention);
    try {
      this.storage.sendObject({
        command: 'message',
        version: 1,
        status,
        id: this.id,
        intention: intention.toObject(),
        data: data,
        requestId: request.id
      });
      return request.promise;
    } catch (e) {
      NetworkIntention.deleteRequestObject(request.id, e);
      return request.promise;
    }
  }

  async sendError(intention, data) {
    return await this.send('error', intention, data);
  }

  async sendCommand(intention, command, data) {
    const request = NetworkIntention.createRequestObject(this, intention, data);
    const iObj = (intention.toObject == null) ? intention : intention.toObject();
    try {
      await this.storage.sendObject({
        command: command,
        version: 1,
        id: this.id,
        intention: iObj,
        data: data,
        requestId: request.id
      });
      return request.promise;
    } catch (e) {
      NetworkIntention.deleteRequestObject(request.id, e);
      return request.promise;
    }
  }

  get messageTimeout() { return this.#messageTimeout; }


  toObject() {
    return {
      ...super.toObject(),
      createTime: this.createTime,
      origin: this.#origin
    }
  }
};