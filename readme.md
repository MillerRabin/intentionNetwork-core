# Intention network Messages

Message parser is parser of channel message for Intention Network.
In Intention Network all messages a binary and has a header with unique id and offset of packet.
If message is larger than chunkSize, it will be splitted to multiple small messages.

## Send(channel, message, chunkSize)
  Sends a message through the channel. Every message will have unique id and packet information.
  if message length larger than chunkSize channel.send will be called multiple times.

## parseSingle(message)
  Decode Intention Network message. Message must not be splitted. Can be used in lambdas.

## parseMulti(message)
  Decode Intention Network message. Message can be splitted to parts. This function waits while all parts will be 
  received and returns whole decoded message. Delay between parts can't be less than cancelTime (5000) seconds otherwise exception will be thrown

## setCancelTime(value)
  Set cancel time to different value.