import safe from "./core/safe.js";
import IntentionAbstract from "./IntentionAbstract.js";
import intentionRequest from "./IntentionRequest.js";

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

  get origin() {
    return this.#origin;
  }

  get type() {
    return this.#type;
  }

  send(status, intention, data) {
    if (intention.toObject == null) throw new Error('Intention must not be null');
    const request = intentionRequest.create(this, intention);
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
      intentionRequest.delete(request.id, e);
      return request.promise;
    }
  }

  async sendError(intention, data) {
    return await this.send('error', intention, data);
  }

  async sendCommand(intention, command, data) {
    const request = intentionRequest.create(this, intention, data);
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
      intentionRequest.delete(request.id, e);
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