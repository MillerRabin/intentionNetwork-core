# Intention network Messages

Message parser is parser of channel message for Intention Network.
In Intention Network all messages a binary and has a header with unique id and offset of packet.
If message is larger than chunkSize, it will be splitted to multiple small messages.

## Send({ useStreaming = true, channel, message, chunkSize })
  if useStreaming is set to true sends message through the channel in the streaming mode otherwise sends data as is.
### streamingMode
  Message will be splitted into the chunks with a maximum size !chunkSize 
  Every part will have unique id and packet information. Needs to be concatenated on recepient.
## parse(message)
  Decode Intention Network message. Can decode JSON messages and streaming messages

## setCancelTime(value)
  If streaming message does not receives all it's parts during cancel timeout, it will be rejected.
  This function sets with timeout 