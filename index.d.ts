import { IncomingMessage, OutgoingMessage } from "http";
import * as opentracing from "opentracing";

/**
 * Tracer is the entry-point of the Datadog tracing implementation.
 */
interface Tracer extends opentracing.Tracer {
  /**
   * Add tracer as a named export
   */
  tracer: Tracer;

  /**
   * For compatibility with NodeNext + esModuleInterop: false
   */
  default: Tracer;

  /**
   * Starts and returns a new Span representing a logical unit of work.
   * @param {string} name The name of the operation.
   * @param {tracer.SpanOptions} [options] Options for the newly created span.
   * @returns {Span} A new Span object.
   */
  startSpan (name: string, options?: tracer.SpanOptions): tracer.Span;

  /**
   * Injects the given SpanContext instance for cross-process propagation
   * within `carrier`
   * @param  {SpanContext} spanContext The SpanContext to inject into the
   *         carrier object. As a convenience, a Span instance may be passed
   *         in instead (in which case its .context() is used for the
   *         inject()).
   * @param  {string} format The format of the carrier.
   * @param  {any} carrier The carrier object.
   */
  inject (spanContext: tracer.SpanContext | tracer.Span, format: string, carrier: any): void;

  /**
   * Returns a SpanContext instance extracted from `carrier` in the given
   * `format`.
   * @param  {string} format The format of the carrier.
   * @param  {any} carrier The carrier object.
   * @return {SpanContext}
   *         The extracted SpanContext, or null if no such SpanContext could
   *         be found in `carrier`
   */
  extract (format: string, carrier: any): tracer.SpanContext | null;

  /**
   * Enable and optionally configure a plugin.
   * @param plugin The name of a built-in plugin.
   * @param config Configuration options. Can also be `false` to disable the plugin.
   */
  use<P extends keyof Plugins> (plugin: P, config?: Plugins[P] | boolean): this;

  /**
   * Returns a reference to the current scope.
   */
  scope (): tracer.Scope;

  /**
   * Instruments a function by automatically creating a span activated on its
   * scope.
   *
   * The span will automatically be finished when one of these conditions is
   * met:
   *
   * * The function returns a promise, in which case the span will finish when
   * the promise is resolved or rejected.
   * * The function takes a callback as its second parameter, in which case the
   * span will finish when that callback is called.
   * * The function doesn't accept a callback and doesn't return a promise, in
   * which case the span will finish at the end of the function execution.
   *
   * If the `orphanable` option is set to false, the function will not be traced
   * unless there is already an active span or `childOf` option. Note that this
   * option is deprecated and has been removed in version 4.0.
   */
  trace<T> (name: string, fn: (span: tracer.Span) => T): T;
  trace<T> (name: string, fn: (span: tracer.Span, done: (error?: Error) => void) => T): T;
  trace<T> (name: string, options: tracer.TraceOptions & tracer.SpanOptions, fn: (span?: tracer.Span, done?: (error?: Error) => void) => T): T;

  /**
   * Wrap a function to automatically create a span activated on its
   * scope when it's called.
   *
   * The span will automatically be finished when one of these conditions is
   * met:
   *
   * * The function returns a promise, in which case the span will finish when
   * the promise is resolved or rejected.
   * * The function takes a callback as its last parameter, in which case the
   * span will finish when that callback is called.
   * * The function doesn't accept a callback and doesn't return a promise, in
   * which case the span will finish at the end of the function execution.
   */
  wrap<T = (...args: any[]) => any> (name: string, fn: T): T;
  wrap<T = (...args: any[]) => any> (name: string, options: tracer.TraceOptions & tracer.SpanOptions, fn: T): T;
  wrap<T = (...args: any[]) => any> (name: string, options: (...args: any[]) => tracer.TraceOptions & tracer.SpanOptions, fn: T): T;

  /**
   * Returns an HTML string containing <meta> tags that should be included in
   * the <head> of a document to enable correlating the current trace with the
   * RUM view. Otherwise, it is not possible to associate the trace used to
   * generate the initial HTML document with a given RUM view. The resulting
   * HTML document should not be cached as the meta tags are time-sensitive
   * and are associated with a specific user.
   *
   * Note that this feature is currently not supported by the backend and
   * using it will have no effect.
   */
  getRumData (): string;

  /**
   * Links an authenticated user to the current trace.
   * @param {User} user Properties of the authenticated user. Accepts custom fields.
   * @returns {Tracer} The Tracer instance for chaining.
   */
  setUser (user: tracer.User): Tracer;

  appsec: tracer.Appsec;

  dogstatsd: tracer.DogStatsD;
}

declare namespace tracer {
  export type SpanOptions = opentracing.SpanOptions;
  export { Tracer };

  export interface TraceOptions extends Analyzable {
    /**
     * The resource you are tracing. The resource name must not be longer than
     * 5000 characters.
     */
    resource?: string,

