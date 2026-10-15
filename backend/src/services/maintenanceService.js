import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// Permitted status transitions state machine
const PERMITTED_TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'PENDING'],
  COMPLETED: ['IN_PROGRESS'], // Reopening
  CANCELLED: ['PENDING'] // Reopening
};

export async function getMaintenanceTasks(filters = {}) {
  const { buildingId, status, priority, limit = 50, offset = 0 } = filters;
  const where = {};

  if (buildingId) where.buildingId = buildingId;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [total, tasks] = await Promise.all([
    prisma.maintenanceTask.count({ where }),
    prisma.maintenanceTask.findMany({
      where,
      include: {
        building: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true } },
        alert: { select: { id: true, title: true, category: true, severity: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        _count: { select: { history: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      buildingId: t.buildingId,
      buildingName: t.building?.name || null,
      zoneId: t.zoneId,
      zoneName: t.zone?.name || null,
      alertId: t.alertId,
      alertTitle: t.alert?.title || null,
      assignedTo: t.assignedToUser ? { id: t.assignedToUser.id, name: t.assignedToUser.name } : null,
      dueDate: t.dueDate?.toISOString() || null,
      completedAt: t.completedAt?.toISOString() || null,
      historyCount: t._count.history,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: offset + tasks.length < total
    }
  };
}

export async function getMaintenanceTaskById(id) {
  const task = await prisma.maintenanceTask.findUnique({
    where: { id },
    include: {
      building: { select: { id: true, name: true, code: true } },
      zone: { select: { id: true, name: true } },
      alert: { select: { id: true, title: true, category: true, severity: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      history: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!task) {
    throw new NotFoundError('Maintenance Task', id);
  }

  return {
    ...task,
    history: task.history.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      changedBy: h.changedBy,
      note: h.note,
      createdAt: h.createdAt.toISOString()
    }))
  };
}

export async function createMaintenanceTask(data, creatorUser = null) {
  if (data.buildingId) {
    const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
    if (!building) throw new NotFoundError('Building', data.buildingId);
  }

  if (data.alertId) {
    const alert = await prisma.alert.findUnique({ where: { id: data.alertId } });
    if (!alert) throw new NotFoundError('Alert', data.alertId);
  }

  const creatorName = creatorUser ? creatorUser.name : 'SustainabilityOperator';

  const task = await prisma.maintenanceTask.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
      buildingId: data.buildingId || null,
      zoneId: data.zoneId || null,
      alertId: data.alertId || null,
      assignedToId: data.assignedToId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      history: {
        create: {
          previousStatus: 'NONE',
          newStatus: 'PENDING',
          changedBy: creatorName,
          note: 'Maintenance task initiated.'
        }
      }
    },
    include: {
      building: { select: { id: true, name: true } },
      assignedToUser: { select: { id: true, name: true } }
    }
  });

  return task;
}

export async function updateMaintenanceTask(id, updateData, user = null) {
  const task = await prisma.maintenanceTask.findUnique({ where: { id } });
  if (!task) {
    throw new NotFoundError('Maintenance Task', id);
  }

  const updaterName = user ? user.name : 'SustainabilityOperator';
  const dataToUpdate = {};

  if (updateData.priority) dataToUpdate.priority = updateData.priority;
  if (updateData.assignedToId !== undefined) dataToUpdate.assignedToId = updateData.assignedToId;

  // Validate status transition
  if (updateData.status && updateData.status !== task.status) {
    const allowed = PERMITTED_TRANSITIONS[task.status] || [];
    if (!allowed.includes(updateData.status)) {
      throw new ValidationError(
        `Invalid status transition from '${task.status}' to '${updateData.status}'. Permitted next states: [${allowed.join(', ')}]`
      );
    }

    dataToUpdate.status = updateData.status;
    if (updateData.status === 'COMPLETED') {
      dataToUpdate.completedAt = new Date();
    }

    const [updatedTask] = await prisma.$transaction([
      prisma.maintenanceTask.update({
        where: { id },
        data: dataToUpdate
      }),
      prisma.maintenanceHistory.create({
        data: {
          taskId: id,
          previousStatus: task.status,
          newStatus: updateData.status,
          changedBy: updaterName,
          note: updateData.note || `Transitioned status from ${task.status} to ${updateData.status}`
        }
      })
    ]);

    return updatedTask;
  }

  // Update without status transition
  const updatedTask = await prisma.maintenanceTask.update({
    where: { id },
    data: dataToUpdate
  });

  return updatedTask;
}
