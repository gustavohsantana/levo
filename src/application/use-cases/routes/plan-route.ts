import {
  type Clock,
  type Coordinates,
  CourierUnavailableError,
  EmptyRouteError,
  type IdGenerator,
  NotFoundError,
  OrderAlreadyRoutedError,
  OrderNotGeocodedError,
  ValidationError,
  Route,
  RouteStop,
  type RouteOptimizer,
  RouteTooLargeError,
  type RoutingService,
  type UnitOfWork,
  baselineDuration,
} from '@/core';
import { mensagemDaRota, telefoneParaWhatsApp } from '@/core/services/route-message';

interface Input {
  courierId: string;
  orderIds: string[];
}

/** Cabe num baú de moto; acima disso a comida chega fria. */
const MAX_STOPS = 15;

export class PlanRoute {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly routing: RoutingService,
    private readonly optimizer: RouteOptimizer,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly maxStops: number = MAX_STOPS,
    /** Endereço público, para montar o link do motoboy. Vazio desliga o aviso. */
    private readonly baseUrl: string = '',
  ) {}

  async execute(input: Input): Promise<Route> {
    if (input.orderIds.length === 0) throw new EmptyRouteError();
    if (input.orderIds.length > this.maxStops) {
      throw new RouteTooLargeError(input.orderIds.length, this.maxStops);
    }

    // ── 1. Ler e validar (transação curta) ────────────────────────────────
    const { establishmentId, origin, orders, semPino } = await this.uow.run(async (repos) => {
      const courier = await repos.couriers.findById(input.courierId);
      if (!courier) throw new NotFoundError('Motoboy', input.courierId);
      if (!courier.active) throw new CourierUnavailableError(input.courierId);
      /*
       * Uma leva na fila por vez. Estar na rua não impede montar a próxima —
       * essa é a trava que mudou de lugar, para o momento em que ele sai.
       */
      if (await repos.routes.hasPlannedRouteFor(input.courierId)) {
        throw new CourierUnavailableError(input.courierId);
      }

      const establishment = await repos.establishments.current();
      const found = await repos.orders.findManyByIds(input.orderIds);
      const byId = new Map(found.map((order) => [order.id, order]));

      // Preserva a ordem em que o dono selecionou/recebeu os pedidos: é ela que
      // define a linha de base da comparação.
      const ordered = input.orderIds.map((id) => {
        const order = byId.get(id);
        if (!order) throw new NotFoundError('Pedido', id);
        if (order.status !== 'NEW') throw new OrderAlreadyRoutedError(id);
        /*
         * Retirada não entra em rota: quem busca é o cliente.
         */
        if (order.isPickup) {
          throw new ValidationError(
            `${order.customerName} é retirada no balcão — não entra em rota.`,
          );
        }
        return order;
      });

      /*
       * Pedido sem pino entra na rota, no fim.
       *
       * Sem coordenada o otimizador não tem o que calcular — isso é aritmética,
       * não política. Mas bloquear era a resposta errada: no papel, o dono
       * simplesmente levava o endereço junto, e o motoboy achava. Travar o
       * pedido fazia o sistema ser pior que o caderno.
       *
       * Então os localizados são otimizados, e os sem pino vão ao fim da
       * sequência, com o endereço escrito. O motoboy os vê por último, sabe que
       * são os "sem mapa", e resolve como sempre resolveu.
       *
       * Ao fim, e não no meio, porque a ordem deles é a única coisa que não
       * sabemos: colocá-los entre paradas calculadas estragaria o trajeto que
       * conhecemos para acomodar o que não conhecemos.
       */
      const comPino = ordered.filter((order) => order.isGeocoded);
      const semPino = ordered.filter((order) => !order.isGeocoded);

      if (comPino.length === 0) throw new OrderNotGeocodedError(ordered[0]?.id ?? '');

      return {
        establishmentId: establishment.id,
        origin: establishment.coordinates,
        orders: comPino,
        semPino,
      };
    });

    // ── 2. Falar com o roteirizador (fora da transação) ───────────────────
    const points: Coordinates[] = [origin, ...orders.map((order) => order.coordinates!)];
    const matrix = await this.routing.durationMatrix(points);

    /**
     * ⭐ A comparação que vende o produto.
     *
     * `baseline` é o tempo da rota na ordem em que os pedidos chegaram — o que
     * aconteceria hoje, com o maço de papéis. `optimized` é o que o Levô
     * propõe. Os dois saem da **mesma matriz**, então a comparação é honesta:
     * mesmo motor, mesmo trânsito, mesmo momento. Comparar contra uma
     * estimativa inventada daria um número maior e sem valor nenhum.
     */
    const baseline = baselineDuration(matrix);
    const optimized = this.optimizer.optimize(matrix);

    /*
     * Os sem pino vão ao fim, na ordem em que o dono os escolheu.
     *
     * Não há como ordená-los: sem coordenada não existe distância entre eles. A
     * ordem de seleção é o único critério que o dono reconhece, e ele escolheu
     * por algum motivo.
     */
    const sequence = [...optimized.order.map((index) => orders[index - 1]), ...semPino];
    /*
     * O traçado cobre só quem tem pino. Os outros não têm por onde passar, e
     * desenhar uma linha até um ponto inventado seria pior que não desenhar.
     */
    const path = await this.routing.path([
      origin,
      ...sequence.filter((order) => order.isGeocoded).map((order) => order.coordinates!),
      origin,
    ]);

    // ── 3. Persistir tudo de uma vez ──────────────────────────────────────
    return this.uow.run(async (repos) => {
      /**
       * Revalidação dentro da transação de escrita.
       *
       * Entre a leitura do passo 1 e este momento houve duas chamadas de rede
       * ao roteirizador — segundos em que outra aba, ou o próprio dono clicando
       * duas vezes, pode ter despachado os mesmos pedidos. Sem esta recarga, os
       * dois planejamentos passariam pela validação e o pedido entraria em duas
       * rotas: uma entrega fantasma no baú de um motoboy e um cliente que nunca
       * recebe.
       *
       * As entidades relidas aqui SUBSTITUEM as do passo 1, senão gravaríamos
       * de volta o estado velho por cima do novo.
       */
      const fresh = await repos.orders.findManyByIds(sequence.map((order) => order.id));
      const freshById = new Map(fresh.map((order) => [order.id, order]));

      const confirmed = sequence.map((stale) => {
        const order = freshById.get(stale.id);
        if (!order) throw new NotFoundError('Pedido', stale.id);
        if (order.status !== 'NEW') throw new OrderAlreadyRoutedError(order.id);
        /*
         * Retirada não entra em rota.
         *
         * Recusar aqui, e não só esconder da tela, porque a tela não é a única
         * porta: importação de marketplace e pedido montado por outra aba
         * chegam por caminhos diferentes. Um pedido de balcão no baú do motoboy
         * é uma entrega que ninguém pediu, num endereço que é a própria loja.
         */
        if (order.isPickup) {
          throw new ValidationError(
            `${order.customerName} é retirada no balcão — não entra em rota.`,
          );
        }
        return order;
      });

      /*
       * Adiantar a próxima leva é permitido; empilhar duas não.
       *
       * O pedido fica pronto às 20h10 e o motoboy volta às 20h25. Bloquear até
       * ele chegar são quinze minutos de comida esfriando por burocracia — e o
       * dono ainda teria que lembrar de alocar depois, no meio do movimento.
       *
       * Com a rota planejada antes, ele chega e já sai: o pedido está separado,
       * a sequência calculada, e "saiu para entrega" despacha tudo de uma vez.
       *
       * O limite é uma leva na fila. Duas não é adiantamento, é bagunça: ele não
       * saberia qual sai primeiro, e o dono perderia a conta do que já separou.
       */
      if (await repos.routes.hasPlannedRouteFor(input.courierId)) {
        throw new CourierUnavailableError(input.courierId);
      }

      const routeId = this.ids.next();
      const now = this.clock.now();

      // ETA acumulado perna a perna: `legs[k]` é o trecho até a parada k+1.
      let elapsed = 0;
      const stops = confirmed.map((order, index) => {
        const leg = path.legs[index];
        elapsed += leg?.durationSeconds ?? 0;
        return RouteStop.create({
          id: this.ids.next(),
          orderId: order.id,
          position: index + 1,
          etaSeconds: elapsed,
          legDistanceMeters: leg?.distanceMeters ?? 0,
        });
      });

      const route = Route.plan({
        id: routeId,
        establishmentId,
        courierId: input.courierId,
        stops,
        geometry: path.geometry,
        distanceMeters: path.distanceMeters,
        // Vem da matriz, não do traçado, para ficar comparável com o baseline.
        durationSeconds: Math.round(optimized.totalDurationSeconds),
        baselineDurationSeconds: Math.round(baseline),
        now,
      });

      for (const order of confirmed) order.assignToRoute(routeId, now);

      await repos.routes.save(route);
      await repos.orders.saveMany(confirmed);
      await repos.events.append([
        ...route.pullEvents(),
        ...confirmed.flatMap((order) => order.pullEvents()),
      ]);

      /*
       * A mensagem entra na mesma transação da rota.
       *
       * Fora dela, uma queda entre gravar e enfileirar deixaria o motoboy com
       * uma rota que ninguém avisou. Dentro, ou as duas existem ou nenhuma —
       * e o envio em si é do worker, que pode falhar à vontade sem levar o
       * despacho junto.
       */
      if (this.baseUrl) {
        const courier = await repos.couriers.findById(input.courierId);
        const loja = await repos.establishments.current();

        /*
         * O Telegram não passa pelo interruptor da loja.
         *
         * O motoboy tocou no convite: o consentimento dele É a autorização, e
         * é o que torna o canal seguro. Exigir um segundo "sim" do dono para
         * uma mensagem que o destinatário já pediu seria burocracia sem ganho.
         *
         * O WhatsApp continua atrás do interruptor porque lá é o contrário:
         * ninguém autorizou nada, e quem paga a conta de um envio mal visto é
         * o número da loja.
         */
        const canal =
          courier?.telegramChatId
            ? { channel: 'TELEGRAM' as const, destination: courier.telegramChatId }
            : loja.whatsappRoutes && courier
              ? (() => {
                  const tel = telefoneParaWhatsApp(courier.phone.value);
                  return tel ? { channel: 'WHATSAPP' as const, destination: tel } : null;
                })()
              : null;

        if (courier && canal) {
          const link = `${this.baseUrl.replace(/\/$/, '')}/m/${route.accessToken}`;

          await repos.courierNotifications.enqueue({
            routeId: route.id,
            ...canal,
            link,
            /*
             * No Telegram o link vira botão, então ele sai do corpo. No
             * WhatsApp não existe botão: lá o link É a mensagem.
             */
            text: mensagemDaRota({
              courierName: courier.name,
              storeName: loja.name,
              stops: stops.length,
              link,
              comBotao: canal.channel === 'TELEGRAM',
            }),
          });
        }
      }

      return route;
    });
  }
}
