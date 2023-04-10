export default function createPromiseState({
  message = 'Time is out', 
  rejectTimeout = 120000
}) {  
  let setReady;
  let timeout;
  const ready = new Promise((resolve, reject) => {
    setReady = resolve;
    timeout = setTimeout(() => reject(new Error(message)), rejectTimeout);
  }).then((r) => {
    clearTimeout(timeout);
    return r;
  });
  return { ready, setReady }
}
