export default class AcceptedIntentions {
  #accepted;
  #accepting;
  #intention;
  #storageInterface;
  
  #loadAccepted(acceptedObject) {
    const aMap = ((acceptedObject != null) && Array.isArray(acceptedObject.accepted)) ? new Map(acceptedObject.accepted) : new Map();
    const aSet = ((acceptedObject != null) && Array.isArray(acceptedObject.accepting)) ? new Set(acceptedObject.accepting) : new Set();
    this.#accepted = aMap;
    this.#accepting = aSet;
  }

  constructor(intention, accepted, storageInterface) {
    if (intention == null) throw new Error('intention expected');
    if (storageInterface == null) 
      throw new Error('Storage interface expected');
    this.#storageInterface = storageInterface;
    this.#intention = intention;
    this.#loadAccepted(accepted);
  }

  get intention() { return this.#intention; }
  get accepted() { return this.#accepted; }
  get accepting() { return this.#accepting; }

  async setAccepted(intention) {    
    const result = this.#accepted.set(intention.id, intention);
    if (this.intention.type == 'NetworkIntention')
      await this.intention.sendCommand(intention, 'setAccepted');
    else {
      await this.#storageInterface.addAccepted(this.intention.id, intention);
    }
    return result;
  }

  has(intention) {
    return this.#accepted.has(intention.id);
  }

  isAccepting(target) {
    return this.#accepting.has(target.id);
  }

  async setAccepting(target) {
    this.#accepting.add(target.id);
    if (this.intention.type == 'Intention')
      await this.#storageInterface.addAccepting(this.intention.id, intention);
  }

  async deleteAccepting(target) {
    this.#accepting.delete(target.id);
    if (this.intention.type == 'Intention')
      await this.#storageInterface.deleteAccepting(this.intention.id, intention);
  }

  async #deleteNotify(intention, data) {   
    const result = this.#accepted.delete(intention.id);
    if (intention.type == 'Intention') {
      intention.accepted.#accepted.delete(this.intention.id);
      await intention.send('close', this.intention, data).catch(() => { });
    }
    if (this.intention.type == 'NetworkIntention')
      await this.intention.sendCommand(intention, 'deleteAccepted', data).catch(() => { });
    return result;
  }

  async deleteAccepted(intention, data) {
    if (this.intention.type == 'Intention')
      await this.#storageInterface.deleteAccepted(this.intention.id, intention);
    this.#deleteNotify(intention, data);
  }

  async send(data, status = 'data') {
    const promises = [];
    for (let [, intention] of this.#accepted) {
      promises.push(intention.send(status, this.intention, data).catch((e) => {
        return { reason: e };
      }));
    }
    return await Promise.all(promises);
  }

  async reload() {
    if (this.intention.type == 'NetworkIntention') {
      const aObj = await this.intention.sendCommand(this.intention, 'getAccepted');
      this.#loadAccepted(this, aObj);      
    }
  }

  async close(data) {
    const promises = [];
    for (const [, intention] of this.#accepted)
      promises.push(this.#deleteNotify(intention, data));    
    await Promise.allSettled(data);    
    this.#accepted.clear();
  }

  toObject() {
    const res = {
      accepted: Array.from(this.#accepted),
      accepting: Array.from(this.#accepting)
    };   
    return res;
  }

  get size() {
    return this.#accepted.size;
  }
};