    /**
     * The service you are tracing. The service name must not be longer than
     * 100 characters.
     */
    service?: string,

    /**
     * The type of request.
     */
    type?: string

    /**
     * An array of span links
     */
    links?: Array<{ context: SpanContext, attributes?: Object }>
  }

  /**
   * Span represents a logical unit of work as part of a broader Trace.
   * Examples of span might include remote procedure calls or a in-process
   * function calls to sub-components. A Trace has a single, top-level "root"
   * Span that in turn may have zero or more child Spans, which in turn may
   * have children.
   */
  export interface Span extends opentracing.Span {
    context (): SpanContext;

    /**
     * Causally links another span to the current span
     * @param {SpanContext} context The context of the span to link to.
     * @param {Object} attributes An optional key value pair of arbitrary values.
     * @returns {void}
     */
    addLink (context: SpanContext, attributes?: Object): void;
  }

  /**
   * SpanContext represents Span state that must propagate to descendant Spans
   * and across process boundaries.
   *
   * SpanContext is logically divided into two pieces: the user-level "Baggage"
   * (see setBaggageItem and getBaggageItem) that propagates across Span
   * boundaries and any Tracer-implementation-specific fields that are needed to
   * identify or otherwise contextualize the associated Span instance (e.g., a
   * <trace_id, span_id, sampled> tuple).
   */
  export interface SpanContext extends opentracing.SpanContext {
    /**
     * Returns the string representation of the internal trace ID.
     */
    toTraceId (): string;

    /**
     * Returns the string representation of the internal span ID.
     */
    toSpanId (): string;

    /**
     * Returns the string representation used for DBM integration.
     */
    toTraceparent (): string;
  }

  /**
   * Sampling rule to configure on the priority sampler.
   */
  export interface SamplingRule {
    /**
     * Sampling rate for this rule.
     */
    sampleRate: number

    /**
     * Service on which to apply this rule. The rule will apply to all services if not provided.
     */
    service?: string | RegExp

    /**
     * Operation name on which to apply this rule. The rule will apply to all operation names if not provided.
     */
    name?: string | RegExp
  }

  /**
   * Span sampling rules to ingest single spans where the enclosing trace is dropped
   */
  export interface SpanSamplingRule {
    /**
     * Sampling rate for this rule. Will default to 1.0 (always) if not provided.
     */
    sampleRate?: number

    /**
     * Maximum number of spans matching a span sampling rule to be allowed per second.
     */
    maxPerSecond?: number

    /**
     * Service name or pattern on which to apply this rule. The rule will apply to all services if not provided.
     */
    service?: string

    /**
     * Operation name or pattern on which to apply this rule. The rule will apply to all operation names if not provided.
     */
    name?: string
  }

  /**
   * User object that can be passed to `tracer.appsec.setUser()`.
   */
  export interface User {
    /**
     * Unique identifier of the user.
     * Mandatory.
     */
    id: string,

    /**
     * Email of the user.
     */
    email?: string,

    /**
     * User-friendly name of the user.
     */
    name?: string,

    /**
     * Session ID of the user.
     */
    session_id?: string,

    /**
     * Role the user is making the request under.
     */
    role?: string,

    /**
     * Scopes or granted authorizations the user currently possesses.
     * The value could come from the scope associated with an OAuth2
     * Access Token or an attribute value in a SAML 2 Assertion.
     */
    scope?: string,

    /**
     * Custom fields to attach to the user (RBAC, Oauth, etc…).
     */
    [key: string]: string | undefined
  }

  export interface DogStatsD {
    /**
     * Increments a metric by the specified value, optionally specifying tags.
     * @param {string} stat The dot-separated metric name.
     * @param {number} value The amount to increment the stat by.
     * @param {[tag:string]:string|number} tags Tags to pass along, such as `{ foo: 'bar' }`. Values are combined with config.tags.
     */
    increment(stat: string, value?: number, tags?: { [tag: string]: string|number }): void

    /**
     * Decrements a metric by the specified value, optionally specifying tags.
     * @param {string} stat The dot-separated metric name.
     * @param {number} value The amount to decrement the stat by.
     * @param {[tag:string]:string|number} tags Tags to pass along, such as `{ foo: 'bar' }`. Values are combined with config.tags.
     */
    decrement(stat: string, value?: number, tags?: { [tag: string]: string|number }): void

    /**
     * Sets a distribution value, optionally specifying tags.
     * @param {string} stat The dot-separated metric name.
     * @param {number} value The amount to increment the stat by.
     * @param {[tag:string]:string|number} tags Tags to pass along, such as `{ foo: 'bar' }`. Values are combined with config.tags.
     */
    distribution(stat: string, value?: number, tags?: { [tag: string]: string|number }): void

