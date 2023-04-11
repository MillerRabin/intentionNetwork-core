import { version } from './config.js';
import createPromiseState from './core/state.js';

export default class LinkedStorageAbstract {
  #storage;
  #channel;
  #handling;
  #id;
  #type = 'LinkedStorageAbstract';
  #endpoint;
  #port;
  #origin;
  #schema;
  #pingPromise
  

  constructor({ storage, channel, handling, id, endpoint, origin, port, schema }) {
    if (storage == null) throw new Error('Storage must be exists');
    if (handling == null) throw new Error('Manage type must be defined');
    this.#storage = storage;          
    this.#channel = channel;  
    this.#handling = handling;
    this.#id = id ?? channel?.id;
    this.#origin = origin;
    this.#port = port;
    this.#schema = schema;
    this.#endpoint = this.#channel?.endpoint ?? endpoint;
    if (this.#endpoint == null)
      throw new Error(`endpoint can't be null`);
  }

  async sendObject(obj) {      
    const smsg = JSON.stringify(obj);
    return await this.#channel.send(smsg);        
  }

  async sendError(error) {
    const eobj = (error instanceof Error) ? { message: error.message } : error;
    return await this.sendObject({
        command: 'error',
        version,
        error: eobj
    });
  }

  get type() { return this.#type; }
  get channel() { return this.#channel; }
  get storage() { return this.#storage; }
  get handling() { return this.#handling; }
  get port() { return this.#port; }
  get origin() { return this.#origin; }
  get schema() { return this.#schema; }  
  get endpoint() { return this.#endpoint; }

  get id() {    
    if (this.#id != null) return this.#id;
    if (this.#schema == null)
        return `${this.#origin}:${this.#port}`;
    return `${this.#schema}://${this.#origin}:${this.#port}`;
  }

  async deleteIntention(networkIntention) {
    return await this.#storage.deleteIntention(networkIntention.id); 
  }

  setAlive() {
    if (this.#pingPromise != null)
      this.#channel.pingPromise.setReady();
  }

  async ping() {
    this.#pingPromise = pingPromise = createPromiseState({ message: 'Ping request', rejectTimeout: 5000 });    
    await this.sendObject({
      command: 'ping',
      version
    });
    return this.#pingPromise.ready;
  }  
};
