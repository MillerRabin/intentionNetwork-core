export default function createPromiseState({
  message = 'Time is out', 
  rejectTimeout = 30000
}) {  
  let setReady;
  let timeout;
  let cancel;
  const ready = new Promise((resolve, reject) => {
    setReady = resolve;
    cancel = reject;
    timeout = setTimeout(() => reject(new Error(message)), rejectTimeout);
  }).then((r) => {
    clearTimeout(timeout);
    return r;
  });
  return { ready, setReady, cancel }
}
