import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'Login API is working' });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    // Buscar el usuario en la base de datos con role_id = 1 (Admin)
    const [rows]: any = await pool.query(
      'SELECT id, email, password, first_name, last_name, user_type, role_id FROM users WHERE email = ? AND role_id = 1 LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas o no tienes permisos de administrador' }, { status: 401 });
    }

    const user = rows[0];

    // Verificar la contraseña con Bcrypt (Laravel usa Bcrypt por defecto)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // No devolvemos el password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      status: 'success',
      user: userWithoutPassword
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}
