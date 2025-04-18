import { RouteHandlerMethod } from 'fastify'

export interface IHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  route: string
  handler: RouteHandlerMethod
}
