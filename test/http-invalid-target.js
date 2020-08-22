'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const From = require('..')
const got = require('got')

test('http invalid target', async (t) => {
  const instance = Fastify()

  const timeout = 1000 * 60 * 2
  t.setTimeout(timeout)
  t.tearDown(instance.close.bind(instance))

  instance.get('/', (request, reply) => {
    reply.from()
  })
  instance.register(From, {
    base: 'http://abc.xyz1',
    http: { requestOptions: { timeout } }
  })

  await instance.listen(0)

  try {
    await got(`http://localhost:${instance.server.address().port}`)
  } catch (err) {
    t.equal(err.response.statusCode, 503)
    t.match(err.response.headers['content-type'], /application\/json/)
    t.deepEqual(JSON.parse(err.response.body), {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Service Unavailable'
    })
    return
  }
  t.fail()
})
