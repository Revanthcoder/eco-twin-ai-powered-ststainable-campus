import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../repositories/prismaClient.js';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password credentials');
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });

    return successResponse(res, {
      user: payload,
      token,
      expiresIn: config.JWT_EXPIRES_IN
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    return successResponse(res, { user: req.user });
  } catch (err) {
    next(err);
  }
}
