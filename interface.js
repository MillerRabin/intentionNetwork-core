async function dispatch(to, from, command, schema, data) {
  const res = await to.send('data', from, {
    command,
    data
  });
  console.log(res);
  return res;
}

export function mapValueToInterface(to, from, value) {
  if (value == null) throw new Error(`Value can't be null`);  
  const res = {};
  for (const key in value) {
    if (!value.hasOwnProperty(key)) continue;
    const vr = value[key];
    res[key] = async (data) => {
      return await dispatch(to, from, key, vr, data);
    };
  }
  return res;
}

export default {
  mapValueToInterface  
}