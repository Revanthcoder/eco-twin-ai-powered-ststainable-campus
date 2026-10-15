import { prisma } from '../repositories/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';

export async function getAllSettings(includePrivate = false) {
  const where = includePrivate ? {} : { isPublic: true };
  const settings = await prisma.systemSetting.findMany({
    where,
    orderBy: { key: 'asc' }
  });

  return settings.map((s) => ({
    key: s.key,
    value: parseSettingValue(s.value, s.dataType),
    dataType: s.dataType,
    description: s.description,
    isPublic: s.isPublic,
    updatedAt: s.updatedAt.toISOString()
  }));
}

export async function updateSettings(settingsList) {
  const updatedResults = [];

  for (const item of settingsList) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: item.key }
    });

    if (existing) {
      const updated = await prisma.systemSetting.update({
        where: { key: item.key },
        data: { value: String(item.value) }
      });
      updatedResults.push({
        key: updated.key,
        value: parseSettingValue(updated.value, updated.dataType),
        updatedAt: updated.updatedAt.toISOString()
      });
    }
  }

  return updatedResults;
}

function parseSettingValue(val, type) {
  if (type === 'FLOAT') return parseFloat(val);
  if (type === 'INT') return parseInt(val, 10);
  if (type === 'BOOLEAN') return val === 'true';
  if (type === 'JSON') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}
