'use strict'

const t = require('tap')
const fastify = require('fastify')
const From = require('..')

const upstream = fastify()
t.teardown(upstream.close.bind(upstream))
t.plan(3)

upstream.post('/test', async (request, reply) => {
  if (typeof request.body === 'object') {
    return 'not ok'
  }
  return 'ok'
})

upstream.listen({ port: 0 }, function (err) {
  t.error(err)

  const app = fastify()
  app.register(From)
  t.teardown(app.close.bind(app))

  app.post('/test', (request, reply) => {
    if (request.body.method === 'invalid_method') {
      return reply.code(400).send({ message: 'payload contains invalid method' })
    }
    reply.from(`http://127.0.0.1:${upstream.server.address().port}/test`)
  })

  app.listen({ port: 0 }, async function (err) {
    t.error(err)

    const response = await fetch(
      `http://127.0.0.1:${app.server.address().port}/test`,
      {
        headers: { 'content-type': 'application/json ; charset=utf-8' },
        // eslint-disable-next-line no-useless-escape
        body: '"{\\\"method\\\":\\\"invalid_method\\\"}"',
        method: 'POST'
      })

    t.equal(await response.text(), 'ok')
  })
})
