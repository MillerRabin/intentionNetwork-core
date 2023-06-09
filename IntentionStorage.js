import LinkedStorageClient from './LinkedStorageClient.js';
import IntentionMap from './IntentionMap.js';
import NetworkIntention from './NetworkIntention.js';
import messages from './messages.js';
import dispatcher from './dispatcher.js';

export default class IntentionStorage {
  #id;
  #storageInterface;
  #intentions;
  #storageLinks = new Map();
  #createLinkedStorage(params) {
    params.storage = this;
    if (params.handling == null)
      params.handling = 'manual';
    return new LinkedStorageClient(params);    
  }

  constructor(id, storageInterface) {
    if (id == null) throw new Error('id is expected');
    if (storageInterface == null) throw new Error('Storage interface should be passed');
    this.#id = id;
    this.#storageInterface = storageInterface;
    this.#intentions = new IntentionMap(this, storageInterface);
  }

  get id() { return this.#id; }

  get intentions() { return this.#intentions; }

  async addStorage(params) {
    const linkedStorage = this.#createLinkedStorage(params)
    await this.#storageInterface.addLinkedStorage(linkedStorage);
    this.#storageLinks.set(linkedStorage.id, linkedStorage);
    return linkedStorage;
  }

  getLinkedStorage(id) {
    const linkedStorage = this.#storageLinks.get(id);
    if (linkedStorage == null) throw new Error(`LinkedStorage with id ${id} is not found `);
    return linkedStorage;
  }

  async deleteStorage(id) {    
    await this.#storageInterface.removeLinkedStorage({ storageId: this.#id, id });
  }

  async addNetworkIntention(textIntention) {
    const intention = new NetworkIntention({ 
      ...textIntention, 
      storageInterface: this.#storageInterface, 
      dataPath: 'network.dispatch', 
      onData: this.#storageInterface.intentionDispatcher
    });
    await this.#storageInterface.addIntention(intention);
    return intention;
  }

  async deleteIntention(id) {
    return await this.#storageInterface.deleteIntention(id);
  }

  async dispatch(modules, event) {
    const { channel } = modules;
    const chn = new channel.Channel(event);
    const storageLink = await this.addStorage({ channel: chn });
    const body = messages.getBody(event);
    await dispatcher.dispatchMessage(storageLink, body);
    return { message: 'dispatched' };
  }

  async broadcast(modules, connection, intentions) {
    const { channel, storage } = modules;    
    try {
      await channel.Channel.getConnection(connection.id,  connection.endpoint);
      const chn = new channel.Channel({ requestContext: { endpoint: connection.endpoint }}, connection.id, storage);      
      const storageLink = this.#createLinkedStorage({ channel: chn });
      const promises = [...intentions.map(i => storageLink.broadcast(i))];            
      const res = await Promise.allSettled(promises);                
      return res;      
    } catch (e) {
      console.log('broadcast', e);
      await this.deleteStorage(connection.id);
      throw e;
    }
  }
  
  async observe(modules) {
    const conns = await this.#storageInterface.getBroadcastReady(modules, this.id );
    if (conns.length == 0) return;
    const promises = [...conns.map(c => this.broadcast(modules, c, c.intentions))];
    return await Promise.allSettled(promises);    
  }
}