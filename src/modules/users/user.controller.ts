import { NextRequest, NextResponse } from 'next/server';
import { usersService } from './user.service';
import { createProfileSchema } from './dto/create-user.dto';
import { updateProfileSchema } from './dto/update-profile.dto';
import { changePasswordSchema } from './dto/change-password.dto';
import { updateRoleSchema } from './dto/update-user-role.dto';
import { listUsersQuerySchema } from './dto/list-users.dto';
import { requireAuth, requireRole} from '../../lib/auth-guard';
import { handleError } from '../../lib/error-handler';

export const usersController = {
    async getMe(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            const profile = await usersService.getProfile(auth.sub);
            return NextResponse.json(profile);
        } catch (err) {
            return handleError(err);
        }
    },
    async getById(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const profile = await usersService.getUserById(params.id);
            return NextResponse.json(profile);
        } catch (err) {
            return handleError(err);
        }
    },

    async create(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = createProfileSchema.parse(await req.json());
            console.log('Creating user with data', body);
            const user = await usersService.createUser(body);
            return NextResponse.json(user, { status: 201 });
        } catch (err) {
            return handleError(err);
        }
    },

    async updateMe(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            const body = updateProfileSchema.parse(await req.json());
            const updated = await usersService.updateProfile(auth.sub, body);
            return NextResponse.json(updated);
        } catch (err) {
            return handleError(err);
        }
    },

    async changePassword(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            const body = changePasswordSchema.parse(await req.json());
            await usersService.changePassword(auth.sub, body);
            return NextResponse.json({ success: true });
        } catch (err) {
            return handleError(err);
        }
    },

    async list(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const url = new URL(req.url);
            const query = listUsersQuerySchema.parse({
                page: url.searchParams.get('page') ?? undefined,
                limit: url.searchParams.get('limit') ?? undefined,
            });

            const result = await usersService.listUsers(query.page, query.limit);
            return NextResponse.json(result);
        } catch (err) {
            return handleError(err);
        }
    },

    async updateRole(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = updateRoleSchema.parse(await req.json());
            const updated = await usersService.updateRole(params.id, body.role, auth.sub);
            return NextResponse.json(updated);
        } catch (err) {
            return handleError(err);
        }
    },

    async delete(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            await usersService.deleteUser(params.id, auth.sub);
            return NextResponse.json({ success: true });
        } catch (err) {
            return handleError(err);
        }
    },
};