    /**
     * Sets a gauge value, optionally specifying tags.
     * @param {string} stat The dot-separated metric name.
     * @param {number} value The amount to increment the stat by.
     * @param {[tag:string]:string|number} tags Tags to pass along, such as `{ foo: 'bar' }`. Values are combined with config.tags.
     */
    gauge(stat: string, value?: number, tags?: { [tag: string]: string|number }): void

    /**
     * Sets a histogram value, optionally specifying tags.
     * @param {string} stat The dot-separated metric name.
     * @param {number} value The amount to increment the stat by.
     * @param {[tag:string]:string|number} tags Tags to pass along, such as `{ foo: 'bar' }`. Values are combined with config.tags.
     */
    histogram(stat: string, value?: number, tags?: { [tag: string]: string|number }): void

    /**
     * Forces any unsent metrics to be sent
     *
     * @beta This method is experimental and could be removed in future versions.
     */
    flush(): void
  }

  export interface Appsec {
    /**
     * Links a successful login event to the current trace. Will link the passed user to the current trace with Appsec.setUser() internally.
     * @param {User} user Properties of the authenticated user. Accepts custom fields.
     * @param {[key: string]: string} metadata Custom fields to link to the login success event.
     *
     * @beta This method is in beta and could change in future versions.
     */
    trackUserLoginSuccessEvent(user: User, metadata?: { [key: string]: string }): void

    /**
     * Links a failed login event to the current trace.
     * @param {string} userId The user id of the attemped login.
     * @param {boolean} exists If the user id exists.
     * @param {[key: string]: string} metadata Custom fields to link to the login failure event.
     *
     * @beta This method is in beta and could change in future versions.
     */
    trackUserLoginFailureEvent(userId: string, exists: boolean, metadata?: { [key: string]: string }): void

    /**
     * Links a custom event to the current trace.
     * @param {string} eventName The name of the event.
     * @param {[key: string]: string} metadata Custom fields to link to the event.
     *
     * @beta This method is in beta and could change in future versions.
     */
    trackCustomEvent(eventName: string, metadata?: { [key: string]: string }): void

    /**
     * Checks if the passed user should be blocked according to AppSec rules.
     * If no user is linked to the current trace, will link the passed user to it.
     * @param {User} user Properties of the authenticated user. Accepts custom fields.
     * @return {boolean} Indicates whether the user should be blocked.
     *
     * @beta This method is in beta and could change in the future
     */
    isUserBlocked(user: User): boolean

    /**
     * Sends a "blocked" template response based on the request accept header and ends the response.
     * **You should stop processing the request after calling this function!**
     * @param {IncomingMessage} req Can be passed to force which request to act on. Optional.
     * @param {OutgoingMessage} res Can be passed to force which response to act on. Optional.
     * @return {boolean} Indicates if the action was successful.
     *
     * @beta This method is in beta and could change in the future
     */
    blockRequest(req?: IncomingMessage, res?: OutgoingMessage): boolean

    /**
     * Links an authenticated user to the current trace.
     * @param {User} user Properties of the authenticated user. Accepts custom fields.
     *
     * @beta This method is in beta and could change in the future
     */
    setUser(user: User): void
  }

  /** @hidden */
  type anyObject = {
    [key: string]: any;
  };

  /** @hidden */
  interface TransportRequestParams {
    method: string;
    path: string;
    body?: anyObject;
    bulkBody?: anyObject;
    querystring?: anyObject;
  }

  /**
   * The Datadog Scope Manager. This is used for context propagation.
   */
  export interface Scope {
    /**
     * Get the current active span or null if there is none.
     *
     * @returns {Span} The active span.
     */
    active (): Span | null;

    /**
     * Activate a span in the scope of a function.
     *
     * @param {Span} span The span to activate.
     * @param {Function} fn Function that will have the span activated on its scope.
     * @returns The return value of the provided function.
     */
    activate<T> (span: Span, fn: ((...args: any[]) => T)): T;

    /**
     * Binds a target to the provided span, or the active span if omitted.
     *
     * @param {Function|Promise} fn Target that will have the span activated on its scope.
     * @param {Span} [span=scope.active()] The span to activate.
     * @returns The bound target.
     */
    bind<T extends (...args: any[]) => void> (fn: T, span?: Span | null): T;
    bind<V, T extends (...args: any[]) => V> (fn: T, span?: Span | null): T;
    bind<T> (fn: Promise<T>, span?: Span | null): Promise<T>;
  }

  /** @hidden */
  interface Analyzable {
    /**
     * Whether to measure the span. Can also be set to a key-value pair with span
     * names as keys and booleans as values for more granular control.
     */
    measured?: boolean | { [key: string]: boolean };
  }
}

/**
 * Singleton returned by the module. It has to be initialized before it will
 * start tracing. If not initialized, or initialized and disabled, it will use
 * a no-op implementation.
 */
declare const tracer: Tracer;

export = tracer;
