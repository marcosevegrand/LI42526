import { appError } from '../../shared/auth/session';
import type { SessionUser } from '../../shared/auth/session';
import { InterventionsRepository } from './interventions.repository';

type CreateInterventionInput = {
  serviceOrderId: string;
  description: string;
  mechanicUserId: string;
  notes?: string;
  elapsedSeconds: number;
  timerState: 'idle' | 'running' | 'paused' | 'stopped';
};

export class InterventionsService {
  constructor(private readonly repository = new InterventionsRepository()) {}

  async listByServiceOrderId(serviceOrderId: string) {
    const interventions = await this.repository.listByServiceOrderId(serviceOrderId);
    return interventions.map((intervention: unknown) => this.toDto(intervention));
  }

  async create(input: CreateInterventionInput, sessionUser: SessionUser) {
    const serviceOrderExists = await this.repository.serviceOrderExists(input.serviceOrderId);
    if (!serviceOrderExists) {
      throw appError(400, 'invalid_service_order', 'serviceOrderId does not exist');
    }

    if (sessionUser.role === 'mechanic' && sessionUser.id !== input.mechanicUserId) {
      throw appError(403, 'forbidden', 'Mechanic can only create interventions assigned to self');
    }

    const intervention = await this.repository.create(input);
    return this.toDto(intervention);
  }

  async getById(id: string) {
    const intervention = await this.repository.findById(id);
    if (!intervention) {
      throw appError(404, 'not_found', 'Intervention not found');
    }

    return this.toDto(intervention);
  }

  async update(
    id: string,
    input: {
      description?: string;
      mechanicUserId?: string;
      notes?: string;
    },
    sessionUser: SessionUser,
  ) {
    const intervention = await this.repository.findById(id);
    if (!intervention) {
      throw appError(404, 'not_found', 'Intervention not found');
    }

    if (sessionUser.role === 'mechanic' && intervention.mechanicUserId !== sessionUser.id) {
      throw appError(403, 'forbidden', 'Mechanic can only update own interventions');
    }

    const updated = await this.repository.updateIntervention(id, input);
    return this.toDto(updated);
  }

  async updateTimer(input: {
    id: string;
    timerState: 'idle' | 'running' | 'paused' | 'stopped';
  }) {
    const intervention = await this.repository.findById(input.id);
    if (!intervention) {
      throw appError(404, 'not_found', 'Intervention not found');
    }

    const currentTimerState = intervention.timerState;
    const now = new Date();

    if (input.timerState === 'running') {
      if (currentTimerState === 'running') {
        throw appError(409, 'invalid_timer_transition', 'Timer is already running');
      }
      if (currentTimerState !== 'idle' && currentTimerState !== 'paused') {
        throw appError(
          409,
          'invalid_timer_transition',
          `Cannot start timer from state ${currentTimerState}`,
        );
      }

      const updated = await this.repository.updateTimerState({
        id: input.id,
        timerState: 'running',
        timerStartedAt: now,
      });
      return this.toDto(updated);
    }

    if (input.timerState === 'paused') {
      if (currentTimerState !== 'running') {
        throw appError(409, 'invalid_timer_transition', 'Timer can only be paused from running');
      }

      const deltaSeconds = this.computeElapsedDeltaSeconds(intervention.timerStartedAt, now);
      const updated = await this.repository.updateTimerState({
        id: input.id,
        timerState: 'paused',
        elapsedSeconds: intervention.elapsedSeconds + deltaSeconds,
        timerStartedAt: null,
      });
      return this.toDto(updated);
    }

    if (input.timerState === 'stopped') {
      if (currentTimerState !== 'running' && currentTimerState !== 'paused') {
        throw appError(
          409,
          'invalid_timer_transition',
          'Timer can only be stopped from running or paused',
        );
      }

      const deltaSeconds =
        currentTimerState === 'running'
          ? this.computeElapsedDeltaSeconds(intervention.timerStartedAt, now)
          : 0;

      const updated = await this.repository.updateTimerState({
        id: input.id,
        timerState: 'stopped',
        elapsedSeconds: intervention.elapsedSeconds + deltaSeconds,
        timerStartedAt: null,
      });
      return this.toDto(updated);
    }

    if (input.timerState === 'idle') {
      if (currentTimerState !== 'stopped') {
        throw appError(
          409,
          'invalid_timer_transition',
          'Timer can only return to idle after being stopped',
        );
      }

      const updated = await this.repository.updateTimerState({
        id: input.id,
        timerState: 'idle',
        elapsedSeconds: intervention.elapsedSeconds,
        timerStartedAt: null,
      });
      return this.toDto(updated);
    }

    throw appError(400, 'validation_error', 'Invalid timer state');
  }

  async attachPart(input: {
    interventionId: string;
    partReference: string;
    quantity: number;
    note?: string;
  }) {
    const intervention = await this.repository.findById(input.interventionId);
    if (!intervention) {
      throw appError(404, 'not_found', 'Intervention not found');
    }

    try {
      const result = await this.repository.attachPart(input);
      if (!result) {
        throw appError(404, 'not_found', 'Part not found');
      }

      return {
        partReference: result.partReference,
        quantity: result.quantity,
        note: result.note ?? undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'insufficient_stock') {
        throw appError(409, 'insufficient_stock', 'Not enough stock for requested quantity');
      }
      throw error;
    }
  }

  async timerStart(id: string) {
    return this.updateTimer({ id, timerState: 'running' });
  }

  async timerPause(id: string) {
    return this.updateTimer({ id, timerState: 'paused' });
  }

  async timerStop(id: string) {
    return this.updateTimer({ id, timerState: 'stopped' });
  }

  async listParts(interventionId: string) {
    const intervention = await this.repository.findById(interventionId);
    if (!intervention) {
      throw appError(404, 'not_found', 'Intervention not found');
    }

    const parts = await this.repository.listPartsByIntervention(interventionId);
    return parts.map((part: unknown) => {
      const source = part as {
        partReference: string;
        quantity: number;
        note: string | null;
      };

      return {
        partReference: source.partReference,
        quantity: source.quantity,
        note: source.note ?? undefined,
      };
    });
  }

  private toDto(intervention: unknown) {
    const source = intervention as {
      id: string;
      description: string;
      mechanicUserId: string;
      notes: string | null;
      elapsedSeconds: number;
      timerState: 'idle' | 'running' | 'paused' | 'stopped';
      timerStartedAt?: Date | null;
    };

    return {
      id: source.id,
      description: source.description,
      mechanicUserId: source.mechanicUserId,
      notes: source.notes ?? undefined,
      elapsedSeconds: source.elapsedSeconds,
      timerState: source.timerState,
      timerStartedAt: source.timerStartedAt ? source.timerStartedAt.toISOString() : undefined,
    };
  }

  private computeElapsedDeltaSeconds(timerStartedAt: Date | null | undefined, now: Date) {
    if (!timerStartedAt) {
      return 0;
    }

    const delta = Math.floor((now.getTime() - timerStartedAt.getTime()) / 1000);
    return Math.max(delta, 0);
  }
}