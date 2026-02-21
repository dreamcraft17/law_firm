import { handleAdmin } from '@/lib/api/admin-handler';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleAdmin(pathSegments, 'GET', request);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleAdmin(pathSegments, 'POST', request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleAdmin(pathSegments, 'PUT', request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleAdmin(pathSegments, 'PATCH', request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await params;
  return handleAdmin(pathSegments, 'DELETE', request);
}
