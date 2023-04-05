import safe from "./core/safe.mjs";
import AcceptedIntentions from "./AcceptedIntentions.js";
import uuid from "./core/uuid.mjs";

export default class IntentionAbstract {
  #createTime = new Date();
  #id = uuid.generate();
  #updateTime = this.#createTime;
  #title;
  #description;
  #input;
  #output;
  #parameters;
  #value;
  #accepted;
  #type = 'IntentionAbstract';
  #enableBroadcast;
  #storage;
  #storageInterface;
  #onData;
  #dataPath;

  constructor({
    title,
    description,
    input,
    output,
    parameters = [],
    value,
    enableBroadcast = true,
    id = this.#id,
    createTime = this.#createTime,
    storageInterface,
    storage,
    accepted,
    dataPath,
    onData
  }) {
    if (storageInterface == null)
      throw new Error('Need to specify storage interface');
    if (safe.isEmpty(title)) throw new Error('Intention must have a title');
    if (safe.isEmpty(input)) throw new Error('Intention must have an input parameter');
    if (safe.isEmpty(output)) throw new Error('Intention must have an output parameters');
    if (!Array.isArray(parameters)) throw new Error('Parameters must be array');
    if (input == output) throw new Error('Input and Output can`t be the same');
    if (storage == null) throw new Error('Storage is expected');
    if (safe.isEmpty(id)) throw new Error('Intention must have an id');
    if (safe.isEmpty(createTime)) throw new Error('Intention must have createTime');
    if (safe.isEmpty(dataPath)) throw new Error(`dataPath can't be null`);    
    if (typeof(onData) != 'function') throw new Error(`onData must be function`);    
    this.#storageInterface = storageInterface
    this.#title = title;
    this.#description = description;
    this.#input = input;
    this.#output = output;
    this.#parameters = parameters;
    this.#value = value; 
    this.#enableBroadcast = enableBroadcast;
    this.#id = id;
    this.#createTime = createTime;
    this.#storage = storage;
    this.#accepted = new AcceptedIntentions(this, accepted, this.#storageInterface);
    this.#onData = onData;
    this.#dataPath = dataPath;
  }

  getKey(reverse = false) {
    return (!reverse) ? `${this.#input} - ${this.#output}` : `${this.#output} - ${this.#input}`;
  }

  get storageInterface() { return this.#storageInterface }
  get parameters() { return this.#parameters; }
  get input() { return this.#input; }
  get output() { return this.#output; }
  get description() { return this.#description; }
  get title() { return this.#title; } 
  get updateTime() { return this.#updateTime; }
  get createTime() { return this.#createTime; }
  get value() { return this.#value; }  
  get type() { return this.#type; }
  get accepted() { return this.#accepted; }
  get enableBroadcast() { return this.#enableBroadcast; }
  get id() { return this.#id;}
  get storage() { return this.#storage;}
  get onData() { return this.#onData; }
  get dataPath() { return this.#dataPath; }

  update(status) {
    this.#updateTime = new Date();
    this.#storage.query.updateIntention(this, status);
  }

  async sendError(obj) {
    await this.#storage.sendError(obj);
  }

  toObject() {
    return {
      id: this.#id,
      createTime: this.#createTime,
      updateTime: this.#updateTime,
      key: this.getKey(),
      input: this.#input,
      output: this.#output,
      title: this.#title,
      description: this.#description,
      value: this.#value,
      type: this.type,
      parameters: this.#parameters,
      accepted: this.#accepted.toObject()
    }
  }
};