
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Establishment
 * 
 */
export type Establishment = $Result.DefaultSelection<Prisma.$EstablishmentPayload>
/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Courier
 * 
 */
export type Courier = $Result.DefaultSelection<Prisma.$CourierPayload>
/**
 * Model Order
 * 
 */
export type Order = $Result.DefaultSelection<Prisma.$OrderPayload>
/**
 * Model Route
 * 
 */
export type Route = $Result.DefaultSelection<Prisma.$RoutePayload>
/**
 * Model RouteStop
 * 
 */
export type RouteStop = $Result.DefaultSelection<Prisma.$RouteStopPayload>
/**
 * Model CourierPing
 * 
 */
export type CourierPing = $Result.DefaultSelection<Prisma.$CourierPingPayload>
/**
 * Model DomainEventLog
 * 
 */
export type DomainEventLog = $Result.DefaultSelection<Prisma.$DomainEventLogPayload>
/**
 * Model GeocodeCache
 * 
 */
export type GeocodeCache = $Result.DefaultSelection<Prisma.$GeocodeCachePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const OrderSourceKind: {
  MANUAL: 'MANUAL',
  WEBHOOK: 'WEBHOOK',
  IFOOD: 'IFOOD',
  AIQFOME: 'AIQFOME'
};

export type OrderSourceKind = (typeof OrderSourceKind)[keyof typeof OrderSourceKind]


export const OrderStatus: {
  NEW: 'NEW',
  IN_ROUTE: 'IN_ROUTE',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED'
};

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]


export const RouteStatus: {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED'
};

export type RouteStatus = (typeof RouteStatus)[keyof typeof RouteStatus]


export const StopStatus: {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED'
};

export type StopStatus = (typeof StopStatus)[keyof typeof StopStatus]

}

export type OrderSourceKind = $Enums.OrderSourceKind

export const OrderSourceKind: typeof $Enums.OrderSourceKind

export type OrderStatus = $Enums.OrderStatus

export const OrderStatus: typeof $Enums.OrderStatus

export type RouteStatus = $Enums.RouteStatus

export const RouteStatus: typeof $Enums.RouteStatus

export type StopStatus = $Enums.StopStatus

