'use strict'

const t = require('tap')
const Fastify = require('fastify')
const From = require('..')
const http = require('http')
const get = require('simple-get').concat

const instance = Fastify()

t.plan(9)
t.tearDown(instance.close.bind(instance))

const bodyString = JSON.stringify({ hello: 'world' })

const parsedLength = Buffer.byteLength(bodyString)

const target = http.createServer((req, res) => {
  t.pass('request proxied')
  t.equal(req.method, 'POST')
  t.equal(req.headers['content-type'], 'application/json')
  t.same(req.headers['content-length'], parsedLength)
  let data = ''
  req.setEncoding('utf8')
  req.on('data', (d) => {
    data += d
  })
  req.on('end', () => {
    t.same(JSON.parse(data), { hello: 'world' })
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ something: 'else' }))
  })
})

instance.post('/', (request, reply) => {
  reply.from(`http://localhost:${target.address().port}`)
})

t.tearDown(target.close.bind(target))

target.listen(0, (err) => {
  t.error(err)

  instance.addContentTypeParser('application/json', function (req, payload, done) {
    done(null, payload)
  })

  instance.register(From, {
    base: `http://localhost:${target.address().port}`,
    undici: true
  })

  instance.listen(0, (err) => {
    t.error(err)

    get({
      url: `http://localhost:${instance.server.address().port}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: bodyString
    }, (err, res, data) => {
      t.error(err)
      const parsed = JSON.parse(data)
      t.deepEqual(parsed, { something: 'else' })
    })
  })
})
