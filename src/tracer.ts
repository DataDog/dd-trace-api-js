import * as dc from 'dc-polyfill'
import * as opentracing from "opentracing";

const { version } = require('../package.json')

const major = version.split('.')[0]

interface ChannelPayload {
  self: object
  args: IArguments
  ret: any
  proxy?: Function
  revProxy: any[]
}

interface ReturnValue {
  value?: any
  error?: Error
}

function callChannel(
  self: object,
  args: IArguments,
  name: string, 
  defaultFun: Function, 
  mapReturnValue: boolean = false,
  revProxy: Array<object> = []
): any {
  const channel = dc.channel(`datadog-api:v${major}:${name}`)
  if (!channel.hasSubscribers) {
    return defaultFun.apply(self, args)
  }
  const ret: ReturnValue = {}
  const payload: ChannelPayload = { self, args, ret, revProxy }
  if (mapReturnValue) {
    payload.proxy = defaultFun
  }
  channel.publish(payload)
  if (ret.error) throw ret.error
  if (!('value' in ret)) {
    return defaultFun.apply(self, args)
  }
  return ret.value
}

function noop(self:object, args: IArguments, name: string): void {
  return callChannel(self, args, name, () => {})
}

export type SpanOptions = opentracing.SpanOptions;

export class SpanContext {
  public toTraceId(): string {
    return callChannel(this, arguments, 'context:toTraceId', () => '0000000000000000000')
  }

  public toSpanId(): string {
    return callChannel(this, arguments, 'context:toSpanId', () => '0000000000000000000')
  }

  public toTraceparent(): string {
    return callChannel(this, arguments, 'context:toTraceparent', () => '00-00000000000000000000000000000000-0000000000000000-00')
  }
}

export class Span {
  public setTag(key: string, value: string | number): void {
    return noop(this, arguments, 'span:setTag')
  }

  public addTags(keyValuePairs: { [key: string]: string | number }): void {
    return noop(this, arguments, 'span:addTags')
  }

  public finish(): void {
    return noop(this, arguments, 'span:finish')
  }

  public context(): opentracing.SpanContext {
    return callChannel(this, arguments, 'span:context', () => new SpanContext())
  }

  public addLink(): void {
    return noop(this, arguments, 'addLink')
  }
}

export class Scope {
  // TODO is this Span | SpanContext?
  public activate(fn: Function): any;
  public activate(span: Span, fn: Function): any;
  public activate(spanOrFn: Span | Function, fn?: Function): any {
    return callChannel(this, arguments, 'scope:activate', fn)
  }

  public active(): Span | null {
    return callChannel(this, arguments, 'scope:active', () => new Span(), true)
  }

  public bind(fn: Function): void {
    return callChannel(this, arguments, 'scope:bind', fn => fn)
  }
}

export function startSpan(name: string, options?: SpanOptions): Span {
  return callChannel(this, arguments, 'startSpan', () => new Span(), true)
}

export function inject(spanContext: Span | SpanContext, format: string, carrier: object): void {
  return noop(this, arguments, 'inject')
}

export function extract(format: string, carrier: object): SpanContext | null{
  return callChannel(this, arguments, 'extract', () => null)
}

interface PluginConfig {
  // TODO
}

export function use(plugin: string, options?: PluginConfig): void {
  return noop(this, arguments, 'use')
}

export function scope(): Scope {
  return callChannel(this, arguments, 'scope', () => new Scope())
}

interface TraceOnlyOptions {
  // TODO
}
type TraceOptions = TraceOnlyOptions & SpanOptions;

type TraceFunction<T> = ((span: Span) => T) | ((span: Span, done: (error?: Error) => void) => T);
export function trace<T> (name: string, fn: TraceFunction<T>): T;
export function trace<T> (name: string, options: TraceOptions, fn: TraceFunction<T>): T;
export function trace<T> (
  name: string,
  optionsOrFn?: TraceOptions & SpanOptions,
  fn?: (span?: Span, done?: (error?: Error) => void) => T
): T {
  return callChannel(this, arguments, 'trace', function (name, optionsOrFn, fn) {
    fn = typeof optionsOrFn === 'function' ? optionsOrFn : fn
    return fn.apply(this, arguments)

  }, false, [() => new Span()])
}

type AnyFn<T> = (...args: any[]) => T;
export function wrap<T = AnyFn<any>> (name: string, fn: T): T;
export function wrap<T = AnyFn<any>> (name: string, options: TraceOptions, fn: T): T;
export function wrap<T = AnyFn<any>> (name: string, options: AnyFn<TraceOptions>, fn: T): T;
export function wrap<T = AnyFn<any>> (name: string, optionsOrFn: TraceOptions | AnyFn<TraceOptions>, fn?: T): T {
  return callChannel(this, arguments, 'wrap', (name, optionsOrFn, fn) => {
    return typeof optionsOrFn === 'function' ? optionsOrFn : fn
  })
}

export function getRumData(): string {
  return callChannel(this, arguments, 'getRumData', () => '')
}