export const StopStatus: typeof $Enums.StopStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Establishments
 * const establishments = await prisma.establishment.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Establishments
   * const establishments = await prisma.establishment.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.PrismaClientConstructorArgs<ClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.establishment`: Exposes CRUD operations for the **Establishment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Establishments
    * const establishments = await prisma.establishment.findMany()
    * ```
    */
  get establishment(): Prisma.EstablishmentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.courier`: Exposes CRUD operations for the **Courier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Couriers
    * const couriers = await prisma.courier.findMany()
    * ```
    */
  get courier(): Prisma.CourierDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.order`: Exposes CRUD operations for the **Order** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Orders
    * const orders = await prisma.order.findMany()
    * ```
    */
  get order(): Prisma.OrderDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.route`: Exposes CRUD operations for the **Route** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Routes
    * const routes = await prisma.route.findMany()
    * ```
    */
  get route(): Prisma.RouteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.routeStop`: Exposes CRUD operations for the **RouteStop** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RouteStops
    * const routeStops = await prisma.routeStop.findMany()
    * ```
    */
  get routeStop(): Prisma.RouteStopDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.courierPing`: Exposes CRUD operations for the **CourierPing** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CourierPings
    * const courierPings = await prisma.courierPing.findMany()
    * ```
    */
  get courierPing(): Prisma.CourierPingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.domainEventLog`: Exposes CRUD operations for the **DomainEventLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DomainEventLogs
    * const domainEventLogs = await prisma.domainEventLog.findMany()
    * ```
    */
  get domainEventLog(): Prisma.DomainEventLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.geocodeCache`: Exposes CRUD operations for the **GeocodeCache** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GeocodeCaches
    * const geocodeCaches = await prisma.geocodeCache.findMany()
    * ```
    */
  get geocodeCache(): Prisma.GeocodeCacheDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.9.1
   * Query Engine version: e922089b7d7502aff4249d5da3420f6fa55fc6ad
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * Resolved type of the argument passed to the `PrismaClient` constructor.
   *
   * When called without a narrower options type (the common case), this resolves
   * to `PrismaClientOptions` directly, which produces a clear TypeScript error
   * message (`not assignable to parameter of type 'PrismaClientOptions'`) when
   * the argument is missing or incomplete. When the user supplies a narrower
   * options type (e.g. via a literal), it falls back to `Subset` to keep
   * filtering out unknown properties.
   */
  export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> =
    [PrismaClientOptions] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      ((Without<T, U> & U) | (Without<U, T> & T)) & object
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Establishment: 'Establishment',
    User: 'User',
    Courier: 'Courier',
    Order: 'Order',
    Route: 'Route',
    RouteStop: 'RouteStop',
    CourierPing: 'CourierPing',
    DomainEventLog: 'DomainEventLog',
    GeocodeCache: 'GeocodeCache'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "establishment" | "user" | "courier" | "order" | "route" | "routeStop" | "courierPing" | "domainEventLog" | "geocodeCache"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Establishment: {
        payload: Prisma.$EstablishmentPayload<ExtArgs>
        fields: Prisma.EstablishmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EstablishmentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EstablishmentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>
          }
          findFirst: {
            args: Prisma.EstablishmentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EstablishmentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>
          }
          findMany: {
            args: Prisma.EstablishmentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>[]
          }
          create: {
            args: Prisma.EstablishmentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>
          }
          createMany: {
            args: Prisma.EstablishmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EstablishmentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>[]
          }
          delete: {
            args: Prisma.EstablishmentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>
          }
          update: {
            args: Prisma.EstablishmentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>
          }
          deleteMany: {
            args: Prisma.EstablishmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EstablishmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EstablishmentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>[]
          }
          upsert: {
            args: Prisma.EstablishmentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EstablishmentPayload>
          }
          aggregate: {
            args: Prisma.EstablishmentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEstablishment>
          }
          groupBy: {
            args: Prisma.EstablishmentGroupByArgs<ExtArgs>
            result: $Utils.Optional<EstablishmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.EstablishmentCountArgs<ExtArgs>
            result: $Utils.Optional<EstablishmentCountAggregateOutputType> | number
          }
        }
      }
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Courier: {
        payload: Prisma.$CourierPayload<ExtArgs>
        fields: Prisma.CourierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CourierFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CourierFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>
          }
          findFirst: {
            args: Prisma.CourierFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CourierFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>
          }
          findMany: {
            args: Prisma.CourierFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>[]
          }
          create: {
            args: Prisma.CourierCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>
          }
          createMany: {
            args: Prisma.CourierCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CourierCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>[]
          }
          delete: {
            args: Prisma.CourierDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>
          }
          update: {
            args: Prisma.CourierUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>
          }
          deleteMany: {
            args: Prisma.CourierDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CourierUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CourierUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>[]
          }
          upsert: {
            args: Prisma.CourierUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPayload>
          }
          aggregate: {
            args: Prisma.CourierAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCourier>
          }
          groupBy: {
            args: Prisma.CourierGroupByArgs<ExtArgs>
            result: $Utils.Optional<CourierGroupByOutputType>[]
          }
          count: {
            args: Prisma.CourierCountArgs<ExtArgs>
            result: $Utils.Optional<CourierCountAggregateOutputType> | number
          }
        }
      }
      Order: {
        payload: Prisma.$OrderPayload<ExtArgs>
        fields: Prisma.OrderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          findFirst: {
            args: Prisma.OrderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          findMany: {
            args: Prisma.OrderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          create: {
            args: Prisma.OrderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          createMany: {
            args: Prisma.OrderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OrderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          delete: {
            args: Prisma.OrderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          update: {
            args: Prisma.OrderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          deleteMany: {
            args: Prisma.OrderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OrderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OrderUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          upsert: {
            args: Prisma.OrderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          aggregate: {
            args: Prisma.OrderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOrder>
          }
          groupBy: {
            args: Prisma.OrderGroupByArgs<ExtArgs>
            result: $Utils.Optional<OrderGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrderCountArgs<ExtArgs>
            result: $Utils.Optional<OrderCountAggregateOutputType> | number
          }
        }
      }
      Route: {
        payload: Prisma.$RoutePayload<ExtArgs>
        fields: Prisma.RouteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RouteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RouteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          findFirst: {
            args: Prisma.RouteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RouteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          findMany: {
            args: Prisma.RouteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>[]
          }
          create: {
            args: Prisma.RouteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          createMany: {
            args: Prisma.RouteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RouteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>[]
          }
          delete: {
            args: Prisma.RouteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          update: {
            args: Prisma.RouteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          deleteMany: {
            args: Prisma.RouteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RouteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RouteUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>[]
          }
          upsert: {
            args: Prisma.RouteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          aggregate: {
            args: Prisma.RouteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoute>
          }
          groupBy: {
            args: Prisma.RouteGroupByArgs<ExtArgs>
            result: $Utils.Optional<RouteGroupByOutputType>[]
          }
          count: {
            args: Prisma.RouteCountArgs<ExtArgs>
            result: $Utils.Optional<RouteCountAggregateOutputType> | number
          }
        }
      }
      RouteStop: {
        payload: Prisma.$RouteStopPayload<ExtArgs>
        fields: Prisma.RouteStopFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RouteStopFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RouteStopFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>
          }
          findFirst: {
            args: Prisma.RouteStopFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RouteStopFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>
          }
          findMany: {
            args: Prisma.RouteStopFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>[]
          }
          create: {
            args: Prisma.RouteStopCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>
          }
          createMany: {
            args: Prisma.RouteStopCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RouteStopCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>[]
          }
          delete: {
            args: Prisma.RouteStopDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>
          }
          update: {
            args: Prisma.RouteStopUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>
          }
          deleteMany: {
            args: Prisma.RouteStopDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RouteStopUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RouteStopUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>[]
          }
          upsert: {
            args: Prisma.RouteStopUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RouteStopPayload>
          }
          aggregate: {
            args: Prisma.RouteStopAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRouteStop>
          }
          groupBy: {
            args: Prisma.RouteStopGroupByArgs<ExtArgs>
            result: $Utils.Optional<RouteStopGroupByOutputType>[]
          }
          count: {
            args: Prisma.RouteStopCountArgs<ExtArgs>
            result: $Utils.Optional<RouteStopCountAggregateOutputType> | number
          }
        }
      }
      CourierPing: {
        payload: Prisma.$CourierPingPayload<ExtArgs>
        fields: Prisma.CourierPingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CourierPingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CourierPingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>
          }
          findFirst: {
            args: Prisma.CourierPingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CourierPingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>
          }
          findMany: {
            args: Prisma.CourierPingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>[]
          }
          create: {
            args: Prisma.CourierPingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>
          }
          createMany: {
            args: Prisma.CourierPingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CourierPingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>[]
          }
          delete: {
            args: Prisma.CourierPingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>
          }
          update: {
            args: Prisma.CourierPingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>
          }
          deleteMany: {
            args: Prisma.CourierPingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CourierPingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CourierPingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>[]
          }
          upsert: {
            args: Prisma.CourierPingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourierPingPayload>
          }
          aggregate: {
            args: Prisma.CourierPingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCourierPing>
          }
          groupBy: {
            args: Prisma.CourierPingGroupByArgs<ExtArgs>
            result: $Utils.Optional<CourierPingGroupByOutputType>[]
          }
          count: {
            args: Prisma.CourierPingCountArgs<ExtArgs>
            result: $Utils.Optional<CourierPingCountAggregateOutputType> | number
          }
        }
      }
      DomainEventLog: {
        payload: Prisma.$DomainEventLogPayload<ExtArgs>
        fields: Prisma.DomainEventLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DomainEventLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DomainEventLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>
          }
          findFirst: {
            args: Prisma.DomainEventLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DomainEventLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>
          }
          findMany: {
            args: Prisma.DomainEventLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>[]
          }
          create: {
            args: Prisma.DomainEventLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>
          }
          createMany: {
            args: Prisma.DomainEventLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DomainEventLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>[]
          }
          delete: {
            args: Prisma.DomainEventLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>
          }
          update: {
            args: Prisma.DomainEventLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>
          }
          deleteMany: {
            args: Prisma.DomainEventLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DomainEventLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DomainEventLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>[]
          }
          upsert: {
            args: Prisma.DomainEventLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DomainEventLogPayload>
          }
          aggregate: {
            args: Prisma.DomainEventLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDomainEventLog>
          }
          groupBy: {
            args: Prisma.DomainEventLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<DomainEventLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.DomainEventLogCountArgs<ExtArgs>
            result: $Utils.Optional<DomainEventLogCountAggregateOutputType> | number
          }
        }
      }
      GeocodeCache: {
        payload: Prisma.$GeocodeCachePayload<ExtArgs>
        fields: Prisma.GeocodeCacheFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GeocodeCacheFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GeocodeCacheFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>
          }
          findFirst: {
            args: Prisma.GeocodeCacheFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GeocodeCacheFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>
          }
          findMany: {
            args: Prisma.GeocodeCacheFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>[]
          }
          create: {
            args: Prisma.GeocodeCacheCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>
          }
          createMany: {
            args: Prisma.GeocodeCacheCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GeocodeCacheCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>[]
          }
          delete: {
            args: Prisma.GeocodeCacheDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>
          }
          update: {
            args: Prisma.GeocodeCacheUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>
          }
          deleteMany: {
            args: Prisma.GeocodeCacheDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GeocodeCacheUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GeocodeCacheUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>[]
          }
          upsert: {
            args: Prisma.GeocodeCacheUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GeocodeCachePayload>
          }
          aggregate: {
            args: Prisma.GeocodeCacheAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGeocodeCache>
          }
          groupBy: {
            args: Prisma.GeocodeCacheGroupByArgs<ExtArgs>
            result: $Utils.Optional<GeocodeCacheGroupByOutputType>[]
          }
          count: {
            args: Prisma.GeocodeCacheCountArgs<ExtArgs>
            result: $Utils.Optional<GeocodeCacheCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * A driver adapter that PrismaClient uses to connect to your database, such as the ones provided by `@prisma/adapter-pg`, `@prisma/adapter-libsql`, `@prisma/adapter-planetscale`, etc.
     * 
     * A driver adapter is **required** unless you connect to your database through Prisma Accelerate (in which case use `accelerateUrl` instead).
     * 
     * Learn more: https://pris.ly/d/driver-adapters
     * 
     * @example
     * ```ts
     * import { PrismaPg } from '@prisma/adapter-pg'
     * import { PrismaClient } from './generated/prisma/client'
     * 
     * const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
     * const prisma = new PrismaClient({ adapter })
     * ```
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * The Prisma Accelerate connection URL. Use this option to connect to your database through Prisma Accelerate instead of using a driver adapter to connect directly.
     * 
     * Learn more: https://pris.ly/d/accelerate
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    establishment?: EstablishmentOmit
    user?: UserOmit
    courier?: CourierOmit
    order?: OrderOmit
    route?: RouteOmit
    routeStop?: RouteStopOmit
    courierPing?: CourierPingOmit
    domainEventLog?: DomainEventLogOmit
    geocodeCache?: GeocodeCacheOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type EstablishmentCountOutputType
   */

  export type EstablishmentCountOutputType = {
    users: number
    couriers: number
    orders: number
    routes: number
    events: number
  }

  export type EstablishmentCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | EstablishmentCountOutputTypeCountUsersArgs
    couriers?: boolean | EstablishmentCountOutputTypeCountCouriersArgs
    orders?: boolean | EstablishmentCountOutputTypeCountOrdersArgs
    routes?: boolean | EstablishmentCountOutputTypeCountRoutesArgs
    events?: boolean | EstablishmentCountOutputTypeCountEventsArgs
  }

  // Custom InputTypes
  /**
   * EstablishmentCountOutputType without action
   */
  export type EstablishmentCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EstablishmentCountOutputType
     */
    select?: EstablishmentCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EstablishmentCountOutputType without action
   */
  export type EstablishmentCountOutputTypeCountUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
  }

  /**
   * EstablishmentCountOutputType without action
   */
  export type EstablishmentCountOutputTypeCountCouriersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourierWhereInput
  }

  /**
   * EstablishmentCountOutputType without action
   */
  export type EstablishmentCountOutputTypeCountOrdersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
  }

  /**
   * EstablishmentCountOutputType without action
   */
  export type EstablishmentCountOutputTypeCountRoutesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteWhereInput
  }

  /**
   * EstablishmentCountOutputType without action
   */
  export type EstablishmentCountOutputTypeCountEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DomainEventLogWhereInput
  }


  /**
   * Count Type CourierCountOutputType
   */

  export type CourierCountOutputType = {
    routes: number
  }

  export type CourierCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    routes?: boolean | CourierCountOutputTypeCountRoutesArgs
  }

  // Custom InputTypes
  /**
   * CourierCountOutputType without action
   */
  export type CourierCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierCountOutputType
     */
    select?: CourierCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CourierCountOutputType without action
   */
  export type CourierCountOutputTypeCountRoutesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteWhereInput
  }


  /**
   * Count Type RouteCountOutputType
   */

  export type RouteCountOutputType = {
    stops: number
    pings: number
  }

  export type RouteCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    stops?: boolean | RouteCountOutputTypeCountStopsArgs
    pings?: boolean | RouteCountOutputTypeCountPingsArgs
  }

  // Custom InputTypes
  /**
   * RouteCountOutputType without action
   */
  export type RouteCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteCountOutputType
     */
    select?: RouteCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RouteCountOutputType without action
   */
  export type RouteCountOutputTypeCountStopsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteStopWhereInput
  }

  /**
   * RouteCountOutputType without action
   */
  export type RouteCountOutputTypeCountPingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourierPingWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Establishment
   */

  export type AggregateEstablishment = {
    _count: EstablishmentCountAggregateOutputType | null
    _avg: EstablishmentAvgAggregateOutputType | null
    _sum: EstablishmentSumAggregateOutputType | null
    _min: EstablishmentMinAggregateOutputType | null
    _max: EstablishmentMaxAggregateOutputType | null
  }

  export type EstablishmentAvgAggregateOutputType = {
    lat: number | null
    lng: number | null
  }

  export type EstablishmentSumAggregateOutputType = {
    lat: number | null
    lng: number | null
  }

  export type EstablishmentMinAggregateOutputType = {
    id: string | null
    name: string | null
    address: string | null
    lat: number | null
    lng: number | null
    createdAt: Date | null
  }

  export type EstablishmentMaxAggregateOutputType = {
    id: string | null
    name: string | null
    address: string | null
    lat: number | null
    lng: number | null
    createdAt: Date | null
  }

  export type EstablishmentCountAggregateOutputType = {
    id: number
    name: number
    address: number
    lat: number
    lng: number
    createdAt: number
    _all: number
  }


  export type EstablishmentAvgAggregateInputType = {
    lat?: true
    lng?: true
  }

  export type EstablishmentSumAggregateInputType = {
    lat?: true
    lng?: true
  }

  export type EstablishmentMinAggregateInputType = {
    id?: true
    name?: true
    address?: true
    lat?: true
    lng?: true
    createdAt?: true
  }

  export type EstablishmentMaxAggregateInputType = {
    id?: true
    name?: true
    address?: true
    lat?: true
    lng?: true
    createdAt?: true
  }

  export type EstablishmentCountAggregateInputType = {
    id?: true
    name?: true
    address?: true
    lat?: true
    lng?: true
    createdAt?: true
    _all?: true
  }

  export type EstablishmentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Establishment to aggregate.
     */
    where?: EstablishmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Establishments to fetch.
     */
    orderBy?: EstablishmentOrderByWithRelationInput | EstablishmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EstablishmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Establishments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Establishments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Establishments
    **/
    _count?: true | EstablishmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EstablishmentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EstablishmentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EstablishmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EstablishmentMaxAggregateInputType
  }

  export type GetEstablishmentAggregateType<T extends EstablishmentAggregateArgs> = {
        [P in keyof T & keyof AggregateEstablishment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEstablishment[P]>
      : GetScalarType<T[P], AggregateEstablishment[P]>
  }




  export type EstablishmentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EstablishmentWhereInput
    orderBy?: EstablishmentOrderByWithAggregationInput | EstablishmentOrderByWithAggregationInput[]
    by: EstablishmentScalarFieldEnum[] | EstablishmentScalarFieldEnum
    having?: EstablishmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EstablishmentCountAggregateInputType | true
    _avg?: EstablishmentAvgAggregateInputType
    _sum?: EstablishmentSumAggregateInputType
    _min?: EstablishmentMinAggregateInputType
    _max?: EstablishmentMaxAggregateInputType
  }

  export type EstablishmentGroupByOutputType = {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt: Date
    _count: EstablishmentCountAggregateOutputType | null
    _avg: EstablishmentAvgAggregateOutputType | null
    _sum: EstablishmentSumAggregateOutputType | null
    _min: EstablishmentMinAggregateOutputType | null
    _max: EstablishmentMaxAggregateOutputType | null
  }

  type GetEstablishmentGroupByPayload<T extends EstablishmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EstablishmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EstablishmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EstablishmentGroupByOutputType[P]>
            : GetScalarType<T[P], EstablishmentGroupByOutputType[P]>
        }
      >
    >


  export type EstablishmentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    address?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
    users?: boolean | Establishment$usersArgs<ExtArgs>
    couriers?: boolean | Establishment$couriersArgs<ExtArgs>
    orders?: boolean | Establishment$ordersArgs<ExtArgs>
    routes?: boolean | Establishment$routesArgs<ExtArgs>
    events?: boolean | Establishment$eventsArgs<ExtArgs>
    _count?: boolean | EstablishmentCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["establishment"]>

  export type EstablishmentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    address?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["establishment"]>

  export type EstablishmentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    address?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["establishment"]>

  export type EstablishmentSelectScalar = {
    id?: boolean
    name?: boolean
    address?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }

  export type EstablishmentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "address" | "lat" | "lng" | "createdAt", ExtArgs["result"]["establishment"]>
  export type EstablishmentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | Establishment$usersArgs<ExtArgs>
    couriers?: boolean | Establishment$couriersArgs<ExtArgs>
    orders?: boolean | Establishment$ordersArgs<ExtArgs>
    routes?: boolean | Establishment$routesArgs<ExtArgs>
    events?: boolean | Establishment$eventsArgs<ExtArgs>
    _count?: boolean | EstablishmentCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type EstablishmentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type EstablishmentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $EstablishmentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Establishment"
    objects: {
      users: Prisma.$UserPayload<ExtArgs>[]
      couriers: Prisma.$CourierPayload<ExtArgs>[]
      orders: Prisma.$OrderPayload<ExtArgs>[]
      routes: Prisma.$RoutePayload<ExtArgs>[]
      events: Prisma.$DomainEventLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      address: string
      lat: number
      lng: number
      createdAt: Date
    }, ExtArgs["result"]["establishment"]>
    composites: {}
  }

  type EstablishmentGetPayload<S extends boolean | null | undefined | EstablishmentDefaultArgs> = $Result.GetResult<Prisma.$EstablishmentPayload, S>

  type EstablishmentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EstablishmentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EstablishmentCountAggregateInputType | true
    }

  export interface EstablishmentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Establishment'], meta: { name: 'Establishment' } }
    /**
     * Find zero or one Establishment that matches the filter.
     * @param {EstablishmentFindUniqueArgs} args - Arguments to find a Establishment
     * @example
     * // Get one Establishment
     * const establishment = await prisma.establishment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EstablishmentFindUniqueArgs>(args: SelectSubset<T, EstablishmentFindUniqueArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Establishment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EstablishmentFindUniqueOrThrowArgs} args - Arguments to find a Establishment
     * @example
     * // Get one Establishment
     * const establishment = await prisma.establishment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EstablishmentFindUniqueOrThrowArgs>(args: SelectSubset<T, EstablishmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Establishment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentFindFirstArgs} args - Arguments to find a Establishment
     * @example
     * // Get one Establishment
     * const establishment = await prisma.establishment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EstablishmentFindFirstArgs>(args?: SelectSubset<T, EstablishmentFindFirstArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Establishment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentFindFirstOrThrowArgs} args - Arguments to find a Establishment
     * @example
     * // Get one Establishment
     * const establishment = await prisma.establishment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EstablishmentFindFirstOrThrowArgs>(args?: SelectSubset<T, EstablishmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Establishments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Establishments
     * const establishments = await prisma.establishment.findMany()
     * 
     * // Get first 10 Establishments
     * const establishments = await prisma.establishment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const establishmentWithIdOnly = await prisma.establishment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EstablishmentFindManyArgs>(args?: SelectSubset<T, EstablishmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Establishment.
     * @param {EstablishmentCreateArgs} args - Arguments to create a Establishment.
     * @example
     * // Create one Establishment
     * const Establishment = await prisma.establishment.create({
     *   data: {
     *     // ... data to create a Establishment
     *   }
     * })
     * 
     */
    create<T extends EstablishmentCreateArgs>(args: SelectSubset<T, EstablishmentCreateArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Establishments.
     * @param {EstablishmentCreateManyArgs} args - Arguments to create many Establishments.
     * @example
     * // Create many Establishments
     * const establishment = await prisma.establishment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EstablishmentCreateManyArgs>(args?: SelectSubset<T, EstablishmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Establishments and returns the data saved in the database.
     * @param {EstablishmentCreateManyAndReturnArgs} args - Arguments to create many Establishments.
     * @example
     * // Create many Establishments
     * const establishment = await prisma.establishment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Establishments and only return the `id`
     * const establishmentWithIdOnly = await prisma.establishment.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EstablishmentCreateManyAndReturnArgs>(args?: SelectSubset<T, EstablishmentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Establishment.
     * @param {EstablishmentDeleteArgs} args - Arguments to delete one Establishment.
     * @example
     * // Delete one Establishment
     * const Establishment = await prisma.establishment.delete({
     *   where: {
     *     // ... filter to delete one Establishment
     *   }
     * })
     * 
     */
    delete<T extends EstablishmentDeleteArgs>(args: SelectSubset<T, EstablishmentDeleteArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Establishment.
     * @param {EstablishmentUpdateArgs} args - Arguments to update one Establishment.
     * @example
     * // Update one Establishment
     * const establishment = await prisma.establishment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EstablishmentUpdateArgs>(args: SelectSubset<T, EstablishmentUpdateArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Establishments.
     * @param {EstablishmentDeleteManyArgs} args - Arguments to filter Establishments to delete.
     * @example
     * // Delete a few Establishments
     * const { count } = await prisma.establishment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EstablishmentDeleteManyArgs>(args?: SelectSubset<T, EstablishmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Establishments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Establishments
     * const establishment = await prisma.establishment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EstablishmentUpdateManyArgs>(args: SelectSubset<T, EstablishmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Establishments and returns the data updated in the database.
     * @param {EstablishmentUpdateManyAndReturnArgs} args - Arguments to update many Establishments.
     * @example
     * // Update many Establishments
     * const establishment = await prisma.establishment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Establishments and only return the `id`
     * const establishmentWithIdOnly = await prisma.establishment.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EstablishmentUpdateManyAndReturnArgs>(args: SelectSubset<T, EstablishmentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Establishment.
     * @param {EstablishmentUpsertArgs} args - Arguments to update or create a Establishment.
     * @example
     * // Update or create a Establishment
     * const establishment = await prisma.establishment.upsert({
     *   create: {
     *     // ... data to create a Establishment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Establishment we want to update
     *   }
     * })
     */
    upsert<T extends EstablishmentUpsertArgs>(args: SelectSubset<T, EstablishmentUpsertArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Establishments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentCountArgs} args - Arguments to filter Establishments to count.
     * @example
     * // Count the number of Establishments
     * const count = await prisma.establishment.count({
     *   where: {
     *     // ... the filter for the Establishments we want to count
     *   }
     * })
    **/
    count<T extends EstablishmentCountArgs>(
      args?: Subset<T, EstablishmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EstablishmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Establishment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EstablishmentAggregateArgs>(args: Subset<T, EstablishmentAggregateArgs>): Prisma.PrismaPromise<GetEstablishmentAggregateType<T>>

    /**
     * Group by Establishment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EstablishmentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EstablishmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EstablishmentGroupByArgs['orderBy'] }
        : { orderBy?: EstablishmentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EstablishmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEstablishmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Establishment model
   */
  readonly fields: EstablishmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Establishment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EstablishmentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    users<T extends Establishment$usersArgs<ExtArgs> = {}>(args?: Subset<T, Establishment$usersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    couriers<T extends Establishment$couriersArgs<ExtArgs> = {}>(args?: Subset<T, Establishment$couriersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    orders<T extends Establishment$ordersArgs<ExtArgs> = {}>(args?: Subset<T, Establishment$ordersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    routes<T extends Establishment$routesArgs<ExtArgs> = {}>(args?: Subset<T, Establishment$routesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    events<T extends Establishment$eventsArgs<ExtArgs> = {}>(args?: Subset<T, Establishment$eventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Establishment model
   */
  interface EstablishmentFieldRefs {
    readonly id: FieldRef<"Establishment", 'String'>
    readonly name: FieldRef<"Establishment", 'String'>
    readonly address: FieldRef<"Establishment", 'String'>
    readonly lat: FieldRef<"Establishment", 'Float'>
    readonly lng: FieldRef<"Establishment", 'Float'>
    readonly createdAt: FieldRef<"Establishment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Establishment findUnique
   */
  export type EstablishmentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * Filter, which Establishment to fetch.
     */
    where: EstablishmentWhereUniqueInput
  }

  /**
   * Establishment findUniqueOrThrow
   */
  export type EstablishmentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * Filter, which Establishment to fetch.
     */
    where: EstablishmentWhereUniqueInput
  }

  /**
   * Establishment findFirst
   */
  export type EstablishmentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * Filter, which Establishment to fetch.
     */
    where?: EstablishmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Establishments to fetch.
     */
    orderBy?: EstablishmentOrderByWithRelationInput | EstablishmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Establishments.
     */
    cursor?: EstablishmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Establishments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Establishments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Establishments.
     */
    distinct?: EstablishmentScalarFieldEnum | EstablishmentScalarFieldEnum[]
  }

  /**
   * Establishment findFirstOrThrow
   */
  export type EstablishmentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * Filter, which Establishment to fetch.
     */
    where?: EstablishmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Establishments to fetch.
     */
    orderBy?: EstablishmentOrderByWithRelationInput | EstablishmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Establishments.
     */
    cursor?: EstablishmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Establishments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Establishments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Establishments.
     */
    distinct?: EstablishmentScalarFieldEnum | EstablishmentScalarFieldEnum[]
  }

  /**
   * Establishment findMany
   */
  export type EstablishmentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * Filter, which Establishments to fetch.
     */
    where?: EstablishmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Establishments to fetch.
     */
    orderBy?: EstablishmentOrderByWithRelationInput | EstablishmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Establishments.
     */
    cursor?: EstablishmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Establishments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Establishments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Establishments.
     */
    distinct?: EstablishmentScalarFieldEnum | EstablishmentScalarFieldEnum[]
  }

  /**
   * Establishment create
   */
  export type EstablishmentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * The data needed to create a Establishment.
     */
    data: XOR<EstablishmentCreateInput, EstablishmentUncheckedCreateInput>
  }

  /**
   * Establishment createMany
   */
  export type EstablishmentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Establishments.
     */
    data: EstablishmentCreateManyInput | EstablishmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Establishment createManyAndReturn
   */
  export type EstablishmentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * The data used to create many Establishments.
     */
    data: EstablishmentCreateManyInput | EstablishmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Establishment update
   */
  export type EstablishmentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * The data needed to update a Establishment.
     */
    data: XOR<EstablishmentUpdateInput, EstablishmentUncheckedUpdateInput>
    /**
     * Choose, which Establishment to update.
     */
    where: EstablishmentWhereUniqueInput
  }

  /**
   * Establishment updateMany
   */
  export type EstablishmentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Establishments.
     */
    data: XOR<EstablishmentUpdateManyMutationInput, EstablishmentUncheckedUpdateManyInput>
    /**
     * Filter which Establishments to update
     */
    where?: EstablishmentWhereInput
    /**
     * Limit how many Establishments to update.
     */
    limit?: number
  }

  /**
   * Establishment updateManyAndReturn
   */
  export type EstablishmentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * The data used to update Establishments.
     */
    data: XOR<EstablishmentUpdateManyMutationInput, EstablishmentUncheckedUpdateManyInput>
    /**
     * Filter which Establishments to update
     */
    where?: EstablishmentWhereInput
    /**
     * Limit how many Establishments to update.
     */
    limit?: number
  }

  /**
   * Establishment upsert
   */
  export type EstablishmentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * The filter to search for the Establishment to update in case it exists.
     */
    where: EstablishmentWhereUniqueInput
    /**
     * In case the Establishment found by the `where` argument doesn't exist, create a new Establishment with this data.
     */
    create: XOR<EstablishmentCreateInput, EstablishmentUncheckedCreateInput>
    /**
     * In case the Establishment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EstablishmentUpdateInput, EstablishmentUncheckedUpdateInput>
  }

  /**
   * Establishment delete
   */
  export type EstablishmentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
    /**
     * Filter which Establishment to delete.
     */
    where: EstablishmentWhereUniqueInput
  }

  /**
   * Establishment deleteMany
   */
  export type EstablishmentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Establishments to delete
     */
    where?: EstablishmentWhereInput
    /**
     * Limit how many Establishments to delete.
     */
    limit?: number
  }

  /**
   * Establishment.users
   */
  export type Establishment$usersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    cursor?: UserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * Establishment.couriers
   */
  export type Establishment$couriersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    where?: CourierWhereInput
    orderBy?: CourierOrderByWithRelationInput | CourierOrderByWithRelationInput[]
    cursor?: CourierWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CourierScalarFieldEnum | CourierScalarFieldEnum[]
  }

  /**
   * Establishment.orders
   */
  export type Establishment$ordersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    cursor?: OrderWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Establishment.routes
   */
  export type Establishment$routesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    where?: RouteWhereInput
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    cursor?: RouteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Establishment.events
   */
  export type Establishment$eventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    where?: DomainEventLogWhereInput
    orderBy?: DomainEventLogOrderByWithRelationInput | DomainEventLogOrderByWithRelationInput[]
    cursor?: DomainEventLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DomainEventLogScalarFieldEnum | DomainEventLogScalarFieldEnum[]
  }

  /**
   * Establishment without action
   */
  export type EstablishmentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Establishment
     */
    select?: EstablishmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Establishment
     */
    omit?: EstablishmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EstablishmentInclude<ExtArgs> | null
  }


  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    email: string | null
    name: string | null
    passwordHash: string | null
    createdAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    email: string | null
    name: string | null
    passwordHash: string | null
    createdAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    establishmentId: number
    email: number
    name: number
    passwordHash: number
    createdAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    establishmentId?: true
    email?: true
    name?: true
    passwordHash?: true
    createdAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    establishmentId?: true
    email?: true
    name?: true
    passwordHash?: true
    createdAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    establishmentId?: true
    email?: true
    name?: true
    passwordHash?: true
    createdAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    establishmentId: string
    email: string
    name: string
    passwordHash: string
    createdAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    email?: boolean
    name?: boolean
    passwordHash?: boolean
    createdAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    email?: boolean
    name?: boolean
    passwordHash?: boolean
    createdAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    email?: boolean
    name?: boolean
    passwordHash?: boolean
    createdAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    establishmentId?: boolean
    email?: boolean
    name?: boolean
    passwordHash?: boolean
    createdAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "establishmentId" | "email" | "name" | "passwordHash" | "createdAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      establishment: Prisma.$EstablishmentPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      establishmentId: string
      email: string
      name: string
      passwordHash: string
      createdAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    establishment<T extends EstablishmentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EstablishmentDefaultArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly establishmentId: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Courier
   */

  export type AggregateCourier = {
    _count: CourierCountAggregateOutputType | null
    _min: CourierMinAggregateOutputType | null
    _max: CourierMaxAggregateOutputType | null
  }

  export type CourierMinAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    name: string | null
    phone: string | null
    active: boolean | null
    createdAt: Date | null
  }

  export type CourierMaxAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    name: string | null
    phone: string | null
    active: boolean | null
    createdAt: Date | null
  }

  export type CourierCountAggregateOutputType = {
    id: number
    establishmentId: number
    name: number
    phone: number
    active: number
    createdAt: number
    _all: number
  }


  export type CourierMinAggregateInputType = {
    id?: true
    establishmentId?: true
    name?: true
    phone?: true
    active?: true
    createdAt?: true
  }

  export type CourierMaxAggregateInputType = {
    id?: true
    establishmentId?: true
    name?: true
    phone?: true
    active?: true
    createdAt?: true
  }

  export type CourierCountAggregateInputType = {
    id?: true
    establishmentId?: true
    name?: true
    phone?: true
    active?: true
    createdAt?: true
    _all?: true
  }

  export type CourierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Courier to aggregate.
     */
    where?: CourierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Couriers to fetch.
     */
    orderBy?: CourierOrderByWithRelationInput | CourierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CourierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Couriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Couriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Couriers
    **/
    _count?: true | CourierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CourierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CourierMaxAggregateInputType
  }

  export type GetCourierAggregateType<T extends CourierAggregateArgs> = {
        [P in keyof T & keyof AggregateCourier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCourier[P]>
      : GetScalarType<T[P], AggregateCourier[P]>
  }




  export type CourierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourierWhereInput
    orderBy?: CourierOrderByWithAggregationInput | CourierOrderByWithAggregationInput[]
    by: CourierScalarFieldEnum[] | CourierScalarFieldEnum
    having?: CourierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CourierCountAggregateInputType | true
    _min?: CourierMinAggregateInputType
    _max?: CourierMaxAggregateInputType
  }

  export type CourierGroupByOutputType = {
    id: string
    establishmentId: string
    name: string
    phone: string
    active: boolean
    createdAt: Date
    _count: CourierCountAggregateOutputType | null
    _min: CourierMinAggregateOutputType | null
    _max: CourierMaxAggregateOutputType | null
  }

  type GetCourierGroupByPayload<T extends CourierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CourierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CourierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CourierGroupByOutputType[P]>
            : GetScalarType<T[P], CourierGroupByOutputType[P]>
        }
      >
    >


  export type CourierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    phone?: boolean
    active?: boolean
    createdAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    routes?: boolean | Courier$routesArgs<ExtArgs>
    _count?: boolean | CourierCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courier"]>

  export type CourierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    phone?: boolean
    active?: boolean
    createdAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courier"]>

  export type CourierSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    phone?: boolean
    active?: boolean
    createdAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courier"]>

  export type CourierSelectScalar = {
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    phone?: boolean
    active?: boolean
    createdAt?: boolean
  }

  export type CourierOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "establishmentId" | "name" | "phone" | "active" | "createdAt", ExtArgs["result"]["courier"]>
  export type CourierInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    routes?: boolean | Courier$routesArgs<ExtArgs>
    _count?: boolean | CourierCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CourierIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }
  export type CourierIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }

  export type $CourierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Courier"
    objects: {
      establishment: Prisma.$EstablishmentPayload<ExtArgs>
      routes: Prisma.$RoutePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      establishmentId: string
      name: string
      phone: string
      active: boolean
      createdAt: Date
    }, ExtArgs["result"]["courier"]>
    composites: {}
  }

  type CourierGetPayload<S extends boolean | null | undefined | CourierDefaultArgs> = $Result.GetResult<Prisma.$CourierPayload, S>

  type CourierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CourierFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CourierCountAggregateInputType | true
    }

  export interface CourierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Courier'], meta: { name: 'Courier' } }
    /**
     * Find zero or one Courier that matches the filter.
     * @param {CourierFindUniqueArgs} args - Arguments to find a Courier
     * @example
     * // Get one Courier
     * const courier = await prisma.courier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CourierFindUniqueArgs>(args: SelectSubset<T, CourierFindUniqueArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Courier that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CourierFindUniqueOrThrowArgs} args - Arguments to find a Courier
     * @example
     * // Get one Courier
     * const courier = await prisma.courier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CourierFindUniqueOrThrowArgs>(args: SelectSubset<T, CourierFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Courier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierFindFirstArgs} args - Arguments to find a Courier
     * @example
     * // Get one Courier
     * const courier = await prisma.courier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CourierFindFirstArgs>(args?: SelectSubset<T, CourierFindFirstArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Courier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierFindFirstOrThrowArgs} args - Arguments to find a Courier
     * @example
     * // Get one Courier
     * const courier = await prisma.courier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CourierFindFirstOrThrowArgs>(args?: SelectSubset<T, CourierFindFirstOrThrowArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Couriers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Couriers
     * const couriers = await prisma.courier.findMany()
     * 
     * // Get first 10 Couriers
     * const couriers = await prisma.courier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const courierWithIdOnly = await prisma.courier.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CourierFindManyArgs>(args?: SelectSubset<T, CourierFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Courier.
     * @param {CourierCreateArgs} args - Arguments to create a Courier.
     * @example
     * // Create one Courier
     * const Courier = await prisma.courier.create({
     *   data: {
     *     // ... data to create a Courier
     *   }
     * })
     * 
     */
    create<T extends CourierCreateArgs>(args: SelectSubset<T, CourierCreateArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Couriers.
     * @param {CourierCreateManyArgs} args - Arguments to create many Couriers.
     * @example
     * // Create many Couriers
     * const courier = await prisma.courier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CourierCreateManyArgs>(args?: SelectSubset<T, CourierCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Couriers and returns the data saved in the database.
     * @param {CourierCreateManyAndReturnArgs} args - Arguments to create many Couriers.
     * @example
     * // Create many Couriers
     * const courier = await prisma.courier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Couriers and only return the `id`
     * const courierWithIdOnly = await prisma.courier.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CourierCreateManyAndReturnArgs>(args?: SelectSubset<T, CourierCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Courier.
     * @param {CourierDeleteArgs} args - Arguments to delete one Courier.
     * @example
     * // Delete one Courier
     * const Courier = await prisma.courier.delete({
     *   where: {
     *     // ... filter to delete one Courier
     *   }
     * })
     * 
     */
    delete<T extends CourierDeleteArgs>(args: SelectSubset<T, CourierDeleteArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Courier.
     * @param {CourierUpdateArgs} args - Arguments to update one Courier.
     * @example
     * // Update one Courier
     * const courier = await prisma.courier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CourierUpdateArgs>(args: SelectSubset<T, CourierUpdateArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Couriers.
     * @param {CourierDeleteManyArgs} args - Arguments to filter Couriers to delete.
     * @example
     * // Delete a few Couriers
     * const { count } = await prisma.courier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CourierDeleteManyArgs>(args?: SelectSubset<T, CourierDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Couriers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Couriers
     * const courier = await prisma.courier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CourierUpdateManyArgs>(args: SelectSubset<T, CourierUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Couriers and returns the data updated in the database.
     * @param {CourierUpdateManyAndReturnArgs} args - Arguments to update many Couriers.
     * @example
     * // Update many Couriers
     * const courier = await prisma.courier.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Couriers and only return the `id`
     * const courierWithIdOnly = await prisma.courier.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CourierUpdateManyAndReturnArgs>(args: SelectSubset<T, CourierUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Courier.
     * @param {CourierUpsertArgs} args - Arguments to update or create a Courier.
     * @example
     * // Update or create a Courier
     * const courier = await prisma.courier.upsert({
     *   create: {
     *     // ... data to create a Courier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Courier we want to update
     *   }
     * })
     */
    upsert<T extends CourierUpsertArgs>(args: SelectSubset<T, CourierUpsertArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Couriers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierCountArgs} args - Arguments to filter Couriers to count.
     * @example
     * // Count the number of Couriers
     * const count = await prisma.courier.count({
     *   where: {
     *     // ... the filter for the Couriers we want to count
     *   }
     * })
    **/
    count<T extends CourierCountArgs>(
      args?: Subset<T, CourierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CourierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Courier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CourierAggregateArgs>(args: Subset<T, CourierAggregateArgs>): Prisma.PrismaPromise<GetCourierAggregateType<T>>

    /**
     * Group by Courier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CourierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CourierGroupByArgs['orderBy'] }
        : { orderBy?: CourierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CourierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCourierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Courier model
   */
  readonly fields: CourierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Courier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CourierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    establishment<T extends EstablishmentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EstablishmentDefaultArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    routes<T extends Courier$routesArgs<ExtArgs> = {}>(args?: Subset<T, Courier$routesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Courier model
   */
  interface CourierFieldRefs {
    readonly id: FieldRef<"Courier", 'String'>
    readonly establishmentId: FieldRef<"Courier", 'String'>
    readonly name: FieldRef<"Courier", 'String'>
    readonly phone: FieldRef<"Courier", 'String'>
    readonly active: FieldRef<"Courier", 'Boolean'>
    readonly createdAt: FieldRef<"Courier", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Courier findUnique
   */
  export type CourierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * Filter, which Courier to fetch.
     */
    where: CourierWhereUniqueInput
  }

  /**
   * Courier findUniqueOrThrow
   */
  export type CourierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * Filter, which Courier to fetch.
     */
    where: CourierWhereUniqueInput
  }

  /**
   * Courier findFirst
   */
  export type CourierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * Filter, which Courier to fetch.
     */
    where?: CourierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Couriers to fetch.
     */
    orderBy?: CourierOrderByWithRelationInput | CourierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Couriers.
     */
    cursor?: CourierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Couriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Couriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Couriers.
     */
    distinct?: CourierScalarFieldEnum | CourierScalarFieldEnum[]
  }

  /**
   * Courier findFirstOrThrow
   */
  export type CourierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * Filter, which Courier to fetch.
     */
    where?: CourierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Couriers to fetch.
     */
    orderBy?: CourierOrderByWithRelationInput | CourierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Couriers.
     */
    cursor?: CourierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Couriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Couriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Couriers.
     */
    distinct?: CourierScalarFieldEnum | CourierScalarFieldEnum[]
  }

  /**
   * Courier findMany
   */
  export type CourierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * Filter, which Couriers to fetch.
     */
    where?: CourierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Couriers to fetch.
     */
    orderBy?: CourierOrderByWithRelationInput | CourierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Couriers.
     */
    cursor?: CourierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Couriers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Couriers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Couriers.
     */
    distinct?: CourierScalarFieldEnum | CourierScalarFieldEnum[]
  }

  /**
   * Courier create
   */
  export type CourierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * The data needed to create a Courier.
     */
    data: XOR<CourierCreateInput, CourierUncheckedCreateInput>
  }

  /**
   * Courier createMany
   */
  export type CourierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Couriers.
     */
    data: CourierCreateManyInput | CourierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Courier createManyAndReturn
   */
  export type CourierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * The data used to create many Couriers.
     */
    data: CourierCreateManyInput | CourierCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Courier update
   */
  export type CourierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * The data needed to update a Courier.
     */
    data: XOR<CourierUpdateInput, CourierUncheckedUpdateInput>
    /**
     * Choose, which Courier to update.
     */
    where: CourierWhereUniqueInput
  }

  /**
   * Courier updateMany
   */
  export type CourierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Couriers.
     */
    data: XOR<CourierUpdateManyMutationInput, CourierUncheckedUpdateManyInput>
    /**
     * Filter which Couriers to update
     */
    where?: CourierWhereInput
    /**
     * Limit how many Couriers to update.
     */
    limit?: number
  }

  /**
   * Courier updateManyAndReturn
   */
  export type CourierUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * The data used to update Couriers.
     */
    data: XOR<CourierUpdateManyMutationInput, CourierUncheckedUpdateManyInput>
    /**
     * Filter which Couriers to update
     */
    where?: CourierWhereInput
    /**
     * Limit how many Couriers to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Courier upsert
   */
  export type CourierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * The filter to search for the Courier to update in case it exists.
     */
    where: CourierWhereUniqueInput
    /**
     * In case the Courier found by the `where` argument doesn't exist, create a new Courier with this data.
     */
    create: XOR<CourierCreateInput, CourierUncheckedCreateInput>
    /**
     * In case the Courier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CourierUpdateInput, CourierUncheckedUpdateInput>
  }

  /**
   * Courier delete
   */
  export type CourierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
    /**
     * Filter which Courier to delete.
     */
    where: CourierWhereUniqueInput
  }

  /**
   * Courier deleteMany
   */
  export type CourierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Couriers to delete
     */
    where?: CourierWhereInput
    /**
     * Limit how many Couriers to delete.
     */
    limit?: number
  }

  /**
   * Courier.routes
   */
  export type Courier$routesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    where?: RouteWhereInput
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    cursor?: RouteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Courier without action
   */
  export type CourierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Courier
     */
    select?: CourierSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Courier
     */
    omit?: CourierOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierInclude<ExtArgs> | null
  }


  /**
   * Model Order
   */

  export type AggregateOrder = {
    _count: OrderCountAggregateOutputType | null
    _avg: OrderAvgAggregateOutputType | null
    _sum: OrderSumAggregateOutputType | null
    _min: OrderMinAggregateOutputType | null
    _max: OrderMaxAggregateOutputType | null
  }

  export type OrderAvgAggregateOutputType = {
    lat: number | null
    lng: number | null
    amountCents: number | null
  }

  export type OrderSumAggregateOutputType = {
    lat: number | null
    lng: number | null
    amountCents: number | null
  }

  export type OrderMinAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    source: $Enums.OrderSourceKind | null
    externalId: string | null
    customerName: string | null
    customerPhone: string | null
    address: string | null
    reference: string | null
    lat: number | null
    lng: number | null
    amountCents: number | null
    notes: string | null
    status: $Enums.OrderStatus | null
    trackingToken: string | null
    routeId: string | null
    createdAt: Date | null
    deliveredAt: Date | null
  }

  export type OrderMaxAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    source: $Enums.OrderSourceKind | null
    externalId: string | null
    customerName: string | null
    customerPhone: string | null
    address: string | null
    reference: string | null
    lat: number | null
    lng: number | null
    amountCents: number | null
    notes: string | null
    status: $Enums.OrderStatus | null
    trackingToken: string | null
    routeId: string | null
    createdAt: Date | null
    deliveredAt: Date | null
  }

  export type OrderCountAggregateOutputType = {
    id: number
    establishmentId: number
    source: number
    externalId: number
    customerName: number
    customerPhone: number
    address: number
    reference: number
    lat: number
    lng: number
    amountCents: number
    notes: number
    status: number
    trackingToken: number
    routeId: number
    createdAt: number
    deliveredAt: number
    _all: number
  }


  export type OrderAvgAggregateInputType = {
    lat?: true
    lng?: true
    amountCents?: true
  }

  export type OrderSumAggregateInputType = {
    lat?: true
    lng?: true
    amountCents?: true
  }

  export type OrderMinAggregateInputType = {
    id?: true
    establishmentId?: true
    source?: true
    externalId?: true
    customerName?: true
    customerPhone?: true
    address?: true
    reference?: true
    lat?: true
    lng?: true
    amountCents?: true
    notes?: true
    status?: true
    trackingToken?: true
    routeId?: true
    createdAt?: true
    deliveredAt?: true
  }

  export type OrderMaxAggregateInputType = {
    id?: true
    establishmentId?: true
    source?: true
    externalId?: true
    customerName?: true
    customerPhone?: true
    address?: true
    reference?: true
    lat?: true
    lng?: true
    amountCents?: true
    notes?: true
    status?: true
    trackingToken?: true
    routeId?: true
    createdAt?: true
    deliveredAt?: true
  }

  export type OrderCountAggregateInputType = {
    id?: true
    establishmentId?: true
    source?: true
    externalId?: true
    customerName?: true
    customerPhone?: true
    address?: true
    reference?: true
    lat?: true
    lng?: true
    amountCents?: true
    notes?: true
    status?: true
    trackingToken?: true
    routeId?: true
    createdAt?: true
    deliveredAt?: true
    _all?: true
  }

  export type OrderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Order to aggregate.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Orders
    **/
    _count?: true | OrderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OrderAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OrderSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrderMaxAggregateInputType
  }

  export type GetOrderAggregateType<T extends OrderAggregateArgs> = {
        [P in keyof T & keyof AggregateOrder]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrder[P]>
      : GetScalarType<T[P], AggregateOrder[P]>
  }




  export type OrderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithAggregationInput | OrderOrderByWithAggregationInput[]
    by: OrderScalarFieldEnum[] | OrderScalarFieldEnum
    having?: OrderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrderCountAggregateInputType | true
    _avg?: OrderAvgAggregateInputType
    _sum?: OrderSumAggregateInputType
    _min?: OrderMinAggregateInputType
    _max?: OrderMaxAggregateInputType
  }

  export type OrderGroupByOutputType = {
    id: string
    establishmentId: string
    source: $Enums.OrderSourceKind
    externalId: string | null
    customerName: string
    customerPhone: string | null
    address: string
    reference: string | null
    lat: number | null
    lng: number | null
    amountCents: number
    notes: string | null
    status: $Enums.OrderStatus
    trackingToken: string
    routeId: string | null
    createdAt: Date
    deliveredAt: Date | null
    _count: OrderCountAggregateOutputType | null
    _avg: OrderAvgAggregateOutputType | null
    _sum: OrderSumAggregateOutputType | null
    _min: OrderMinAggregateOutputType | null
    _max: OrderMaxAggregateOutputType | null
  }

  type GetOrderGroupByPayload<T extends OrderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrderGroupByOutputType[P]>
            : GetScalarType<T[P], OrderGroupByOutputType[P]>
        }
      >
    >


  export type OrderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    source?: boolean
    externalId?: boolean
    customerName?: boolean
    customerPhone?: boolean
    address?: boolean
    reference?: boolean
    lat?: boolean
    lng?: boolean
    amountCents?: boolean
    notes?: boolean
    status?: boolean
    trackingToken?: boolean
    routeId?: boolean
    createdAt?: boolean
    deliveredAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    stop?: boolean | Order$stopArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    source?: boolean
    externalId?: boolean
    customerName?: boolean
    customerPhone?: boolean
    address?: boolean
    reference?: boolean
    lat?: boolean
    lng?: boolean
    amountCents?: boolean
    notes?: boolean
    status?: boolean
    trackingToken?: boolean
    routeId?: boolean
    createdAt?: boolean
    deliveredAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    source?: boolean
    externalId?: boolean
    customerName?: boolean
    customerPhone?: boolean
    address?: boolean
    reference?: boolean
    lat?: boolean
    lng?: boolean
    amountCents?: boolean
    notes?: boolean
    status?: boolean
    trackingToken?: boolean
    routeId?: boolean
    createdAt?: boolean
    deliveredAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectScalar = {
    id?: boolean
    establishmentId?: boolean
    source?: boolean
    externalId?: boolean
    customerName?: boolean
    customerPhone?: boolean
    address?: boolean
    reference?: boolean
    lat?: boolean
    lng?: boolean
    amountCents?: boolean
    notes?: boolean
    status?: boolean
    trackingToken?: boolean
    routeId?: boolean
    createdAt?: boolean
    deliveredAt?: boolean
  }

  export type OrderOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "establishmentId" | "source" | "externalId" | "customerName" | "customerPhone" | "address" | "reference" | "lat" | "lng" | "amountCents" | "notes" | "status" | "trackingToken" | "routeId" | "createdAt" | "deliveredAt", ExtArgs["result"]["order"]>
  export type OrderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    stop?: boolean | Order$stopArgs<ExtArgs>
  }
  export type OrderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }
  export type OrderIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }

  export type $OrderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Order"
    objects: {
      establishment: Prisma.$EstablishmentPayload<ExtArgs>
      stop: Prisma.$RouteStopPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      establishmentId: string
      source: $Enums.OrderSourceKind
      externalId: string | null
      customerName: string
      customerPhone: string | null
      address: string
      reference: string | null
      lat: number | null
      lng: number | null
      amountCents: number
      notes: string | null
      status: $Enums.OrderStatus
      trackingToken: string
      routeId: string | null
      createdAt: Date
      deliveredAt: Date | null
    }, ExtArgs["result"]["order"]>
    composites: {}
  }

  type OrderGetPayload<S extends boolean | null | undefined | OrderDefaultArgs> = $Result.GetResult<Prisma.$OrderPayload, S>

  type OrderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OrderFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OrderCountAggregateInputType | true
    }

  export interface OrderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Order'], meta: { name: 'Order' } }
    /**
     * Find zero or one Order that matches the filter.
     * @param {OrderFindUniqueArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OrderFindUniqueArgs>(args: SelectSubset<T, OrderFindUniqueArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Order that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OrderFindUniqueOrThrowArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OrderFindUniqueOrThrowArgs>(args: SelectSubset<T, OrderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Order that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindFirstArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OrderFindFirstArgs>(args?: SelectSubset<T, OrderFindFirstArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Order that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindFirstOrThrowArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OrderFindFirstOrThrowArgs>(args?: SelectSubset<T, OrderFindFirstOrThrowArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Orders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Orders
     * const orders = await prisma.order.findMany()
     * 
     * // Get first 10 Orders
     * const orders = await prisma.order.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const orderWithIdOnly = await prisma.order.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OrderFindManyArgs>(args?: SelectSubset<T, OrderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Order.
     * @param {OrderCreateArgs} args - Arguments to create a Order.
     * @example
     * // Create one Order
     * const Order = await prisma.order.create({
     *   data: {
     *     // ... data to create a Order
     *   }
     * })
     * 
     */
    create<T extends OrderCreateArgs>(args: SelectSubset<T, OrderCreateArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Orders.
     * @param {OrderCreateManyArgs} args - Arguments to create many Orders.
     * @example
     * // Create many Orders
     * const order = await prisma.order.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OrderCreateManyArgs>(args?: SelectSubset<T, OrderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Orders and returns the data saved in the database.
     * @param {OrderCreateManyAndReturnArgs} args - Arguments to create many Orders.
     * @example
     * // Create many Orders
     * const order = await prisma.order.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Orders and only return the `id`
     * const orderWithIdOnly = await prisma.order.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OrderCreateManyAndReturnArgs>(args?: SelectSubset<T, OrderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Order.
     * @param {OrderDeleteArgs} args - Arguments to delete one Order.
     * @example
     * // Delete one Order
     * const Order = await prisma.order.delete({
     *   where: {
     *     // ... filter to delete one Order
     *   }
     * })
     * 
     */
    delete<T extends OrderDeleteArgs>(args: SelectSubset<T, OrderDeleteArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Order.
     * @param {OrderUpdateArgs} args - Arguments to update one Order.
     * @example
     * // Update one Order
     * const order = await prisma.order.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OrderUpdateArgs>(args: SelectSubset<T, OrderUpdateArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Orders.
     * @param {OrderDeleteManyArgs} args - Arguments to filter Orders to delete.
     * @example
     * // Delete a few Orders
     * const { count } = await prisma.order.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OrderDeleteManyArgs>(args?: SelectSubset<T, OrderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Orders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Orders
     * const order = await prisma.order.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OrderUpdateManyArgs>(args: SelectSubset<T, OrderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Orders and returns the data updated in the database.
     * @param {OrderUpdateManyAndReturnArgs} args - Arguments to update many Orders.
     * @example
     * // Update many Orders
     * const order = await prisma.order.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Orders and only return the `id`
     * const orderWithIdOnly = await prisma.order.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OrderUpdateManyAndReturnArgs>(args: SelectSubset<T, OrderUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Order.
     * @param {OrderUpsertArgs} args - Arguments to update or create a Order.
     * @example
     * // Update or create a Order
     * const order = await prisma.order.upsert({
     *   create: {
     *     // ... data to create a Order
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Order we want to update
     *   }
     * })
     */
    upsert<T extends OrderUpsertArgs>(args: SelectSubset<T, OrderUpsertArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Orders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderCountArgs} args - Arguments to filter Orders to count.
     * @example
     * // Count the number of Orders
     * const count = await prisma.order.count({
     *   where: {
     *     // ... the filter for the Orders we want to count
     *   }
     * })
    **/
    count<T extends OrderCountArgs>(
      args?: Subset<T, OrderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Order.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrderAggregateArgs>(args: Subset<T, OrderAggregateArgs>): Prisma.PrismaPromise<GetOrderAggregateType<T>>

    /**
     * Group by Order.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrderGroupByArgs['orderBy'] }
        : { orderBy?: OrderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Order model
   */
  readonly fields: OrderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Order.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    establishment<T extends EstablishmentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EstablishmentDefaultArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    stop<T extends Order$stopArgs<ExtArgs> = {}>(args?: Subset<T, Order$stopArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Order model
   */
  interface OrderFieldRefs {
    readonly id: FieldRef<"Order", 'String'>
    readonly establishmentId: FieldRef<"Order", 'String'>
    readonly source: FieldRef<"Order", 'OrderSourceKind'>
    readonly externalId: FieldRef<"Order", 'String'>
    readonly customerName: FieldRef<"Order", 'String'>
    readonly customerPhone: FieldRef<"Order", 'String'>
    readonly address: FieldRef<"Order", 'String'>
    readonly reference: FieldRef<"Order", 'String'>
    readonly lat: FieldRef<"Order", 'Float'>
    readonly lng: FieldRef<"Order", 'Float'>
    readonly amountCents: FieldRef<"Order", 'Int'>
    readonly notes: FieldRef<"Order", 'String'>
    readonly status: FieldRef<"Order", 'OrderStatus'>
    readonly trackingToken: FieldRef<"Order", 'String'>
    readonly routeId: FieldRef<"Order", 'String'>
    readonly createdAt: FieldRef<"Order", 'DateTime'>
    readonly deliveredAt: FieldRef<"Order", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Order findUnique
   */
  export type OrderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order findUniqueOrThrow
   */
  export type OrderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order findFirst
   */
  export type OrderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order findFirstOrThrow
   */
  export type OrderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order findMany
   */
  export type OrderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Orders to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order create
   */
  export type OrderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The data needed to create a Order.
     */
    data: XOR<OrderCreateInput, OrderUncheckedCreateInput>
  }

  /**
   * Order createMany
   */
  export type OrderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Orders.
     */
    data: OrderCreateManyInput | OrderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Order createManyAndReturn
   */
  export type OrderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * The data used to create many Orders.
     */
    data: OrderCreateManyInput | OrderCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Order update
   */
  export type OrderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The data needed to update a Order.
     */
    data: XOR<OrderUpdateInput, OrderUncheckedUpdateInput>
    /**
     * Choose, which Order to update.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order updateMany
   */
  export type OrderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Orders.
     */
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyInput>
    /**
     * Filter which Orders to update
     */
    where?: OrderWhereInput
    /**
     * Limit how many Orders to update.
     */
    limit?: number
  }

  /**
   * Order updateManyAndReturn
   */
  export type OrderUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * The data used to update Orders.
     */
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyInput>
    /**
     * Filter which Orders to update
     */
    where?: OrderWhereInput
    /**
     * Limit how many Orders to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Order upsert
   */
  export type OrderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The filter to search for the Order to update in case it exists.
     */
    where: OrderWhereUniqueInput
    /**
     * In case the Order found by the `where` argument doesn't exist, create a new Order with this data.
     */
    create: XOR<OrderCreateInput, OrderUncheckedCreateInput>
    /**
     * In case the Order was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrderUpdateInput, OrderUncheckedUpdateInput>
  }

  /**
   * Order delete
   */
  export type OrderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter which Order to delete.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order deleteMany
   */
  export type OrderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Orders to delete
     */
    where?: OrderWhereInput
    /**
     * Limit how many Orders to delete.
     */
    limit?: number
  }

  /**
   * Order.stop
   */
  export type Order$stopArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    where?: RouteStopWhereInput
  }

  /**
   * Order without action
   */
  export type OrderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
  }


  /**
   * Model Route
   */

  export type AggregateRoute = {
    _count: RouteCountAggregateOutputType | null
    _avg: RouteAvgAggregateOutputType | null
    _sum: RouteSumAggregateOutputType | null
    _min: RouteMinAggregateOutputType | null
    _max: RouteMaxAggregateOutputType | null
  }

  export type RouteAvgAggregateOutputType = {
    distanceMeters: number | null
    durationSeconds: number | null
    baselineDurationSeconds: number | null
  }

  export type RouteSumAggregateOutputType = {
    distanceMeters: number | null
    durationSeconds: number | null
    baselineDurationSeconds: number | null
  }

  export type RouteMinAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    courierId: string | null
    status: $Enums.RouteStatus | null
    accessToken: string | null
    geometry: string | null
    distanceMeters: number | null
    durationSeconds: number | null
    baselineDurationSeconds: number | null
    createdAt: Date | null
    startedAt: Date | null
    finishedAt: Date | null
  }

  export type RouteMaxAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    courierId: string | null
    status: $Enums.RouteStatus | null
    accessToken: string | null
    geometry: string | null
    distanceMeters: number | null
    durationSeconds: number | null
    baselineDurationSeconds: number | null
    createdAt: Date | null
    startedAt: Date | null
    finishedAt: Date | null
  }

  export type RouteCountAggregateOutputType = {
    id: number
    establishmentId: number
    courierId: number
    status: number
    accessToken: number
    geometry: number
    distanceMeters: number
    durationSeconds: number
    baselineDurationSeconds: number
    createdAt: number
    startedAt: number
    finishedAt: number
    _all: number
  }


  export type RouteAvgAggregateInputType = {
    distanceMeters?: true
    durationSeconds?: true
    baselineDurationSeconds?: true
  }

  export type RouteSumAggregateInputType = {
    distanceMeters?: true
    durationSeconds?: true
    baselineDurationSeconds?: true
  }

  export type RouteMinAggregateInputType = {
    id?: true
    establishmentId?: true
    courierId?: true
    status?: true
    accessToken?: true
    geometry?: true
    distanceMeters?: true
    durationSeconds?: true
    baselineDurationSeconds?: true
    createdAt?: true
    startedAt?: true
    finishedAt?: true
  }

  export type RouteMaxAggregateInputType = {
    id?: true
    establishmentId?: true
    courierId?: true
    status?: true
    accessToken?: true
    geometry?: true
    distanceMeters?: true
    durationSeconds?: true
    baselineDurationSeconds?: true
    createdAt?: true
    startedAt?: true
    finishedAt?: true
  }

  export type RouteCountAggregateInputType = {
    id?: true
    establishmentId?: true
    courierId?: true
    status?: true
    accessToken?: true
    geometry?: true
    distanceMeters?: true
    durationSeconds?: true
    baselineDurationSeconds?: true
    createdAt?: true
    startedAt?: true
    finishedAt?: true
    _all?: true
  }

  export type RouteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Route to aggregate.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Routes
    **/
    _count?: true | RouteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RouteAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RouteSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RouteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RouteMaxAggregateInputType
  }

  export type GetRouteAggregateType<T extends RouteAggregateArgs> = {
        [P in keyof T & keyof AggregateRoute]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoute[P]>
      : GetScalarType<T[P], AggregateRoute[P]>
  }




  export type RouteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteWhereInput
    orderBy?: RouteOrderByWithAggregationInput | RouteOrderByWithAggregationInput[]
    by: RouteScalarFieldEnum[] | RouteScalarFieldEnum
    having?: RouteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RouteCountAggregateInputType | true
    _avg?: RouteAvgAggregateInputType
    _sum?: RouteSumAggregateInputType
    _min?: RouteMinAggregateInputType
    _max?: RouteMaxAggregateInputType
  }

  export type RouteGroupByOutputType = {
    id: string
    establishmentId: string
    courierId: string
    status: $Enums.RouteStatus
    accessToken: string
    geometry: string | null
    distanceMeters: number
    durationSeconds: number
    baselineDurationSeconds: number
    createdAt: Date
    startedAt: Date | null
    finishedAt: Date | null
    _count: RouteCountAggregateOutputType | null
    _avg: RouteAvgAggregateOutputType | null
    _sum: RouteSumAggregateOutputType | null
    _min: RouteMinAggregateOutputType | null
    _max: RouteMaxAggregateOutputType | null
  }

  type GetRouteGroupByPayload<T extends RouteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RouteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RouteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RouteGroupByOutputType[P]>
            : GetScalarType<T[P], RouteGroupByOutputType[P]>
        }
      >
    >


  export type RouteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    courierId?: boolean
    status?: boolean
    accessToken?: boolean
    geometry?: boolean
    distanceMeters?: boolean
    durationSeconds?: boolean
    baselineDurationSeconds?: boolean
    createdAt?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    courier?: boolean | CourierDefaultArgs<ExtArgs>
    stops?: boolean | Route$stopsArgs<ExtArgs>
    pings?: boolean | Route$pingsArgs<ExtArgs>
    _count?: boolean | RouteCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["route"]>

  export type RouteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    courierId?: boolean
    status?: boolean
    accessToken?: boolean
    geometry?: boolean
    distanceMeters?: boolean
    durationSeconds?: boolean
    baselineDurationSeconds?: boolean
    createdAt?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    courier?: boolean | CourierDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["route"]>

  export type RouteSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    courierId?: boolean
    status?: boolean
    accessToken?: boolean
    geometry?: boolean
    distanceMeters?: boolean
    durationSeconds?: boolean
    baselineDurationSeconds?: boolean
    createdAt?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    courier?: boolean | CourierDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["route"]>

  export type RouteSelectScalar = {
    id?: boolean
    establishmentId?: boolean
    courierId?: boolean
    status?: boolean
    accessToken?: boolean
    geometry?: boolean
    distanceMeters?: boolean
    durationSeconds?: boolean
    baselineDurationSeconds?: boolean
    createdAt?: boolean
    startedAt?: boolean
    finishedAt?: boolean
  }

  export type RouteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "establishmentId" | "courierId" | "status" | "accessToken" | "geometry" | "distanceMeters" | "durationSeconds" | "baselineDurationSeconds" | "createdAt" | "startedAt" | "finishedAt", ExtArgs["result"]["route"]>
  export type RouteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    courier?: boolean | CourierDefaultArgs<ExtArgs>
    stops?: boolean | Route$stopsArgs<ExtArgs>
    pings?: boolean | Route$pingsArgs<ExtArgs>
    _count?: boolean | RouteCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RouteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    courier?: boolean | CourierDefaultArgs<ExtArgs>
  }
  export type RouteIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
    courier?: boolean | CourierDefaultArgs<ExtArgs>
  }

  export type $RoutePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Route"
    objects: {
      establishment: Prisma.$EstablishmentPayload<ExtArgs>
      courier: Prisma.$CourierPayload<ExtArgs>
      stops: Prisma.$RouteStopPayload<ExtArgs>[]
      pings: Prisma.$CourierPingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      establishmentId: string
      courierId: string
      status: $Enums.RouteStatus
      accessToken: string
      geometry: string | null
      distanceMeters: number
      durationSeconds: number
      baselineDurationSeconds: number
      createdAt: Date
      startedAt: Date | null
      finishedAt: Date | null
    }, ExtArgs["result"]["route"]>
    composites: {}
  }

  type RouteGetPayload<S extends boolean | null | undefined | RouteDefaultArgs> = $Result.GetResult<Prisma.$RoutePayload, S>

  type RouteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RouteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RouteCountAggregateInputType | true
    }

  export interface RouteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Route'], meta: { name: 'Route' } }
    /**
     * Find zero or one Route that matches the filter.
     * @param {RouteFindUniqueArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RouteFindUniqueArgs>(args: SelectSubset<T, RouteFindUniqueArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Route that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RouteFindUniqueOrThrowArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RouteFindUniqueOrThrowArgs>(args: SelectSubset<T, RouteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Route that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteFindFirstArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RouteFindFirstArgs>(args?: SelectSubset<T, RouteFindFirstArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Route that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteFindFirstOrThrowArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RouteFindFirstOrThrowArgs>(args?: SelectSubset<T, RouteFindFirstOrThrowArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Routes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Routes
     * const routes = await prisma.route.findMany()
     * 
     * // Get first 10 Routes
     * const routes = await prisma.route.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const routeWithIdOnly = await prisma.route.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RouteFindManyArgs>(args?: SelectSubset<T, RouteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Route.
     * @param {RouteCreateArgs} args - Arguments to create a Route.
     * @example
     * // Create one Route
     * const Route = await prisma.route.create({
     *   data: {
     *     // ... data to create a Route
     *   }
     * })
     * 
     */
    create<T extends RouteCreateArgs>(args: SelectSubset<T, RouteCreateArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Routes.
     * @param {RouteCreateManyArgs} args - Arguments to create many Routes.
     * @example
     * // Create many Routes
     * const route = await prisma.route.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RouteCreateManyArgs>(args?: SelectSubset<T, RouteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Routes and returns the data saved in the database.
     * @param {RouteCreateManyAndReturnArgs} args - Arguments to create many Routes.
     * @example
     * // Create many Routes
     * const route = await prisma.route.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Routes and only return the `id`
     * const routeWithIdOnly = await prisma.route.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RouteCreateManyAndReturnArgs>(args?: SelectSubset<T, RouteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Route.
     * @param {RouteDeleteArgs} args - Arguments to delete one Route.
     * @example
     * // Delete one Route
     * const Route = await prisma.route.delete({
     *   where: {
     *     // ... filter to delete one Route
     *   }
     * })
     * 
     */
    delete<T extends RouteDeleteArgs>(args: SelectSubset<T, RouteDeleteArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Route.
     * @param {RouteUpdateArgs} args - Arguments to update one Route.
     * @example
     * // Update one Route
     * const route = await prisma.route.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RouteUpdateArgs>(args: SelectSubset<T, RouteUpdateArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Routes.
     * @param {RouteDeleteManyArgs} args - Arguments to filter Routes to delete.
     * @example
     * // Delete a few Routes
     * const { count } = await prisma.route.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RouteDeleteManyArgs>(args?: SelectSubset<T, RouteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Routes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Routes
     * const route = await prisma.route.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RouteUpdateManyArgs>(args: SelectSubset<T, RouteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Routes and returns the data updated in the database.
     * @param {RouteUpdateManyAndReturnArgs} args - Arguments to update many Routes.
     * @example
     * // Update many Routes
     * const route = await prisma.route.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Routes and only return the `id`
     * const routeWithIdOnly = await prisma.route.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RouteUpdateManyAndReturnArgs>(args: SelectSubset<T, RouteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Route.
     * @param {RouteUpsertArgs} args - Arguments to update or create a Route.
     * @example
     * // Update or create a Route
     * const route = await prisma.route.upsert({
     *   create: {
     *     // ... data to create a Route
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Route we want to update
     *   }
     * })
     */
    upsert<T extends RouteUpsertArgs>(args: SelectSubset<T, RouteUpsertArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Routes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteCountArgs} args - Arguments to filter Routes to count.
     * @example
     * // Count the number of Routes
     * const count = await prisma.route.count({
     *   where: {
     *     // ... the filter for the Routes we want to count
     *   }
     * })
    **/
    count<T extends RouteCountArgs>(
      args?: Subset<T, RouteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RouteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Route.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RouteAggregateArgs>(args: Subset<T, RouteAggregateArgs>): Prisma.PrismaPromise<GetRouteAggregateType<T>>

    /**
     * Group by Route.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RouteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RouteGroupByArgs['orderBy'] }
        : { orderBy?: RouteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RouteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRouteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Route model
   */
  readonly fields: RouteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Route.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RouteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    establishment<T extends EstablishmentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EstablishmentDefaultArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    courier<T extends CourierDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourierDefaultArgs<ExtArgs>>): Prisma__CourierClient<$Result.GetResult<Prisma.$CourierPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    stops<T extends Route$stopsArgs<ExtArgs> = {}>(args?: Subset<T, Route$stopsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    pings<T extends Route$pingsArgs<ExtArgs> = {}>(args?: Subset<T, Route$pingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Route model
   */
  interface RouteFieldRefs {
    readonly id: FieldRef<"Route", 'String'>
    readonly establishmentId: FieldRef<"Route", 'String'>
    readonly courierId: FieldRef<"Route", 'String'>
    readonly status: FieldRef<"Route", 'RouteStatus'>
    readonly accessToken: FieldRef<"Route", 'String'>
    readonly geometry: FieldRef<"Route", 'String'>
    readonly distanceMeters: FieldRef<"Route", 'Int'>
    readonly durationSeconds: FieldRef<"Route", 'Int'>
    readonly baselineDurationSeconds: FieldRef<"Route", 'Int'>
    readonly createdAt: FieldRef<"Route", 'DateTime'>
    readonly startedAt: FieldRef<"Route", 'DateTime'>
    readonly finishedAt: FieldRef<"Route", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Route findUnique
   */
  export type RouteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route findUniqueOrThrow
   */
  export type RouteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route findFirst
   */
  export type RouteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Routes.
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Routes.
     */
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Route findFirstOrThrow
   */
  export type RouteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Routes.
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Routes.
     */
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Route findMany
   */
  export type RouteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Routes to fetch.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Routes.
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Routes.
     */
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Route create
   */
  export type RouteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * The data needed to create a Route.
     */
    data: XOR<RouteCreateInput, RouteUncheckedCreateInput>
  }

  /**
   * Route createMany
   */
  export type RouteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Routes.
     */
    data: RouteCreateManyInput | RouteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Route createManyAndReturn
   */
  export type RouteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * The data used to create many Routes.
     */
    data: RouteCreateManyInput | RouteCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Route update
   */
  export type RouteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * The data needed to update a Route.
     */
    data: XOR<RouteUpdateInput, RouteUncheckedUpdateInput>
    /**
     * Choose, which Route to update.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route updateMany
   */
  export type RouteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Routes.
     */
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyInput>
    /**
     * Filter which Routes to update
     */
    where?: RouteWhereInput
    /**
     * Limit how many Routes to update.
     */
    limit?: number
  }

  /**
   * Route updateManyAndReturn
   */
  export type RouteUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * The data used to update Routes.
     */
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyInput>
    /**
     * Filter which Routes to update
     */
    where?: RouteWhereInput
    /**
     * Limit how many Routes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Route upsert
   */
  export type RouteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * The filter to search for the Route to update in case it exists.
     */
    where: RouteWhereUniqueInput
    /**
     * In case the Route found by the `where` argument doesn't exist, create a new Route with this data.
     */
    create: XOR<RouteCreateInput, RouteUncheckedCreateInput>
    /**
     * In case the Route was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RouteUpdateInput, RouteUncheckedUpdateInput>
  }

  /**
   * Route delete
   */
  export type RouteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter which Route to delete.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route deleteMany
   */
  export type RouteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Routes to delete
     */
    where?: RouteWhereInput
    /**
     * Limit how many Routes to delete.
     */
    limit?: number
  }

  /**
   * Route.stops
   */
  export type Route$stopsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    where?: RouteStopWhereInput
    orderBy?: RouteStopOrderByWithRelationInput | RouteStopOrderByWithRelationInput[]
    cursor?: RouteStopWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RouteStopScalarFieldEnum | RouteStopScalarFieldEnum[]
  }

  /**
   * Route.pings
   */
  export type Route$pingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    where?: CourierPingWhereInput
    orderBy?: CourierPingOrderByWithRelationInput | CourierPingOrderByWithRelationInput[]
    cursor?: CourierPingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CourierPingScalarFieldEnum | CourierPingScalarFieldEnum[]
  }

  /**
   * Route without action
   */
  export type RouteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Route
     */
    omit?: RouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
  }


  /**
   * Model RouteStop
   */

  export type AggregateRouteStop = {
    _count: RouteStopCountAggregateOutputType | null
    _avg: RouteStopAvgAggregateOutputType | null
    _sum: RouteStopSumAggregateOutputType | null
    _min: RouteStopMinAggregateOutputType | null
    _max: RouteStopMaxAggregateOutputType | null
  }

  export type RouteStopAvgAggregateOutputType = {
    position: number | null
    etaSeconds: number | null
    legDistanceMeters: number | null
  }

  export type RouteStopSumAggregateOutputType = {
    position: number | null
    etaSeconds: number | null
    legDistanceMeters: number | null
  }

  export type RouteStopMinAggregateOutputType = {
    id: string | null
    routeId: string | null
    orderId: string | null
    position: number | null
    status: $Enums.StopStatus | null
    etaSeconds: number | null
    legDistanceMeters: number | null
    resolvedAt: Date | null
    failureReason: string | null
  }

  export type RouteStopMaxAggregateOutputType = {
    id: string | null
    routeId: string | null
    orderId: string | null
    position: number | null
    status: $Enums.StopStatus | null
    etaSeconds: number | null
    legDistanceMeters: number | null
    resolvedAt: Date | null
    failureReason: string | null
  }

  export type RouteStopCountAggregateOutputType = {
    id: number
    routeId: number
    orderId: number
    position: number
    status: number
    etaSeconds: number
    legDistanceMeters: number
    resolvedAt: number
    failureReason: number
    _all: number
  }


  export type RouteStopAvgAggregateInputType = {
    position?: true
    etaSeconds?: true
    legDistanceMeters?: true
  }

  export type RouteStopSumAggregateInputType = {
    position?: true
    etaSeconds?: true
    legDistanceMeters?: true
  }

  export type RouteStopMinAggregateInputType = {
    id?: true
    routeId?: true
    orderId?: true
    position?: true
    status?: true
    etaSeconds?: true
    legDistanceMeters?: true
    resolvedAt?: true
    failureReason?: true
  }

  export type RouteStopMaxAggregateInputType = {
    id?: true
    routeId?: true
    orderId?: true
    position?: true
    status?: true
    etaSeconds?: true
    legDistanceMeters?: true
    resolvedAt?: true
    failureReason?: true
  }

  export type RouteStopCountAggregateInputType = {
    id?: true
    routeId?: true
    orderId?: true
    position?: true
    status?: true
    etaSeconds?: true
    legDistanceMeters?: true
    resolvedAt?: true
    failureReason?: true
    _all?: true
  }

  export type RouteStopAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RouteStop to aggregate.
     */
    where?: RouteStopWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RouteStops to fetch.
     */
    orderBy?: RouteStopOrderByWithRelationInput | RouteStopOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RouteStopWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RouteStops from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RouteStops.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RouteStops
    **/
    _count?: true | RouteStopCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RouteStopAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RouteStopSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RouteStopMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RouteStopMaxAggregateInputType
  }

  export type GetRouteStopAggregateType<T extends RouteStopAggregateArgs> = {
        [P in keyof T & keyof AggregateRouteStop]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRouteStop[P]>
      : GetScalarType<T[P], AggregateRouteStop[P]>
  }




  export type RouteStopGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteStopWhereInput
    orderBy?: RouteStopOrderByWithAggregationInput | RouteStopOrderByWithAggregationInput[]
    by: RouteStopScalarFieldEnum[] | RouteStopScalarFieldEnum
    having?: RouteStopScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RouteStopCountAggregateInputType | true
    _avg?: RouteStopAvgAggregateInputType
    _sum?: RouteStopSumAggregateInputType
    _min?: RouteStopMinAggregateInputType
    _max?: RouteStopMaxAggregateInputType
  }

  export type RouteStopGroupByOutputType = {
    id: string
    routeId: string
    orderId: string
    position: number
    status: $Enums.StopStatus
    etaSeconds: number
    legDistanceMeters: number
    resolvedAt: Date | null
    failureReason: string | null
    _count: RouteStopCountAggregateOutputType | null
    _avg: RouteStopAvgAggregateOutputType | null
    _sum: RouteStopSumAggregateOutputType | null
    _min: RouteStopMinAggregateOutputType | null
    _max: RouteStopMaxAggregateOutputType | null
  }

  type GetRouteStopGroupByPayload<T extends RouteStopGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RouteStopGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RouteStopGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RouteStopGroupByOutputType[P]>
            : GetScalarType<T[P], RouteStopGroupByOutputType[P]>
        }
      >
    >


  export type RouteStopSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    routeId?: boolean
    orderId?: boolean
    position?: boolean
    status?: boolean
    etaSeconds?: boolean
    legDistanceMeters?: boolean
    resolvedAt?: boolean
    failureReason?: boolean
    route?: boolean | RouteDefaultArgs<ExtArgs>
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["routeStop"]>

  export type RouteStopSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    routeId?: boolean
    orderId?: boolean
    position?: boolean
    status?: boolean
    etaSeconds?: boolean
    legDistanceMeters?: boolean
    resolvedAt?: boolean
    failureReason?: boolean
    route?: boolean | RouteDefaultArgs<ExtArgs>
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["routeStop"]>

  export type RouteStopSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    routeId?: boolean
    orderId?: boolean
    position?: boolean
    status?: boolean
    etaSeconds?: boolean
    legDistanceMeters?: boolean
    resolvedAt?: boolean
    failureReason?: boolean
    route?: boolean | RouteDefaultArgs<ExtArgs>
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["routeStop"]>

  export type RouteStopSelectScalar = {
    id?: boolean
    routeId?: boolean
    orderId?: boolean
    position?: boolean
    status?: boolean
    etaSeconds?: boolean
    legDistanceMeters?: boolean
    resolvedAt?: boolean
    failureReason?: boolean
  }

  export type RouteStopOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "routeId" | "orderId" | "position" | "status" | "etaSeconds" | "legDistanceMeters" | "resolvedAt" | "failureReason", ExtArgs["result"]["routeStop"]>
  export type RouteStopInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    route?: boolean | RouteDefaultArgs<ExtArgs>
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }
  export type RouteStopIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    route?: boolean | RouteDefaultArgs<ExtArgs>
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }
  export type RouteStopIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    route?: boolean | RouteDefaultArgs<ExtArgs>
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }

  export type $RouteStopPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RouteStop"
    objects: {
      route: Prisma.$RoutePayload<ExtArgs>
      order: Prisma.$OrderPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      routeId: string
      orderId: string
      position: number
      status: $Enums.StopStatus
      etaSeconds: number
      legDistanceMeters: number
      resolvedAt: Date | null
      failureReason: string | null
    }, ExtArgs["result"]["routeStop"]>
    composites: {}
  }

  type RouteStopGetPayload<S extends boolean | null | undefined | RouteStopDefaultArgs> = $Result.GetResult<Prisma.$RouteStopPayload, S>

  type RouteStopCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RouteStopFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RouteStopCountAggregateInputType | true
    }

  export interface RouteStopDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RouteStop'], meta: { name: 'RouteStop' } }
    /**
     * Find zero or one RouteStop that matches the filter.
     * @param {RouteStopFindUniqueArgs} args - Arguments to find a RouteStop
     * @example
     * // Get one RouteStop
     * const routeStop = await prisma.routeStop.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RouteStopFindUniqueArgs>(args: SelectSubset<T, RouteStopFindUniqueArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RouteStop that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RouteStopFindUniqueOrThrowArgs} args - Arguments to find a RouteStop
     * @example
     * // Get one RouteStop
     * const routeStop = await prisma.routeStop.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RouteStopFindUniqueOrThrowArgs>(args: SelectSubset<T, RouteStopFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RouteStop that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopFindFirstArgs} args - Arguments to find a RouteStop
     * @example
     * // Get one RouteStop
     * const routeStop = await prisma.routeStop.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RouteStopFindFirstArgs>(args?: SelectSubset<T, RouteStopFindFirstArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RouteStop that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopFindFirstOrThrowArgs} args - Arguments to find a RouteStop
     * @example
     * // Get one RouteStop
     * const routeStop = await prisma.routeStop.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RouteStopFindFirstOrThrowArgs>(args?: SelectSubset<T, RouteStopFindFirstOrThrowArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RouteStops that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RouteStops
     * const routeStops = await prisma.routeStop.findMany()
     * 
     * // Get first 10 RouteStops
     * const routeStops = await prisma.routeStop.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const routeStopWithIdOnly = await prisma.routeStop.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RouteStopFindManyArgs>(args?: SelectSubset<T, RouteStopFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RouteStop.
     * @param {RouteStopCreateArgs} args - Arguments to create a RouteStop.
     * @example
     * // Create one RouteStop
     * const RouteStop = await prisma.routeStop.create({
     *   data: {
     *     // ... data to create a RouteStop
     *   }
     * })
     * 
     */
    create<T extends RouteStopCreateArgs>(args: SelectSubset<T, RouteStopCreateArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RouteStops.
     * @param {RouteStopCreateManyArgs} args - Arguments to create many RouteStops.
     * @example
     * // Create many RouteStops
     * const routeStop = await prisma.routeStop.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RouteStopCreateManyArgs>(args?: SelectSubset<T, RouteStopCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RouteStops and returns the data saved in the database.
     * @param {RouteStopCreateManyAndReturnArgs} args - Arguments to create many RouteStops.
     * @example
     * // Create many RouteStops
     * const routeStop = await prisma.routeStop.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RouteStops and only return the `id`
     * const routeStopWithIdOnly = await prisma.routeStop.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RouteStopCreateManyAndReturnArgs>(args?: SelectSubset<T, RouteStopCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RouteStop.
     * @param {RouteStopDeleteArgs} args - Arguments to delete one RouteStop.
     * @example
     * // Delete one RouteStop
     * const RouteStop = await prisma.routeStop.delete({
     *   where: {
     *     // ... filter to delete one RouteStop
     *   }
     * })
     * 
     */
    delete<T extends RouteStopDeleteArgs>(args: SelectSubset<T, RouteStopDeleteArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RouteStop.
     * @param {RouteStopUpdateArgs} args - Arguments to update one RouteStop.
     * @example
     * // Update one RouteStop
     * const routeStop = await prisma.routeStop.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RouteStopUpdateArgs>(args: SelectSubset<T, RouteStopUpdateArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RouteStops.
     * @param {RouteStopDeleteManyArgs} args - Arguments to filter RouteStops to delete.
     * @example
     * // Delete a few RouteStops
     * const { count } = await prisma.routeStop.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RouteStopDeleteManyArgs>(args?: SelectSubset<T, RouteStopDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RouteStops.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RouteStops
     * const routeStop = await prisma.routeStop.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RouteStopUpdateManyArgs>(args: SelectSubset<T, RouteStopUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RouteStops and returns the data updated in the database.
     * @param {RouteStopUpdateManyAndReturnArgs} args - Arguments to update many RouteStops.
     * @example
     * // Update many RouteStops
     * const routeStop = await prisma.routeStop.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RouteStops and only return the `id`
     * const routeStopWithIdOnly = await prisma.routeStop.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RouteStopUpdateManyAndReturnArgs>(args: SelectSubset<T, RouteStopUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RouteStop.
     * @param {RouteStopUpsertArgs} args - Arguments to update or create a RouteStop.
     * @example
     * // Update or create a RouteStop
     * const routeStop = await prisma.routeStop.upsert({
     *   create: {
     *     // ... data to create a RouteStop
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RouteStop we want to update
     *   }
     * })
     */
    upsert<T extends RouteStopUpsertArgs>(args: SelectSubset<T, RouteStopUpsertArgs<ExtArgs>>): Prisma__RouteStopClient<$Result.GetResult<Prisma.$RouteStopPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RouteStops.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopCountArgs} args - Arguments to filter RouteStops to count.
     * @example
     * // Count the number of RouteStops
     * const count = await prisma.routeStop.count({
     *   where: {
     *     // ... the filter for the RouteStops we want to count
     *   }
     * })
    **/
    count<T extends RouteStopCountArgs>(
      args?: Subset<T, RouteStopCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RouteStopCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RouteStop.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RouteStopAggregateArgs>(args: Subset<T, RouteStopAggregateArgs>): Prisma.PrismaPromise<GetRouteStopAggregateType<T>>

    /**
     * Group by RouteStop.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteStopGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RouteStopGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RouteStopGroupByArgs['orderBy'] }
        : { orderBy?: RouteStopGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RouteStopGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRouteStopGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RouteStop model
   */
  readonly fields: RouteStopFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RouteStop.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RouteStopClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    route<T extends RouteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RouteDefaultArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    order<T extends OrderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrderDefaultArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RouteStop model
   */
  interface RouteStopFieldRefs {
    readonly id: FieldRef<"RouteStop", 'String'>
    readonly routeId: FieldRef<"RouteStop", 'String'>
    readonly orderId: FieldRef<"RouteStop", 'String'>
    readonly position: FieldRef<"RouteStop", 'Int'>
    readonly status: FieldRef<"RouteStop", 'StopStatus'>
    readonly etaSeconds: FieldRef<"RouteStop", 'Int'>
    readonly legDistanceMeters: FieldRef<"RouteStop", 'Int'>
    readonly resolvedAt: FieldRef<"RouteStop", 'DateTime'>
    readonly failureReason: FieldRef<"RouteStop", 'String'>
  }
    

  // Custom InputTypes
  /**
   * RouteStop findUnique
   */
  export type RouteStopFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * Filter, which RouteStop to fetch.
     */
    where: RouteStopWhereUniqueInput
  }

  /**
   * RouteStop findUniqueOrThrow
   */
  export type RouteStopFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * Filter, which RouteStop to fetch.
     */
    where: RouteStopWhereUniqueInput
  }

  /**
   * RouteStop findFirst
   */
  export type RouteStopFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * Filter, which RouteStop to fetch.
     */
    where?: RouteStopWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RouteStops to fetch.
     */
    orderBy?: RouteStopOrderByWithRelationInput | RouteStopOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RouteStops.
     */
    cursor?: RouteStopWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RouteStops from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RouteStops.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RouteStops.
     */
    distinct?: RouteStopScalarFieldEnum | RouteStopScalarFieldEnum[]
  }

  /**
   * RouteStop findFirstOrThrow
   */
  export type RouteStopFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * Filter, which RouteStop to fetch.
     */
    where?: RouteStopWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RouteStops to fetch.
     */
    orderBy?: RouteStopOrderByWithRelationInput | RouteStopOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RouteStops.
     */
    cursor?: RouteStopWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RouteStops from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RouteStops.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RouteStops.
     */
    distinct?: RouteStopScalarFieldEnum | RouteStopScalarFieldEnum[]
  }

  /**
   * RouteStop findMany
   */
  export type RouteStopFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * Filter, which RouteStops to fetch.
     */
    where?: RouteStopWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RouteStops to fetch.
     */
    orderBy?: RouteStopOrderByWithRelationInput | RouteStopOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RouteStops.
     */
    cursor?: RouteStopWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RouteStops from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RouteStops.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RouteStops.
     */
    distinct?: RouteStopScalarFieldEnum | RouteStopScalarFieldEnum[]
  }

  /**
   * RouteStop create
   */
  export type RouteStopCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * The data needed to create a RouteStop.
     */
    data: XOR<RouteStopCreateInput, RouteStopUncheckedCreateInput>
  }

  /**
   * RouteStop createMany
   */
  export type RouteStopCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RouteStops.
     */
    data: RouteStopCreateManyInput | RouteStopCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RouteStop createManyAndReturn
   */
  export type RouteStopCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * The data used to create many RouteStops.
     */
    data: RouteStopCreateManyInput | RouteStopCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RouteStop update
   */
  export type RouteStopUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * The data needed to update a RouteStop.
     */
    data: XOR<RouteStopUpdateInput, RouteStopUncheckedUpdateInput>
    /**
     * Choose, which RouteStop to update.
     */
    where: RouteStopWhereUniqueInput
  }

  /**
   * RouteStop updateMany
   */
  export type RouteStopUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RouteStops.
     */
    data: XOR<RouteStopUpdateManyMutationInput, RouteStopUncheckedUpdateManyInput>
    /**
     * Filter which RouteStops to update
     */
    where?: RouteStopWhereInput
    /**
     * Limit how many RouteStops to update.
     */
    limit?: number
  }

  /**
   * RouteStop updateManyAndReturn
   */
  export type RouteStopUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * The data used to update RouteStops.
     */
    data: XOR<RouteStopUpdateManyMutationInput, RouteStopUncheckedUpdateManyInput>
    /**
     * Filter which RouteStops to update
     */
    where?: RouteStopWhereInput
    /**
     * Limit how many RouteStops to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * RouteStop upsert
   */
  export type RouteStopUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * The filter to search for the RouteStop to update in case it exists.
     */
    where: RouteStopWhereUniqueInput
    /**
     * In case the RouteStop found by the `where` argument doesn't exist, create a new RouteStop with this data.
     */
    create: XOR<RouteStopCreateInput, RouteStopUncheckedCreateInput>
    /**
     * In case the RouteStop was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RouteStopUpdateInput, RouteStopUncheckedUpdateInput>
  }

  /**
   * RouteStop delete
   */
  export type RouteStopDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
    /**
     * Filter which RouteStop to delete.
     */
    where: RouteStopWhereUniqueInput
  }

  /**
   * RouteStop deleteMany
   */
  export type RouteStopDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RouteStops to delete
     */
    where?: RouteStopWhereInput
    /**
     * Limit how many RouteStops to delete.
     */
    limit?: number
  }

  /**
   * RouteStop without action
   */
  export type RouteStopDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RouteStop
     */
    select?: RouteStopSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RouteStop
     */
    omit?: RouteStopOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteStopInclude<ExtArgs> | null
  }


  /**
   * Model CourierPing
   */

  export type AggregateCourierPing = {
    _count: CourierPingCountAggregateOutputType | null
    _avg: CourierPingAvgAggregateOutputType | null
    _sum: CourierPingSumAggregateOutputType | null
    _min: CourierPingMinAggregateOutputType | null
    _max: CourierPingMaxAggregateOutputType | null
  }

  export type CourierPingAvgAggregateOutputType = {
    lat: number | null
    lng: number | null
  }

  export type CourierPingSumAggregateOutputType = {
    lat: number | null
    lng: number | null
  }

  export type CourierPingMinAggregateOutputType = {
    id: string | null
    routeId: string | null
    lat: number | null
    lng: number | null
    recordedAt: Date | null
  }

  export type CourierPingMaxAggregateOutputType = {
    id: string | null
    routeId: string | null
    lat: number | null
    lng: number | null
    recordedAt: Date | null
  }

  export type CourierPingCountAggregateOutputType = {
    id: number
    routeId: number
    lat: number
    lng: number
    recordedAt: number
    _all: number
  }


  export type CourierPingAvgAggregateInputType = {
    lat?: true
    lng?: true
  }

  export type CourierPingSumAggregateInputType = {
    lat?: true
    lng?: true
  }

  export type CourierPingMinAggregateInputType = {
    id?: true
    routeId?: true
    lat?: true
    lng?: true
    recordedAt?: true
  }

  export type CourierPingMaxAggregateInputType = {
    id?: true
    routeId?: true
    lat?: true
    lng?: true
    recordedAt?: true
  }

  export type CourierPingCountAggregateInputType = {
    id?: true
    routeId?: true
    lat?: true
    lng?: true
    recordedAt?: true
    _all?: true
  }

  export type CourierPingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CourierPing to aggregate.
     */
    where?: CourierPingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourierPings to fetch.
     */
    orderBy?: CourierPingOrderByWithRelationInput | CourierPingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CourierPingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourierPings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourierPings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CourierPings
    **/
    _count?: true | CourierPingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CourierPingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CourierPingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CourierPingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CourierPingMaxAggregateInputType
  }

  export type GetCourierPingAggregateType<T extends CourierPingAggregateArgs> = {
        [P in keyof T & keyof AggregateCourierPing]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCourierPing[P]>
      : GetScalarType<T[P], AggregateCourierPing[P]>
  }




  export type CourierPingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourierPingWhereInput
    orderBy?: CourierPingOrderByWithAggregationInput | CourierPingOrderByWithAggregationInput[]
    by: CourierPingScalarFieldEnum[] | CourierPingScalarFieldEnum
    having?: CourierPingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CourierPingCountAggregateInputType | true
    _avg?: CourierPingAvgAggregateInputType
    _sum?: CourierPingSumAggregateInputType
    _min?: CourierPingMinAggregateInputType
    _max?: CourierPingMaxAggregateInputType
  }

  export type CourierPingGroupByOutputType = {
    id: string
    routeId: string
    lat: number
    lng: number
    recordedAt: Date
    _count: CourierPingCountAggregateOutputType | null
    _avg: CourierPingAvgAggregateOutputType | null
    _sum: CourierPingSumAggregateOutputType | null
    _min: CourierPingMinAggregateOutputType | null
    _max: CourierPingMaxAggregateOutputType | null
  }

  type GetCourierPingGroupByPayload<T extends CourierPingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CourierPingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CourierPingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CourierPingGroupByOutputType[P]>
            : GetScalarType<T[P], CourierPingGroupByOutputType[P]>
        }
      >
    >


  export type CourierPingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    routeId?: boolean
    lat?: boolean
    lng?: boolean
    recordedAt?: boolean
    route?: boolean | RouteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courierPing"]>

  export type CourierPingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    routeId?: boolean
    lat?: boolean
    lng?: boolean
    recordedAt?: boolean
    route?: boolean | RouteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courierPing"]>

  export type CourierPingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    routeId?: boolean
    lat?: boolean
    lng?: boolean
    recordedAt?: boolean
    route?: boolean | RouteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courierPing"]>

  export type CourierPingSelectScalar = {
    id?: boolean
    routeId?: boolean
    lat?: boolean
    lng?: boolean
    recordedAt?: boolean
  }

  export type CourierPingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "routeId" | "lat" | "lng" | "recordedAt", ExtArgs["result"]["courierPing"]>
  export type CourierPingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    route?: boolean | RouteDefaultArgs<ExtArgs>
  }
  export type CourierPingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    route?: boolean | RouteDefaultArgs<ExtArgs>
  }
  export type CourierPingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    route?: boolean | RouteDefaultArgs<ExtArgs>
  }

  export type $CourierPingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CourierPing"
    objects: {
      route: Prisma.$RoutePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      routeId: string
      lat: number
      lng: number
      recordedAt: Date
    }, ExtArgs["result"]["courierPing"]>
    composites: {}
  }

  type CourierPingGetPayload<S extends boolean | null | undefined | CourierPingDefaultArgs> = $Result.GetResult<Prisma.$CourierPingPayload, S>

  type CourierPingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CourierPingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CourierPingCountAggregateInputType | true
    }

  export interface CourierPingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CourierPing'], meta: { name: 'CourierPing' } }
    /**
     * Find zero or one CourierPing that matches the filter.
     * @param {CourierPingFindUniqueArgs} args - Arguments to find a CourierPing
     * @example
     * // Get one CourierPing
     * const courierPing = await prisma.courierPing.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CourierPingFindUniqueArgs>(args: SelectSubset<T, CourierPingFindUniqueArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CourierPing that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CourierPingFindUniqueOrThrowArgs} args - Arguments to find a CourierPing
     * @example
     * // Get one CourierPing
     * const courierPing = await prisma.courierPing.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CourierPingFindUniqueOrThrowArgs>(args: SelectSubset<T, CourierPingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CourierPing that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingFindFirstArgs} args - Arguments to find a CourierPing
     * @example
     * // Get one CourierPing
     * const courierPing = await prisma.courierPing.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CourierPingFindFirstArgs>(args?: SelectSubset<T, CourierPingFindFirstArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CourierPing that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingFindFirstOrThrowArgs} args - Arguments to find a CourierPing
     * @example
     * // Get one CourierPing
     * const courierPing = await prisma.courierPing.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CourierPingFindFirstOrThrowArgs>(args?: SelectSubset<T, CourierPingFindFirstOrThrowArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CourierPings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CourierPings
     * const courierPings = await prisma.courierPing.findMany()
     * 
     * // Get first 10 CourierPings
     * const courierPings = await prisma.courierPing.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const courierPingWithIdOnly = await prisma.courierPing.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CourierPingFindManyArgs>(args?: SelectSubset<T, CourierPingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CourierPing.
     * @param {CourierPingCreateArgs} args - Arguments to create a CourierPing.
     * @example
     * // Create one CourierPing
     * const CourierPing = await prisma.courierPing.create({
     *   data: {
     *     // ... data to create a CourierPing
     *   }
     * })
     * 
     */
    create<T extends CourierPingCreateArgs>(args: SelectSubset<T, CourierPingCreateArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CourierPings.
     * @param {CourierPingCreateManyArgs} args - Arguments to create many CourierPings.
     * @example
     * // Create many CourierPings
     * const courierPing = await prisma.courierPing.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CourierPingCreateManyArgs>(args?: SelectSubset<T, CourierPingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CourierPings and returns the data saved in the database.
     * @param {CourierPingCreateManyAndReturnArgs} args - Arguments to create many CourierPings.
     * @example
     * // Create many CourierPings
     * const courierPing = await prisma.courierPing.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CourierPings and only return the `id`
     * const courierPingWithIdOnly = await prisma.courierPing.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CourierPingCreateManyAndReturnArgs>(args?: SelectSubset<T, CourierPingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CourierPing.
     * @param {CourierPingDeleteArgs} args - Arguments to delete one CourierPing.
     * @example
     * // Delete one CourierPing
     * const CourierPing = await prisma.courierPing.delete({
     *   where: {
     *     // ... filter to delete one CourierPing
     *   }
     * })
     * 
     */
    delete<T extends CourierPingDeleteArgs>(args: SelectSubset<T, CourierPingDeleteArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CourierPing.
     * @param {CourierPingUpdateArgs} args - Arguments to update one CourierPing.
     * @example
     * // Update one CourierPing
     * const courierPing = await prisma.courierPing.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CourierPingUpdateArgs>(args: SelectSubset<T, CourierPingUpdateArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CourierPings.
     * @param {CourierPingDeleteManyArgs} args - Arguments to filter CourierPings to delete.
     * @example
     * // Delete a few CourierPings
     * const { count } = await prisma.courierPing.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CourierPingDeleteManyArgs>(args?: SelectSubset<T, CourierPingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CourierPings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CourierPings
     * const courierPing = await prisma.courierPing.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CourierPingUpdateManyArgs>(args: SelectSubset<T, CourierPingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CourierPings and returns the data updated in the database.
     * @param {CourierPingUpdateManyAndReturnArgs} args - Arguments to update many CourierPings.
     * @example
     * // Update many CourierPings
     * const courierPing = await prisma.courierPing.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CourierPings and only return the `id`
     * const courierPingWithIdOnly = await prisma.courierPing.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CourierPingUpdateManyAndReturnArgs>(args: SelectSubset<T, CourierPingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CourierPing.
     * @param {CourierPingUpsertArgs} args - Arguments to update or create a CourierPing.
     * @example
     * // Update or create a CourierPing
     * const courierPing = await prisma.courierPing.upsert({
     *   create: {
     *     // ... data to create a CourierPing
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CourierPing we want to update
     *   }
     * })
     */
    upsert<T extends CourierPingUpsertArgs>(args: SelectSubset<T, CourierPingUpsertArgs<ExtArgs>>): Prisma__CourierPingClient<$Result.GetResult<Prisma.$CourierPingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CourierPings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingCountArgs} args - Arguments to filter CourierPings to count.
     * @example
     * // Count the number of CourierPings
     * const count = await prisma.courierPing.count({
     *   where: {
     *     // ... the filter for the CourierPings we want to count
     *   }
     * })
    **/
    count<T extends CourierPingCountArgs>(
      args?: Subset<T, CourierPingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CourierPingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CourierPing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CourierPingAggregateArgs>(args: Subset<T, CourierPingAggregateArgs>): Prisma.PrismaPromise<GetCourierPingAggregateType<T>>

    /**
     * Group by CourierPing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourierPingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CourierPingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CourierPingGroupByArgs['orderBy'] }
        : { orderBy?: CourierPingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CourierPingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCourierPingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CourierPing model
   */
  readonly fields: CourierPingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CourierPing.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CourierPingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    route<T extends RouteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RouteDefaultArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CourierPing model
   */
  interface CourierPingFieldRefs {
    readonly id: FieldRef<"CourierPing", 'String'>
    readonly routeId: FieldRef<"CourierPing", 'String'>
    readonly lat: FieldRef<"CourierPing", 'Float'>
    readonly lng: FieldRef<"CourierPing", 'Float'>
    readonly recordedAt: FieldRef<"CourierPing", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CourierPing findUnique
   */
  export type CourierPingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * Filter, which CourierPing to fetch.
     */
    where: CourierPingWhereUniqueInput
  }

  /**
   * CourierPing findUniqueOrThrow
   */
  export type CourierPingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * Filter, which CourierPing to fetch.
     */
    where: CourierPingWhereUniqueInput
  }

  /**
   * CourierPing findFirst
   */
  export type CourierPingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * Filter, which CourierPing to fetch.
     */
    where?: CourierPingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourierPings to fetch.
     */
    orderBy?: CourierPingOrderByWithRelationInput | CourierPingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CourierPings.
     */
    cursor?: CourierPingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourierPings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourierPings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourierPings.
     */
    distinct?: CourierPingScalarFieldEnum | CourierPingScalarFieldEnum[]
  }

  /**
   * CourierPing findFirstOrThrow
   */
  export type CourierPingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * Filter, which CourierPing to fetch.
     */
    where?: CourierPingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourierPings to fetch.
     */
    orderBy?: CourierPingOrderByWithRelationInput | CourierPingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CourierPings.
     */
    cursor?: CourierPingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourierPings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourierPings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourierPings.
     */
    distinct?: CourierPingScalarFieldEnum | CourierPingScalarFieldEnum[]
  }

  /**
   * CourierPing findMany
   */
  export type CourierPingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * Filter, which CourierPings to fetch.
     */
    where?: CourierPingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourierPings to fetch.
     */
    orderBy?: CourierPingOrderByWithRelationInput | CourierPingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CourierPings.
     */
    cursor?: CourierPingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourierPings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourierPings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourierPings.
     */
    distinct?: CourierPingScalarFieldEnum | CourierPingScalarFieldEnum[]
  }

  /**
   * CourierPing create
   */
  export type CourierPingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * The data needed to create a CourierPing.
     */
    data: XOR<CourierPingCreateInput, CourierPingUncheckedCreateInput>
  }

  /**
   * CourierPing createMany
   */
  export type CourierPingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CourierPings.
     */
    data: CourierPingCreateManyInput | CourierPingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CourierPing createManyAndReturn
   */
  export type CourierPingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * The data used to create many CourierPings.
     */
    data: CourierPingCreateManyInput | CourierPingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CourierPing update
   */
  export type CourierPingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * The data needed to update a CourierPing.
     */
    data: XOR<CourierPingUpdateInput, CourierPingUncheckedUpdateInput>
    /**
     * Choose, which CourierPing to update.
     */
    where: CourierPingWhereUniqueInput
  }

  /**
   * CourierPing updateMany
   */
  export type CourierPingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CourierPings.
     */
    data: XOR<CourierPingUpdateManyMutationInput, CourierPingUncheckedUpdateManyInput>
    /**
     * Filter which CourierPings to update
     */
    where?: CourierPingWhereInput
    /**
     * Limit how many CourierPings to update.
     */
    limit?: number
  }

  /**
   * CourierPing updateManyAndReturn
   */
  export type CourierPingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * The data used to update CourierPings.
     */
    data: XOR<CourierPingUpdateManyMutationInput, CourierPingUncheckedUpdateManyInput>
    /**
     * Filter which CourierPings to update
     */
    where?: CourierPingWhereInput
    /**
     * Limit how many CourierPings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CourierPing upsert
   */
  export type CourierPingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * The filter to search for the CourierPing to update in case it exists.
     */
    where: CourierPingWhereUniqueInput
    /**
     * In case the CourierPing found by the `where` argument doesn't exist, create a new CourierPing with this data.
     */
    create: XOR<CourierPingCreateInput, CourierPingUncheckedCreateInput>
    /**
     * In case the CourierPing was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CourierPingUpdateInput, CourierPingUncheckedUpdateInput>
  }

  /**
   * CourierPing delete
   */
  export type CourierPingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
    /**
     * Filter which CourierPing to delete.
     */
    where: CourierPingWhereUniqueInput
  }

  /**
   * CourierPing deleteMany
   */
  export type CourierPingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CourierPings to delete
     */
    where?: CourierPingWhereInput
    /**
     * Limit how many CourierPings to delete.
     */
    limit?: number
  }

  /**
   * CourierPing without action
   */
  export type CourierPingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourierPing
     */
    select?: CourierPingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourierPing
     */
    omit?: CourierPingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourierPingInclude<ExtArgs> | null
  }


  /**
   * Model DomainEventLog
   */

  export type AggregateDomainEventLog = {
    _count: DomainEventLogCountAggregateOutputType | null
    _min: DomainEventLogMinAggregateOutputType | null
    _max: DomainEventLogMaxAggregateOutputType | null
  }

  export type DomainEventLogMinAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    name: string | null
    aggregateId: string | null
    occurredAt: Date | null
  }

  export type DomainEventLogMaxAggregateOutputType = {
    id: string | null
    establishmentId: string | null
    name: string | null
    aggregateId: string | null
    occurredAt: Date | null
  }

  export type DomainEventLogCountAggregateOutputType = {
    id: number
    establishmentId: number
    name: number
    aggregateId: number
    payload: number
    occurredAt: number
    _all: number
  }


  export type DomainEventLogMinAggregateInputType = {
    id?: true
    establishmentId?: true
    name?: true
    aggregateId?: true
    occurredAt?: true
  }

  export type DomainEventLogMaxAggregateInputType = {
    id?: true
    establishmentId?: true
    name?: true
    aggregateId?: true
    occurredAt?: true
  }

  export type DomainEventLogCountAggregateInputType = {
    id?: true
    establishmentId?: true
    name?: true
    aggregateId?: true
    payload?: true
    occurredAt?: true
    _all?: true
  }

  export type DomainEventLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DomainEventLog to aggregate.
     */
    where?: DomainEventLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DomainEventLogs to fetch.
     */
    orderBy?: DomainEventLogOrderByWithRelationInput | DomainEventLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DomainEventLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DomainEventLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DomainEventLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DomainEventLogs
    **/
    _count?: true | DomainEventLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DomainEventLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DomainEventLogMaxAggregateInputType
  }

  export type GetDomainEventLogAggregateType<T extends DomainEventLogAggregateArgs> = {
        [P in keyof T & keyof AggregateDomainEventLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDomainEventLog[P]>
      : GetScalarType<T[P], AggregateDomainEventLog[P]>
  }




  export type DomainEventLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DomainEventLogWhereInput
    orderBy?: DomainEventLogOrderByWithAggregationInput | DomainEventLogOrderByWithAggregationInput[]
    by: DomainEventLogScalarFieldEnum[] | DomainEventLogScalarFieldEnum
    having?: DomainEventLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DomainEventLogCountAggregateInputType | true
    _min?: DomainEventLogMinAggregateInputType
    _max?: DomainEventLogMaxAggregateInputType
  }

  export type DomainEventLogGroupByOutputType = {
    id: string
    establishmentId: string
    name: string
    aggregateId: string
    payload: JsonValue
    occurredAt: Date
    _count: DomainEventLogCountAggregateOutputType | null
    _min: DomainEventLogMinAggregateOutputType | null
    _max: DomainEventLogMaxAggregateOutputType | null
  }

  type GetDomainEventLogGroupByPayload<T extends DomainEventLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DomainEventLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DomainEventLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DomainEventLogGroupByOutputType[P]>
            : GetScalarType<T[P], DomainEventLogGroupByOutputType[P]>
        }
      >
    >


  export type DomainEventLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    aggregateId?: boolean
    payload?: boolean
    occurredAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["domainEventLog"]>

  export type DomainEventLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    aggregateId?: boolean
    payload?: boolean
    occurredAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["domainEventLog"]>

  export type DomainEventLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    aggregateId?: boolean
    payload?: boolean
    occurredAt?: boolean
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["domainEventLog"]>

  export type DomainEventLogSelectScalar = {
    id?: boolean
    establishmentId?: boolean
    name?: boolean
    aggregateId?: boolean
    payload?: boolean
    occurredAt?: boolean
  }

  export type DomainEventLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "establishmentId" | "name" | "aggregateId" | "payload" | "occurredAt", ExtArgs["result"]["domainEventLog"]>
  export type DomainEventLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }
  export type DomainEventLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }
  export type DomainEventLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    establishment?: boolean | EstablishmentDefaultArgs<ExtArgs>
  }

  export type $DomainEventLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DomainEventLog"
    objects: {
      establishment: Prisma.$EstablishmentPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      establishmentId: string
      name: string
      aggregateId: string
      payload: Prisma.JsonValue
      occurredAt: Date
    }, ExtArgs["result"]["domainEventLog"]>
    composites: {}
  }

  type DomainEventLogGetPayload<S extends boolean | null | undefined | DomainEventLogDefaultArgs> = $Result.GetResult<Prisma.$DomainEventLogPayload, S>

  type DomainEventLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DomainEventLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DomainEventLogCountAggregateInputType | true
    }

  export interface DomainEventLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DomainEventLog'], meta: { name: 'DomainEventLog' } }
    /**
     * Find zero or one DomainEventLog that matches the filter.
     * @param {DomainEventLogFindUniqueArgs} args - Arguments to find a DomainEventLog
     * @example
     * // Get one DomainEventLog
     * const domainEventLog = await prisma.domainEventLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DomainEventLogFindUniqueArgs>(args: SelectSubset<T, DomainEventLogFindUniqueArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DomainEventLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DomainEventLogFindUniqueOrThrowArgs} args - Arguments to find a DomainEventLog
     * @example
     * // Get one DomainEventLog
     * const domainEventLog = await prisma.domainEventLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DomainEventLogFindUniqueOrThrowArgs>(args: SelectSubset<T, DomainEventLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DomainEventLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogFindFirstArgs} args - Arguments to find a DomainEventLog
     * @example
     * // Get one DomainEventLog
     * const domainEventLog = await prisma.domainEventLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DomainEventLogFindFirstArgs>(args?: SelectSubset<T, DomainEventLogFindFirstArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DomainEventLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogFindFirstOrThrowArgs} args - Arguments to find a DomainEventLog
     * @example
     * // Get one DomainEventLog
     * const domainEventLog = await prisma.domainEventLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DomainEventLogFindFirstOrThrowArgs>(args?: SelectSubset<T, DomainEventLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DomainEventLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DomainEventLogs
     * const domainEventLogs = await prisma.domainEventLog.findMany()
     * 
     * // Get first 10 DomainEventLogs
     * const domainEventLogs = await prisma.domainEventLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const domainEventLogWithIdOnly = await prisma.domainEventLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DomainEventLogFindManyArgs>(args?: SelectSubset<T, DomainEventLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DomainEventLog.
     * @param {DomainEventLogCreateArgs} args - Arguments to create a DomainEventLog.
     * @example
     * // Create one DomainEventLog
     * const DomainEventLog = await prisma.domainEventLog.create({
     *   data: {
     *     // ... data to create a DomainEventLog
     *   }
     * })
     * 
     */
    create<T extends DomainEventLogCreateArgs>(args: SelectSubset<T, DomainEventLogCreateArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DomainEventLogs.
     * @param {DomainEventLogCreateManyArgs} args - Arguments to create many DomainEventLogs.
     * @example
     * // Create many DomainEventLogs
     * const domainEventLog = await prisma.domainEventLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DomainEventLogCreateManyArgs>(args?: SelectSubset<T, DomainEventLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many DomainEventLogs and returns the data saved in the database.
     * @param {DomainEventLogCreateManyAndReturnArgs} args - Arguments to create many DomainEventLogs.
     * @example
     * // Create many DomainEventLogs
     * const domainEventLog = await prisma.domainEventLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many DomainEventLogs and only return the `id`
     * const domainEventLogWithIdOnly = await prisma.domainEventLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DomainEventLogCreateManyAndReturnArgs>(args?: SelectSubset<T, DomainEventLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a DomainEventLog.
     * @param {DomainEventLogDeleteArgs} args - Arguments to delete one DomainEventLog.
     * @example
     * // Delete one DomainEventLog
     * const DomainEventLog = await prisma.domainEventLog.delete({
     *   where: {
     *     // ... filter to delete one DomainEventLog
     *   }
     * })
     * 
     */
    delete<T extends DomainEventLogDeleteArgs>(args: SelectSubset<T, DomainEventLogDeleteArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DomainEventLog.
     * @param {DomainEventLogUpdateArgs} args - Arguments to update one DomainEventLog.
     * @example
     * // Update one DomainEventLog
     * const domainEventLog = await prisma.domainEventLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DomainEventLogUpdateArgs>(args: SelectSubset<T, DomainEventLogUpdateArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DomainEventLogs.
     * @param {DomainEventLogDeleteManyArgs} args - Arguments to filter DomainEventLogs to delete.
     * @example
     * // Delete a few DomainEventLogs
     * const { count } = await prisma.domainEventLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DomainEventLogDeleteManyArgs>(args?: SelectSubset<T, DomainEventLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DomainEventLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DomainEventLogs
     * const domainEventLog = await prisma.domainEventLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DomainEventLogUpdateManyArgs>(args: SelectSubset<T, DomainEventLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DomainEventLogs and returns the data updated in the database.
     * @param {DomainEventLogUpdateManyAndReturnArgs} args - Arguments to update many DomainEventLogs.
     * @example
     * // Update many DomainEventLogs
     * const domainEventLog = await prisma.domainEventLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more DomainEventLogs and only return the `id`
     * const domainEventLogWithIdOnly = await prisma.domainEventLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DomainEventLogUpdateManyAndReturnArgs>(args: SelectSubset<T, DomainEventLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one DomainEventLog.
     * @param {DomainEventLogUpsertArgs} args - Arguments to update or create a DomainEventLog.
     * @example
     * // Update or create a DomainEventLog
     * const domainEventLog = await prisma.domainEventLog.upsert({
     *   create: {
     *     // ... data to create a DomainEventLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DomainEventLog we want to update
     *   }
     * })
     */
    upsert<T extends DomainEventLogUpsertArgs>(args: SelectSubset<T, DomainEventLogUpsertArgs<ExtArgs>>): Prisma__DomainEventLogClient<$Result.GetResult<Prisma.$DomainEventLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DomainEventLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogCountArgs} args - Arguments to filter DomainEventLogs to count.
     * @example
     * // Count the number of DomainEventLogs
     * const count = await prisma.domainEventLog.count({
     *   where: {
     *     // ... the filter for the DomainEventLogs we want to count
     *   }
     * })
    **/
    count<T extends DomainEventLogCountArgs>(
      args?: Subset<T, DomainEventLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DomainEventLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DomainEventLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DomainEventLogAggregateArgs>(args: Subset<T, DomainEventLogAggregateArgs>): Prisma.PrismaPromise<GetDomainEventLogAggregateType<T>>

    /**
     * Group by DomainEventLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DomainEventLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DomainEventLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DomainEventLogGroupByArgs['orderBy'] }
        : { orderBy?: DomainEventLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DomainEventLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDomainEventLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DomainEventLog model
   */
  readonly fields: DomainEventLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DomainEventLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DomainEventLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    establishment<T extends EstablishmentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EstablishmentDefaultArgs<ExtArgs>>): Prisma__EstablishmentClient<$Result.GetResult<Prisma.$EstablishmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DomainEventLog model
   */
  interface DomainEventLogFieldRefs {
    readonly id: FieldRef<"DomainEventLog", 'String'>
    readonly establishmentId: FieldRef<"DomainEventLog", 'String'>
    readonly name: FieldRef<"DomainEventLog", 'String'>
    readonly aggregateId: FieldRef<"DomainEventLog", 'String'>
    readonly payload: FieldRef<"DomainEventLog", 'Json'>
    readonly occurredAt: FieldRef<"DomainEventLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DomainEventLog findUnique
   */
  export type DomainEventLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * Filter, which DomainEventLog to fetch.
     */
    where: DomainEventLogWhereUniqueInput
  }

  /**
   * DomainEventLog findUniqueOrThrow
   */
  export type DomainEventLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * Filter, which DomainEventLog to fetch.
     */
    where: DomainEventLogWhereUniqueInput
  }

  /**
   * DomainEventLog findFirst
   */
  export type DomainEventLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * Filter, which DomainEventLog to fetch.
     */
    where?: DomainEventLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DomainEventLogs to fetch.
     */
    orderBy?: DomainEventLogOrderByWithRelationInput | DomainEventLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DomainEventLogs.
     */
    cursor?: DomainEventLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DomainEventLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DomainEventLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DomainEventLogs.
     */
    distinct?: DomainEventLogScalarFieldEnum | DomainEventLogScalarFieldEnum[]
  }

  /**
   * DomainEventLog findFirstOrThrow
   */
  export type DomainEventLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * Filter, which DomainEventLog to fetch.
     */
    where?: DomainEventLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DomainEventLogs to fetch.
     */
    orderBy?: DomainEventLogOrderByWithRelationInput | DomainEventLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DomainEventLogs.
     */
    cursor?: DomainEventLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DomainEventLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DomainEventLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DomainEventLogs.
     */
    distinct?: DomainEventLogScalarFieldEnum | DomainEventLogScalarFieldEnum[]
  }

  /**
   * DomainEventLog findMany
   */
  export type DomainEventLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * Filter, which DomainEventLogs to fetch.
     */
    where?: DomainEventLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DomainEventLogs to fetch.
     */
    orderBy?: DomainEventLogOrderByWithRelationInput | DomainEventLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DomainEventLogs.
     */
    cursor?: DomainEventLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DomainEventLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DomainEventLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DomainEventLogs.
     */
    distinct?: DomainEventLogScalarFieldEnum | DomainEventLogScalarFieldEnum[]
  }

  /**
   * DomainEventLog create
   */
  export type DomainEventLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * The data needed to create a DomainEventLog.
     */
    data: XOR<DomainEventLogCreateInput, DomainEventLogUncheckedCreateInput>
  }

  /**
   * DomainEventLog createMany
   */
  export type DomainEventLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DomainEventLogs.
     */
    data: DomainEventLogCreateManyInput | DomainEventLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DomainEventLog createManyAndReturn
   */
  export type DomainEventLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * The data used to create many DomainEventLogs.
     */
    data: DomainEventLogCreateManyInput | DomainEventLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * DomainEventLog update
   */
  export type DomainEventLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * The data needed to update a DomainEventLog.
     */
    data: XOR<DomainEventLogUpdateInput, DomainEventLogUncheckedUpdateInput>
    /**
     * Choose, which DomainEventLog to update.
     */
    where: DomainEventLogWhereUniqueInput
  }

  /**
   * DomainEventLog updateMany
   */
  export type DomainEventLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DomainEventLogs.
     */
    data: XOR<DomainEventLogUpdateManyMutationInput, DomainEventLogUncheckedUpdateManyInput>
    /**
     * Filter which DomainEventLogs to update
     */
    where?: DomainEventLogWhereInput
    /**
     * Limit how many DomainEventLogs to update.
     */
    limit?: number
  }

  /**
   * DomainEventLog updateManyAndReturn
   */
  export type DomainEventLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * The data used to update DomainEventLogs.
     */
    data: XOR<DomainEventLogUpdateManyMutationInput, DomainEventLogUncheckedUpdateManyInput>
    /**
     * Filter which DomainEventLogs to update
     */
    where?: DomainEventLogWhereInput
    /**
     * Limit how many DomainEventLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * DomainEventLog upsert
   */
  export type DomainEventLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * The filter to search for the DomainEventLog to update in case it exists.
     */
    where: DomainEventLogWhereUniqueInput
    /**
     * In case the DomainEventLog found by the `where` argument doesn't exist, create a new DomainEventLog with this data.
     */
    create: XOR<DomainEventLogCreateInput, DomainEventLogUncheckedCreateInput>
    /**
     * In case the DomainEventLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DomainEventLogUpdateInput, DomainEventLogUncheckedUpdateInput>
  }

  /**
   * DomainEventLog delete
   */
  export type DomainEventLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
    /**
     * Filter which DomainEventLog to delete.
     */
    where: DomainEventLogWhereUniqueInput
  }

  /**
   * DomainEventLog deleteMany
   */
  export type DomainEventLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DomainEventLogs to delete
     */
    where?: DomainEventLogWhereInput
    /**
     * Limit how many DomainEventLogs to delete.
     */
    limit?: number
  }

  /**
   * DomainEventLog without action
   */
  export type DomainEventLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DomainEventLog
     */
    select?: DomainEventLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DomainEventLog
     */
    omit?: DomainEventLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DomainEventLogInclude<ExtArgs> | null
  }


  /**
   * Model GeocodeCache
   */

  export type AggregateGeocodeCache = {
    _count: GeocodeCacheCountAggregateOutputType | null
    _avg: GeocodeCacheAvgAggregateOutputType | null
    _sum: GeocodeCacheSumAggregateOutputType | null
    _min: GeocodeCacheMinAggregateOutputType | null
    _max: GeocodeCacheMaxAggregateOutputType | null
  }

  export type GeocodeCacheAvgAggregateOutputType = {
    lat: number | null
    lng: number | null
  }

  export type GeocodeCacheSumAggregateOutputType = {
    lat: number | null
    lng: number | null
  }

  export type GeocodeCacheMinAggregateOutputType = {
    cacheKey: string | null
    lat: number | null
    lng: number | null
    createdAt: Date | null
  }

  export type GeocodeCacheMaxAggregateOutputType = {
    cacheKey: string | null
    lat: number | null
    lng: number | null
    createdAt: Date | null
  }

  export type GeocodeCacheCountAggregateOutputType = {
    cacheKey: number
    lat: number
    lng: number
    createdAt: number
    _all: number
  }


  export type GeocodeCacheAvgAggregateInputType = {
    lat?: true
    lng?: true
  }

  export type GeocodeCacheSumAggregateInputType = {
    lat?: true
    lng?: true
  }

  export type GeocodeCacheMinAggregateInputType = {
    cacheKey?: true
    lat?: true
    lng?: true
    createdAt?: true
  }

  export type GeocodeCacheMaxAggregateInputType = {
    cacheKey?: true
    lat?: true
    lng?: true
    createdAt?: true
  }

  export type GeocodeCacheCountAggregateInputType = {
    cacheKey?: true
    lat?: true
    lng?: true
    createdAt?: true
    _all?: true
  }

  export type GeocodeCacheAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GeocodeCache to aggregate.
     */
    where?: GeocodeCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeocodeCaches to fetch.
     */
    orderBy?: GeocodeCacheOrderByWithRelationInput | GeocodeCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GeocodeCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeocodeCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeocodeCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GeocodeCaches
    **/
    _count?: true | GeocodeCacheCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GeocodeCacheAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GeocodeCacheSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GeocodeCacheMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GeocodeCacheMaxAggregateInputType
  }

  export type GetGeocodeCacheAggregateType<T extends GeocodeCacheAggregateArgs> = {
        [P in keyof T & keyof AggregateGeocodeCache]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGeocodeCache[P]>
      : GetScalarType<T[P], AggregateGeocodeCache[P]>
  }




  export type GeocodeCacheGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GeocodeCacheWhereInput
    orderBy?: GeocodeCacheOrderByWithAggregationInput | GeocodeCacheOrderByWithAggregationInput[]
    by: GeocodeCacheScalarFieldEnum[] | GeocodeCacheScalarFieldEnum
    having?: GeocodeCacheScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GeocodeCacheCountAggregateInputType | true
    _avg?: GeocodeCacheAvgAggregateInputType
    _sum?: GeocodeCacheSumAggregateInputType
    _min?: GeocodeCacheMinAggregateInputType
    _max?: GeocodeCacheMaxAggregateInputType
  }

  export type GeocodeCacheGroupByOutputType = {
    cacheKey: string
    lat: number
    lng: number
    createdAt: Date
    _count: GeocodeCacheCountAggregateOutputType | null
    _avg: GeocodeCacheAvgAggregateOutputType | null
    _sum: GeocodeCacheSumAggregateOutputType | null
    _min: GeocodeCacheMinAggregateOutputType | null
    _max: GeocodeCacheMaxAggregateOutputType | null
  }

  type GetGeocodeCacheGroupByPayload<T extends GeocodeCacheGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GeocodeCacheGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GeocodeCacheGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GeocodeCacheGroupByOutputType[P]>
            : GetScalarType<T[P], GeocodeCacheGroupByOutputType[P]>
        }
      >
    >


  export type GeocodeCacheSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    cacheKey?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["geocodeCache"]>

  export type GeocodeCacheSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    cacheKey?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["geocodeCache"]>

  export type GeocodeCacheSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    cacheKey?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["geocodeCache"]>

  export type GeocodeCacheSelectScalar = {
    cacheKey?: boolean
    lat?: boolean
    lng?: boolean
    createdAt?: boolean
  }

  export type GeocodeCacheOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"cacheKey" | "lat" | "lng" | "createdAt", ExtArgs["result"]["geocodeCache"]>

  export type $GeocodeCachePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GeocodeCache"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      cacheKey: string
      lat: number
      lng: number
      createdAt: Date
    }, ExtArgs["result"]["geocodeCache"]>
    composites: {}
  }

  type GeocodeCacheGetPayload<S extends boolean | null | undefined | GeocodeCacheDefaultArgs> = $Result.GetResult<Prisma.$GeocodeCachePayload, S>

  type GeocodeCacheCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GeocodeCacheFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GeocodeCacheCountAggregateInputType | true
    }

  export interface GeocodeCacheDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GeocodeCache'], meta: { name: 'GeocodeCache' } }
    /**
     * Find zero or one GeocodeCache that matches the filter.
     * @param {GeocodeCacheFindUniqueArgs} args - Arguments to find a GeocodeCache
     * @example
     * // Get one GeocodeCache
     * const geocodeCache = await prisma.geocodeCache.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GeocodeCacheFindUniqueArgs>(args: SelectSubset<T, GeocodeCacheFindUniqueArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GeocodeCache that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GeocodeCacheFindUniqueOrThrowArgs} args - Arguments to find a GeocodeCache
     * @example
     * // Get one GeocodeCache
     * const geocodeCache = await prisma.geocodeCache.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GeocodeCacheFindUniqueOrThrowArgs>(args: SelectSubset<T, GeocodeCacheFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GeocodeCache that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheFindFirstArgs} args - Arguments to find a GeocodeCache
     * @example
     * // Get one GeocodeCache
     * const geocodeCache = await prisma.geocodeCache.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GeocodeCacheFindFirstArgs>(args?: SelectSubset<T, GeocodeCacheFindFirstArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GeocodeCache that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheFindFirstOrThrowArgs} args - Arguments to find a GeocodeCache
     * @example
     * // Get one GeocodeCache
     * const geocodeCache = await prisma.geocodeCache.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GeocodeCacheFindFirstOrThrowArgs>(args?: SelectSubset<T, GeocodeCacheFindFirstOrThrowArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GeocodeCaches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GeocodeCaches
     * const geocodeCaches = await prisma.geocodeCache.findMany()
     * 
     * // Get first 10 GeocodeCaches
     * const geocodeCaches = await prisma.geocodeCache.findMany({ take: 10 })
     * 
     * // Only select the `cacheKey`
     * const geocodeCacheWithCacheKeyOnly = await prisma.geocodeCache.findMany({ select: { cacheKey: true } })
     * 
     */
    findMany<T extends GeocodeCacheFindManyArgs>(args?: SelectSubset<T, GeocodeCacheFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GeocodeCache.
     * @param {GeocodeCacheCreateArgs} args - Arguments to create a GeocodeCache.
     * @example
     * // Create one GeocodeCache
     * const GeocodeCache = await prisma.geocodeCache.create({
     *   data: {
     *     // ... data to create a GeocodeCache
     *   }
     * })
     * 
     */
    create<T extends GeocodeCacheCreateArgs>(args: SelectSubset<T, GeocodeCacheCreateArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GeocodeCaches.
     * @param {GeocodeCacheCreateManyArgs} args - Arguments to create many GeocodeCaches.
     * @example
     * // Create many GeocodeCaches
     * const geocodeCache = await prisma.geocodeCache.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GeocodeCacheCreateManyArgs>(args?: SelectSubset<T, GeocodeCacheCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GeocodeCaches and returns the data saved in the database.
     * @param {GeocodeCacheCreateManyAndReturnArgs} args - Arguments to create many GeocodeCaches.
     * @example
     * // Create many GeocodeCaches
     * const geocodeCache = await prisma.geocodeCache.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GeocodeCaches and only return the `cacheKey`
     * const geocodeCacheWithCacheKeyOnly = await prisma.geocodeCache.createManyAndReturn({
     *   select: { cacheKey: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GeocodeCacheCreateManyAndReturnArgs>(args?: SelectSubset<T, GeocodeCacheCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GeocodeCache.
     * @param {GeocodeCacheDeleteArgs} args - Arguments to delete one GeocodeCache.
     * @example
     * // Delete one GeocodeCache
     * const GeocodeCache = await prisma.geocodeCache.delete({
     *   where: {
     *     // ... filter to delete one GeocodeCache
     *   }
     * })
     * 
     */
    delete<T extends GeocodeCacheDeleteArgs>(args: SelectSubset<T, GeocodeCacheDeleteArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GeocodeCache.
     * @param {GeocodeCacheUpdateArgs} args - Arguments to update one GeocodeCache.
     * @example
     * // Update one GeocodeCache
     * const geocodeCache = await prisma.geocodeCache.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GeocodeCacheUpdateArgs>(args: SelectSubset<T, GeocodeCacheUpdateArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GeocodeCaches.
     * @param {GeocodeCacheDeleteManyArgs} args - Arguments to filter GeocodeCaches to delete.
     * @example
     * // Delete a few GeocodeCaches
     * const { count } = await prisma.geocodeCache.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GeocodeCacheDeleteManyArgs>(args?: SelectSubset<T, GeocodeCacheDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GeocodeCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GeocodeCaches
     * const geocodeCache = await prisma.geocodeCache.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GeocodeCacheUpdateManyArgs>(args: SelectSubset<T, GeocodeCacheUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GeocodeCaches and returns the data updated in the database.
     * @param {GeocodeCacheUpdateManyAndReturnArgs} args - Arguments to update many GeocodeCaches.
     * @example
     * // Update many GeocodeCaches
     * const geocodeCache = await prisma.geocodeCache.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GeocodeCaches and only return the `cacheKey`
     * const geocodeCacheWithCacheKeyOnly = await prisma.geocodeCache.updateManyAndReturn({
     *   select: { cacheKey: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GeocodeCacheUpdateManyAndReturnArgs>(args: SelectSubset<T, GeocodeCacheUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GeocodeCache.
     * @param {GeocodeCacheUpsertArgs} args - Arguments to update or create a GeocodeCache.
     * @example
     * // Update or create a GeocodeCache
     * const geocodeCache = await prisma.geocodeCache.upsert({
     *   create: {
     *     // ... data to create a GeocodeCache
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GeocodeCache we want to update
     *   }
     * })
     */
    upsert<T extends GeocodeCacheUpsertArgs>(args: SelectSubset<T, GeocodeCacheUpsertArgs<ExtArgs>>): Prisma__GeocodeCacheClient<$Result.GetResult<Prisma.$GeocodeCachePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GeocodeCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheCountArgs} args - Arguments to filter GeocodeCaches to count.
     * @example
     * // Count the number of GeocodeCaches
     * const count = await prisma.geocodeCache.count({
     *   where: {
     *     // ... the filter for the GeocodeCaches we want to count
     *   }
     * })
    **/
    count<T extends GeocodeCacheCountArgs>(
      args?: Subset<T, GeocodeCacheCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GeocodeCacheCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GeocodeCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GeocodeCacheAggregateArgs>(args: Subset<T, GeocodeCacheAggregateArgs>): Prisma.PrismaPromise<GetGeocodeCacheAggregateType<T>>

    /**
     * Group by GeocodeCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeocodeCacheGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GeocodeCacheGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GeocodeCacheGroupByArgs['orderBy'] }
        : { orderBy?: GeocodeCacheGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GeocodeCacheGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGeocodeCacheGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GeocodeCache model
   */
  readonly fields: GeocodeCacheFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GeocodeCache.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GeocodeCacheClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the GeocodeCache model
   */
  interface GeocodeCacheFieldRefs {
    readonly cacheKey: FieldRef<"GeocodeCache", 'String'>
    readonly lat: FieldRef<"GeocodeCache", 'Float'>
    readonly lng: FieldRef<"GeocodeCache", 'Float'>
    readonly createdAt: FieldRef<"GeocodeCache", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * GeocodeCache findUnique
   */
  export type GeocodeCacheFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * Filter, which GeocodeCache to fetch.
     */
    where: GeocodeCacheWhereUniqueInput
  }

  /**
   * GeocodeCache findUniqueOrThrow
   */
  export type GeocodeCacheFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * Filter, which GeocodeCache to fetch.
     */
    where: GeocodeCacheWhereUniqueInput
  }

  /**
   * GeocodeCache findFirst
   */
  export type GeocodeCacheFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * Filter, which GeocodeCache to fetch.
     */
    where?: GeocodeCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeocodeCaches to fetch.
     */
    orderBy?: GeocodeCacheOrderByWithRelationInput | GeocodeCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GeocodeCaches.
     */
    cursor?: GeocodeCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeocodeCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeocodeCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeocodeCaches.
     */
    distinct?: GeocodeCacheScalarFieldEnum | GeocodeCacheScalarFieldEnum[]
  }

  /**
   * GeocodeCache findFirstOrThrow
   */
  export type GeocodeCacheFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * Filter, which GeocodeCache to fetch.
     */
    where?: GeocodeCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeocodeCaches to fetch.
     */
    orderBy?: GeocodeCacheOrderByWithRelationInput | GeocodeCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GeocodeCaches.
     */
    cursor?: GeocodeCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeocodeCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeocodeCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeocodeCaches.
     */
    distinct?: GeocodeCacheScalarFieldEnum | GeocodeCacheScalarFieldEnum[]
  }

  /**
   * GeocodeCache findMany
   */
  export type GeocodeCacheFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * Filter, which GeocodeCaches to fetch.
     */
    where?: GeocodeCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeocodeCaches to fetch.
     */
    orderBy?: GeocodeCacheOrderByWithRelationInput | GeocodeCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GeocodeCaches.
     */
    cursor?: GeocodeCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeocodeCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeocodeCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeocodeCaches.
     */
    distinct?: GeocodeCacheScalarFieldEnum | GeocodeCacheScalarFieldEnum[]
  }

  /**
   * GeocodeCache create
   */
  export type GeocodeCacheCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * The data needed to create a GeocodeCache.
     */
    data: XOR<GeocodeCacheCreateInput, GeocodeCacheUncheckedCreateInput>
  }

  /**
   * GeocodeCache createMany
   */
  export type GeocodeCacheCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GeocodeCaches.
     */
    data: GeocodeCacheCreateManyInput | GeocodeCacheCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GeocodeCache createManyAndReturn
   */
  export type GeocodeCacheCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * The data used to create many GeocodeCaches.
     */
    data: GeocodeCacheCreateManyInput | GeocodeCacheCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GeocodeCache update
   */
  export type GeocodeCacheUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * The data needed to update a GeocodeCache.
     */
    data: XOR<GeocodeCacheUpdateInput, GeocodeCacheUncheckedUpdateInput>
    /**
     * Choose, which GeocodeCache to update.
     */
    where: GeocodeCacheWhereUniqueInput
  }

  /**
   * GeocodeCache updateMany
   */
  export type GeocodeCacheUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GeocodeCaches.
     */
    data: XOR<GeocodeCacheUpdateManyMutationInput, GeocodeCacheUncheckedUpdateManyInput>
    /**
     * Filter which GeocodeCaches to update
     */
    where?: GeocodeCacheWhereInput
    /**
     * Limit how many GeocodeCaches to update.
     */
    limit?: number
  }

  /**
   * GeocodeCache updateManyAndReturn
   */
  export type GeocodeCacheUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * The data used to update GeocodeCaches.
     */
    data: XOR<GeocodeCacheUpdateManyMutationInput, GeocodeCacheUncheckedUpdateManyInput>
    /**
     * Filter which GeocodeCaches to update
     */
    where?: GeocodeCacheWhereInput
    /**
     * Limit how many GeocodeCaches to update.
     */
    limit?: number
  }

  /**
   * GeocodeCache upsert
   */
  export type GeocodeCacheUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * The filter to search for the GeocodeCache to update in case it exists.
     */
    where: GeocodeCacheWhereUniqueInput
    /**
     * In case the GeocodeCache found by the `where` argument doesn't exist, create a new GeocodeCache with this data.
     */
    create: XOR<GeocodeCacheCreateInput, GeocodeCacheUncheckedCreateInput>
    /**
     * In case the GeocodeCache was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GeocodeCacheUpdateInput, GeocodeCacheUncheckedUpdateInput>
  }

  /**
   * GeocodeCache delete
   */
  export type GeocodeCacheDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
    /**
     * Filter which GeocodeCache to delete.
     */
    where: GeocodeCacheWhereUniqueInput
  }

  /**
   * GeocodeCache deleteMany
   */
  export type GeocodeCacheDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GeocodeCaches to delete
     */
    where?: GeocodeCacheWhereInput
    /**
     * Limit how many GeocodeCaches to delete.
     */
    limit?: number
  }

  /**
   * GeocodeCache without action
   */
  export type GeocodeCacheDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeocodeCache
     */
    select?: GeocodeCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GeocodeCache
     */
    omit?: GeocodeCacheOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const EstablishmentScalarFieldEnum: {
    id: 'id',
    name: 'name',
    address: 'address',
    lat: 'lat',
    lng: 'lng',
    createdAt: 'createdAt'
  };

  export type EstablishmentScalarFieldEnum = (typeof EstablishmentScalarFieldEnum)[keyof typeof EstablishmentScalarFieldEnum]


  export const UserScalarFieldEnum: {
    id: 'id',
    establishmentId: 'establishmentId',
    email: 'email',
    name: 'name',
    passwordHash: 'passwordHash',
    createdAt: 'createdAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const CourierScalarFieldEnum: {
    id: 'id',
    establishmentId: 'establishmentId',
    name: 'name',
    phone: 'phone',
    active: 'active',
    createdAt: 'createdAt'
  };

  export type CourierScalarFieldEnum = (typeof CourierScalarFieldEnum)[keyof typeof CourierScalarFieldEnum]


  export const OrderScalarFieldEnum: {
    id: 'id',
    establishmentId: 'establishmentId',
    source: 'source',
    externalId: 'externalId',
    customerName: 'customerName',
    customerPhone: 'customerPhone',
    address: 'address',
    reference: 'reference',
    lat: 'lat',
    lng: 'lng',
    amountCents: 'amountCents',
    notes: 'notes',
    status: 'status',
    trackingToken: 'trackingToken',
    routeId: 'routeId',
    createdAt: 'createdAt',
    deliveredAt: 'deliveredAt'
  };

  export type OrderScalarFieldEnum = (typeof OrderScalarFieldEnum)[keyof typeof OrderScalarFieldEnum]


  export const RouteScalarFieldEnum: {
    id: 'id',
    establishmentId: 'establishmentId',
    courierId: 'courierId',
    status: 'status',
    accessToken: 'accessToken',
    geometry: 'geometry',
    distanceMeters: 'distanceMeters',
    durationSeconds: 'durationSeconds',
    baselineDurationSeconds: 'baselineDurationSeconds',
    createdAt: 'createdAt',
    startedAt: 'startedAt',
    finishedAt: 'finishedAt'
  };

  export type RouteScalarFieldEnum = (typeof RouteScalarFieldEnum)[keyof typeof RouteScalarFieldEnum]


  export const RouteStopScalarFieldEnum: {
    id: 'id',
    routeId: 'routeId',
    orderId: 'orderId',
    position: 'position',
    status: 'status',
    etaSeconds: 'etaSeconds',
    legDistanceMeters: 'legDistanceMeters',
    resolvedAt: 'resolvedAt',
    failureReason: 'failureReason'
  };

  export type RouteStopScalarFieldEnum = (typeof RouteStopScalarFieldEnum)[keyof typeof RouteStopScalarFieldEnum]


  export const CourierPingScalarFieldEnum: {
    id: 'id',
    routeId: 'routeId',
    lat: 'lat',
    lng: 'lng',
    recordedAt: 'recordedAt'
  };

  export type CourierPingScalarFieldEnum = (typeof CourierPingScalarFieldEnum)[keyof typeof CourierPingScalarFieldEnum]


  export const DomainEventLogScalarFieldEnum: {
    id: 'id',
    establishmentId: 'establishmentId',
    name: 'name',
    aggregateId: 'aggregateId',
    payload: 'payload',
    occurredAt: 'occurredAt'
  };

  export type DomainEventLogScalarFieldEnum = (typeof DomainEventLogScalarFieldEnum)[keyof typeof DomainEventLogScalarFieldEnum]


  export const GeocodeCacheScalarFieldEnum: {
    cacheKey: 'cacheKey',
    lat: 'lat',
    lng: 'lng',
    createdAt: 'createdAt'
  };

  export type GeocodeCacheScalarFieldEnum = (typeof GeocodeCacheScalarFieldEnum)[keyof typeof GeocodeCacheScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'OrderSourceKind'
   */
  export type EnumOrderSourceKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderSourceKind'>
    


  /**
   * Reference to a field of type 'OrderSourceKind[]'
   */
  export type ListEnumOrderSourceKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderSourceKind[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'OrderStatus'
   */
  export type EnumOrderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderStatus'>
    


  /**
   * Reference to a field of type 'OrderStatus[]'
   */
  export type ListEnumOrderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderStatus[]'>
    


  /**
   * Reference to a field of type 'RouteStatus'
   */
  export type EnumRouteStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RouteStatus'>
    


  /**
   * Reference to a field of type 'RouteStatus[]'
   */
  export type ListEnumRouteStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RouteStatus[]'>
    


  /**
   * Reference to a field of type 'StopStatus'
   */
  export type EnumStopStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StopStatus'>
    


  /**
   * Reference to a field of type 'StopStatus[]'
   */
  export type ListEnumStopStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StopStatus[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    
  /**
   * Deep Input Types
   */


  export type EstablishmentWhereInput = {
    AND?: EstablishmentWhereInput | EstablishmentWhereInput[]
    OR?: EstablishmentWhereInput[]
    NOT?: EstablishmentWhereInput | EstablishmentWhereInput[]
    id?: StringFilter<"Establishment"> | string
    name?: StringFilter<"Establishment"> | string
    address?: StringFilter<"Establishment"> | string
    lat?: FloatFilter<"Establishment"> | number
    lng?: FloatFilter<"Establishment"> | number
    createdAt?: DateTimeFilter<"Establishment"> | Date | string
    users?: UserListRelationFilter
    couriers?: CourierListRelationFilter
    orders?: OrderListRelationFilter
    routes?: RouteListRelationFilter
    events?: DomainEventLogListRelationFilter
  }

  export type EstablishmentOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    address?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
    users?: UserOrderByRelationAggregateInput
    couriers?: CourierOrderByRelationAggregateInput
    orders?: OrderOrderByRelationAggregateInput
    routes?: RouteOrderByRelationAggregateInput
    events?: DomainEventLogOrderByRelationAggregateInput
  }

  export type EstablishmentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: EstablishmentWhereInput | EstablishmentWhereInput[]
    OR?: EstablishmentWhereInput[]
    NOT?: EstablishmentWhereInput | EstablishmentWhereInput[]
    name?: StringFilter<"Establishment"> | string
    address?: StringFilter<"Establishment"> | string
    lat?: FloatFilter<"Establishment"> | number
    lng?: FloatFilter<"Establishment"> | number
    createdAt?: DateTimeFilter<"Establishment"> | Date | string
    users?: UserListRelationFilter
    couriers?: CourierListRelationFilter
    orders?: OrderListRelationFilter
    routes?: RouteListRelationFilter
    events?: DomainEventLogListRelationFilter
  }, "id">

  export type EstablishmentOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    address?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
    _count?: EstablishmentCountOrderByAggregateInput
    _avg?: EstablishmentAvgOrderByAggregateInput
    _max?: EstablishmentMaxOrderByAggregateInput
    _min?: EstablishmentMinOrderByAggregateInput
    _sum?: EstablishmentSumOrderByAggregateInput
  }

  export type EstablishmentScalarWhereWithAggregatesInput = {
    AND?: EstablishmentScalarWhereWithAggregatesInput | EstablishmentScalarWhereWithAggregatesInput[]
    OR?: EstablishmentScalarWhereWithAggregatesInput[]
    NOT?: EstablishmentScalarWhereWithAggregatesInput | EstablishmentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Establishment"> | string
    name?: StringWithAggregatesFilter<"Establishment"> | string
    address?: StringWithAggregatesFilter<"Establishment"> | string
    lat?: FloatWithAggregatesFilter<"Establishment"> | number
    lng?: FloatWithAggregatesFilter<"Establishment"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Establishment"> | Date | string
  }

  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    establishmentId?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    email?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    createdAt?: SortOrder
    establishment?: EstablishmentOrderByWithRelationInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    establishmentId?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    email?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    createdAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    establishmentId?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type CourierWhereInput = {
    AND?: CourierWhereInput | CourierWhereInput[]
    OR?: CourierWhereInput[]
    NOT?: CourierWhereInput | CourierWhereInput[]
    id?: StringFilter<"Courier"> | string
    establishmentId?: StringFilter<"Courier"> | string
    name?: StringFilter<"Courier"> | string
    phone?: StringFilter<"Courier"> | string
    active?: BoolFilter<"Courier"> | boolean
    createdAt?: DateTimeFilter<"Courier"> | Date | string
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
    routes?: RouteListRelationFilter
  }

  export type CourierOrderByWithRelationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    phone?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    establishment?: EstablishmentOrderByWithRelationInput
    routes?: RouteOrderByRelationAggregateInput
  }

  export type CourierWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CourierWhereInput | CourierWhereInput[]
    OR?: CourierWhereInput[]
    NOT?: CourierWhereInput | CourierWhereInput[]
    establishmentId?: StringFilter<"Courier"> | string
    name?: StringFilter<"Courier"> | string
    phone?: StringFilter<"Courier"> | string
    active?: BoolFilter<"Courier"> | boolean
    createdAt?: DateTimeFilter<"Courier"> | Date | string
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
    routes?: RouteListRelationFilter
  }, "id">

  export type CourierOrderByWithAggregationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    phone?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    _count?: CourierCountOrderByAggregateInput
    _max?: CourierMaxOrderByAggregateInput
    _min?: CourierMinOrderByAggregateInput
  }

  export type CourierScalarWhereWithAggregatesInput = {
    AND?: CourierScalarWhereWithAggregatesInput | CourierScalarWhereWithAggregatesInput[]
    OR?: CourierScalarWhereWithAggregatesInput[]
    NOT?: CourierScalarWhereWithAggregatesInput | CourierScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Courier"> | string
    establishmentId?: StringWithAggregatesFilter<"Courier"> | string
    name?: StringWithAggregatesFilter<"Courier"> | string
    phone?: StringWithAggregatesFilter<"Courier"> | string
    active?: BoolWithAggregatesFilter<"Courier"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Courier"> | Date | string
  }

  export type OrderWhereInput = {
    AND?: OrderWhereInput | OrderWhereInput[]
    OR?: OrderWhereInput[]
    NOT?: OrderWhereInput | OrderWhereInput[]
    id?: StringFilter<"Order"> | string
    establishmentId?: StringFilter<"Order"> | string
    source?: EnumOrderSourceKindFilter<"Order"> | $Enums.OrderSourceKind
    externalId?: StringNullableFilter<"Order"> | string | null
    customerName?: StringFilter<"Order"> | string
    customerPhone?: StringNullableFilter<"Order"> | string | null
    address?: StringFilter<"Order"> | string
    reference?: StringNullableFilter<"Order"> | string | null
    lat?: FloatNullableFilter<"Order"> | number | null
    lng?: FloatNullableFilter<"Order"> | number | null
    amountCents?: IntFilter<"Order"> | number
    notes?: StringNullableFilter<"Order"> | string | null
    status?: EnumOrderStatusFilter<"Order"> | $Enums.OrderStatus
    trackingToken?: StringFilter<"Order"> | string
    routeId?: StringNullableFilter<"Order"> | string | null
    createdAt?: DateTimeFilter<"Order"> | Date | string
    deliveredAt?: DateTimeNullableFilter<"Order"> | Date | string | null
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
    stop?: XOR<RouteStopNullableScalarRelationFilter, RouteStopWhereInput> | null
  }

  export type OrderOrderByWithRelationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    source?: SortOrder
    externalId?: SortOrderInput | SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrderInput | SortOrder
    address?: SortOrder
    reference?: SortOrderInput | SortOrder
    lat?: SortOrderInput | SortOrder
    lng?: SortOrderInput | SortOrder
    amountCents?: SortOrder
    notes?: SortOrderInput | SortOrder
    status?: SortOrder
    trackingToken?: SortOrder
    routeId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    deliveredAt?: SortOrderInput | SortOrder
    establishment?: EstablishmentOrderByWithRelationInput
    stop?: RouteStopOrderByWithRelationInput
  }

  export type OrderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    trackingToken?: string
    establishmentId_source_externalId?: OrderEstablishmentIdSourceExternalIdCompoundUniqueInput
    AND?: OrderWhereInput | OrderWhereInput[]
    OR?: OrderWhereInput[]
    NOT?: OrderWhereInput | OrderWhereInput[]
    establishmentId?: StringFilter<"Order"> | string
    source?: EnumOrderSourceKindFilter<"Order"> | $Enums.OrderSourceKind
    externalId?: StringNullableFilter<"Order"> | string | null
    customerName?: StringFilter<"Order"> | string
    customerPhone?: StringNullableFilter<"Order"> | string | null
    address?: StringFilter<"Order"> | string
    reference?: StringNullableFilter<"Order"> | string | null
    lat?: FloatNullableFilter<"Order"> | number | null
    lng?: FloatNullableFilter<"Order"> | number | null
    amountCents?: IntFilter<"Order"> | number
    notes?: StringNullableFilter<"Order"> | string | null
    status?: EnumOrderStatusFilter<"Order"> | $Enums.OrderStatus
    routeId?: StringNullableFilter<"Order"> | string | null
    createdAt?: DateTimeFilter<"Order"> | Date | string
    deliveredAt?: DateTimeNullableFilter<"Order"> | Date | string | null
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
    stop?: XOR<RouteStopNullableScalarRelationFilter, RouteStopWhereInput> | null
  }, "id" | "trackingToken" | "establishmentId_source_externalId">

  export type OrderOrderByWithAggregationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    source?: SortOrder
    externalId?: SortOrderInput | SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrderInput | SortOrder
    address?: SortOrder
    reference?: SortOrderInput | SortOrder
    lat?: SortOrderInput | SortOrder
    lng?: SortOrderInput | SortOrder
    amountCents?: SortOrder
    notes?: SortOrderInput | SortOrder
    status?: SortOrder
    trackingToken?: SortOrder
    routeId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    deliveredAt?: SortOrderInput | SortOrder
    _count?: OrderCountOrderByAggregateInput
    _avg?: OrderAvgOrderByAggregateInput
    _max?: OrderMaxOrderByAggregateInput
    _min?: OrderMinOrderByAggregateInput
    _sum?: OrderSumOrderByAggregateInput
  }

  export type OrderScalarWhereWithAggregatesInput = {
    AND?: OrderScalarWhereWithAggregatesInput | OrderScalarWhereWithAggregatesInput[]
    OR?: OrderScalarWhereWithAggregatesInput[]
    NOT?: OrderScalarWhereWithAggregatesInput | OrderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Order"> | string
    establishmentId?: StringWithAggregatesFilter<"Order"> | string
    source?: EnumOrderSourceKindWithAggregatesFilter<"Order"> | $Enums.OrderSourceKind
    externalId?: StringNullableWithAggregatesFilter<"Order"> | string | null
    customerName?: StringWithAggregatesFilter<"Order"> | string
    customerPhone?: StringNullableWithAggregatesFilter<"Order"> | string | null
    address?: StringWithAggregatesFilter<"Order"> | string
    reference?: StringNullableWithAggregatesFilter<"Order"> | string | null
    lat?: FloatNullableWithAggregatesFilter<"Order"> | number | null
    lng?: FloatNullableWithAggregatesFilter<"Order"> | number | null
    amountCents?: IntWithAggregatesFilter<"Order"> | number
    notes?: StringNullableWithAggregatesFilter<"Order"> | string | null
    status?: EnumOrderStatusWithAggregatesFilter<"Order"> | $Enums.OrderStatus
    trackingToken?: StringWithAggregatesFilter<"Order"> | string
    routeId?: StringNullableWithAggregatesFilter<"Order"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Order"> | Date | string
    deliveredAt?: DateTimeNullableWithAggregatesFilter<"Order"> | Date | string | null
  }

  export type RouteWhereInput = {
    AND?: RouteWhereInput | RouteWhereInput[]
    OR?: RouteWhereInput[]
    NOT?: RouteWhereInput | RouteWhereInput[]
    id?: StringFilter<"Route"> | string
    establishmentId?: StringFilter<"Route"> | string
    courierId?: StringFilter<"Route"> | string
    status?: EnumRouteStatusFilter<"Route"> | $Enums.RouteStatus
    accessToken?: StringFilter<"Route"> | string
    geometry?: StringNullableFilter<"Route"> | string | null
    distanceMeters?: IntFilter<"Route"> | number
    durationSeconds?: IntFilter<"Route"> | number
    baselineDurationSeconds?: IntFilter<"Route"> | number
    createdAt?: DateTimeFilter<"Route"> | Date | string
    startedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    finishedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
    courier?: XOR<CourierScalarRelationFilter, CourierWhereInput>
    stops?: RouteStopListRelationFilter
    pings?: CourierPingListRelationFilter
  }

  export type RouteOrderByWithRelationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    courierId?: SortOrder
    status?: SortOrder
    accessToken?: SortOrder
    geometry?: SortOrderInput | SortOrder
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
    createdAt?: SortOrder
    startedAt?: SortOrderInput | SortOrder
    finishedAt?: SortOrderInput | SortOrder
    establishment?: EstablishmentOrderByWithRelationInput
    courier?: CourierOrderByWithRelationInput
    stops?: RouteStopOrderByRelationAggregateInput
    pings?: CourierPingOrderByRelationAggregateInput
  }

  export type RouteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    accessToken?: string
    AND?: RouteWhereInput | RouteWhereInput[]
    OR?: RouteWhereInput[]
    NOT?: RouteWhereInput | RouteWhereInput[]
    establishmentId?: StringFilter<"Route"> | string
    courierId?: StringFilter<"Route"> | string
    status?: EnumRouteStatusFilter<"Route"> | $Enums.RouteStatus
    geometry?: StringNullableFilter<"Route"> | string | null
    distanceMeters?: IntFilter<"Route"> | number
    durationSeconds?: IntFilter<"Route"> | number
    baselineDurationSeconds?: IntFilter<"Route"> | number
    createdAt?: DateTimeFilter<"Route"> | Date | string
    startedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    finishedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
    courier?: XOR<CourierScalarRelationFilter, CourierWhereInput>
    stops?: RouteStopListRelationFilter
    pings?: CourierPingListRelationFilter
  }, "id" | "accessToken">

  export type RouteOrderByWithAggregationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    courierId?: SortOrder
    status?: SortOrder
    accessToken?: SortOrder
    geometry?: SortOrderInput | SortOrder
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
    createdAt?: SortOrder
    startedAt?: SortOrderInput | SortOrder
    finishedAt?: SortOrderInput | SortOrder
    _count?: RouteCountOrderByAggregateInput
    _avg?: RouteAvgOrderByAggregateInput
    _max?: RouteMaxOrderByAggregateInput
    _min?: RouteMinOrderByAggregateInput
    _sum?: RouteSumOrderByAggregateInput
  }

  export type RouteScalarWhereWithAggregatesInput = {
    AND?: RouteScalarWhereWithAggregatesInput | RouteScalarWhereWithAggregatesInput[]
    OR?: RouteScalarWhereWithAggregatesInput[]
    NOT?: RouteScalarWhereWithAggregatesInput | RouteScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Route"> | string
    establishmentId?: StringWithAggregatesFilter<"Route"> | string
    courierId?: StringWithAggregatesFilter<"Route"> | string
    status?: EnumRouteStatusWithAggregatesFilter<"Route"> | $Enums.RouteStatus
    accessToken?: StringWithAggregatesFilter<"Route"> | string
    geometry?: StringNullableWithAggregatesFilter<"Route"> | string | null
    distanceMeters?: IntWithAggregatesFilter<"Route"> | number
    durationSeconds?: IntWithAggregatesFilter<"Route"> | number
    baselineDurationSeconds?: IntWithAggregatesFilter<"Route"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Route"> | Date | string
    startedAt?: DateTimeNullableWithAggregatesFilter<"Route"> | Date | string | null
    finishedAt?: DateTimeNullableWithAggregatesFilter<"Route"> | Date | string | null
  }

  export type RouteStopWhereInput = {
    AND?: RouteStopWhereInput | RouteStopWhereInput[]
    OR?: RouteStopWhereInput[]
    NOT?: RouteStopWhereInput | RouteStopWhereInput[]
    id?: StringFilter<"RouteStop"> | string
    routeId?: StringFilter<"RouteStop"> | string
    orderId?: StringFilter<"RouteStop"> | string
    position?: IntFilter<"RouteStop"> | number
    status?: EnumStopStatusFilter<"RouteStop"> | $Enums.StopStatus
    etaSeconds?: IntFilter<"RouteStop"> | number
    legDistanceMeters?: IntFilter<"RouteStop"> | number
    resolvedAt?: DateTimeNullableFilter<"RouteStop"> | Date | string | null
    failureReason?: StringNullableFilter<"RouteStop"> | string | null
    route?: XOR<RouteScalarRelationFilter, RouteWhereInput>
    order?: XOR<OrderScalarRelationFilter, OrderWhereInput>
  }

  export type RouteStopOrderByWithRelationInput = {
    id?: SortOrder
    routeId?: SortOrder
    orderId?: SortOrder
    position?: SortOrder
    status?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
    resolvedAt?: SortOrderInput | SortOrder
    failureReason?: SortOrderInput | SortOrder
    route?: RouteOrderByWithRelationInput
    order?: OrderOrderByWithRelationInput
  }

  export type RouteStopWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    orderId?: string
    routeId_position?: RouteStopRouteIdPositionCompoundUniqueInput
    AND?: RouteStopWhereInput | RouteStopWhereInput[]
    OR?: RouteStopWhereInput[]
    NOT?: RouteStopWhereInput | RouteStopWhereInput[]
    routeId?: StringFilter<"RouteStop"> | string
    position?: IntFilter<"RouteStop"> | number
    status?: EnumStopStatusFilter<"RouteStop"> | $Enums.StopStatus
    etaSeconds?: IntFilter<"RouteStop"> | number
    legDistanceMeters?: IntFilter<"RouteStop"> | number
    resolvedAt?: DateTimeNullableFilter<"RouteStop"> | Date | string | null
    failureReason?: StringNullableFilter<"RouteStop"> | string | null
    route?: XOR<RouteScalarRelationFilter, RouteWhereInput>
    order?: XOR<OrderScalarRelationFilter, OrderWhereInput>
  }, "id" | "orderId" | "routeId_position">

  export type RouteStopOrderByWithAggregationInput = {
    id?: SortOrder
    routeId?: SortOrder
    orderId?: SortOrder
    position?: SortOrder
    status?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
    resolvedAt?: SortOrderInput | SortOrder
    failureReason?: SortOrderInput | SortOrder
    _count?: RouteStopCountOrderByAggregateInput
    _avg?: RouteStopAvgOrderByAggregateInput
    _max?: RouteStopMaxOrderByAggregateInput
    _min?: RouteStopMinOrderByAggregateInput
    _sum?: RouteStopSumOrderByAggregateInput
  }

  export type RouteStopScalarWhereWithAggregatesInput = {
    AND?: RouteStopScalarWhereWithAggregatesInput | RouteStopScalarWhereWithAggregatesInput[]
    OR?: RouteStopScalarWhereWithAggregatesInput[]
    NOT?: RouteStopScalarWhereWithAggregatesInput | RouteStopScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RouteStop"> | string
    routeId?: StringWithAggregatesFilter<"RouteStop"> | string
    orderId?: StringWithAggregatesFilter<"RouteStop"> | string
    position?: IntWithAggregatesFilter<"RouteStop"> | number
    status?: EnumStopStatusWithAggregatesFilter<"RouteStop"> | $Enums.StopStatus
    etaSeconds?: IntWithAggregatesFilter<"RouteStop"> | number
    legDistanceMeters?: IntWithAggregatesFilter<"RouteStop"> | number
    resolvedAt?: DateTimeNullableWithAggregatesFilter<"RouteStop"> | Date | string | null
    failureReason?: StringNullableWithAggregatesFilter<"RouteStop"> | string | null
  }

  export type CourierPingWhereInput = {
    AND?: CourierPingWhereInput | CourierPingWhereInput[]
    OR?: CourierPingWhereInput[]
    NOT?: CourierPingWhereInput | CourierPingWhereInput[]
    id?: StringFilter<"CourierPing"> | string
    routeId?: StringFilter<"CourierPing"> | string
    lat?: FloatFilter<"CourierPing"> | number
    lng?: FloatFilter<"CourierPing"> | number
    recordedAt?: DateTimeFilter<"CourierPing"> | Date | string
    route?: XOR<RouteScalarRelationFilter, RouteWhereInput>
  }

  export type CourierPingOrderByWithRelationInput = {
    id?: SortOrder
    routeId?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    recordedAt?: SortOrder
    route?: RouteOrderByWithRelationInput
  }

  export type CourierPingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CourierPingWhereInput | CourierPingWhereInput[]
    OR?: CourierPingWhereInput[]
    NOT?: CourierPingWhereInput | CourierPingWhereInput[]
    routeId?: StringFilter<"CourierPing"> | string
    lat?: FloatFilter<"CourierPing"> | number
    lng?: FloatFilter<"CourierPing"> | number
    recordedAt?: DateTimeFilter<"CourierPing"> | Date | string
    route?: XOR<RouteScalarRelationFilter, RouteWhereInput>
  }, "id">

  export type CourierPingOrderByWithAggregationInput = {
    id?: SortOrder
    routeId?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    recordedAt?: SortOrder
    _count?: CourierPingCountOrderByAggregateInput
    _avg?: CourierPingAvgOrderByAggregateInput
    _max?: CourierPingMaxOrderByAggregateInput
    _min?: CourierPingMinOrderByAggregateInput
    _sum?: CourierPingSumOrderByAggregateInput
  }

  export type CourierPingScalarWhereWithAggregatesInput = {
    AND?: CourierPingScalarWhereWithAggregatesInput | CourierPingScalarWhereWithAggregatesInput[]
    OR?: CourierPingScalarWhereWithAggregatesInput[]
    NOT?: CourierPingScalarWhereWithAggregatesInput | CourierPingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CourierPing"> | string
    routeId?: StringWithAggregatesFilter<"CourierPing"> | string
    lat?: FloatWithAggregatesFilter<"CourierPing"> | number
    lng?: FloatWithAggregatesFilter<"CourierPing"> | number
    recordedAt?: DateTimeWithAggregatesFilter<"CourierPing"> | Date | string
  }

  export type DomainEventLogWhereInput = {
    AND?: DomainEventLogWhereInput | DomainEventLogWhereInput[]
    OR?: DomainEventLogWhereInput[]
    NOT?: DomainEventLogWhereInput | DomainEventLogWhereInput[]
    id?: StringFilter<"DomainEventLog"> | string
    establishmentId?: StringFilter<"DomainEventLog"> | string
    name?: StringFilter<"DomainEventLog"> | string
    aggregateId?: StringFilter<"DomainEventLog"> | string
    payload?: JsonFilter<"DomainEventLog">
    occurredAt?: DateTimeFilter<"DomainEventLog"> | Date | string
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
  }

  export type DomainEventLogOrderByWithRelationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    aggregateId?: SortOrder
    payload?: SortOrder
    occurredAt?: SortOrder
    establishment?: EstablishmentOrderByWithRelationInput
  }

  export type DomainEventLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: DomainEventLogWhereInput | DomainEventLogWhereInput[]
    OR?: DomainEventLogWhereInput[]
    NOT?: DomainEventLogWhereInput | DomainEventLogWhereInput[]
    establishmentId?: StringFilter<"DomainEventLog"> | string
    name?: StringFilter<"DomainEventLog"> | string
    aggregateId?: StringFilter<"DomainEventLog"> | string
    payload?: JsonFilter<"DomainEventLog">
    occurredAt?: DateTimeFilter<"DomainEventLog"> | Date | string
    establishment?: XOR<EstablishmentScalarRelationFilter, EstablishmentWhereInput>
  }, "id">

  export type DomainEventLogOrderByWithAggregationInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    aggregateId?: SortOrder
    payload?: SortOrder
    occurredAt?: SortOrder
    _count?: DomainEventLogCountOrderByAggregateInput
    _max?: DomainEventLogMaxOrderByAggregateInput
    _min?: DomainEventLogMinOrderByAggregateInput
  }

  export type DomainEventLogScalarWhereWithAggregatesInput = {
    AND?: DomainEventLogScalarWhereWithAggregatesInput | DomainEventLogScalarWhereWithAggregatesInput[]
    OR?: DomainEventLogScalarWhereWithAggregatesInput[]
    NOT?: DomainEventLogScalarWhereWithAggregatesInput | DomainEventLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"DomainEventLog"> | string
    establishmentId?: StringWithAggregatesFilter<"DomainEventLog"> | string
    name?: StringWithAggregatesFilter<"DomainEventLog"> | string
    aggregateId?: StringWithAggregatesFilter<"DomainEventLog"> | string
    payload?: JsonWithAggregatesFilter<"DomainEventLog">
    occurredAt?: DateTimeWithAggregatesFilter<"DomainEventLog"> | Date | string
  }

  export type GeocodeCacheWhereInput = {
    AND?: GeocodeCacheWhereInput | GeocodeCacheWhereInput[]
    OR?: GeocodeCacheWhereInput[]
    NOT?: GeocodeCacheWhereInput | GeocodeCacheWhereInput[]
    cacheKey?: StringFilter<"GeocodeCache"> | string
    lat?: FloatFilter<"GeocodeCache"> | number
    lng?: FloatFilter<"GeocodeCache"> | number
    createdAt?: DateTimeFilter<"GeocodeCache"> | Date | string
  }

  export type GeocodeCacheOrderByWithRelationInput = {
    cacheKey?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type GeocodeCacheWhereUniqueInput = Prisma.AtLeast<{
    cacheKey?: string
    AND?: GeocodeCacheWhereInput | GeocodeCacheWhereInput[]
    OR?: GeocodeCacheWhereInput[]
    NOT?: GeocodeCacheWhereInput | GeocodeCacheWhereInput[]
    lat?: FloatFilter<"GeocodeCache"> | number
    lng?: FloatFilter<"GeocodeCache"> | number
    createdAt?: DateTimeFilter<"GeocodeCache"> | Date | string
  }, "cacheKey">

  export type GeocodeCacheOrderByWithAggregationInput = {
    cacheKey?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
    _count?: GeocodeCacheCountOrderByAggregateInput
    _avg?: GeocodeCacheAvgOrderByAggregateInput
    _max?: GeocodeCacheMaxOrderByAggregateInput
    _min?: GeocodeCacheMinOrderByAggregateInput
    _sum?: GeocodeCacheSumOrderByAggregateInput
  }

  export type GeocodeCacheScalarWhereWithAggregatesInput = {
    AND?: GeocodeCacheScalarWhereWithAggregatesInput | GeocodeCacheScalarWhereWithAggregatesInput[]
    OR?: GeocodeCacheScalarWhereWithAggregatesInput[]
    NOT?: GeocodeCacheScalarWhereWithAggregatesInput | GeocodeCacheScalarWhereWithAggregatesInput[]
    cacheKey?: StringWithAggregatesFilter<"GeocodeCache"> | string
    lat?: FloatWithAggregatesFilter<"GeocodeCache"> | number
    lng?: FloatWithAggregatesFilter<"GeocodeCache"> | number
    createdAt?: DateTimeWithAggregatesFilter<"GeocodeCache"> | Date | string
  }

  export type EstablishmentCreateInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierCreateNestedManyWithoutEstablishmentInput
    orders?: OrderCreateNestedManyWithoutEstablishmentInput
    routes?: RouteCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUncheckedCreateInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierUncheckedCreateNestedManyWithoutEstablishmentInput
    orders?: OrderUncheckedCreateNestedManyWithoutEstablishmentInput
    routes?: RouteUncheckedCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogUncheckedCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUncheckedUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUncheckedUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUncheckedUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUncheckedUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentCreateManyInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
  }

  export type EstablishmentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EstablishmentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    name: string
    passwordHash: string
    createdAt?: Date | string
    establishment: EstablishmentCreateNestedOneWithoutUsersInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    establishmentId: string
    email: string
    name: string
    passwordHash: string
    createdAt?: Date | string
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    establishment?: EstablishmentUpdateOneRequiredWithoutUsersNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateManyInput = {
    id?: string
    establishmentId: string
    email: string
    name: string
    passwordHash: string
    createdAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierCreateInput = {
    id?: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
    establishment: EstablishmentCreateNestedOneWithoutCouriersInput
    routes?: RouteCreateNestedManyWithoutCourierInput
  }

  export type CourierUncheckedCreateInput = {
    id?: string
    establishmentId: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
    routes?: RouteUncheckedCreateNestedManyWithoutCourierInput
  }

  export type CourierUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    establishment?: EstablishmentUpdateOneRequiredWithoutCouriersNestedInput
    routes?: RouteUpdateManyWithoutCourierNestedInput
  }

  export type CourierUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routes?: RouteUncheckedUpdateManyWithoutCourierNestedInput
  }

  export type CourierCreateManyInput = {
    id?: string
    establishmentId: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
  }

  export type CourierUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderCreateInput = {
    id?: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
    establishment: EstablishmentCreateNestedOneWithoutOrdersInput
    stop?: RouteStopCreateNestedOneWithoutOrderInput
  }

  export type OrderUncheckedCreateInput = {
    id?: string
    establishmentId: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
    stop?: RouteStopUncheckedCreateNestedOneWithoutOrderInput
  }

  export type OrderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    establishment?: EstablishmentUpdateOneRequiredWithoutOrdersNestedInput
    stop?: RouteStopUpdateOneWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stop?: RouteStopUncheckedUpdateOneWithoutOrderNestedInput
  }

  export type OrderCreateManyInput = {
    id?: string
    establishmentId: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
  }

  export type OrderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OrderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RouteCreateInput = {
    id?: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    establishment: EstablishmentCreateNestedOneWithoutRoutesInput
    courier: CourierCreateNestedOneWithoutRoutesInput
    stops?: RouteStopCreateNestedManyWithoutRouteInput
    pings?: CourierPingCreateNestedManyWithoutRouteInput
  }

  export type RouteUncheckedCreateInput = {
    id?: string
    establishmentId: string
    courierId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    stops?: RouteStopUncheckedCreateNestedManyWithoutRouteInput
    pings?: CourierPingUncheckedCreateNestedManyWithoutRouteInput
  }

  export type RouteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    establishment?: EstablishmentUpdateOneRequiredWithoutRoutesNestedInput
    courier?: CourierUpdateOneRequiredWithoutRoutesNestedInput
    stops?: RouteStopUpdateManyWithoutRouteNestedInput
    pings?: CourierPingUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    courierId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stops?: RouteStopUncheckedUpdateManyWithoutRouteNestedInput
    pings?: CourierPingUncheckedUpdateManyWithoutRouteNestedInput
  }

  export type RouteCreateManyInput = {
    id?: string
    establishmentId: string
    courierId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
  }

  export type RouteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RouteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    courierId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RouteStopCreateInput = {
    id?: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
    route: RouteCreateNestedOneWithoutStopsInput
    order: OrderCreateNestedOneWithoutStopInput
  }

  export type RouteStopUncheckedCreateInput = {
    id?: string
    routeId: string
    orderId: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
  }

  export type RouteStopUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
    route?: RouteUpdateOneRequiredWithoutStopsNestedInput
    order?: OrderUpdateOneRequiredWithoutStopNestedInput
  }

  export type RouteStopUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    routeId?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RouteStopCreateManyInput = {
    id?: string
    routeId: string
    orderId: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
  }

  export type RouteStopUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RouteStopUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    routeId?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CourierPingCreateInput = {
    id?: string
    lat: number
    lng: number
    recordedAt: Date | string
    route: RouteCreateNestedOneWithoutPingsInput
  }

  export type CourierPingUncheckedCreateInput = {
    id?: string
    routeId: string
    lat: number
    lng: number
    recordedAt: Date | string
  }

  export type CourierPingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    route?: RouteUpdateOneRequiredWithoutPingsNestedInput
  }

  export type CourierPingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    routeId?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierPingCreateManyInput = {
    id?: string
    routeId: string
    lat: number
    lng: number
    recordedAt: Date | string
  }

  export type CourierPingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierPingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    routeId?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DomainEventLogCreateInput = {
    id?: string
    name: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    occurredAt: Date | string
    establishment: EstablishmentCreateNestedOneWithoutEventsInput
  }

  export type DomainEventLogUncheckedCreateInput = {
    id?: string
    establishmentId: string
    name: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    occurredAt: Date | string
  }

  export type DomainEventLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    establishment?: EstablishmentUpdateOneRequiredWithoutEventsNestedInput
  }

  export type DomainEventLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DomainEventLogCreateManyInput = {
    id?: string
    establishmentId: string
    name: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    occurredAt: Date | string
  }

  export type DomainEventLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DomainEventLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeocodeCacheCreateInput = {
    cacheKey: string
    lat: number
    lng: number
    createdAt?: Date | string
  }

  export type GeocodeCacheUncheckedCreateInput = {
    cacheKey: string
    lat: number
    lng: number
    createdAt?: Date | string
  }

  export type GeocodeCacheUpdateInput = {
    cacheKey?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeocodeCacheUncheckedUpdateInput = {
    cacheKey?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeocodeCacheCreateManyInput = {
    cacheKey: string
    lat: number
    lng: number
    createdAt?: Date | string
  }

  export type GeocodeCacheUpdateManyMutationInput = {
    cacheKey?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeocodeCacheUncheckedUpdateManyInput = {
    cacheKey?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type UserListRelationFilter = {
    every?: UserWhereInput
    some?: UserWhereInput
    none?: UserWhereInput
  }

  export type CourierListRelationFilter = {
    every?: CourierWhereInput
    some?: CourierWhereInput
    none?: CourierWhereInput
  }

  export type OrderListRelationFilter = {
    every?: OrderWhereInput
    some?: OrderWhereInput
    none?: OrderWhereInput
  }

  export type RouteListRelationFilter = {
    every?: RouteWhereInput
    some?: RouteWhereInput
    none?: RouteWhereInput
  }

  export type DomainEventLogListRelationFilter = {
    every?: DomainEventLogWhereInput
    some?: DomainEventLogWhereInput
    none?: DomainEventLogWhereInput
  }

  export type UserOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CourierOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrderOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RouteOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DomainEventLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EstablishmentCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    address?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type EstablishmentAvgOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
  }

  export type EstablishmentMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    address?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type EstablishmentMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    address?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type EstablishmentSumOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EstablishmentScalarRelationFilter = {
    is?: EstablishmentWhereInput
    isNot?: EstablishmentWhereInput
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    email?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    email?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    email?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    createdAt?: SortOrder
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type CourierCountOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    phone?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type CourierMaxOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    phone?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type CourierMinOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    phone?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumOrderSourceKindFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderSourceKind | EnumOrderSourceKindFieldRefInput<$PrismaModel>
    in?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderSourceKindFilter<$PrismaModel> | $Enums.OrderSourceKind
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type EnumOrderStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderStatus | EnumOrderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderStatusFilter<$PrismaModel> | $Enums.OrderStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type RouteStopNullableScalarRelationFilter = {
    is?: RouteStopWhereInput | null
    isNot?: RouteStopWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type OrderEstablishmentIdSourceExternalIdCompoundUniqueInput = {
    establishmentId: string
    source: $Enums.OrderSourceKind
    externalId: string
  }

  export type OrderCountOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    source?: SortOrder
    externalId?: SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrder
    address?: SortOrder
    reference?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    amountCents?: SortOrder
    notes?: SortOrder
    status?: SortOrder
    trackingToken?: SortOrder
    routeId?: SortOrder
    createdAt?: SortOrder
    deliveredAt?: SortOrder
  }

  export type OrderAvgOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
    amountCents?: SortOrder
  }

  export type OrderMaxOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    source?: SortOrder
    externalId?: SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrder
    address?: SortOrder
    reference?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    amountCents?: SortOrder
    notes?: SortOrder
    status?: SortOrder
    trackingToken?: SortOrder
    routeId?: SortOrder
    createdAt?: SortOrder
    deliveredAt?: SortOrder
  }

  export type OrderMinOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    source?: SortOrder
    externalId?: SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrder
    address?: SortOrder
    reference?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    amountCents?: SortOrder
    notes?: SortOrder
    status?: SortOrder
    trackingToken?: SortOrder
    routeId?: SortOrder
    createdAt?: SortOrder
    deliveredAt?: SortOrder
  }

  export type OrderSumOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
    amountCents?: SortOrder
  }

  export type EnumOrderSourceKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderSourceKind | EnumOrderSourceKindFieldRefInput<$PrismaModel>
    in?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderSourceKindWithAggregatesFilter<$PrismaModel> | $Enums.OrderSourceKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrderSourceKindFilter<$PrismaModel>
    _max?: NestedEnumOrderSourceKindFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumOrderStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderStatus | EnumOrderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderStatusWithAggregatesFilter<$PrismaModel> | $Enums.OrderStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrderStatusFilter<$PrismaModel>
    _max?: NestedEnumOrderStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumRouteStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RouteStatus | EnumRouteStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRouteStatusFilter<$PrismaModel> | $Enums.RouteStatus
  }

  export type CourierScalarRelationFilter = {
    is?: CourierWhereInput
    isNot?: CourierWhereInput
  }

  export type RouteStopListRelationFilter = {
    every?: RouteStopWhereInput
    some?: RouteStopWhereInput
    none?: RouteStopWhereInput
  }

  export type CourierPingListRelationFilter = {
    every?: CourierPingWhereInput
    some?: CourierPingWhereInput
    none?: CourierPingWhereInput
  }

  export type RouteStopOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CourierPingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RouteCountOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    courierId?: SortOrder
    status?: SortOrder
    accessToken?: SortOrder
    geometry?: SortOrder
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
    createdAt?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
  }

  export type RouteAvgOrderByAggregateInput = {
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
  }

  export type RouteMaxOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    courierId?: SortOrder
    status?: SortOrder
    accessToken?: SortOrder
    geometry?: SortOrder
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
    createdAt?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
  }

  export type RouteMinOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    courierId?: SortOrder
    status?: SortOrder
    accessToken?: SortOrder
    geometry?: SortOrder
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
    createdAt?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
  }

  export type RouteSumOrderByAggregateInput = {
    distanceMeters?: SortOrder
    durationSeconds?: SortOrder
    baselineDurationSeconds?: SortOrder
  }

  export type EnumRouteStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RouteStatus | EnumRouteStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRouteStatusWithAggregatesFilter<$PrismaModel> | $Enums.RouteStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRouteStatusFilter<$PrismaModel>
    _max?: NestedEnumRouteStatusFilter<$PrismaModel>
  }

  export type EnumStopStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.StopStatus | EnumStopStatusFieldRefInput<$PrismaModel>
    in?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumStopStatusFilter<$PrismaModel> | $Enums.StopStatus
  }

  export type RouteScalarRelationFilter = {
    is?: RouteWhereInput
    isNot?: RouteWhereInput
  }

  export type OrderScalarRelationFilter = {
    is?: OrderWhereInput
    isNot?: OrderWhereInput
  }

  export type RouteStopRouteIdPositionCompoundUniqueInput = {
    routeId: string
    position: number
  }

  export type RouteStopCountOrderByAggregateInput = {
    id?: SortOrder
    routeId?: SortOrder
    orderId?: SortOrder
    position?: SortOrder
    status?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
    resolvedAt?: SortOrder
    failureReason?: SortOrder
  }

  export type RouteStopAvgOrderByAggregateInput = {
    position?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
  }

  export type RouteStopMaxOrderByAggregateInput = {
    id?: SortOrder
    routeId?: SortOrder
    orderId?: SortOrder
    position?: SortOrder
    status?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
    resolvedAt?: SortOrder
    failureReason?: SortOrder
  }

  export type RouteStopMinOrderByAggregateInput = {
    id?: SortOrder
    routeId?: SortOrder
    orderId?: SortOrder
    position?: SortOrder
    status?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
    resolvedAt?: SortOrder
    failureReason?: SortOrder
  }

  export type RouteStopSumOrderByAggregateInput = {
    position?: SortOrder
    etaSeconds?: SortOrder
    legDistanceMeters?: SortOrder
  }

  export type EnumStopStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StopStatus | EnumStopStatusFieldRefInput<$PrismaModel>
    in?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumStopStatusWithAggregatesFilter<$PrismaModel> | $Enums.StopStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStopStatusFilter<$PrismaModel>
    _max?: NestedEnumStopStatusFilter<$PrismaModel>
  }

  export type CourierPingCountOrderByAggregateInput = {
    id?: SortOrder
    routeId?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    recordedAt?: SortOrder
  }

  export type CourierPingAvgOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
  }

  export type CourierPingMaxOrderByAggregateInput = {
    id?: SortOrder
    routeId?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    recordedAt?: SortOrder
  }

  export type CourierPingMinOrderByAggregateInput = {
    id?: SortOrder
    routeId?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    recordedAt?: SortOrder
  }

  export type CourierPingSumOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DomainEventLogCountOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    aggregateId?: SortOrder
    payload?: SortOrder
    occurredAt?: SortOrder
  }

  export type DomainEventLogMaxOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    aggregateId?: SortOrder
    occurredAt?: SortOrder
  }

  export type DomainEventLogMinOrderByAggregateInput = {
    id?: SortOrder
    establishmentId?: SortOrder
    name?: SortOrder
    aggregateId?: SortOrder
    occurredAt?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type GeocodeCacheCountOrderByAggregateInput = {
    cacheKey?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type GeocodeCacheAvgOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
  }

  export type GeocodeCacheMaxOrderByAggregateInput = {
    cacheKey?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type GeocodeCacheMinOrderByAggregateInput = {
    cacheKey?: SortOrder
    lat?: SortOrder
    lng?: SortOrder
    createdAt?: SortOrder
  }

  export type GeocodeCacheSumOrderByAggregateInput = {
    lat?: SortOrder
    lng?: SortOrder
  }

  export type UserCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<UserCreateWithoutEstablishmentInput, UserUncheckedCreateWithoutEstablishmentInput> | UserCreateWithoutEstablishmentInput[] | UserUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: UserCreateOrConnectWithoutEstablishmentInput | UserCreateOrConnectWithoutEstablishmentInput[]
    createMany?: UserCreateManyEstablishmentInputEnvelope
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type CourierCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<CourierCreateWithoutEstablishmentInput, CourierUncheckedCreateWithoutEstablishmentInput> | CourierCreateWithoutEstablishmentInput[] | CourierUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: CourierCreateOrConnectWithoutEstablishmentInput | CourierCreateOrConnectWithoutEstablishmentInput[]
    createMany?: CourierCreateManyEstablishmentInputEnvelope
    connect?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
  }

  export type OrderCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<OrderCreateWithoutEstablishmentInput, OrderUncheckedCreateWithoutEstablishmentInput> | OrderCreateWithoutEstablishmentInput[] | OrderUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutEstablishmentInput | OrderCreateOrConnectWithoutEstablishmentInput[]
    createMany?: OrderCreateManyEstablishmentInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type RouteCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<RouteCreateWithoutEstablishmentInput, RouteUncheckedCreateWithoutEstablishmentInput> | RouteCreateWithoutEstablishmentInput[] | RouteUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutEstablishmentInput | RouteCreateOrConnectWithoutEstablishmentInput[]
    createMany?: RouteCreateManyEstablishmentInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type DomainEventLogCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<DomainEventLogCreateWithoutEstablishmentInput, DomainEventLogUncheckedCreateWithoutEstablishmentInput> | DomainEventLogCreateWithoutEstablishmentInput[] | DomainEventLogUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: DomainEventLogCreateOrConnectWithoutEstablishmentInput | DomainEventLogCreateOrConnectWithoutEstablishmentInput[]
    createMany?: DomainEventLogCreateManyEstablishmentInputEnvelope
    connect?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
  }

  export type UserUncheckedCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<UserCreateWithoutEstablishmentInput, UserUncheckedCreateWithoutEstablishmentInput> | UserCreateWithoutEstablishmentInput[] | UserUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: UserCreateOrConnectWithoutEstablishmentInput | UserCreateOrConnectWithoutEstablishmentInput[]
    createMany?: UserCreateManyEstablishmentInputEnvelope
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type CourierUncheckedCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<CourierCreateWithoutEstablishmentInput, CourierUncheckedCreateWithoutEstablishmentInput> | CourierCreateWithoutEstablishmentInput[] | CourierUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: CourierCreateOrConnectWithoutEstablishmentInput | CourierCreateOrConnectWithoutEstablishmentInput[]
    createMany?: CourierCreateManyEstablishmentInputEnvelope
    connect?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
  }

  export type OrderUncheckedCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<OrderCreateWithoutEstablishmentInput, OrderUncheckedCreateWithoutEstablishmentInput> | OrderCreateWithoutEstablishmentInput[] | OrderUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutEstablishmentInput | OrderCreateOrConnectWithoutEstablishmentInput[]
    createMany?: OrderCreateManyEstablishmentInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type RouteUncheckedCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<RouteCreateWithoutEstablishmentInput, RouteUncheckedCreateWithoutEstablishmentInput> | RouteCreateWithoutEstablishmentInput[] | RouteUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutEstablishmentInput | RouteCreateOrConnectWithoutEstablishmentInput[]
    createMany?: RouteCreateManyEstablishmentInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type DomainEventLogUncheckedCreateNestedManyWithoutEstablishmentInput = {
    create?: XOR<DomainEventLogCreateWithoutEstablishmentInput, DomainEventLogUncheckedCreateWithoutEstablishmentInput> | DomainEventLogCreateWithoutEstablishmentInput[] | DomainEventLogUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: DomainEventLogCreateOrConnectWithoutEstablishmentInput | DomainEventLogCreateOrConnectWithoutEstablishmentInput[]
    createMany?: DomainEventLogCreateManyEstablishmentInputEnvelope
    connect?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UserUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<UserCreateWithoutEstablishmentInput, UserUncheckedCreateWithoutEstablishmentInput> | UserCreateWithoutEstablishmentInput[] | UserUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: UserCreateOrConnectWithoutEstablishmentInput | UserCreateOrConnectWithoutEstablishmentInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutEstablishmentInput | UserUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: UserCreateManyEstablishmentInputEnvelope
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutEstablishmentInput | UserUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: UserUpdateManyWithWhereWithoutEstablishmentInput | UserUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type CourierUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<CourierCreateWithoutEstablishmentInput, CourierUncheckedCreateWithoutEstablishmentInput> | CourierCreateWithoutEstablishmentInput[] | CourierUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: CourierCreateOrConnectWithoutEstablishmentInput | CourierCreateOrConnectWithoutEstablishmentInput[]
    upsert?: CourierUpsertWithWhereUniqueWithoutEstablishmentInput | CourierUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: CourierCreateManyEstablishmentInputEnvelope
    set?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    disconnect?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    delete?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    connect?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    update?: CourierUpdateWithWhereUniqueWithoutEstablishmentInput | CourierUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: CourierUpdateManyWithWhereWithoutEstablishmentInput | CourierUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: CourierScalarWhereInput | CourierScalarWhereInput[]
  }

  export type OrderUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<OrderCreateWithoutEstablishmentInput, OrderUncheckedCreateWithoutEstablishmentInput> | OrderCreateWithoutEstablishmentInput[] | OrderUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutEstablishmentInput | OrderCreateOrConnectWithoutEstablishmentInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutEstablishmentInput | OrderUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: OrderCreateManyEstablishmentInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutEstablishmentInput | OrderUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutEstablishmentInput | OrderUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type RouteUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<RouteCreateWithoutEstablishmentInput, RouteUncheckedCreateWithoutEstablishmentInput> | RouteCreateWithoutEstablishmentInput[] | RouteUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutEstablishmentInput | RouteCreateOrConnectWithoutEstablishmentInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutEstablishmentInput | RouteUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: RouteCreateManyEstablishmentInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutEstablishmentInput | RouteUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutEstablishmentInput | RouteUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type DomainEventLogUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<DomainEventLogCreateWithoutEstablishmentInput, DomainEventLogUncheckedCreateWithoutEstablishmentInput> | DomainEventLogCreateWithoutEstablishmentInput[] | DomainEventLogUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: DomainEventLogCreateOrConnectWithoutEstablishmentInput | DomainEventLogCreateOrConnectWithoutEstablishmentInput[]
    upsert?: DomainEventLogUpsertWithWhereUniqueWithoutEstablishmentInput | DomainEventLogUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: DomainEventLogCreateManyEstablishmentInputEnvelope
    set?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    disconnect?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    delete?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    connect?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    update?: DomainEventLogUpdateWithWhereUniqueWithoutEstablishmentInput | DomainEventLogUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: DomainEventLogUpdateManyWithWhereWithoutEstablishmentInput | DomainEventLogUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: DomainEventLogScalarWhereInput | DomainEventLogScalarWhereInput[]
  }

  export type UserUncheckedUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<UserCreateWithoutEstablishmentInput, UserUncheckedCreateWithoutEstablishmentInput> | UserCreateWithoutEstablishmentInput[] | UserUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: UserCreateOrConnectWithoutEstablishmentInput | UserCreateOrConnectWithoutEstablishmentInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutEstablishmentInput | UserUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: UserCreateManyEstablishmentInputEnvelope
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutEstablishmentInput | UserUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: UserUpdateManyWithWhereWithoutEstablishmentInput | UserUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type CourierUncheckedUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<CourierCreateWithoutEstablishmentInput, CourierUncheckedCreateWithoutEstablishmentInput> | CourierCreateWithoutEstablishmentInput[] | CourierUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: CourierCreateOrConnectWithoutEstablishmentInput | CourierCreateOrConnectWithoutEstablishmentInput[]
    upsert?: CourierUpsertWithWhereUniqueWithoutEstablishmentInput | CourierUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: CourierCreateManyEstablishmentInputEnvelope
    set?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    disconnect?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    delete?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    connect?: CourierWhereUniqueInput | CourierWhereUniqueInput[]
    update?: CourierUpdateWithWhereUniqueWithoutEstablishmentInput | CourierUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: CourierUpdateManyWithWhereWithoutEstablishmentInput | CourierUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: CourierScalarWhereInput | CourierScalarWhereInput[]
  }

  export type OrderUncheckedUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<OrderCreateWithoutEstablishmentInput, OrderUncheckedCreateWithoutEstablishmentInput> | OrderCreateWithoutEstablishmentInput[] | OrderUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutEstablishmentInput | OrderCreateOrConnectWithoutEstablishmentInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutEstablishmentInput | OrderUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: OrderCreateManyEstablishmentInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutEstablishmentInput | OrderUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutEstablishmentInput | OrderUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type RouteUncheckedUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<RouteCreateWithoutEstablishmentInput, RouteUncheckedCreateWithoutEstablishmentInput> | RouteCreateWithoutEstablishmentInput[] | RouteUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutEstablishmentInput | RouteCreateOrConnectWithoutEstablishmentInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutEstablishmentInput | RouteUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: RouteCreateManyEstablishmentInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutEstablishmentInput | RouteUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutEstablishmentInput | RouteUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type DomainEventLogUncheckedUpdateManyWithoutEstablishmentNestedInput = {
    create?: XOR<DomainEventLogCreateWithoutEstablishmentInput, DomainEventLogUncheckedCreateWithoutEstablishmentInput> | DomainEventLogCreateWithoutEstablishmentInput[] | DomainEventLogUncheckedCreateWithoutEstablishmentInput[]
    connectOrCreate?: DomainEventLogCreateOrConnectWithoutEstablishmentInput | DomainEventLogCreateOrConnectWithoutEstablishmentInput[]
    upsert?: DomainEventLogUpsertWithWhereUniqueWithoutEstablishmentInput | DomainEventLogUpsertWithWhereUniqueWithoutEstablishmentInput[]
    createMany?: DomainEventLogCreateManyEstablishmentInputEnvelope
    set?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    disconnect?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    delete?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    connect?: DomainEventLogWhereUniqueInput | DomainEventLogWhereUniqueInput[]
    update?: DomainEventLogUpdateWithWhereUniqueWithoutEstablishmentInput | DomainEventLogUpdateWithWhereUniqueWithoutEstablishmentInput[]
    updateMany?: DomainEventLogUpdateManyWithWhereWithoutEstablishmentInput | DomainEventLogUpdateManyWithWhereWithoutEstablishmentInput[]
    deleteMany?: DomainEventLogScalarWhereInput | DomainEventLogScalarWhereInput[]
  }

  export type EstablishmentCreateNestedOneWithoutUsersInput = {
    create?: XOR<EstablishmentCreateWithoutUsersInput, EstablishmentUncheckedCreateWithoutUsersInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutUsersInput
    connect?: EstablishmentWhereUniqueInput
  }

  export type EstablishmentUpdateOneRequiredWithoutUsersNestedInput = {
    create?: XOR<EstablishmentCreateWithoutUsersInput, EstablishmentUncheckedCreateWithoutUsersInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutUsersInput
    upsert?: EstablishmentUpsertWithoutUsersInput
    connect?: EstablishmentWhereUniqueInput
    update?: XOR<XOR<EstablishmentUpdateToOneWithWhereWithoutUsersInput, EstablishmentUpdateWithoutUsersInput>, EstablishmentUncheckedUpdateWithoutUsersInput>
  }

  export type EstablishmentCreateNestedOneWithoutCouriersInput = {
    create?: XOR<EstablishmentCreateWithoutCouriersInput, EstablishmentUncheckedCreateWithoutCouriersInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutCouriersInput
    connect?: EstablishmentWhereUniqueInput
  }

  export type RouteCreateNestedManyWithoutCourierInput = {
    create?: XOR<RouteCreateWithoutCourierInput, RouteUncheckedCreateWithoutCourierInput> | RouteCreateWithoutCourierInput[] | RouteUncheckedCreateWithoutCourierInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutCourierInput | RouteCreateOrConnectWithoutCourierInput[]
    createMany?: RouteCreateManyCourierInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type RouteUncheckedCreateNestedManyWithoutCourierInput = {
    create?: XOR<RouteCreateWithoutCourierInput, RouteUncheckedCreateWithoutCourierInput> | RouteCreateWithoutCourierInput[] | RouteUncheckedCreateWithoutCourierInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutCourierInput | RouteCreateOrConnectWithoutCourierInput[]
    createMany?: RouteCreateManyCourierInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EstablishmentUpdateOneRequiredWithoutCouriersNestedInput = {
    create?: XOR<EstablishmentCreateWithoutCouriersInput, EstablishmentUncheckedCreateWithoutCouriersInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutCouriersInput
    upsert?: EstablishmentUpsertWithoutCouriersInput
    connect?: EstablishmentWhereUniqueInput
    update?: XOR<XOR<EstablishmentUpdateToOneWithWhereWithoutCouriersInput, EstablishmentUpdateWithoutCouriersInput>, EstablishmentUncheckedUpdateWithoutCouriersInput>
  }

  export type RouteUpdateManyWithoutCourierNestedInput = {
    create?: XOR<RouteCreateWithoutCourierInput, RouteUncheckedCreateWithoutCourierInput> | RouteCreateWithoutCourierInput[] | RouteUncheckedCreateWithoutCourierInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutCourierInput | RouteCreateOrConnectWithoutCourierInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutCourierInput | RouteUpsertWithWhereUniqueWithoutCourierInput[]
    createMany?: RouteCreateManyCourierInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutCourierInput | RouteUpdateWithWhereUniqueWithoutCourierInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutCourierInput | RouteUpdateManyWithWhereWithoutCourierInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type RouteUncheckedUpdateManyWithoutCourierNestedInput = {
    create?: XOR<RouteCreateWithoutCourierInput, RouteUncheckedCreateWithoutCourierInput> | RouteCreateWithoutCourierInput[] | RouteUncheckedCreateWithoutCourierInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutCourierInput | RouteCreateOrConnectWithoutCourierInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutCourierInput | RouteUpsertWithWhereUniqueWithoutCourierInput[]
    createMany?: RouteCreateManyCourierInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutCourierInput | RouteUpdateWithWhereUniqueWithoutCourierInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutCourierInput | RouteUpdateManyWithWhereWithoutCourierInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type EstablishmentCreateNestedOneWithoutOrdersInput = {
    create?: XOR<EstablishmentCreateWithoutOrdersInput, EstablishmentUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutOrdersInput
    connect?: EstablishmentWhereUniqueInput
  }

  export type RouteStopCreateNestedOneWithoutOrderInput = {
    create?: XOR<RouteStopCreateWithoutOrderInput, RouteStopUncheckedCreateWithoutOrderInput>
    connectOrCreate?: RouteStopCreateOrConnectWithoutOrderInput
    connect?: RouteStopWhereUniqueInput
  }

  export type RouteStopUncheckedCreateNestedOneWithoutOrderInput = {
    create?: XOR<RouteStopCreateWithoutOrderInput, RouteStopUncheckedCreateWithoutOrderInput>
    connectOrCreate?: RouteStopCreateOrConnectWithoutOrderInput
    connect?: RouteStopWhereUniqueInput
  }

  export type EnumOrderSourceKindFieldUpdateOperationsInput = {
    set?: $Enums.OrderSourceKind
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumOrderStatusFieldUpdateOperationsInput = {
    set?: $Enums.OrderStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EstablishmentUpdateOneRequiredWithoutOrdersNestedInput = {
    create?: XOR<EstablishmentCreateWithoutOrdersInput, EstablishmentUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutOrdersInput
    upsert?: EstablishmentUpsertWithoutOrdersInput
    connect?: EstablishmentWhereUniqueInput
    update?: XOR<XOR<EstablishmentUpdateToOneWithWhereWithoutOrdersInput, EstablishmentUpdateWithoutOrdersInput>, EstablishmentUncheckedUpdateWithoutOrdersInput>
  }

  export type RouteStopUpdateOneWithoutOrderNestedInput = {
    create?: XOR<RouteStopCreateWithoutOrderInput, RouteStopUncheckedCreateWithoutOrderInput>
    connectOrCreate?: RouteStopCreateOrConnectWithoutOrderInput
    upsert?: RouteStopUpsertWithoutOrderInput
    disconnect?: RouteStopWhereInput | boolean
    delete?: RouteStopWhereInput | boolean
    connect?: RouteStopWhereUniqueInput
    update?: XOR<XOR<RouteStopUpdateToOneWithWhereWithoutOrderInput, RouteStopUpdateWithoutOrderInput>, RouteStopUncheckedUpdateWithoutOrderInput>
  }

  export type RouteStopUncheckedUpdateOneWithoutOrderNestedInput = {
    create?: XOR<RouteStopCreateWithoutOrderInput, RouteStopUncheckedCreateWithoutOrderInput>
    connectOrCreate?: RouteStopCreateOrConnectWithoutOrderInput
    upsert?: RouteStopUpsertWithoutOrderInput
    disconnect?: RouteStopWhereInput | boolean
    delete?: RouteStopWhereInput | boolean
    connect?: RouteStopWhereUniqueInput
    update?: XOR<XOR<RouteStopUpdateToOneWithWhereWithoutOrderInput, RouteStopUpdateWithoutOrderInput>, RouteStopUncheckedUpdateWithoutOrderInput>
  }

  export type EstablishmentCreateNestedOneWithoutRoutesInput = {
    create?: XOR<EstablishmentCreateWithoutRoutesInput, EstablishmentUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutRoutesInput
    connect?: EstablishmentWhereUniqueInput
  }

  export type CourierCreateNestedOneWithoutRoutesInput = {
    create?: XOR<CourierCreateWithoutRoutesInput, CourierUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: CourierCreateOrConnectWithoutRoutesInput
    connect?: CourierWhereUniqueInput
  }

  export type RouteStopCreateNestedManyWithoutRouteInput = {
    create?: XOR<RouteStopCreateWithoutRouteInput, RouteStopUncheckedCreateWithoutRouteInput> | RouteStopCreateWithoutRouteInput[] | RouteStopUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: RouteStopCreateOrConnectWithoutRouteInput | RouteStopCreateOrConnectWithoutRouteInput[]
    createMany?: RouteStopCreateManyRouteInputEnvelope
    connect?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
  }

  export type CourierPingCreateNestedManyWithoutRouteInput = {
    create?: XOR<CourierPingCreateWithoutRouteInput, CourierPingUncheckedCreateWithoutRouteInput> | CourierPingCreateWithoutRouteInput[] | CourierPingUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: CourierPingCreateOrConnectWithoutRouteInput | CourierPingCreateOrConnectWithoutRouteInput[]
    createMany?: CourierPingCreateManyRouteInputEnvelope
    connect?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
  }

  export type RouteStopUncheckedCreateNestedManyWithoutRouteInput = {
    create?: XOR<RouteStopCreateWithoutRouteInput, RouteStopUncheckedCreateWithoutRouteInput> | RouteStopCreateWithoutRouteInput[] | RouteStopUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: RouteStopCreateOrConnectWithoutRouteInput | RouteStopCreateOrConnectWithoutRouteInput[]
    createMany?: RouteStopCreateManyRouteInputEnvelope
    connect?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
  }

  export type CourierPingUncheckedCreateNestedManyWithoutRouteInput = {
    create?: XOR<CourierPingCreateWithoutRouteInput, CourierPingUncheckedCreateWithoutRouteInput> | CourierPingCreateWithoutRouteInput[] | CourierPingUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: CourierPingCreateOrConnectWithoutRouteInput | CourierPingCreateOrConnectWithoutRouteInput[]
    createMany?: CourierPingCreateManyRouteInputEnvelope
    connect?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
  }

  export type EnumRouteStatusFieldUpdateOperationsInput = {
    set?: $Enums.RouteStatus
  }

  export type EstablishmentUpdateOneRequiredWithoutRoutesNestedInput = {
    create?: XOR<EstablishmentCreateWithoutRoutesInput, EstablishmentUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutRoutesInput
    upsert?: EstablishmentUpsertWithoutRoutesInput
    connect?: EstablishmentWhereUniqueInput
    update?: XOR<XOR<EstablishmentUpdateToOneWithWhereWithoutRoutesInput, EstablishmentUpdateWithoutRoutesInput>, EstablishmentUncheckedUpdateWithoutRoutesInput>
  }

  export type CourierUpdateOneRequiredWithoutRoutesNestedInput = {
    create?: XOR<CourierCreateWithoutRoutesInput, CourierUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: CourierCreateOrConnectWithoutRoutesInput
    upsert?: CourierUpsertWithoutRoutesInput
    connect?: CourierWhereUniqueInput
    update?: XOR<XOR<CourierUpdateToOneWithWhereWithoutRoutesInput, CourierUpdateWithoutRoutesInput>, CourierUncheckedUpdateWithoutRoutesInput>
  }

  export type RouteStopUpdateManyWithoutRouteNestedInput = {
    create?: XOR<RouteStopCreateWithoutRouteInput, RouteStopUncheckedCreateWithoutRouteInput> | RouteStopCreateWithoutRouteInput[] | RouteStopUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: RouteStopCreateOrConnectWithoutRouteInput | RouteStopCreateOrConnectWithoutRouteInput[]
    upsert?: RouteStopUpsertWithWhereUniqueWithoutRouteInput | RouteStopUpsertWithWhereUniqueWithoutRouteInput[]
    createMany?: RouteStopCreateManyRouteInputEnvelope
    set?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    disconnect?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    delete?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    connect?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    update?: RouteStopUpdateWithWhereUniqueWithoutRouteInput | RouteStopUpdateWithWhereUniqueWithoutRouteInput[]
    updateMany?: RouteStopUpdateManyWithWhereWithoutRouteInput | RouteStopUpdateManyWithWhereWithoutRouteInput[]
    deleteMany?: RouteStopScalarWhereInput | RouteStopScalarWhereInput[]
  }

  export type CourierPingUpdateManyWithoutRouteNestedInput = {
    create?: XOR<CourierPingCreateWithoutRouteInput, CourierPingUncheckedCreateWithoutRouteInput> | CourierPingCreateWithoutRouteInput[] | CourierPingUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: CourierPingCreateOrConnectWithoutRouteInput | CourierPingCreateOrConnectWithoutRouteInput[]
    upsert?: CourierPingUpsertWithWhereUniqueWithoutRouteInput | CourierPingUpsertWithWhereUniqueWithoutRouteInput[]
    createMany?: CourierPingCreateManyRouteInputEnvelope
    set?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    disconnect?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    delete?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    connect?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    update?: CourierPingUpdateWithWhereUniqueWithoutRouteInput | CourierPingUpdateWithWhereUniqueWithoutRouteInput[]
    updateMany?: CourierPingUpdateManyWithWhereWithoutRouteInput | CourierPingUpdateManyWithWhereWithoutRouteInput[]
    deleteMany?: CourierPingScalarWhereInput | CourierPingScalarWhereInput[]
  }

  export type RouteStopUncheckedUpdateManyWithoutRouteNestedInput = {
    create?: XOR<RouteStopCreateWithoutRouteInput, RouteStopUncheckedCreateWithoutRouteInput> | RouteStopCreateWithoutRouteInput[] | RouteStopUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: RouteStopCreateOrConnectWithoutRouteInput | RouteStopCreateOrConnectWithoutRouteInput[]
    upsert?: RouteStopUpsertWithWhereUniqueWithoutRouteInput | RouteStopUpsertWithWhereUniqueWithoutRouteInput[]
    createMany?: RouteStopCreateManyRouteInputEnvelope
    set?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    disconnect?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    delete?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    connect?: RouteStopWhereUniqueInput | RouteStopWhereUniqueInput[]
    update?: RouteStopUpdateWithWhereUniqueWithoutRouteInput | RouteStopUpdateWithWhereUniqueWithoutRouteInput[]
    updateMany?: RouteStopUpdateManyWithWhereWithoutRouteInput | RouteStopUpdateManyWithWhereWithoutRouteInput[]
    deleteMany?: RouteStopScalarWhereInput | RouteStopScalarWhereInput[]
  }

  export type CourierPingUncheckedUpdateManyWithoutRouteNestedInput = {
    create?: XOR<CourierPingCreateWithoutRouteInput, CourierPingUncheckedCreateWithoutRouteInput> | CourierPingCreateWithoutRouteInput[] | CourierPingUncheckedCreateWithoutRouteInput[]
    connectOrCreate?: CourierPingCreateOrConnectWithoutRouteInput | CourierPingCreateOrConnectWithoutRouteInput[]
    upsert?: CourierPingUpsertWithWhereUniqueWithoutRouteInput | CourierPingUpsertWithWhereUniqueWithoutRouteInput[]
    createMany?: CourierPingCreateManyRouteInputEnvelope
    set?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    disconnect?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    delete?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    connect?: CourierPingWhereUniqueInput | CourierPingWhereUniqueInput[]
    update?: CourierPingUpdateWithWhereUniqueWithoutRouteInput | CourierPingUpdateWithWhereUniqueWithoutRouteInput[]
    updateMany?: CourierPingUpdateManyWithWhereWithoutRouteInput | CourierPingUpdateManyWithWhereWithoutRouteInput[]
    deleteMany?: CourierPingScalarWhereInput | CourierPingScalarWhereInput[]
  }

  export type RouteCreateNestedOneWithoutStopsInput = {
    create?: XOR<RouteCreateWithoutStopsInput, RouteUncheckedCreateWithoutStopsInput>
    connectOrCreate?: RouteCreateOrConnectWithoutStopsInput
    connect?: RouteWhereUniqueInput
  }

  export type OrderCreateNestedOneWithoutStopInput = {
    create?: XOR<OrderCreateWithoutStopInput, OrderUncheckedCreateWithoutStopInput>
    connectOrCreate?: OrderCreateOrConnectWithoutStopInput
    connect?: OrderWhereUniqueInput
  }

  export type EnumStopStatusFieldUpdateOperationsInput = {
    set?: $Enums.StopStatus
  }

  export type RouteUpdateOneRequiredWithoutStopsNestedInput = {
    create?: XOR<RouteCreateWithoutStopsInput, RouteUncheckedCreateWithoutStopsInput>
    connectOrCreate?: RouteCreateOrConnectWithoutStopsInput
    upsert?: RouteUpsertWithoutStopsInput
    connect?: RouteWhereUniqueInput
    update?: XOR<XOR<RouteUpdateToOneWithWhereWithoutStopsInput, RouteUpdateWithoutStopsInput>, RouteUncheckedUpdateWithoutStopsInput>
  }

  export type OrderUpdateOneRequiredWithoutStopNestedInput = {
    create?: XOR<OrderCreateWithoutStopInput, OrderUncheckedCreateWithoutStopInput>
    connectOrCreate?: OrderCreateOrConnectWithoutStopInput
    upsert?: OrderUpsertWithoutStopInput
    connect?: OrderWhereUniqueInput
    update?: XOR<XOR<OrderUpdateToOneWithWhereWithoutStopInput, OrderUpdateWithoutStopInput>, OrderUncheckedUpdateWithoutStopInput>
  }

  export type RouteCreateNestedOneWithoutPingsInput = {
    create?: XOR<RouteCreateWithoutPingsInput, RouteUncheckedCreateWithoutPingsInput>
    connectOrCreate?: RouteCreateOrConnectWithoutPingsInput
    connect?: RouteWhereUniqueInput
  }

  export type RouteUpdateOneRequiredWithoutPingsNestedInput = {
    create?: XOR<RouteCreateWithoutPingsInput, RouteUncheckedCreateWithoutPingsInput>
    connectOrCreate?: RouteCreateOrConnectWithoutPingsInput
    upsert?: RouteUpsertWithoutPingsInput
    connect?: RouteWhereUniqueInput
    update?: XOR<XOR<RouteUpdateToOneWithWhereWithoutPingsInput, RouteUpdateWithoutPingsInput>, RouteUncheckedUpdateWithoutPingsInput>
  }

  export type EstablishmentCreateNestedOneWithoutEventsInput = {
    create?: XOR<EstablishmentCreateWithoutEventsInput, EstablishmentUncheckedCreateWithoutEventsInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutEventsInput
    connect?: EstablishmentWhereUniqueInput
  }

  export type EstablishmentUpdateOneRequiredWithoutEventsNestedInput = {
    create?: XOR<EstablishmentCreateWithoutEventsInput, EstablishmentUncheckedCreateWithoutEventsInput>
    connectOrCreate?: EstablishmentCreateOrConnectWithoutEventsInput
    upsert?: EstablishmentUpsertWithoutEventsInput
    connect?: EstablishmentWhereUniqueInput
    update?: XOR<XOR<EstablishmentUpdateToOneWithWhereWithoutEventsInput, EstablishmentUpdateWithoutEventsInput>, EstablishmentUncheckedUpdateWithoutEventsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumOrderSourceKindFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderSourceKind | EnumOrderSourceKindFieldRefInput<$PrismaModel>
    in?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderSourceKindFilter<$PrismaModel> | $Enums.OrderSourceKind
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumOrderStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderStatus | EnumOrderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderStatusFilter<$PrismaModel> | $Enums.OrderStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumOrderSourceKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderSourceKind | EnumOrderSourceKindFieldRefInput<$PrismaModel>
    in?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderSourceKind[] | ListEnumOrderSourceKindFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderSourceKindWithAggregatesFilter<$PrismaModel> | $Enums.OrderSourceKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrderSourceKindFilter<$PrismaModel>
    _max?: NestedEnumOrderSourceKindFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedEnumOrderStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrderStatus | EnumOrderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OrderStatus[] | ListEnumOrderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOrderStatusWithAggregatesFilter<$PrismaModel> | $Enums.OrderStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrderStatusFilter<$PrismaModel>
    _max?: NestedEnumOrderStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumRouteStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RouteStatus | EnumRouteStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRouteStatusFilter<$PrismaModel> | $Enums.RouteStatus
  }

  export type NestedEnumRouteStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RouteStatus | EnumRouteStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RouteStatus[] | ListEnumRouteStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRouteStatusWithAggregatesFilter<$PrismaModel> | $Enums.RouteStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRouteStatusFilter<$PrismaModel>
    _max?: NestedEnumRouteStatusFilter<$PrismaModel>
  }

  export type NestedEnumStopStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.StopStatus | EnumStopStatusFieldRefInput<$PrismaModel>
    in?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumStopStatusFilter<$PrismaModel> | $Enums.StopStatus
  }

  export type NestedEnumStopStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StopStatus | EnumStopStatusFieldRefInput<$PrismaModel>
    in?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.StopStatus[] | ListEnumStopStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumStopStatusWithAggregatesFilter<$PrismaModel> | $Enums.StopStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStopStatusFilter<$PrismaModel>
    _max?: NestedEnumStopStatusFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserCreateWithoutEstablishmentInput = {
    id?: string
    email: string
    name: string
    passwordHash: string
    createdAt?: Date | string
  }

  export type UserUncheckedCreateWithoutEstablishmentInput = {
    id?: string
    email: string
    name: string
    passwordHash: string
    createdAt?: Date | string
  }

  export type UserCreateOrConnectWithoutEstablishmentInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutEstablishmentInput, UserUncheckedCreateWithoutEstablishmentInput>
  }

  export type UserCreateManyEstablishmentInputEnvelope = {
    data: UserCreateManyEstablishmentInput | UserCreateManyEstablishmentInput[]
    skipDuplicates?: boolean
  }

  export type CourierCreateWithoutEstablishmentInput = {
    id?: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
    routes?: RouteCreateNestedManyWithoutCourierInput
  }

  export type CourierUncheckedCreateWithoutEstablishmentInput = {
    id?: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
    routes?: RouteUncheckedCreateNestedManyWithoutCourierInput
  }

  export type CourierCreateOrConnectWithoutEstablishmentInput = {
    where: CourierWhereUniqueInput
    create: XOR<CourierCreateWithoutEstablishmentInput, CourierUncheckedCreateWithoutEstablishmentInput>
  }

  export type CourierCreateManyEstablishmentInputEnvelope = {
    data: CourierCreateManyEstablishmentInput | CourierCreateManyEstablishmentInput[]
    skipDuplicates?: boolean
  }

  export type OrderCreateWithoutEstablishmentInput = {
    id?: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
    stop?: RouteStopCreateNestedOneWithoutOrderInput
  }

  export type OrderUncheckedCreateWithoutEstablishmentInput = {
    id?: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
    stop?: RouteStopUncheckedCreateNestedOneWithoutOrderInput
  }

  export type OrderCreateOrConnectWithoutEstablishmentInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutEstablishmentInput, OrderUncheckedCreateWithoutEstablishmentInput>
  }

  export type OrderCreateManyEstablishmentInputEnvelope = {
    data: OrderCreateManyEstablishmentInput | OrderCreateManyEstablishmentInput[]
    skipDuplicates?: boolean
  }

  export type RouteCreateWithoutEstablishmentInput = {
    id?: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    courier: CourierCreateNestedOneWithoutRoutesInput
    stops?: RouteStopCreateNestedManyWithoutRouteInput
    pings?: CourierPingCreateNestedManyWithoutRouteInput
  }

  export type RouteUncheckedCreateWithoutEstablishmentInput = {
    id?: string
    courierId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    stops?: RouteStopUncheckedCreateNestedManyWithoutRouteInput
    pings?: CourierPingUncheckedCreateNestedManyWithoutRouteInput
  }

  export type RouteCreateOrConnectWithoutEstablishmentInput = {
    where: RouteWhereUniqueInput
    create: XOR<RouteCreateWithoutEstablishmentInput, RouteUncheckedCreateWithoutEstablishmentInput>
  }

  export type RouteCreateManyEstablishmentInputEnvelope = {
    data: RouteCreateManyEstablishmentInput | RouteCreateManyEstablishmentInput[]
    skipDuplicates?: boolean
  }

  export type DomainEventLogCreateWithoutEstablishmentInput = {
    id?: string
    name: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    occurredAt: Date | string
  }

  export type DomainEventLogUncheckedCreateWithoutEstablishmentInput = {
    id?: string
    name: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    occurredAt: Date | string
  }

  export type DomainEventLogCreateOrConnectWithoutEstablishmentInput = {
    where: DomainEventLogWhereUniqueInput
    create: XOR<DomainEventLogCreateWithoutEstablishmentInput, DomainEventLogUncheckedCreateWithoutEstablishmentInput>
  }

  export type DomainEventLogCreateManyEstablishmentInputEnvelope = {
    data: DomainEventLogCreateManyEstablishmentInput | DomainEventLogCreateManyEstablishmentInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithWhereUniqueWithoutEstablishmentInput = {
    where: UserWhereUniqueInput
    update: XOR<UserUpdateWithoutEstablishmentInput, UserUncheckedUpdateWithoutEstablishmentInput>
    create: XOR<UserCreateWithoutEstablishmentInput, UserUncheckedCreateWithoutEstablishmentInput>
  }

  export type UserUpdateWithWhereUniqueWithoutEstablishmentInput = {
    where: UserWhereUniqueInput
    data: XOR<UserUpdateWithoutEstablishmentInput, UserUncheckedUpdateWithoutEstablishmentInput>
  }

  export type UserUpdateManyWithWhereWithoutEstablishmentInput = {
    where: UserScalarWhereInput
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyWithoutEstablishmentInput>
  }

  export type UserScalarWhereInput = {
    AND?: UserScalarWhereInput | UserScalarWhereInput[]
    OR?: UserScalarWhereInput[]
    NOT?: UserScalarWhereInput | UserScalarWhereInput[]
    id?: StringFilter<"User"> | string
    establishmentId?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
  }

  export type CourierUpsertWithWhereUniqueWithoutEstablishmentInput = {
    where: CourierWhereUniqueInput
    update: XOR<CourierUpdateWithoutEstablishmentInput, CourierUncheckedUpdateWithoutEstablishmentInput>
    create: XOR<CourierCreateWithoutEstablishmentInput, CourierUncheckedCreateWithoutEstablishmentInput>
  }

  export type CourierUpdateWithWhereUniqueWithoutEstablishmentInput = {
    where: CourierWhereUniqueInput
    data: XOR<CourierUpdateWithoutEstablishmentInput, CourierUncheckedUpdateWithoutEstablishmentInput>
  }

  export type CourierUpdateManyWithWhereWithoutEstablishmentInput = {
    where: CourierScalarWhereInput
    data: XOR<CourierUpdateManyMutationInput, CourierUncheckedUpdateManyWithoutEstablishmentInput>
  }

  export type CourierScalarWhereInput = {
    AND?: CourierScalarWhereInput | CourierScalarWhereInput[]
    OR?: CourierScalarWhereInput[]
    NOT?: CourierScalarWhereInput | CourierScalarWhereInput[]
    id?: StringFilter<"Courier"> | string
    establishmentId?: StringFilter<"Courier"> | string
    name?: StringFilter<"Courier"> | string
    phone?: StringFilter<"Courier"> | string
    active?: BoolFilter<"Courier"> | boolean
    createdAt?: DateTimeFilter<"Courier"> | Date | string
  }

  export type OrderUpsertWithWhereUniqueWithoutEstablishmentInput = {
    where: OrderWhereUniqueInput
    update: XOR<OrderUpdateWithoutEstablishmentInput, OrderUncheckedUpdateWithoutEstablishmentInput>
    create: XOR<OrderCreateWithoutEstablishmentInput, OrderUncheckedCreateWithoutEstablishmentInput>
  }

  export type OrderUpdateWithWhereUniqueWithoutEstablishmentInput = {
    where: OrderWhereUniqueInput
    data: XOR<OrderUpdateWithoutEstablishmentInput, OrderUncheckedUpdateWithoutEstablishmentInput>
  }

  export type OrderUpdateManyWithWhereWithoutEstablishmentInput = {
    where: OrderScalarWhereInput
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyWithoutEstablishmentInput>
  }

  export type OrderScalarWhereInput = {
    AND?: OrderScalarWhereInput | OrderScalarWhereInput[]
    OR?: OrderScalarWhereInput[]
    NOT?: OrderScalarWhereInput | OrderScalarWhereInput[]
    id?: StringFilter<"Order"> | string
    establishmentId?: StringFilter<"Order"> | string
    source?: EnumOrderSourceKindFilter<"Order"> | $Enums.OrderSourceKind
    externalId?: StringNullableFilter<"Order"> | string | null
    customerName?: StringFilter<"Order"> | string
    customerPhone?: StringNullableFilter<"Order"> | string | null
    address?: StringFilter<"Order"> | string
    reference?: StringNullableFilter<"Order"> | string | null
    lat?: FloatNullableFilter<"Order"> | number | null
    lng?: FloatNullableFilter<"Order"> | number | null
    amountCents?: IntFilter<"Order"> | number
    notes?: StringNullableFilter<"Order"> | string | null
    status?: EnumOrderStatusFilter<"Order"> | $Enums.OrderStatus
    trackingToken?: StringFilter<"Order"> | string
    routeId?: StringNullableFilter<"Order"> | string | null
    createdAt?: DateTimeFilter<"Order"> | Date | string
    deliveredAt?: DateTimeNullableFilter<"Order"> | Date | string | null
  }

  export type RouteUpsertWithWhereUniqueWithoutEstablishmentInput = {
    where: RouteWhereUniqueInput
    update: XOR<RouteUpdateWithoutEstablishmentInput, RouteUncheckedUpdateWithoutEstablishmentInput>
    create: XOR<RouteCreateWithoutEstablishmentInput, RouteUncheckedCreateWithoutEstablishmentInput>
  }

  export type RouteUpdateWithWhereUniqueWithoutEstablishmentInput = {
    where: RouteWhereUniqueInput
    data: XOR<RouteUpdateWithoutEstablishmentInput, RouteUncheckedUpdateWithoutEstablishmentInput>
  }

  export type RouteUpdateManyWithWhereWithoutEstablishmentInput = {
    where: RouteScalarWhereInput
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyWithoutEstablishmentInput>
  }

  export type RouteScalarWhereInput = {
    AND?: RouteScalarWhereInput | RouteScalarWhereInput[]
    OR?: RouteScalarWhereInput[]
    NOT?: RouteScalarWhereInput | RouteScalarWhereInput[]
    id?: StringFilter<"Route"> | string
    establishmentId?: StringFilter<"Route"> | string
    courierId?: StringFilter<"Route"> | string
    status?: EnumRouteStatusFilter<"Route"> | $Enums.RouteStatus
    accessToken?: StringFilter<"Route"> | string
    geometry?: StringNullableFilter<"Route"> | string | null
    distanceMeters?: IntFilter<"Route"> | number
    durationSeconds?: IntFilter<"Route"> | number
    baselineDurationSeconds?: IntFilter<"Route"> | number
    createdAt?: DateTimeFilter<"Route"> | Date | string
    startedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    finishedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
  }

  export type DomainEventLogUpsertWithWhereUniqueWithoutEstablishmentInput = {
    where: DomainEventLogWhereUniqueInput
    update: XOR<DomainEventLogUpdateWithoutEstablishmentInput, DomainEventLogUncheckedUpdateWithoutEstablishmentInput>
    create: XOR<DomainEventLogCreateWithoutEstablishmentInput, DomainEventLogUncheckedCreateWithoutEstablishmentInput>
  }

  export type DomainEventLogUpdateWithWhereUniqueWithoutEstablishmentInput = {
    where: DomainEventLogWhereUniqueInput
    data: XOR<DomainEventLogUpdateWithoutEstablishmentInput, DomainEventLogUncheckedUpdateWithoutEstablishmentInput>
  }

  export type DomainEventLogUpdateManyWithWhereWithoutEstablishmentInput = {
    where: DomainEventLogScalarWhereInput
    data: XOR<DomainEventLogUpdateManyMutationInput, DomainEventLogUncheckedUpdateManyWithoutEstablishmentInput>
  }

  export type DomainEventLogScalarWhereInput = {
    AND?: DomainEventLogScalarWhereInput | DomainEventLogScalarWhereInput[]
    OR?: DomainEventLogScalarWhereInput[]
    NOT?: DomainEventLogScalarWhereInput | DomainEventLogScalarWhereInput[]
    id?: StringFilter<"DomainEventLog"> | string
    establishmentId?: StringFilter<"DomainEventLog"> | string
    name?: StringFilter<"DomainEventLog"> | string
    aggregateId?: StringFilter<"DomainEventLog"> | string
    payload?: JsonFilter<"DomainEventLog">
    occurredAt?: DateTimeFilter<"DomainEventLog"> | Date | string
  }

  export type EstablishmentCreateWithoutUsersInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    couriers?: CourierCreateNestedManyWithoutEstablishmentInput
    orders?: OrderCreateNestedManyWithoutEstablishmentInput
    routes?: RouteCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUncheckedCreateWithoutUsersInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    couriers?: CourierUncheckedCreateNestedManyWithoutEstablishmentInput
    orders?: OrderUncheckedCreateNestedManyWithoutEstablishmentInput
    routes?: RouteUncheckedCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogUncheckedCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentCreateOrConnectWithoutUsersInput = {
    where: EstablishmentWhereUniqueInput
    create: XOR<EstablishmentCreateWithoutUsersInput, EstablishmentUncheckedCreateWithoutUsersInput>
  }

  export type EstablishmentUpsertWithoutUsersInput = {
    update: XOR<EstablishmentUpdateWithoutUsersInput, EstablishmentUncheckedUpdateWithoutUsersInput>
    create: XOR<EstablishmentCreateWithoutUsersInput, EstablishmentUncheckedCreateWithoutUsersInput>
    where?: EstablishmentWhereInput
  }

  export type EstablishmentUpdateToOneWithWhereWithoutUsersInput = {
    where?: EstablishmentWhereInput
    data: XOR<EstablishmentUpdateWithoutUsersInput, EstablishmentUncheckedUpdateWithoutUsersInput>
  }

  export type EstablishmentUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    couriers?: CourierUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentUncheckedUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    couriers?: CourierUncheckedUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUncheckedUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUncheckedUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUncheckedUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentCreateWithoutCouriersInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserCreateNestedManyWithoutEstablishmentInput
    orders?: OrderCreateNestedManyWithoutEstablishmentInput
    routes?: RouteCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUncheckedCreateWithoutCouriersInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutEstablishmentInput
    orders?: OrderUncheckedCreateNestedManyWithoutEstablishmentInput
    routes?: RouteUncheckedCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogUncheckedCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentCreateOrConnectWithoutCouriersInput = {
    where: EstablishmentWhereUniqueInput
    create: XOR<EstablishmentCreateWithoutCouriersInput, EstablishmentUncheckedCreateWithoutCouriersInput>
  }

  export type RouteCreateWithoutCourierInput = {
    id?: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    establishment: EstablishmentCreateNestedOneWithoutRoutesInput
    stops?: RouteStopCreateNestedManyWithoutRouteInput
    pings?: CourierPingCreateNestedManyWithoutRouteInput
  }

  export type RouteUncheckedCreateWithoutCourierInput = {
    id?: string
    establishmentId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    stops?: RouteStopUncheckedCreateNestedManyWithoutRouteInput
    pings?: CourierPingUncheckedCreateNestedManyWithoutRouteInput
  }

  export type RouteCreateOrConnectWithoutCourierInput = {
    where: RouteWhereUniqueInput
    create: XOR<RouteCreateWithoutCourierInput, RouteUncheckedCreateWithoutCourierInput>
  }

  export type RouteCreateManyCourierInputEnvelope = {
    data: RouteCreateManyCourierInput | RouteCreateManyCourierInput[]
    skipDuplicates?: boolean
  }

  export type EstablishmentUpsertWithoutCouriersInput = {
    update: XOR<EstablishmentUpdateWithoutCouriersInput, EstablishmentUncheckedUpdateWithoutCouriersInput>
    create: XOR<EstablishmentCreateWithoutCouriersInput, EstablishmentUncheckedCreateWithoutCouriersInput>
    where?: EstablishmentWhereInput
  }

  export type EstablishmentUpdateToOneWithWhereWithoutCouriersInput = {
    where?: EstablishmentWhereInput
    data: XOR<EstablishmentUpdateWithoutCouriersInput, EstablishmentUncheckedUpdateWithoutCouriersInput>
  }

  export type EstablishmentUpdateWithoutCouriersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentUncheckedUpdateWithoutCouriersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUncheckedUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUncheckedUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUncheckedUpdateManyWithoutEstablishmentNestedInput
  }

  export type RouteUpsertWithWhereUniqueWithoutCourierInput = {
    where: RouteWhereUniqueInput
    update: XOR<RouteUpdateWithoutCourierInput, RouteUncheckedUpdateWithoutCourierInput>
    create: XOR<RouteCreateWithoutCourierInput, RouteUncheckedCreateWithoutCourierInput>
  }

  export type RouteUpdateWithWhereUniqueWithoutCourierInput = {
    where: RouteWhereUniqueInput
    data: XOR<RouteUpdateWithoutCourierInput, RouteUncheckedUpdateWithoutCourierInput>
  }

  export type RouteUpdateManyWithWhereWithoutCourierInput = {
    where: RouteScalarWhereInput
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyWithoutCourierInput>
  }

  export type EstablishmentCreateWithoutOrdersInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierCreateNestedManyWithoutEstablishmentInput
    routes?: RouteCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUncheckedCreateWithoutOrdersInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierUncheckedCreateNestedManyWithoutEstablishmentInput
    routes?: RouteUncheckedCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogUncheckedCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentCreateOrConnectWithoutOrdersInput = {
    where: EstablishmentWhereUniqueInput
    create: XOR<EstablishmentCreateWithoutOrdersInput, EstablishmentUncheckedCreateWithoutOrdersInput>
  }

  export type RouteStopCreateWithoutOrderInput = {
    id?: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
    route: RouteCreateNestedOneWithoutStopsInput
  }

  export type RouteStopUncheckedCreateWithoutOrderInput = {
    id?: string
    routeId: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
  }

  export type RouteStopCreateOrConnectWithoutOrderInput = {
    where: RouteStopWhereUniqueInput
    create: XOR<RouteStopCreateWithoutOrderInput, RouteStopUncheckedCreateWithoutOrderInput>
  }

  export type EstablishmentUpsertWithoutOrdersInput = {
    update: XOR<EstablishmentUpdateWithoutOrdersInput, EstablishmentUncheckedUpdateWithoutOrdersInput>
    create: XOR<EstablishmentCreateWithoutOrdersInput, EstablishmentUncheckedCreateWithoutOrdersInput>
    where?: EstablishmentWhereInput
  }

  export type EstablishmentUpdateToOneWithWhereWithoutOrdersInput = {
    where?: EstablishmentWhereInput
    data: XOR<EstablishmentUpdateWithoutOrdersInput, EstablishmentUncheckedUpdateWithoutOrdersInput>
  }

  export type EstablishmentUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentUncheckedUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUncheckedUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUncheckedUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUncheckedUpdateManyWithoutEstablishmentNestedInput
  }

  export type RouteStopUpsertWithoutOrderInput = {
    update: XOR<RouteStopUpdateWithoutOrderInput, RouteStopUncheckedUpdateWithoutOrderInput>
    create: XOR<RouteStopCreateWithoutOrderInput, RouteStopUncheckedCreateWithoutOrderInput>
    where?: RouteStopWhereInput
  }

  export type RouteStopUpdateToOneWithWhereWithoutOrderInput = {
    where?: RouteStopWhereInput
    data: XOR<RouteStopUpdateWithoutOrderInput, RouteStopUncheckedUpdateWithoutOrderInput>
  }

  export type RouteStopUpdateWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
    route?: RouteUpdateOneRequiredWithoutStopsNestedInput
  }

  export type RouteStopUncheckedUpdateWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    routeId?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type EstablishmentCreateWithoutRoutesInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierCreateNestedManyWithoutEstablishmentInput
    orders?: OrderCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUncheckedCreateWithoutRoutesInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierUncheckedCreateNestedManyWithoutEstablishmentInput
    orders?: OrderUncheckedCreateNestedManyWithoutEstablishmentInput
    events?: DomainEventLogUncheckedCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentCreateOrConnectWithoutRoutesInput = {
    where: EstablishmentWhereUniqueInput
    create: XOR<EstablishmentCreateWithoutRoutesInput, EstablishmentUncheckedCreateWithoutRoutesInput>
  }

  export type CourierCreateWithoutRoutesInput = {
    id?: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
    establishment: EstablishmentCreateNestedOneWithoutCouriersInput
  }

  export type CourierUncheckedCreateWithoutRoutesInput = {
    id?: string
    establishmentId: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
  }

  export type CourierCreateOrConnectWithoutRoutesInput = {
    where: CourierWhereUniqueInput
    create: XOR<CourierCreateWithoutRoutesInput, CourierUncheckedCreateWithoutRoutesInput>
  }

  export type RouteStopCreateWithoutRouteInput = {
    id?: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
    order: OrderCreateNestedOneWithoutStopInput
  }

  export type RouteStopUncheckedCreateWithoutRouteInput = {
    id?: string
    orderId: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
  }

  export type RouteStopCreateOrConnectWithoutRouteInput = {
    where: RouteStopWhereUniqueInput
    create: XOR<RouteStopCreateWithoutRouteInput, RouteStopUncheckedCreateWithoutRouteInput>
  }

  export type RouteStopCreateManyRouteInputEnvelope = {
    data: RouteStopCreateManyRouteInput | RouteStopCreateManyRouteInput[]
    skipDuplicates?: boolean
  }

  export type CourierPingCreateWithoutRouteInput = {
    id?: string
    lat: number
    lng: number
    recordedAt: Date | string
  }

  export type CourierPingUncheckedCreateWithoutRouteInput = {
    id?: string
    lat: number
    lng: number
    recordedAt: Date | string
  }

  export type CourierPingCreateOrConnectWithoutRouteInput = {
    where: CourierPingWhereUniqueInput
    create: XOR<CourierPingCreateWithoutRouteInput, CourierPingUncheckedCreateWithoutRouteInput>
  }

  export type CourierPingCreateManyRouteInputEnvelope = {
    data: CourierPingCreateManyRouteInput | CourierPingCreateManyRouteInput[]
    skipDuplicates?: boolean
  }

  export type EstablishmentUpsertWithoutRoutesInput = {
    update: XOR<EstablishmentUpdateWithoutRoutesInput, EstablishmentUncheckedUpdateWithoutRoutesInput>
    create: XOR<EstablishmentCreateWithoutRoutesInput, EstablishmentUncheckedCreateWithoutRoutesInput>
    where?: EstablishmentWhereInput
  }

  export type EstablishmentUpdateToOneWithWhereWithoutRoutesInput = {
    where?: EstablishmentWhereInput
    data: XOR<EstablishmentUpdateWithoutRoutesInput, EstablishmentUncheckedUpdateWithoutRoutesInput>
  }

  export type EstablishmentUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentUncheckedUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUncheckedUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUncheckedUpdateManyWithoutEstablishmentNestedInput
    events?: DomainEventLogUncheckedUpdateManyWithoutEstablishmentNestedInput
  }

  export type CourierUpsertWithoutRoutesInput = {
    update: XOR<CourierUpdateWithoutRoutesInput, CourierUncheckedUpdateWithoutRoutesInput>
    create: XOR<CourierCreateWithoutRoutesInput, CourierUncheckedCreateWithoutRoutesInput>
    where?: CourierWhereInput
  }

  export type CourierUpdateToOneWithWhereWithoutRoutesInput = {
    where?: CourierWhereInput
    data: XOR<CourierUpdateWithoutRoutesInput, CourierUncheckedUpdateWithoutRoutesInput>
  }

  export type CourierUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    establishment?: EstablishmentUpdateOneRequiredWithoutCouriersNestedInput
  }

  export type CourierUncheckedUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteStopUpsertWithWhereUniqueWithoutRouteInput = {
    where: RouteStopWhereUniqueInput
    update: XOR<RouteStopUpdateWithoutRouteInput, RouteStopUncheckedUpdateWithoutRouteInput>
    create: XOR<RouteStopCreateWithoutRouteInput, RouteStopUncheckedCreateWithoutRouteInput>
  }

  export type RouteStopUpdateWithWhereUniqueWithoutRouteInput = {
    where: RouteStopWhereUniqueInput
    data: XOR<RouteStopUpdateWithoutRouteInput, RouteStopUncheckedUpdateWithoutRouteInput>
  }

  export type RouteStopUpdateManyWithWhereWithoutRouteInput = {
    where: RouteStopScalarWhereInput
    data: XOR<RouteStopUpdateManyMutationInput, RouteStopUncheckedUpdateManyWithoutRouteInput>
  }

  export type RouteStopScalarWhereInput = {
    AND?: RouteStopScalarWhereInput | RouteStopScalarWhereInput[]
    OR?: RouteStopScalarWhereInput[]
    NOT?: RouteStopScalarWhereInput | RouteStopScalarWhereInput[]
    id?: StringFilter<"RouteStop"> | string
    routeId?: StringFilter<"RouteStop"> | string
    orderId?: StringFilter<"RouteStop"> | string
    position?: IntFilter<"RouteStop"> | number
    status?: EnumStopStatusFilter<"RouteStop"> | $Enums.StopStatus
    etaSeconds?: IntFilter<"RouteStop"> | number
    legDistanceMeters?: IntFilter<"RouteStop"> | number
    resolvedAt?: DateTimeNullableFilter<"RouteStop"> | Date | string | null
    failureReason?: StringNullableFilter<"RouteStop"> | string | null
  }

  export type CourierPingUpsertWithWhereUniqueWithoutRouteInput = {
    where: CourierPingWhereUniqueInput
    update: XOR<CourierPingUpdateWithoutRouteInput, CourierPingUncheckedUpdateWithoutRouteInput>
    create: XOR<CourierPingCreateWithoutRouteInput, CourierPingUncheckedCreateWithoutRouteInput>
  }

  export type CourierPingUpdateWithWhereUniqueWithoutRouteInput = {
    where: CourierPingWhereUniqueInput
    data: XOR<CourierPingUpdateWithoutRouteInput, CourierPingUncheckedUpdateWithoutRouteInput>
  }

  export type CourierPingUpdateManyWithWhereWithoutRouteInput = {
    where: CourierPingScalarWhereInput
    data: XOR<CourierPingUpdateManyMutationInput, CourierPingUncheckedUpdateManyWithoutRouteInput>
  }

  export type CourierPingScalarWhereInput = {
    AND?: CourierPingScalarWhereInput | CourierPingScalarWhereInput[]
    OR?: CourierPingScalarWhereInput[]
    NOT?: CourierPingScalarWhereInput | CourierPingScalarWhereInput[]
    id?: StringFilter<"CourierPing"> | string
    routeId?: StringFilter<"CourierPing"> | string
    lat?: FloatFilter<"CourierPing"> | number
    lng?: FloatFilter<"CourierPing"> | number
    recordedAt?: DateTimeFilter<"CourierPing"> | Date | string
  }

  export type RouteCreateWithoutStopsInput = {
    id?: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    establishment: EstablishmentCreateNestedOneWithoutRoutesInput
    courier: CourierCreateNestedOneWithoutRoutesInput
    pings?: CourierPingCreateNestedManyWithoutRouteInput
  }

  export type RouteUncheckedCreateWithoutStopsInput = {
    id?: string
    establishmentId: string
    courierId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    pings?: CourierPingUncheckedCreateNestedManyWithoutRouteInput
  }

  export type RouteCreateOrConnectWithoutStopsInput = {
    where: RouteWhereUniqueInput
    create: XOR<RouteCreateWithoutStopsInput, RouteUncheckedCreateWithoutStopsInput>
  }

  export type OrderCreateWithoutStopInput = {
    id?: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
    establishment: EstablishmentCreateNestedOneWithoutOrdersInput
  }

  export type OrderUncheckedCreateWithoutStopInput = {
    id?: string
    establishmentId: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
  }

  export type OrderCreateOrConnectWithoutStopInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutStopInput, OrderUncheckedCreateWithoutStopInput>
  }

  export type RouteUpsertWithoutStopsInput = {
    update: XOR<RouteUpdateWithoutStopsInput, RouteUncheckedUpdateWithoutStopsInput>
    create: XOR<RouteCreateWithoutStopsInput, RouteUncheckedCreateWithoutStopsInput>
    where?: RouteWhereInput
  }

  export type RouteUpdateToOneWithWhereWithoutStopsInput = {
    where?: RouteWhereInput
    data: XOR<RouteUpdateWithoutStopsInput, RouteUncheckedUpdateWithoutStopsInput>
  }

  export type RouteUpdateWithoutStopsInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    establishment?: EstablishmentUpdateOneRequiredWithoutRoutesNestedInput
    courier?: CourierUpdateOneRequiredWithoutRoutesNestedInput
    pings?: CourierPingUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateWithoutStopsInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    courierId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pings?: CourierPingUncheckedUpdateManyWithoutRouteNestedInput
  }

  export type OrderUpsertWithoutStopInput = {
    update: XOR<OrderUpdateWithoutStopInput, OrderUncheckedUpdateWithoutStopInput>
    create: XOR<OrderCreateWithoutStopInput, OrderUncheckedCreateWithoutStopInput>
    where?: OrderWhereInput
  }

  export type OrderUpdateToOneWithWhereWithoutStopInput = {
    where?: OrderWhereInput
    data: XOR<OrderUpdateWithoutStopInput, OrderUncheckedUpdateWithoutStopInput>
  }

  export type OrderUpdateWithoutStopInput = {
    id?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    establishment?: EstablishmentUpdateOneRequiredWithoutOrdersNestedInput
  }

  export type OrderUncheckedUpdateWithoutStopInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RouteCreateWithoutPingsInput = {
    id?: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    establishment: EstablishmentCreateNestedOneWithoutRoutesInput
    courier: CourierCreateNestedOneWithoutRoutesInput
    stops?: RouteStopCreateNestedManyWithoutRouteInput
  }

  export type RouteUncheckedCreateWithoutPingsInput = {
    id?: string
    establishmentId: string
    courierId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
    stops?: RouteStopUncheckedCreateNestedManyWithoutRouteInput
  }

  export type RouteCreateOrConnectWithoutPingsInput = {
    where: RouteWhereUniqueInput
    create: XOR<RouteCreateWithoutPingsInput, RouteUncheckedCreateWithoutPingsInput>
  }

  export type RouteUpsertWithoutPingsInput = {
    update: XOR<RouteUpdateWithoutPingsInput, RouteUncheckedUpdateWithoutPingsInput>
    create: XOR<RouteCreateWithoutPingsInput, RouteUncheckedCreateWithoutPingsInput>
    where?: RouteWhereInput
  }

  export type RouteUpdateToOneWithWhereWithoutPingsInput = {
    where?: RouteWhereInput
    data: XOR<RouteUpdateWithoutPingsInput, RouteUncheckedUpdateWithoutPingsInput>
  }

  export type RouteUpdateWithoutPingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    establishment?: EstablishmentUpdateOneRequiredWithoutRoutesNestedInput
    courier?: CourierUpdateOneRequiredWithoutRoutesNestedInput
    stops?: RouteStopUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateWithoutPingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    courierId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stops?: RouteStopUncheckedUpdateManyWithoutRouteNestedInput
  }

  export type EstablishmentCreateWithoutEventsInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierCreateNestedManyWithoutEstablishmentInput
    orders?: OrderCreateNestedManyWithoutEstablishmentInput
    routes?: RouteCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentUncheckedCreateWithoutEventsInput = {
    id?: string
    name: string
    address: string
    lat: number
    lng: number
    createdAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutEstablishmentInput
    couriers?: CourierUncheckedCreateNestedManyWithoutEstablishmentInput
    orders?: OrderUncheckedCreateNestedManyWithoutEstablishmentInput
    routes?: RouteUncheckedCreateNestedManyWithoutEstablishmentInput
  }

  export type EstablishmentCreateOrConnectWithoutEventsInput = {
    where: EstablishmentWhereUniqueInput
    create: XOR<EstablishmentCreateWithoutEventsInput, EstablishmentUncheckedCreateWithoutEventsInput>
  }

  export type EstablishmentUpsertWithoutEventsInput = {
    update: XOR<EstablishmentUpdateWithoutEventsInput, EstablishmentUncheckedUpdateWithoutEventsInput>
    create: XOR<EstablishmentCreateWithoutEventsInput, EstablishmentUncheckedCreateWithoutEventsInput>
    where?: EstablishmentWhereInput
  }

  export type EstablishmentUpdateToOneWithWhereWithoutEventsInput = {
    where?: EstablishmentWhereInput
    data: XOR<EstablishmentUpdateWithoutEventsInput, EstablishmentUncheckedUpdateWithoutEventsInput>
  }

  export type EstablishmentUpdateWithoutEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUpdateManyWithoutEstablishmentNestedInput
  }

  export type EstablishmentUncheckedUpdateWithoutEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutEstablishmentNestedInput
    couriers?: CourierUncheckedUpdateManyWithoutEstablishmentNestedInput
    orders?: OrderUncheckedUpdateManyWithoutEstablishmentNestedInput
    routes?: RouteUncheckedUpdateManyWithoutEstablishmentNestedInput
  }

  export type UserCreateManyEstablishmentInput = {
    id?: string
    email: string
    name: string
    passwordHash: string
    createdAt?: Date | string
  }

  export type CourierCreateManyEstablishmentInput = {
    id?: string
    name: string
    phone: string
    active?: boolean
    createdAt?: Date | string
  }

  export type OrderCreateManyEstablishmentInput = {
    id?: string
    source: $Enums.OrderSourceKind
    externalId?: string | null
    customerName: string
    customerPhone?: string | null
    address: string
    reference?: string | null
    lat?: number | null
    lng?: number | null
    amountCents?: number
    notes?: string | null
    status?: $Enums.OrderStatus
    trackingToken: string
    routeId?: string | null
    createdAt?: Date | string
    deliveredAt?: Date | string | null
  }

  export type RouteCreateManyEstablishmentInput = {
    id?: string
    courierId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
  }

  export type DomainEventLogCreateManyEstablishmentInput = {
    id?: string
    name: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    occurredAt: Date | string
  }

  export type UserUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routes?: RouteUpdateManyWithoutCourierNestedInput
  }

  export type CourierUncheckedUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routes?: RouteUncheckedUpdateManyWithoutCourierNestedInput
  }

  export type CourierUncheckedUpdateManyWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stop?: RouteStopUpdateOneWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stop?: RouteStopUncheckedUpdateOneWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateManyWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    source?: EnumOrderSourceKindFieldUpdateOperationsInput | $Enums.OrderSourceKind
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: StringFieldUpdateOperationsInput | string
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: StringFieldUpdateOperationsInput | string
    reference?: NullableStringFieldUpdateOperationsInput | string | null
    lat?: NullableFloatFieldUpdateOperationsInput | number | null
    lng?: NullableFloatFieldUpdateOperationsInput | number | null
    amountCents?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumOrderStatusFieldUpdateOperationsInput | $Enums.OrderStatus
    trackingToken?: StringFieldUpdateOperationsInput | string
    routeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deliveredAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RouteUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    courier?: CourierUpdateOneRequiredWithoutRoutesNestedInput
    stops?: RouteStopUpdateManyWithoutRouteNestedInput
    pings?: CourierPingUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    courierId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stops?: RouteStopUncheckedUpdateManyWithoutRouteNestedInput
    pings?: CourierPingUncheckedUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateManyWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    courierId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DomainEventLogUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DomainEventLogUncheckedUpdateWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DomainEventLogUncheckedUpdateManyWithoutEstablishmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteCreateManyCourierInput = {
    id?: string
    establishmentId: string
    status?: $Enums.RouteStatus
    accessToken: string
    geometry?: string | null
    distanceMeters?: number
    durationSeconds?: number
    baselineDurationSeconds?: number
    createdAt?: Date | string
    startedAt?: Date | string | null
    finishedAt?: Date | string | null
  }

  export type RouteUpdateWithoutCourierInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    establishment?: EstablishmentUpdateOneRequiredWithoutRoutesNestedInput
    stops?: RouteStopUpdateManyWithoutRouteNestedInput
    pings?: CourierPingUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateWithoutCourierInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    stops?: RouteStopUncheckedUpdateManyWithoutRouteNestedInput
    pings?: CourierPingUncheckedUpdateManyWithoutRouteNestedInput
  }

  export type RouteUncheckedUpdateManyWithoutCourierInput = {
    id?: StringFieldUpdateOperationsInput | string
    establishmentId?: StringFieldUpdateOperationsInput | string
    status?: EnumRouteStatusFieldUpdateOperationsInput | $Enums.RouteStatus
    accessToken?: StringFieldUpdateOperationsInput | string
    geometry?: NullableStringFieldUpdateOperationsInput | string | null
    distanceMeters?: IntFieldUpdateOperationsInput | number
    durationSeconds?: IntFieldUpdateOperationsInput | number
    baselineDurationSeconds?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RouteStopCreateManyRouteInput = {
    id?: string
    orderId: string
    position: number
    status?: $Enums.StopStatus
    etaSeconds?: number
    legDistanceMeters?: number
    resolvedAt?: Date | string | null
    failureReason?: string | null
  }

  export type CourierPingCreateManyRouteInput = {
    id?: string
    lat: number
    lng: number
    recordedAt: Date | string
  }

  export type RouteStopUpdateWithoutRouteInput = {
    id?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
    order?: OrderUpdateOneRequiredWithoutStopNestedInput
  }

  export type RouteStopUncheckedUpdateWithoutRouteInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RouteStopUncheckedUpdateManyWithoutRouteInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    status?: EnumStopStatusFieldUpdateOperationsInput | $Enums.StopStatus
    etaSeconds?: IntFieldUpdateOperationsInput | number
    legDistanceMeters?: IntFieldUpdateOperationsInput | number
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    failureReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CourierPingUpdateWithoutRouteInput = {
    id?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierPingUncheckedUpdateWithoutRouteInput = {
    id?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourierPingUncheckedUpdateManyWithoutRouteInput = {
    id?: StringFieldUpdateOperationsInput | string
    lat?: FloatFieldUpdateOperationsInput | number
    lng?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}