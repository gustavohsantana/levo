import type { Route as RouteRow, RouteStop as StopRow } from '@/generated/prisma/client';
import { Route, RouteStop, type RouteStatus, type StopStatus, Token } from '@/core';

export const RouteMapper = {
  toDomain(row: RouteRow & { stops: StopRow[] }): Route {
    return Route.restore({
      id: row.id,
      establishmentId: row.establishmentId,
      courierId: row.courierId,
      status: row.status as RouteStatus,
      accessToken: Token.create(row.accessToken),
      stops: [...row.stops]
        .sort((a, b) => a.position - b.position)
        .map((stop) =>
          RouteStop.restore({
            id: stop.id,
            orderId: stop.orderId,
            position: stop.position,
            status: stop.status as StopStatus,
            etaSeconds: stop.etaSeconds,
            legDistanceMeters: stop.legDistanceMeters,
            resolvedAt: stop.resolvedAt,
            failureReason: stop.failureReason,
          }),
        ),
      geometry: row.geometry,
      distanceMeters: row.distanceMeters,
      durationSeconds: row.durationSeconds,
      baselineDurationSeconds: row.baselineDurationSeconds,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
    });
  },

  toPersistence(route: Route) {
    return {
      id: route.id,
      establishmentId: route.establishmentId,
      courierId: route.courierId,
      status: route.status,
      accessToken: route.accessToken.value,
      geometry: route.geometry,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      baselineDurationSeconds: route.baselineDurationSeconds,
      createdAt: route.createdAt,
      startedAt: route.startedAt,
      finishedAt: route.finishedAt,
    };
  },

  stopToPersistence(stop: RouteStop, routeId: string) {
    return {
      id: stop.id,
      routeId,
      orderId: stop.orderId,
      position: stop.position,
      status: stop.status,
      etaSeconds: stop.etaSeconds,
      legDistanceMeters: stop.legDistanceMeters,
      resolvedAt: stop.resolvedAt,
      failureReason: stop.failureReason,
    };
  },
};
