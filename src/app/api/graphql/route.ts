
import { createYoga } from 'graphql-yoga'
import { builder } from '@/graphql/builder'
import  '@/graphql/schema/story'
import  '@/graphql/schema/user'
import  '@/graphql/schema/comment'
import  '@/graphql/schema/reaction'
import { NextRequest } from 'next/server'
import { context } from '@/context/context'


const schema = builder.toSchema()

const { handleRequest } = createYoga({
  schema,
  context,
  // Yoga needs to know how to create a valid Next response
  fetchAPI: {
    Response: Response,
    Request: Request,
  },
  graphqlEndpoint: '/api/graphql',
})

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
}
