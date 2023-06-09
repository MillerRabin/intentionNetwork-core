import createPromiseState from "./core/state.js";

async function dispatch(to, from, command, schema, data) {
  const res = await to.send('data', from, {
    command,
    data
  });  
  return res;
}


export default class IntentionInterface {  
  #source;

  #statePromise;
  
  #createStatePromise() {
    if (this.#statePromise != null)
      this.#statePromise.cancel({ message: 'Interface intention error' });    
    this.#statePromise = createPromiseState({ message: 'Interface connection time out'});
    return this.#statePromise;
  }
  
  #createIntention(storage, {
    title,
    description,
    input,
    output
  }) {
    return storage.createIntention({
      title,
      description,
      input,
      output,
      onData: async (status, intention, value) => {
        if (status == 'accepted') {
          this.#mapValueToInterface(intention, this.#source, value);          
          this.#statePromise.setReady();
        }
        if (status == 'close')
          this.#createStatePromise();
      }
    });
  }

  get ready() { 
    return this.#statePromise.ready.catch((e) => {
        console.error(e);
        this.#statePromise = createPromiseState({ message: 'Interface connection time out'});
      return  this.#statePromise.ready;
    });
  }
  
  #mapValueToInterface(to, from, value) {
    if (value == null) throw new Error(`Value can't be null`);      
    for (const key in value) {
      if (!value.hasOwnProperty(key)) continue;
      const vr = value[key];
      this[key] = async (data) => {
        return await dispatch(to, from, key, vr, data);
      };
    }    
  }

  static from(storage, {
    title,
    description,
    input, 
    output
  }) {
    return new IntentionInterface(storage, {title, description, input, output});
  }

  constructor(storage, {
    input, 
    output,
    title,
    description
  }) {
    this.#createStatePromise();
    this.#source = this.#createIntention(storage, {
      input, output, title, description
    })
  }
}