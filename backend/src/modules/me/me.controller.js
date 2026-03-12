import { createHttpError } from '../../utils/http-error.js';
import { getUserById } from '../users/users.repository.js';
import { getUserPermissions } from '../permissions/permissions.repository.js';
import { getUserGroupsMeta } from '../groups/groups.repository.js';

export const getMeHandler = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw createHttpError(401, 'Unauthorized');
    }

    const user = await getUserById(userId);
    if (!user) {
      throw createHttpError(404, 'Usuario no encontrado');
    }

    const [permissions, groups] = await Promise.all([
      getUserPermissions(userId),
      getUserGroupsMeta(userId)
    ]);

    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      nombre: user.name,
      estado: user.estado,
      requiere_cambio_password: user.requiere_cambio_password,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.status(200).json({
      data: {
        user: userPayload,
        groups,
        permissions
      }
    });
  } catch (err) {
    next(err);
  }
};
