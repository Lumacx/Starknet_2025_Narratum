// src/app/api/graphql/route.ts
import 'server-only'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Build (and cache) the Yoga server once per instance
const yogaPromise = (async () => {
  const { createYoga } = await import('graphql-yoga')
  const { builder } = await import('@/graphql/builder')

  await Promise.all([
    import('@/graphql/schema/story'),
    import('@/graphql/schema/user'),
    import('@/graphql/schema/comment'),
    import('@/graphql/schema/reaction'),
  ])

  const { context } = await import('@/context/context')
  const schema = builder.toSchema()

  return createYoga({
    schema,
    context,
    graphqlEndpoint: '/api/graphql',
    fetchAPI: { Response, Request },
  })
})()

type NextCtx = { params?: Record<string, string> } // keep signature for Next

export async function GET(req: Request, _ctx: NextCtx) {
  const yoga = await yogaPromise
  return yoga.fetch(req) // <-- no ctx needed
}

export async function POST(req: Request, _ctx: NextCtx) {
  const yoga = await yogaPromise
  return yoga.fetch(req)
}

export async function OPTIONS(req: Request, _ctx: NextCtx) {
  const yoga = await yogaPromise
  return yoga.fetch(req)
}
