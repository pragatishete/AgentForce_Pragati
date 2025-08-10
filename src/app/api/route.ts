import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import path from 'path';

// Define the POST handler for the login route
export async function POST(request: Request) {
  const { email, password } = await request.json(); // Extract email and password from the request body

  // Validate input
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 422 });
  }

  try {
    const dbPath = path.join(process.cwd(), '../fast_api/test.db'); // Adjust this path as needed
    // Open the SQLite database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Query the user by email
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);

    // Check if the user exists
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    // Validate the password against the hashed password stored in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Check if the password is valid
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    // If login is successful
    return NextResponse.json({ message: 'Login successful' }, { status: 200 });
  } catch (error) {
    console.error('Database error:', error); // Log the error for debugging
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
