const pubEvents = require('./get-all-published-channels')
const subEvents = require('./get-all-subscribed-channels')

const filteredSubEvents = new Set()
const filteredPubEvents = new Set()
for (let i = 0; i < subEvents.length; i++) {
  const event = subEvents[i]
  if (!pubEvents.includes(event)) {
    filteredSubEvents.add(event)
  }
}

for (let i = 0; i < pubEvents.length; i++) {
  const event = pubEvents[i]
  if (!subEvents.includes(event)) {
    filteredPubEvents.add(event)
  }
}

console.log('Subscribed events not published:', Array.from(filteredSubEvents))
console.log('Published events not subscribed:', Array.from(filteredPubEvents))
