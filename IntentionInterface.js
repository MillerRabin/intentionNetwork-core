import state from "./core/state.js";

async function dispatch(to, from, command, schema, data) {
  const res = await to.send('data', from, {
    command,
    data
  });  
  return res;
}


export class IntentionInterface {
  #statePromise = state.createPromiseState({ message: 'Interface connection time out'});
  #source;

  async #createIntentions(storage, {
    title,
    description,
    input,
    output
  }) {
    this.#source = storage.createIntention({
      title,
      description,
      input,
      output,
      onData: async (status, intention, value) => {
        if (status == 'interface') {
          this.#mapValueToInterface(intention, this.#source, value);          
          this.#statePromise.setReady();
        }    
      }
    });
  }

  get ready() { return this.#statePromise.ready }
  
  #mapValueToInterface(to, from, value) {
    if (value == null) throw new Error(`Value can't be null`);      
    for (const key in value) {
      if (!value.hasOwnProperty(key)) continue;
      const vr = value[key];
      this[key] = async (data) => {
        return await dispatch(to, from, key, vr, data);
      };
    }
    return res;
  }

  static from({
    title,
    description,
    input, 
    output
  }) {
    return new IntentionInterface({title, description, input, output});
  }

  constructor(storage, {
    input, 
    output,
    title,
    description
  }) {
    this.#source = this.#createIntentions(storage, {
      input, output, title, description
    })
  }
}


export default {  
  IntentionInterface
}