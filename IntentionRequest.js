import uuid from "./core/uuid.js";

const gRequestTransactions = new Map();

async function processError(networkIntention, error) {
  const id = error.id;
  const operation = error.operation;
  if ((id == null) || (operation == null)) return;
  if (operation == 'delete')
    await networkIntention.storage.deleteIntention(networkIntention.id);
}

export default class IntentionRequest {  
  #intention;
  constructor (intention) {
    this.#intention = intention;    
  }

  create(intention, data) {
    const requestId = uuid.generate();
    const request = { intention, id: requestId };
    request.promise = new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      request.timeout = setTimeout(() => {
        reject({ message: `Request ${requestId} time is out`, data });
        this.delete(requestId);
      }, this.#intention.messageTimeout);
    }).then(result => {
      this.delete(requestId);
      return result;
    }).catch(error => {
      this.delete(requestId, error);
      processError(this.#intention, error);
      throw error;
    });
    gRequestTransactions.set(requestId, request);
    return request;
  }
  
  delete(requestId, error) {    
    const request = gRequestTransactions.get(requestId);
    if (request == null) return;
    clearTimeout(request.timeout);
    error = (error == null) ? new Error(`Request ${requestId} is deleted`) : error;
    gRequestTransactions.delete(requestId);
    request.reject(error);
  }
  
  update(message) {
    if (message.requestId == null) throw new Error('message requestId is null');
    const request = gRequestTransactions.get(message.requestId); 
    if (request == null) {
      console.error(`request is not found: ${message.requestId}`);
      return;
    }
    if (message.status != 'FAILED') {
      clearTimeout(request.timeout);
      return request.resolve(message.result);      
    }
    if (requestTimeout != null)
      clearTimeout(request.timeout);
    return request.reject(message.result);
  }

  clear() {
    for (const [key] of gRequestTransactions) {
      this.delete(key);
    }
  }
}