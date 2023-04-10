export default class StorageLink {
  #channel;
  #storage;
  #origin;
  #port;
  #schema;
  #handling;
  #id;
  #sourceIp;
  #endpoint;
  
  constructor({ id, storage, channel, origin, port, schema, handling, sourceIp, endpoint }) {    
    this.#channel = channel;
    this.#storage = storage;
    this.#origin = origin;
    this.#port = port;
    this.#schema = schema;
    this.#handling = handling;
    this.#id = id ?? channel?.id;
    this.#sourceIp = sourceIp;
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
        version: 1,
        error: eobj
    });
  }

  async broadcast(intention) {
    console.log('linked storage broadcast', intention);
    return await this.sendObject({
        command: 'broadcast',
        version: 1,
        intention
    })
  }

  async deleteIntention(networkIntention) {
    return await this.#storage.deleteIntention(networkIntention.id); 
  }

  get id() {    
    if (this.#id != null) return this.#id;
    if (this.#schema == null)
        return `${this.#origin}:${this.#port}`;
    return `${this.#schema}://${this.#origin}:${this.#port}`;
  }

  get port() { return this.#port; }
  get origin() { return this.#origin; }
  get schema() { return this.#schema; }
  get handling() { return this.#handling; }
  get sourceIp() { return this.#sourceIp; }
  get endpoint() { return this.#endpoint; }
  get storage() { return this.#storage; }
  
  static getKeys(origin, port = 10010) {
    return [
        `${origin}:${port}`
    ];
  }
}