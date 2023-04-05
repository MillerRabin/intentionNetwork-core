import Intention from "./Intention.js";
import NetworkIntention from "./NetworkIntention.js";


export default class {
  #storage;
  #storageInterface

  constructor(storage, storageInterface) {
    this.#storage = storage;
    this.#storageInterface = storageInterface;
  }
  
  #createIntention(data) {
    if (data == null) return null;
    if (data.type == 'NetworkIntention') {
      const storageLink = this.#storage.getLinkedStorage(data.storageId);
      return new NetworkIntention({ ...data, storage: storageLink, storageInterface: this.#storageInterface });
    }
      
    if (data.type == 'Intention')      
      return new Intention({...data, storage: this.#storage, storageInterface: this.#storageInterface});
    throw new Error(`Invalid intention type ${data.type}`);
  }
  
  async byId(id) {
    const res = await this.#storageInterface.getIntentionById(id)
    if (res == null) return null;
    return this.#createIntention(res);
  }
}