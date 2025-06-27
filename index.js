require('dotenv').config()
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs')

app.set('trust proxy', 1) // Trust first proxy (for Coolify, Heroku, Docker, etc.)

app.use(express.json()) // For parsing JSON bodies
app.use(express.urlencoded({ extended: true })) // For parsing URL-encoded bodies

const rateLimitWindowMinutes =
  parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: rateLimitWindowMinutes * 60 * 1000, // minutes to ms
  max: rateLimitMax, // limit each IP to max requests per window
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
})
app.use(limiter)

app.get('/', (req, res) => {
  res
    .type('text/plain')
    .send(
      `httpstatus Node.js service\n\nUsage:\n  /<code>                - Returns the specified HTTP status code\n  /random/<range>        - Returns a random status code from a list or range\n\nOptions:\n  ?sleep=ms              - Delay the response by ms milliseconds\n  Accept: application/json - Get response in JSON format\n\nExamples:\n  /200                   - Returns HTTP 200 OK\n  /404?sleep=1000        - Returns HTTP 404 after 1 second\n  /random/200,201,500-504 - Randomly returns one of the listed codes\n\nFor more info, see: https://httpstat.us\n`
    )
})

// Helper to check if a string is a valid HTTP status code
function isValidStatusCode(code) {
  const num = Number(code)
  return Number.isInteger(num) && num >= 100 && num <= 599
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str)
  } catch {
    return undefined
  }
}

// Map of status code descriptions (short, can be expanded)
const statusDescriptions = {
  200: 'OK: The request has succeeded.',
  201: 'Created: The request has been fulfilled and resulted in a new resource being created.',
  202: 'Accepted: The request has been accepted for processing, but the processing has not been completed.',
  204: 'No Content: The server successfully processed the request, but is not returning any content.',
  301: 'Moved Permanently: The resource has been moved to a new URL.',
  302: 'Found: The resource resides temporarily under a different URL.',
  400: 'Bad Request: The server could not understand the request due to invalid syntax.',
  401: 'Unauthorized: The client must authenticate itself to get the requested response.',
  403: 'Forbidden: The client does not have access rights to the content.',
  404: 'Not Found: The server can not find the requested resource.',
  500: "Internal Server Error: The server has encountered a situation it doesn't know how to handle.",
  502: 'Bad Gateway: The server was acting as a gateway or proxy and received an invalid response.',
  503: 'Service Unavailable: The server is not ready to handle the request.',
  504: 'Gateway Timeout: The server is acting as a gateway and cannot get a response in time.',
  // ... add more as needed ...
}

function getStatusDescription(code) {
  return statusDescriptions[code] || ''
}

function getMDNLink(code) {
  return `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code}`
}

// Main status code endpoint
app.all('/:code', async (req, res, next) => {
  // Skip if this is /random or /echo or /health or /docs or root
  if (['random', 'echo', 'health', 'docs', ''].includes(req.params.code))
    return next()

  const { code } = req.params
  const { sleep, body: bodyParam } = req.query
  const statusCode = Number(code)

  if (!isValidStatusCode(statusCode)) {
    return res.status(400).send('Invalid HTTP status code')
  }

  // Optional delay
  if (sleep) {
    const ms = parseInt(sleep, 10)
    if (!isNaN(ms) && ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms))
    }
  }

  // Custom response body
  let customBody
  if (bodyParam !== undefined) {
    // Try to parse as JSON, fallback to string
    customBody = tryParseJSON(bodyParam) ?? bodyParam
  } else if (
    ['POST', 'PUT', 'PATCH'].includes(req.method) &&
    req.body &&
    Object.keys(req.body).length > 0
  ) {
    customBody = req.body
  }

  // Content negotiation
  const accept = req.headers['accept'] || ''
  if (customBody !== undefined) {
    if (typeof customBody === 'object') {
      res.status(statusCode).json(customBody)
    } else {
      res.status(statusCode).type('text/plain').send(String(customBody))
    }
    return
  }

  if (accept.includes('application/json')) {
    res.status(statusCode).json({
      code: statusCode,
      description: res.statusMessage || '',
      details: getStatusDescription(statusCode),
      mdn: getMDNLink(statusCode),
    })
  } else {
    res
      .status(statusCode)
      .type('text/plain')
      .send(`${statusCode} ${res.statusMessage || ''}`.trim())
  }
})

// Helper to parse range strings like '200,201,500-504'
function parseStatusCodeRange(rangeStr) {
  const codes = []
  const parts = rangeStr.split(',')
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start <= end &&
        isValidStatusCode(start) &&
        isValidStatusCode(end)
      ) {
        for (let i = start; i <= end; i++) {
          codes.push(i)
        }
      }
    } else {
      const code = Number(part)
      if (isValidStatusCode(code)) {
        codes.push(code)
      }
    }
  }
  return codes
}

// /random/:range endpoint
app.all('/random/:range', async (req, res) => {
  const { range } = req.params
  const { sleep, body: bodyParam } = req.query
  const codes = parseStatusCodeRange(range)

  if (!codes.length) {
    return res.status(400).send('Invalid range for random status codes')
  }

  // Pick a random code
  const statusCode = codes[Math.floor(Math.random() * codes.length)]

  // Optional delay
  if (sleep) {
    const ms = parseInt(sleep, 10)
    if (!isNaN(ms) && ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms))
    }
  }

  // Custom response body
  let customBody
  if (bodyParam !== undefined) {
    customBody = tryParseJSON(bodyParam) ?? bodyParam
  } else if (
    ['POST', 'PUT', 'PATCH'].includes(req.method) &&
    req.body &&
    Object.keys(req.body).length > 0
  ) {
    customBody = req.body
  }

  // Content negotiation
  const accept = req.headers['accept'] || ''
  if (customBody !== undefined) {
    if (typeof customBody === 'object') {
      res.status(statusCode).json(customBody)
    } else {
      res.status(statusCode).type('text/plain').send(String(customBody))
    }
    return
  }

  if (accept.includes('application/json')) {
    res.status(statusCode).json({
      code: statusCode,
      description: res.statusMessage || '',
      details: getStatusDescription(statusCode),
      mdn: getMDNLink(statusCode),
    })
  } else {
    res
      .status(statusCode)
      .type('text/plain')
      .send(`${statusCode} ${res.statusMessage || ''}`.trim())
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).type('text/plain').send('OK')
})

// Echo endpoint
app.all('/echo', (req, res) => {
  res.json({
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    url: req.originalUrl,
  })
})

// Redirect endpoint
app.get('/redirect/:code', (req, res) => {
  const { code } = req.params
  const { to } = req.query
  const statusCode = Number(code)
  // Valid redirect codes: 300-308
  if (!isValidStatusCode(statusCode) || statusCode < 300 || statusCode > 308) {
    return res
      .status(400)
      .send('Invalid redirect status code (must be 300-308)')
  }
  if (!to) {
    return res
      .status(400)
      .send('Missing "to" query parameter for redirect target')
  }
  res.redirect(statusCode, to)
})

// Serve OpenAPI docs
const openapiDocument = YAML.load('./openapi.yaml')
const actualPort = PORT
openapiDocument.servers = [{ url: `http://localhost:${actualPort}` }]
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, false, {
    customHead: '<meta name="robots" content="noindex, nofollow">',
  })
)

// Add X-Robots-Tag header to all responses
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  next()
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
