import uuid from "./core/uuid.js";

async function processError(networkIntention, error) {
  const id = error.id;
  const operation = error.operation;
  if ((id == null) || (operation == null)) return;
  if (operation == 'delete')
    await networkIntention.storage.deleteIntention(networkIntention.id);
}

class IntentionRequest {    
  #requests = new Map();
  constructor () {}

  create(source, intention, data) {
    const requestId = uuid.generate();
    const request = { sourceId: source.id, intention, id: requestId };
    request.promise = new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      request.timeout = setTimeout(() => {
        reject({ message: `Request ${requestId} time is out`, data });
        this.delete(requestId);
      }, source.messageTimeout);
    }).then(result => {
      this.delete(requestId);
      return result;
    }).catch(error => {
      this.delete(requestId, error);
      processError(source, error);
      throw error;
    });
    this.#requests.set(requestId, request);
    return request;
  }
  
  delete(requestId, error) {    
    const request = this.#requests.get(requestId);
    if (request == null) return;
    clearTimeout(request.timeout);
    error = (error == null) ? new Error(`Request ${requestId} is deleted`) : error;
    this.#requests.delete(requestId);
    request.reject(error);
  }
  
  update(message) {
    if (message.requestId == null) throw new Error('message requestId is null');
    const request = this.#requests.get(message.requestId); 
    if (request == null) {
      console.error(`request is not found: ${message.requestId}`);
      return;
    }    
    if (request.timeout != null)
      clearTimeout(request.timeout);
    if (message.status != 'FAILED')      
      return request.resolve(message.result);          
    return request.reject(message.result);
  }

  clear() {
    for (const [key, request] of this.#requests) {      
      if (request.timeout != null) 
        clearTimeout(request.timeout);
      this.delete(key);
    }
  }
}

const intentionRequest = new IntentionRequest();
export default intentionRequest;