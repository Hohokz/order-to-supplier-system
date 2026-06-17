import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
    SupplierNotFoundError,
    SupplierAlreadyExistsError,
    SupplierStatusError,
    CannotDeleteSupplierError
} from '@/modules/suppliers/supplier.error';
import {
    CannotModifySelfRoleError,
    IncorrectPasswordError,
    InvalidCredentialsError,
    UsernameAlreadyExistsError,
    UserNotFoundError
} from '@/modules/users/user.error';
import { ForbiddenError, UnauthorizedError } from './auth-guard';
import { UnitNotFoundError } from '@/modules/units/unit.error';
import { InventoryNameAlreadyExist, InventoryNotFoundError, InventoryUsingSupplier, InventoryUsingUnit } from '@/modules/inventories/inventory.error';
import { OrderNotFoundError, OrderSignatureIsEmpty } from '@/modules/order/order.error';

// นำเข้าฟังก์ชันจัดรูปแบบ Zod Error ของคุณ
export interface FormattedZodIssue {
    field: string;
    message: string;
}

export function formatZodError(err: ZodError): FormattedZodIssue[] {
    return err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));
}

export function handleError(err: unknown) {
    // 1. จัดการ Zod Validation Errors
    if (err instanceof ZodError) {
        return NextResponse.json(
            { error: 'Validation failed', details: formatZodError(err) },
            { status: 400 }
        );
    }
    // 1. จัดการ Authentication Errors (ตัวอย่าง)
    if (err instanceof ZodError) {
        return NextResponse.json({ error: formatZodError(err) }, { status: 400 });
    }
    if (err instanceof UsernameAlreadyExistsError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof InvalidCredentialsError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof UserNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
    }

    // 2. จัดการ User Domain Errors (ตัวอย่าง)
    if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError || err instanceof CannotModifySelfRoleError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof UserNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof UsernameAlreadyExistsError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof IncorrectPasswordError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }

    // 3. จัดการ Supplier Domain Errors
    if (err instanceof SupplierNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof SupplierAlreadyExistsError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof SupplierStatusError) {
        return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof CannotDeleteSupplierError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof InventoryUsingSupplier){
        return NextResponse.json({error: err.message}, {status:500})
    }

    //4. จัดการ Unit Domain Error
    if(err instanceof UnitNotFoundError){
        return NextResponse.json({error: err.message}, {status:404});
    }
    if(err instanceof InventoryUsingUnit){
        return NextResponse.json({error: err.message}, {status:500})
    }

    //5. จัดการ Inventory Domain Error
    if(err instanceof InventoryNotFoundError){
        return NextResponse.json({error: err.message}, {status:404});
    }
    if(err instanceof InventoryNameAlreadyExist){
        return NextResponse.json({error: err.message}, {status:500})
    }

    //6. จัดการ Order Domain Error
    if(err instanceof OrderNotFoundError){
        return NextResponse.json({error: err.message}, {status: 404})
    }
    if(err instanceof OrderSignatureIsEmpty){
        return NextResponse.json({error: err.message}, {status: 404})
    }
    

    // 3. จัดการ Error อื่นๆ (Fallback)
    console.error('Unhandled error:', err);
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
}