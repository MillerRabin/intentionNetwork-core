import LinkedStorageAbstract from "./LinkedStorageAbstract.js";

export default class StorageLink extends LinkedStorageAbstract {
  #channel;
  #storage;  
  #sourceIp;  
  #type = 'LinkedStorageClient';
  
  constructor({ id, storage, channel, origin, port, schema, handling, sourceIp, endpoint }) {
    super({ storage, channel, handling, id, endpoint, origin, port, schema });    
    this.#sourceIp = sourceIp;    
  }
  
  async broadcast(intention) {    
    return await this.sendObject({
        command: 'broadcast',
        version: 1,
        intention
    })
  }

  get sourceIp() { return this.#sourceIp; }
  get type() { return this.#type; }
  
  static getKeys(origin, port = 10010) {
    return [
        `${origin}:${port}`
    ];
  }
}